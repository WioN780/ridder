<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ridder Codebase Analysis & Agent Context

This document provides a comprehensive analysis of the **Ridder** workspace, its technical architecture, workflows, components, API boundaries, and dev instructions. Use it to quickly establish context when debugging or implementing features.

---

## 1. Project Overview
**Ridder** is a specialized e-commerce web application that simplifies secondhand clothing listings (e.g., for Vinted, Depop, Grailed). It provides visual ingestion, grouping of flat images into distinct items ("lots"), and structured listing description generation powered by Google Gemini multimodal models.

### Key Capabilities
- **Visual Image Clustering**: Automatically and visually groups uploaded item photographs into distinct clothing items ("lots") using AI.
- **Structured E-commerce Appraisals**: Evaluates brand, size, condition, measurements, pricing estimation, description, and tags from multiple item photos.
- **Batch Processing**: Jointly runs visual clustering and listing generation for flat batches of photos in a single API pass.

---

## 2. Technical Stack
- **Frontend**: Next.js 16.2.9, React 19.2.4, Typescript, Tailwind CSS v4, Lucide Icons, Shadcn UI components. Configured in [package.json](file:///home/mark/Projects/ridder/package.json).
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pillow (image manipulation), and the new Google GenAI SDK (`google-genai`). Configured in [backend/requirements.txt](file:///home/mark/Projects/ridder/backend/requirements.txt).
- **Orchestration**: Docker Compose running both the Next.js app on port `3000` and the FastAPI server on port `8000`. Configured in [docker-compose.yml](file:///home/mark/Projects/ridder/docker-compose.yml).

---

## 3. Directory Structure & Key Files

### Frontend Files
- **[app/page.tsx](file:///home/mark/Projects/ridder/app/page.tsx)**: Main page container managing UI layouts, state for listings, API integrations, and orchestrating batch actions.
- **[app/globals.css](file:///home/mark/Projects/ridder/app/globals.css)**: System styling configuration incorporating Tailwind CSS v4 utilities.
- **[components/WorkspaceHeader.tsx](file:///home/mark/Projects/ridder/components/WorkspaceHeader.tsx)**: Main top navigation containing system logos and the settings toggle.
- **[components/SettingsDialog.tsx](file:///home/mark/Projects/ridder/components/SettingsDialog.tsx)**: Settings panel managing browser local storage for API credentials, currencies, models, and pricing strategies.
- **[components/UploadZone.tsx](file:///home/mark/Projects/ridder/components/UploadZone.tsx)**: Drag-and-drop file uploader using `react-dropzone`.
- **[components/LotGrid.tsx](file:///home/mark/Projects/ridder/components/LotGrid.tsx)**: Grid container rendering active lots and controlling item split/merge flows.
- **[components/LotCard.tsx](file:///home/mark/Projects/ridder/components/LotCard.tsx)**: High-fidelity card representing a clustered lot and displaying its AI-generated listing fields (title, brand, condition, tags, description, measurements).
- **[hooks/use-mock-grouping.ts](file:///home/mark/Projects/ridder/hooks/use-mock-grouping.ts)**: Custom react hook [useMockGrouping](file:///home/mark/Projects/ridder/hooks/use-mock-grouping.ts#L23) that manages state for uploaded files, client-side image mapping, manually merging lots, and splitting lots.
- **[lib/api-key.ts](file:///home/mark/Projects/ridder/lib/api-key.ts)**: Utility functions [getApiKey](file:///home/mark/Projects/ridder/lib/api-key.ts#L7), `getModel`, `getCurrency`, and `getPricingStrategy` fetching config from localStorage.
- **[lib/utils.ts](file:///home/mark/Projects/ridder/lib/utils.ts)**: Reusable classname merging utility `cn`.

### Backend Files
- **[backend/main.py](file:///home/mark/Projects/ridder/backend/main.py)**: Python FastAPI backend definition containing model utilities, schema mappings, image compression, and endpoint definitions.
- **[backend/Dockerfile](file:///home/mark/Projects/ridder/backend/Dockerfile)**: Docker config for the backend service.
- **[Dockerfile](file:///home/mark/Projects/ridder/Dockerfile)**: Docker config for the Next.js frontend build.

---

## 4. Key Workflows & Data Flow

### A. Client Configuration Setup
1. Users enter their Gemini API Key in the settings dialog (handled by [SettingsDialog](file:///home/mark/Projects/ridder/components/SettingsDialog.tsx)).
2. Key changes trigger a debounced GET request to `/list-models` to query supported models.
3. The API key, model selection, currency, and pricing strategy are saved to the browser's `localStorage` via the utilities in [api-key.ts](file:///home/mark/Projects/ridder/lib/api-key.ts).

### B. Standard Visual Grouping & Appraising
1. User drops a batch of image files into [UploadZone](file:///home/mark/Projects/ridder/components/UploadZone.tsx).
2. [useMockGrouping](file:///home/mark/Projects/ridder/hooks/use-mock-grouping.ts#L23) tracks local file listings.
3. Users can manually merge or split lots:
   - `mergeLot` joins a lot with its predecessor.
   - `splitLot` splits a lot directly after a specific image identifier.
4. Clicking "Generate" on a [LotCard](file:///home/mark/Projects/ridder/components/LotCard.tsx) triggers `generateLotListing` in [page.tsx](file:///home/mark/Projects/ridder/app/page.tsx#L130-L186).
5. The frontend POSTs form data containing raw image files and settings parameters to `/generate-listing`.
6. The backend compresses the images to 1024px maximum (in `resize_and_convert_image`), translates the Pydantic schema into a Google GenAI schema, and invokes `generate_content` on Gemini, returning a structured [Listing](file:///home/mark/Projects/ridder/backend/main.py#L32) JSON object.

### C. Advanced Batch AI Clustering & Generation
1. Instead of compiling single lots manually, users click the "Run Batch AI Pipeline" button.
2. `generateBatchListings` in [page.tsx](file:///home/mark/Projects/ridder/app/page.tsx#L189-L277) POSTs all uploaded images directly to the `/generate-batch-listings` endpoint.
3. The backend function [generate_batch_listings_ai](file:///home/mark/Projects/ridder/backend/main.py#L360) instructs Gemini to:
   - Identify distinct items present in the batch.
   - Group the filenames belonging to each physical item.
   - Appraise and generate a listing for each.
4. Returns a [BatchListingResponse](file:///home/mark/Projects/ridder/backend/main.py#L84) containing a list of [BatchItem](file:///home/mark/Projects/ridder/backend/main.py#L68)s.
5. The frontend maps the returned lists back into local React lots and listings states.

---

## 5. API Reference Summary

### GET `/list-models`
- **Purpose**: Retrieves a list of available Gemini models. If an API key is provided, queries the Google API live; otherwise, returns fallback defaults.
- **Handler**: `api_list_models`

### POST `/generate-listing`
- **Purpose**: Appraises a single clothing lot using its associated images.
- **Handler**: `api_generate_listing`
- **Input**: Form data with fields `files` (array), `api_key` (string), `model` (string), `currency` (string), `pricing_strategy` (string).
- **Response Schema**: [Listing](file:///home/mark/Projects/ridder/backend/main.py#L32)

### POST `/cluster-images`
- **Purpose**: Visual clustering only; groups a flat set of uploaded image files.
- **Handler**: `api_cluster_images`
- **Response Schema**: [ClusterResponse](file:///home/mark/Projects/ridder/backend/main.py#L64)

### POST `/generate-batch-listings`
- **Purpose**: Combined visual clustering and listing generation for bulk uploads in a single request.
- **Handler**: `api_generate_batch_listings`
- **Response Schema**: [BatchListingResponse](file:///home/mark/Projects/ridder/backend/main.py#L84)

### POST `/generate-image`
- **Purpose**: Generates a clean cover/product image using Gemini's Imagen 3 model, guided by prompt configurations and optional style references.
- **Handler**: `api_generate_image`
- **Response Schema**: `{"image_url": "data:image/jpeg;base64,..."}`

---

## 6. Development Tips & Conventions

### Pydantic to Gemini Schema Conversion
In [backend/main.py](file:///home/mark/Projects/ridder/backend/main.py#L128-L204), the backend customizes types by dynamically converting Pydantic models to `types.Schema` using `pydantic_to_gemini_schema`. This method resolves nested `$defs`, injects dynamic pricing instructions based on the selected currency, and strips unsupported schema keys (e.g. `default`, `additionalProperties`) to prevent validation failures on Google's API.

### Pricing Strategies
Gemini is instructed on three distinct strategies:
- `vinted_frugal`: Targeted for price-sensitive Vinted buyers (bargain prices, generally 5 - 25 units).
- `premium_resale`: Depop/Grailed context (higher premium valuation, highlighting brand appeal).
- `standard_market`: Competitive average resale value.

### React State Shifts on Lot Modification & Board Undo
- **Smart Listing Shifting**: Whenever an image lot is merged or split manually by a user, the frontend no longer clears all listings. Instead, it dynamically shifts the listing keys (IDs) of the unaffected lots up or down to align with their new lot positions (e.g. if `lot-3` becomes `lot-2` after a merge up, its generated listing shifts to `lot-2` automatically). The listing of the affected lot itself is cleared to prompt clean regeneration.
- **Undo History**: Before any layout modification (merge, split, clear), the system saves the current `lots`, `listings`, and `generatedImages` state on a history stack. An **UNDO** button is displayed on the main action bar, allowing the user to restore the previous state and generated listings instantly.

### Language Customization & Example Output Style Guide
- **Custom Language Generation**: Language options (e.g. English, French, German, Spanish, Ukrainian, etc.) are chosen in the settings menu, saved in `localStorage`, and passed to the backend generation endpoints. The system instructs Gemini to generate all output values (title, description, tags, measurements, etc.) in the selected language.
- **Style Guide (Example Output)**: Users can paste an example description inside the settings. The system instructs the Gemini model to emulation the style, tone, format, and structure of this text when generating the description for single and batch listings.

### Image Generation & Style Reference Guided by Gemini
- **Gemini-guided Style References**: When the user configures an image style reference in settings (automatically resized client-side to fit inside localStorage), the backend first uses Gemini (`gemini-2.5-flash`) to analyze its photographic composition, background, lighting, and colors. This detailed style analysis is injected dynamically into the Imagen prompt along with the item's title/description, resulting in highly cohesive, style-matched cover images without requiring complex cloud storage setups.
- **Tabbed Preview Interface**: The [LotCard](file:///home/mark/Projects/ridder/components/LotCard.tsx) component uses a tabbed view (`Original Photos` vs `AI Cover Image`) to display both the original carousel and the generated representation image.

### Rendering & Performance Optimizations (Lag Prevention)
- **Memoized Lists & Grids**: The unallocated flat images grid is wrapped in a React `useMemo` block to prevent re-rendering when settings or dialog states change.
- **Component Memoization**: The [LotGrid](file:///home/mark/Projects/ridder/components/LotGrid.tsx) and [LotCard](file:///home/mark/Projects/ridder/components/LotCard.tsx) components are wrapped in `React.memo` to skip unnecessary re-renders.
- **Stable Handler References**: Callback handlers (e.g. `handleMerge`, `handleSplit`, `generateLotListing`, `generateBatchListings`, `generateLotImage`) are memoized with `useCallback` to prevent downstream re-renders caused by unstable callback prop changes.

### Vinted Integration & User Utilities
- **Draggable Photo Lots**: Implements HTML5 Drag and Drop API in [LotCard.tsx](file:///home/mark/Projects/ridder/components/LotCard.tsx) where `onDragStart` populates `event.dataTransfer.items` with the lot's actual `File` objects from `rawFiles`. This allows the user to drag the dedicated visual box and drop it directly onto desktop folders or upload forms (such as Vinted's image drops).
- **Copy Description Shortcut**: A dedicated copy button placed in the header of the description text area in [LotCard.tsx](file:///home/mark/Projects/ridder/components/LotCard.tsx), enabling one-click clipboard copying of the generated text description.

