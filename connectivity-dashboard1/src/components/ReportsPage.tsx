import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowPathIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useData } from "../context/dataContext";
import { REPORT_SEVERITY_COLORS } from "../types";
import type { FieldReport, ReportSeverity } from "../types";

const SEVERITIES: ReportSeverity[] = ["Low", "Medium", "High", "Urgent"];
type Filter = ReportSeverity | "All";

function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

function formatAbsolute(iso: string): string {
  const then = Date.parse(iso);
  return Number.isNaN(then) ? iso : new Date(then).toLocaleString();
}

export default function ReportsPage() {
  const { reports, reportsStatus, reportsError, reportsSource, refreshReports } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [lightbox, setLightbox] = useState<FieldReport | null>(null);

  const sorted = useMemo(
    () =>
      [...reports].sort(
        (a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt),
      ),
    [reports],
  );

  const counts = useMemo(() => {
    const base: Record<Filter, number> = { All: sorted.length, Low: 0, Medium: 0, High: 0, Urgent: 0 };
    for (const report of sorted) base[report.severity] += 1;
    return base;
  }, [sorted]);

  const visible = useMemo(
    () => (filter === "All" ? sorted : sorted.filter((report) => report.severity === filter)),
    [sorted, filter],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshReports();
    } finally {
      setRefreshing(false);
    }
  };

  const viewOnMap = (report: FieldReport) => {
    const params = new URLSearchParams({
      lat: String(report.latitude),
      lng: String(report.longitude),
      name: report.category,
    });
    const layersParam = searchParams.get("layers");
    if (layersParam !== null) params.set("layers", layersParam);
    navigate(`/map?${params.toString()}`);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Field Reports</h1>
            <p className="mt-1 text-sm text-slate-500">
              Hazards submitted from the Warning Blackspot mobile app, with captured GPS location.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {reportsSource === "api" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live · auto-refreshing
                </span>
              )}
              {reportsSource === "fallback" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                  Demo snapshot · reports API offline
                </span>
              )}
              {reportsStatus === "loading" && (
                <span className="text-slate-400">Loading reports…</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {reportsError && reportsSource === "fallback" && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            {reportsError} — start it with <code className="font-mono">npm run server</code> to receive live reports.
          </div>
        )}

        {reportsStatus === "error" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
            {reportsError ?? "Failed to load reports."}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {(["All", ...SEVERITIES] as Filter[]).map((option) => {
            const active = filter === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option !== "All" && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: REPORT_SEVERITY_COLORS[option] }}
                  />
                )}
                {option}
                <span className="text-slate-400">{counts[option]}</span>
              </button>
            );
          })}
        </div>

        {visible.length === 0 && reportsStatus !== "loading" ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">No reports to show.</p>
            <p className="mt-1 text-xs text-slate-400">
              Submit a hazard in the mobile app and it will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((report) => (
              <li
                key={report.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: REPORT_SEVERITY_COLORS[report.severity] }}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{report.category}</h3>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor: `${REPORT_SEVERITY_COLORS[report.severity]}22`,
                            color: REPORT_SEVERITY_COLORS[report.severity],
                          }}
                        >
                          {report.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRelative(report.reportedAt)} · {formatAbsolute(report.reportedAt)}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                        {typeof report.accuracy === "number"
                          ? ` · ± ${Math.round(report.accuracy)} m`
                          : ""}
                      </p>
                      {report.notes && (
                        <p className="mt-2 text-sm text-slate-600">{report.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => viewOnMap(report)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                    >
                      <MapPinIcon className="h-3.5 w-3.5" />
                      View on Map
                    </button>

                    {report.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setLightbox(report)}
                        className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                        aria-label="Enlarge photo"
                      >
                        <img
                          src={report.photoUrl}
                          alt={`Hazard photo for ${report.category}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lightbox?.photoUrl && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <div className="max-h-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-2">
              <div className="text-sm">
                <span className="font-semibold text-slate-900">{lightbox.category}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {formatAbsolute(lightbox.reportedAt)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <img
              src={lightbox.photoUrl}
              alt={`Hazard photo for ${lightbox.category}`}
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
