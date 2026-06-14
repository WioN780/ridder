import io
import json
import os
from typing import Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image
from pydantic import BaseModel, Field, ValidationError

app = FastAPI(title="Ridder Listing Generation Backend", version="0.2.0")

# Configure CORS dynamically from environment variables
cors_origins_raw = os.getenv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
cors_origins = [
    origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Listing(BaseModel):
    title: str = Field(
        description="Catchy but professional listing title including key keywords."
    )
    brand: Optional[str] = Field(
        default=None, description="Brand name if visible or identifiable."
    )
    size: Optional[str] = Field(
        default=None, description="Size of the item if visible or identifiable."
    )
    condition: str = Field(
        description="Evaluated condition of the secondhand item (e.g., New with tags, Excellent, Good, Fair, etc.)"
    )
    measurements: dict = Field(
        description="Dictionary of key measurements (e.g. chest, length, sleeve) if applicable or estimated."
    )
    price: Optional[int] = Field(
        default=None, description="Estimated fair listing price in USD (integer)."
    )
    description: str = Field(
        description="Detailed, compelling description highlighting features, materials, and flaws if any."
    )
    tags: List[str] = Field(description="List of 5-10 search tags/keywords.")


class ClusterLot(BaseModel):
    id: str = Field(description="Sequential cluster ID, e.g. lot-1, lot-2")
    file_names: List[str] = Field(
        description="List of filenames belonging to this cluster unit."
    )


class ClusterResponse(BaseModel):
    lots: List[ClusterLot]


class BatchItem(BaseModel):
    title: str = Field(description="Listing title for this specific item.")
    brand: Optional[str] = Field(default=None, description="Identified brand.")
    size: Optional[str] = Field(default=None, description="Identified size.")
    condition: str = Field(description="Evaluated condition of the item.")
    measurements: dict = Field(description="Key measurements.")
    price: Optional[int] = Field(
        default=None, description="Estimated fair listing price in USD."
    )
    description: str = Field(description="compelling, detailed listing description.")
    tags: List[str] = Field(description="List of tags.")
    filenames: List[str] = Field(
        description="Exact filenames of the images belonging to this item."
    )


class BatchListingResponse(BaseModel):
    items: List[BatchItem] = Field(
        description="List of distinct clothing items identified in the batch."
    )


def resize_and_convert_image(image_bytes: bytes) -> bytes:
    """
    Validates, resizes the image to maximum 1024px while preserving aspect ratio,
    and returns the compressed JPEG bytes.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB mode
        if img.mode in ("RGBA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize maintaining aspect ratio
        max_size = 1024
        width, height = img.size
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Output to bytes as JPEG
        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG", quality=85)
        return output_buffer.getvalue()
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to process image: {str(e)}"
        )


def pydantic_to_gemini_schema(model: type[BaseModel], currency: str = "USD") -> types.Schema:
    """
    Converts a Pydantic model to a Google GenAI SDK compatible types.Schema object.
    Inlines references ($ref) and strips out unsupported properties like 'default' and 'additionalProperties'.
    """
    schema = model.model_json_schema()
    defs = schema.pop("$defs", {})

    def resolve_refs(node):
        if isinstance(node, dict):
            if "$ref" in node:
                ref_path = node["$ref"]
                ref_key = ref_path.split("/")[-1]
                ref_schema = defs.get(ref_key, {})
                node.clear()
                node.update(resolve_refs(ref_schema))
            else:
                for k, v in list(node.items()):
                    node[k] = resolve_refs(v)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                node[i] = resolve_refs(v)
        return node

    schema = resolve_refs(schema)

    def update_price_description(node):
        if isinstance(node, dict):
            if "properties" in node:
                props = node["properties"]
                if "price" in props and isinstance(props["price"], dict):
                    props["price"]["description"] = f"Estimated fair listing price in {currency} (integer)."
            for v in node.values():
                update_price_description(v)
        elif isinstance(node, list):
            for v in node:
                update_price_description(v)

    update_price_description(schema)

    def clean_schema(node, is_properties_dict=False):
        if isinstance(node, dict):
            if is_properties_dict:
                for k, v in list(node.items()):
                    node[k] = clean_schema(v, is_properties_dict=False)
            else:
                node.pop("default", None)
                node.pop("additionalProperties", None)
                if "anyOf" in node:
                    any_of = node.pop("anyOf")
                    types_list = [item for item in any_of if item.get("type") != "null"]
                    if types_list:
                        primary = types_list[0]
                        node.update(primary)
                        node["nullable"] = True
                for k, v in list(node.items()):
                    node[k] = clean_schema(v, is_properties_dict=(k == "properties"))
        elif isinstance(node, list):
            for i, v in enumerate(node):
                node[i] = clean_schema(v, is_properties_dict=False)
        return node

    schema = clean_schema(schema)
    types_schema = types.Schema.model_validate(schema)

    def strip_additional_properties(s: types.Schema):
        if not s:
            return
        s.additional_properties = None
        if s.properties:
            for prop_schema in s.properties.values():
                strip_additional_properties(prop_schema)
        if s.items:
            strip_additional_properties(s.items)

    strip_additional_properties(types_schema)
    return types_schema


def generate_listing(
    images: list[bytes],
    api_key: str,
    model: str = "gemini-2.5-flash",
    currency: str = "USD",
    pricing_strategy: str = "vinted_frugal",
    language: str = "English",
    example_output: Optional[str] = None,
) -> Listing:
    """
    Generates a structured secondhand clothing listing from a list of image bytes
    using Google Gemini 1.5 Flash or another configured model. Retries up to 2 times on validation or parsing failures.
    Does not log or store API keys.
    """
    client = genai.Client(api_key=api_key)

    if pricing_strategy == "vinted_frugal":
        pricing_instruction = (
            f"PRICING STRATEGY: Vinted Frugal. The target marketplace is Vinted, where buyers are highly price-sensitive "
            f"and expect low/cheap prices. Do NOT be generous or overvalue the item. "
            f"Set conservative, low, and bargain-level pricing. "
            f"Prices should generally fall within 5 to 25 {currency} depending on the item quality and brand. "
            f"Only price above 25 {currency} if the brand is highly premium, rare, or brand new with tags."
        )
    elif pricing_strategy == "premium_resale":
        pricing_instruction = (
            f"PRICING STRATEGY: Premium Resale. The target marketplace is Depop or Grailed, where buyers seek unique, "
            f"curated, or vintage items. Estimate higher, premium resale values, highlighting brand value and styling potential."
        )
    else:  # standard_market
        pricing_instruction = (
            f"PRICING STRATEGY: Standard Secondhand. Estimate fair, competitive secondhand market value based on item condition and brand."
        )

    language_instruction = f"All text values in the JSON response (such as title, description, condition, measurements dictionary keys/values, and tags) MUST be written in {language}."

    example_instruction = ""
    if example_output and example_output.strip():
        example_instruction = (
            f"Here is an example of the desired description style and format. "
            f"You should model your generated 'description' after this example, matching its tone, structure, and detail level:\n"
            f"=== EXAMPLE DESCRIPTION ===\n{example_output.strip()}\n===========================\n"
        )

    prompt = (
        "You are an expert secondhand clothing appraiser and e-commerce copywriter. "
        "Analyze the uploaded images of this clothing item and generate a structured product listing. "
        f"Generate all pricing in {currency}. "
        f"{pricing_instruction} "
        f"{language_instruction} "
        f"{example_instruction} "
        "You must respond with strictly valid JSON matching the schema. "
        "Do NOT wrap the output in markdown code fences (do not use ```json or ```). "
        "Do NOT provide any preamble, explanation, or trailing text. "
        "Provide raw, strict JSON only."
    )

    contents = [prompt]
    for img_bytes in images:
        contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"))

    max_retries = 2
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=pydantic_to_gemini_schema(Listing, currency=currency),
                ),
            )

            if not response.text:
                raise ValueError("Received an empty response from the Gemini model.")

            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()

            listing_obj = Listing.model_validate_json(cleaned_text)
            return listing_obj

        except (ValidationError, json.JSONDecodeError, ValueError, Exception) as e:
            last_exception = e
            print(
                f"[RETRY WARNING] Listing generation attempt {attempt + 1} failed: {str(e)}"
            )
            continue

    raise (
        last_exception
        if last_exception
        else Exception("Listing generation failed after retries.")
    )


def cluster_images_ai(
    images: list[tuple[bytes, str]], api_key: str, model: str = "gemini-2.5-flash"
) -> ClusterResponse:
    """
    Groups a list of images (bytes + filename) into lots visually using Google Gemini.
    """
    client = genai.Client(api_key=api_key)

    prompt = (
        "You are an expert visual inventory organizer. Analyze the uploaded images and group them "
        "into distinct lots. Each lot represents a single physical product (e.g. all photos of a specific "
        "striped shirt go into one lot, shoes into another, jacket into another). "
        "Group them based on visual identity, color, pattern, and item style. "
        "You must respond with strictly valid JSON matching the schema, listing the filenames belonging "
        "to each group. Do NOT use markdown code fences. Respond with raw JSON only."
    )

    contents = [prompt]
    for img_bytes, filename in images:
        contents.append(f"IMAGE FILENAME: {filename}")
        contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"))

    max_retries = 2
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=pydantic_to_gemini_schema(ClusterResponse),
                ),
            )

            if not response.text:
                raise ValueError("Received an empty clustering response from Gemini.")

            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()

            cluster_obj = ClusterResponse.model_validate_json(cleaned_text)
            return cluster_obj

        except (ValidationError, json.JSONDecodeError, ValueError, Exception) as e:
            last_exception = e
            print(f"[RETRY WARNING] Clustering attempt {attempt + 1} failed: {str(e)}")
            continue

    raise (
        last_exception
        if last_exception
        else Exception("Clustering failed after retries.")
    )


def generate_batch_listings_ai(
    images: list[tuple[bytes, str]],
    api_key: str,
    model: str = "gemini-2.5-flash",
    currency: str = "USD",
    pricing_strategy: str = "vinted_frugal",
    language: str = "English",
    example_output: Optional[str] = None,
) -> BatchListingResponse:
    """
    Groups and generates listings for a flat batch of uploaded clothing images in a single call.
    """
    client = genai.Client(api_key=api_key)

    if pricing_strategy == "vinted_frugal":
        pricing_instruction = (
            f"PRICING STRATEGY: Vinted Frugal. The target marketplace is Vinted, where buyers are highly price-sensitive "
            f"and expect low/cheap prices. Do NOT be generous or overvalue the item. "
            f"Set conservative, low, and bargain-level pricing. "
            f"Prices should generally fall within 5 to 25 {currency} depending on the item quality and brand. "
            f"Only price above 25 {currency} if the brand is highly premium, rare, or brand new with tags."
        )
    elif pricing_strategy == "premium_resale":
        pricing_instruction = (
            f"PRICING STRATEGY: Premium Resale. The target marketplace is Depop or Grailed, where buyers seek unique, "
            f"curated, or vintage items. Estimate higher, premium resale values, highlighting brand value and styling potential."
        )
    else:  # standard_market
        pricing_instruction = (
            f"PRICING STRATEGY: Standard Secondhand. Estimate fair, competitive secondhand market value based on item condition and brand."
        )

    language_instruction = f"All text values in the JSON response (such as title, description, condition, measurements dictionary keys/values, and tags) for each item MUST be written in {language}."

    example_instruction = ""
    if example_output and example_output.strip():
        example_instruction = (
            f"Here is an example of the desired description style and format. "
            f"For each identified item, you should model its generated 'description' after this example, matching its tone, structure, and detail level:\n"
            f"=== EXAMPLE DESCRIPTION ===\n{example_output.strip()}\n===========================\n"
        )

    prompt = (
        "You are an expert secondhand fashion inventory appraiser. Analyze this flat batch of images. "
        "Some images are different angles or details (front, back, label, size tag) of the same physical item. "
        "Your task is to:\n"
        "1. Detect how many distinct clothing items are present in this batch.\n"
        "2. Group the image filenames by the physical item they represent.\n"
        "3. Generate a structured e-commerce listing for each item.\n"
        f"Generate all pricing in {currency}.\n"
        f"{pricing_instruction}\n"
        f"{language_instruction}\n"
        f"{example_instruction}\n"
        "You must respond with strictly valid JSON matching the schema, and list the filenames "
        "that belong to each item. Do NOT use markdown code fences. Respond with raw JSON only."
    )

    contents = [prompt]
    for img_bytes, filename in images:
        contents.append(f"IMAGE FILENAME: {filename}")
        contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"))

    max_retries = 2
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=pydantic_to_gemini_schema(BatchListingResponse, currency=currency),
                ),
            )

            if not response.text:
                raise ValueError("Received an empty batch response from Gemini.")

            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()

            batch_obj = BatchListingResponse.model_validate_json(cleaned_text)
            return batch_obj

        except (ValidationError, json.JSONDecodeError, ValueError, Exception) as e:
            last_exception = e
            print(
                f"[RETRY WARNING] Batch listing attempt {attempt + 1} failed: {str(e)}"
            )
            continue

    raise (
        last_exception
        if last_exception
        else Exception("Batch listing generation failed.")
    )


@app.get("/list-models")
async def api_list_models(api_key: Optional[str] = None):
    """
    GET API handler for listing available models.
    If api_key is provided, dynamically list models supported by that key.
    Otherwise, returns a default set of standard Gemini models.
    """
    default_models = [
        {
            "name": "gemini-3.5-flash",
            "display_name": "Gemini 3.5 Flash (Default)",
            "description": "Newer, faster model optimized for coding and multimodal tasks",
        },
        {
            "name": "gemini-2.5-flash",
            "display_name": "Gemini 2.5 Flash",
            "description": "Fast and versatile multimodal model",
        },
        {
            "name": "gemini-2.5-pro",
            "display_name": "Gemini 2.5 Pro",
            "description": "Complex reasoning and larger context window",
        },
    ]

    if not api_key or not api_key.strip():
        return {"models": default_models}

    try:
        client = genai.Client(api_key=api_key)
        models_list = client.models.list()

        supported = []
        for model in models_list:
            actions = model.supported_actions or []
            if "generateContent" in actions:
                name = model.name or ""
                # Strip models/ prefix
                if name.startswith("models/"):
                    name = name[len("models/") :]
                supported.append(
                    {
                        "name": name,
                        "display_name": model.display_name or name,
                        "description": model.description or "",
                    }
                )

        if not supported:
            return {"models": default_models}
        return {"models": supported}

    except Exception as e:
        print(f"[WARNING] Failed to fetch live models from Google: {str(e)}")
        return {"models": default_models}


@app.post("/generate-listing", response_model=Listing)
async def api_generate_listing(
    files: List[UploadFile] = File(...),
    api_key: str = Form(...),
    model: str = Form("gemini-2.5-flash"),
    currency: str = Form("USD"),
    pricing_strategy: str = Form("vinted_frugal"),
    language: str = Form("English"),
    example_output: Optional[str] = Form(None),
):
    """
    POST API handler for generating product listings.
    """
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="Missing or empty Gemini API Key.")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    allowed_mime_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    processed_images = []

    for file in files:
        if file.content_type not in allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file.filename}. Only JPEG, PNG, and WEBP are supported.",
            )
        content = await file.read()
        jpeg_bytes = resize_and_convert_image(content)
        processed_images.append(jpeg_bytes)

    try:
        result = generate_listing(
            processed_images,
            api_key,
            model=model,
            currency=currency,
            pricing_strategy=pricing_strategy,
            language=language,
            example_output=example_output,
        )
        return result
    except Exception as e:
        error_msg = str(e)
        if api_key in error_msg:
            error_msg = error_msg.replace(api_key, "********")
        raise HTTPException(
            status_code=502, detail=f"Failed to generate clothing listing: {error_msg}"
        )


@app.post("/cluster-images", response_model=ClusterResponse)
async def api_cluster_images(
    files: List[UploadFile] = File(...),
    api_key: str = Form(...),
    model: str = Form("gemini-2.5-flash"),
):
    """
    POST API handler for visually clustering files using Gemini.
    """
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="Missing or empty Gemini API Key.")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    allowed_mime_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    images_with_names = []

    for file in files:
        if file.content_type not in allowed_mime_types:
            raise HTTPException(
                status_code=400, detail=f"Unsupported file format: {file.filename}."
            )
        content = await file.read()
        jpeg_bytes = resize_and_convert_image(content)
        images_with_names.append((jpeg_bytes, file.filename))

    try:
        result = cluster_images_ai(images_with_names, api_key, model=model)
        return result
    except Exception as e:
        error_msg = str(e)
        if api_key in error_msg:
            error_msg = error_msg.replace(api_key, "********")
        raise HTTPException(
            status_code=502, detail=f"Failed to cluster images: {error_msg}"
        )


@app.post("/generate-batch-listings", response_model=BatchListingResponse)
async def api_generate_batch_listings(
    files: List[UploadFile] = File(...),
    api_key: str = Form(...),
    model: str = Form("gemini-2.5-flash"),
    currency: str = Form("USD"),
    pricing_strategy: str = Form("vinted_frugal"),
    language: str = Form("English"),
    example_output: Optional[str] = Form(None),
):
    """
    POST API endpoint for joint visual clustering and listing generation in a single pass.
    """
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="Missing or empty Gemini API Key.")
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    allowed_mime_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    images_with_names = []

    for file in files:
        if file.content_type not in allowed_mime_types:
            raise HTTPException(
                status_code=400, detail=f"Unsupported file format: {file.filename}."
            )
        content = await file.read()
        jpeg_bytes = resize_and_convert_image(content)
        images_with_names.append((jpeg_bytes, file.filename))

    try:
        result = generate_batch_listings_ai(
            images_with_names,
            api_key,
            model=model,
            currency=currency,
            pricing_strategy=pricing_strategy,
            language=language,
            example_output=example_output,
        )
        return result
    except Exception as e:
        error_msg = str(e)
        if api_key in error_msg:
            error_msg = error_msg.replace(api_key, "********")
        raise HTTPException(
            status_code=502, detail=f"Failed to process batch listings: {error_msg}"
        )
