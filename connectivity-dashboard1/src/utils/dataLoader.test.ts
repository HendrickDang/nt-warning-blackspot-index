import { afterEach, describe, expect, it, vi } from "vitest";
import { DataLoadError, fetchJson, fetchText } from "./dataLoader";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchJson", () => {
  it("parses JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ a: 1 }), { status: 200 }))
    );
    await expect(fetchJson<{ a: number }>("/data/x.json")).resolves.toEqual({ a: 1 });
  });

  it("throws DataLoadError on a 404 (unlike a bare fetch catch)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", { status: 404 })));
    await expect(fetchJson("/data/x.json")).rejects.toBeInstanceOf(DataLoadError);
  });

  it("wraps network failures in DataLoadError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      })
    );
    await expect(fetchJson("/data/x.json")).rejects.toBeInstanceOf(DataLoadError);
  });
});

describe("fetchText", () => {
  it("returns the response body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("hello", { status: 200 })));
    await expect(fetchText("/data/x.csv")).resolves.toBe("hello");
  });

  it("throws DataLoadError on a server error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    await expect(fetchText("/data/x.csv")).rejects.toBeInstanceOf(DataLoadError);
  });
});
