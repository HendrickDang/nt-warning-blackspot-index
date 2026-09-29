// Minimal CSV parser for the bundled bushfire-risk dataset. It handles the
// simple, unquoted CSV that ships with the app; values are trimmed and rows
// with no cells are skipped.

export type CsvRecord = Record<string, string>;

export function parseCsv(csvText: string): CsvRecord[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: CsvRecord = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? "").trim();
    });
    return row;
  });
}
