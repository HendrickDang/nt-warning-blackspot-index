export type Severity = "Low" | "Medium" | "High" | "Urgent";

export type ReportStatus = "queued" | "syncing" | "synced";

export type HazardCategory = "Dry grass" | "Tall grass" | "Floodwater" | "Fire / smoke";

export type Language = "English" | "Murrinh Patha";

export type MapLayer = "risk" | "coverage";

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type Report = {
  id: number;
  category: HazardCategory;
  severity: Severity;
  location: string;
  /** Captured GPS position of the report (used by the dashboard map). */
  latitude: number;
  longitude: number;
  accuracy: number | null;
  time: string;
  status: ReportStatus;
  notes?: string;
  photoUri?: string | null;
  /** ISO timestamp; sent to the reports API as reportedAt. */
  reportedAt: string;
};

export type RiskSpot = {
  id: number;
  label: string;
  color: string;
  x: `${number}%`;
  y: `${number}%`;
  size: number;
};
