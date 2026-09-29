import { describe, expect, it } from "vitest";
import { escapeHtml, safeUrl } from "./html";

describe("escapeHtml", () => {
  it("escapes the HTML metacharacters", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("renders nullish values as an empty string", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("safeUrl", () => {
  it("allows http and https urls", () => {
    expect(safeUrl("https://bushtel.nt.gov.au/profile/1")).toBe(
      "https://bushtel.nt.gov.au/profile/1"
    );
  });

  it("rejects javascript and other schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
  });

  it("returns null for nullish values", () => {
    expect(safeUrl(null)).toBeNull();
  });
});
