/**
 * Retrieves the user-provided Gemini API key stored in the browser's localStorage.
 * Returns null if executed server-side or if no key is currently configured.
 *
 * @returns The API key string or null
 */
export function getApiKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("ridder_gemini_api_key") || null;
}

export function getModel(): string {
  if (typeof window === "undefined") {
    return "gemini-2.5-flash";
  }
  return localStorage.getItem("ridder_gemini_model") || "gemini-2.5-flash";
}

export function getCurrency(): string {
  if (typeof window === "undefined") {
    return "USD";
  }
  return localStorage.getItem("ridder_currency") || "USD";
}

export function getPricingStrategy(): string {
  if (typeof window === "undefined") {
    return "vinted_frugal";
  }
  return localStorage.getItem("ridder_pricing_strategy") || "vinted_frugal";
}

export function getLanguage(): string {
  if (typeof window === "undefined") {
    return "English";
  }
  return localStorage.getItem("ridder_language") || "English";
}

export function getExampleOutput(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("ridder_example_output") || "";
}

export function getImageModel(): string {
  if (typeof window === "undefined") {
    return "imagen-4.0-generate-001";
  }
  return localStorage.getItem("ridder_image_model") || "imagen-4.0-generate-001";
}

export function getImagePrompt(): string {
  if (typeof window === "undefined") {
    return "A professional studio product shot, clean flat lay of the item, solid light grey background, soft studio lighting, commercial fashion photography, high detail, sharp focus.";
  }
  return localStorage.getItem("ridder_image_prompt") || "A professional studio product shot, clean flat lay of the item, solid light grey background, soft studio lighting, commercial fashion photography, high detail, sharp focus.";
}

export function getImageStyleRef(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("ridder_image_style_ref") || "";
}

