export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/** True for absolute http(s) URLs — UTM/shortening only make sense for these. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Append non-empty UTM parameters to an http(s) URL.
 * Non-URL content (plain text) is returned unchanged.
 */
export function appendUtmParams(value: string, params: UtmParams): string {
  if (!isHttpUrl(value)) {
    return value;
  }

  const url = new URL(value.trim());
  const mapping: [string, string | undefined][] = [
    ["utm_source", params.source],
    ["utm_medium", params.medium],
    ["utm_campaign", params.campaign],
    ["utm_term", params.term],
    ["utm_content", params.content],
  ];

  for (const [key, raw] of mapping) {
    const trimmed = raw?.trim();
    if (trimmed) {
      url.searchParams.set(key, trimmed);
    }
  }

  return url.toString();
}

/**
 * Shorten a URL via the is.gd API (no API key required).
 * Throws on failure so callers can fall back to the original URL.
 */
export async function shortenUrl(value: string): Promise<string> {
  const endpoint = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(value)}`;
  // Bound the request so a slow/unreachable is.gd can't hang the form submit indefinitely.
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
  const body = (await response.text()).trim();

  if (!response.ok || body.toLowerCase().startsWith("error:")) {
    throw new Error(body || `Shortener returned status ${response.status}`);
  }

  if (!isHttpUrl(body)) {
    throw new Error("Shortener returned an unexpected response");
  }

  return body;
}
