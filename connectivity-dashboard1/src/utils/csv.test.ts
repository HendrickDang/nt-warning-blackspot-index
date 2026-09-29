import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses headers and rows", () => {
    const rows = parseCsv("COMMUNITY,RATING\n10 Mile,Low\nAdelaide River,High\n");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ COMMUNITY: "10 Mile", RATING: "Low" });
    expect(rows[1]).toEqual({ COMMUNITY: "Adelaide River", RATING: "High" });
  });

  it("trims whitespace and handles CRLF", () => {
    const rows = parseCsv("A, B\r\n x , y \r\n");
    expect(rows).toEqual([{ A: "x", B: "y" }]);
  });

  it("returns an empty array for header-only or empty input", () => {
    expect(parseCsv("A,B")).toEqual([]);
    expect(parseCsv("")).toEqual([]);
  });
});
