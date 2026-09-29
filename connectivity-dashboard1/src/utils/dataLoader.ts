// Shared data-loading helpers. Every dataset in public/data is fetched through
// here so that HTTP failures (including 404s, which `.catch` on fetch does NOT
// catch) surface as real errors instead of silently degrading.

export class DataLoadError extends Error {
  readonly url: string;
  readonly status?: number;

  constructor(url: string, status?: number) {
    super(
      status
        ? `Failed to load ${url} (HTTP ${status})`
        : `Failed to load ${url} (network error)`
    );
    this.name = "DataLoadError";
    this.url = url;
    this.status = status;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new DataLoadError(url);
  }
  if (!response.ok) throw new DataLoadError(url, response.status);
  return (await response.json()) as T;
}

export async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new DataLoadError(url);
  }
  if (!response.ok) throw new DataLoadError(url, response.status);
  return response.text();
}

/** Paths to the bundled datasets. Kept in one place so callers stay in sync. */
export const DATA_PATHS = {
  communities: "/data/communities.geojson",
  towers: "/data/towers.geojson",
  coverage: "/data/coverage.geojson",
  boundary: "/data/nt_boundary.geojson",
  bushfireRisk: "/data/Community_Bushfire_Risk.csv",
} as const;
