import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useData } from "../context/dataContext";
import { getWbiTierStyle } from "../utils/wbi";
import { safeUrl } from "../utils/html";
import {
  ALERT_BADGE_CLASS,
  DISASTER_BUFFER_KM,
  DISASTER_KIND_LABELS,
  groupExposures,
  matchCommunitiesToEvents,
} from "../utils/disasters";
import type {
  CommunityExposure,
  CommunityExposureGroup,
  DisasterEvent,
  ExposureStatus,
} from "../utils/disasters";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const STATUS_BADGE: Record<ExposureStatus, string> = {
  affected: "bg-red-100 text-red-700 border-red-200",
  "at-risk": "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_LABEL: Record<ExposureStatus, string> = {
  affected: "Affected",
  "at-risk": "At risk",
};

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Live cyclone/flood exposure from GDACS, shown on the Analytics board. Loads
 * lazily on mount and refreshes every 15 minutes (plus a manual button).
 */
export default function DisasterExposurePanel() {
  const {
    communities,
    wbiCommunities,
    disasters,
    disasterStatus,
    disasterError,
    disasterUpdatedAt,
    ensureDisasters,
    refreshDisasters,
  } = useData();

  useEffect(() => {
    ensureDisasters();
  }, [ensureDisasters]);

  useEffect(() => {
    const id = window.setInterval(() => refreshDisasters(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refreshDisasters]);

  const data = wbiCommunities ?? communities;

  const { events, groups, affectedCount, atRiskCount } = useMemo(() => {
    const list = disasters ?? [];
    const exposures = matchCommunitiesToEvents(list, data);
    const grouped = groupExposures(exposures);
    const affected = grouped.filter((g) => g.status === "affected").length;
    return {
      events: list,
      groups: grouped,
      affectedCount: affected,
      atRiskCount: grouped.length - affected,
    };
  }, [disasters, data]);

  const loading = disasterStatus === "idle" || disasterStatus === "loading";

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-red-50 text-red-600">
            <BoltIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Natural Disaster Exposure</h2>
            <p className="text-[11px] text-slate-400">
              Live cyclones &amp; floods affecting NT communities (GDACS)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {disasterUpdatedAt && !loading && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Updated {new Date(disasterUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={refreshDisasters}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
          <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Checking live hazard feeds…</span>
        </div>
      ) : disasterError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          Could not load live disaster data. {disasterError}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-5 text-slate-500">
          <ShieldCheckIcon className="h-6 w-6 text-emerald-500 shrink-0" />
          <p className="text-xs">
            No active cyclones or floods are currently tracked near the Northern Territory.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Active events" value={events.length} tone="slate" />
            <MiniStat label="Communities affected" value={affectedCount} tone="red" />
            <MiniStat
              label={`At risk (≤ ${DISASTER_BUFFER_KM} km)`}
              value={atRiskCount}
              tone="amber"
            />
          </div>

          <ul className="flex flex-wrap gap-2">
            {events.map((event) => (
              <EventChip key={`${event.kind}-${event.eventId}-${event.episodeId}`} event={event} />
            ))}
          </ul>

          {groups.length === 0 ? (
            <p className="text-xs text-slate-500">
              These events are active, but no NT community falls inside or near their footprints.
            </p>
          ) : (
            <ExposureTable groups={groups} />
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "red" | "amber";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${tones[tone]}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function EventChip({ event }: { event: DisasterEvent }) {
  const window = [formatDay(event.fromDate), formatDay(event.toDate)].filter(Boolean).join(" – ");
  const reportUrl = safeUrl(event.reportUrl);

  return (
    <li
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] ${ALERT_BADGE_CLASS[event.alertLevel]}`}
      title={event.severityText || undefined}
    >
      <span className="font-semibold">{DISASTER_KIND_LABELS[event.kind]}</span>
      <span>{event.name}</span>
      {window && <span className="opacity-70">· {window}</span>}
      {reportUrl && (
        <a
          href={reportUrl}
          target="_blank"
          rel="noreferrer"
          className="opacity-70 hover:opacity-100"
          aria-label={`Open GDACS report for ${event.name}`}
        >
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </a>
      )}
    </li>
  );
}

function ExposureTable({ groups }: { groups: CommunityExposureGroup[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="text-left font-semibold px-3 py-2">Community</th>
            <th className="text-left font-semibold px-3 py-2">Region</th>
            <th className="text-right font-semibold px-3 py-2">Population</th>
            <th className="text-left font-semibold px-3 py-2">Hazard</th>
            <th className="text-left font-semibold px-3 py-2">Status</th>
            <th className="text-right font-semibold px-3 py-2 sr-only">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.map((group) => (
            <ExposureRow key={communityRowKey(group)} group={group} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExposureRow({ group }: { group: CommunityExposureGroup }) {
  const { community, hazards, status } = group;
  const p = community.properties;
  const style = getWbiTierStyle(p.wbi_tier);
  const [lng, lat] = community.geometry.coordinates;

  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (p.community_name) params.set("name", p.community_name);
  if (typeof p.community_id === "number") params.set("commId", String(p.community_id));

  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full border shrink-0"
            style={{ backgroundColor: style.fill, borderColor: style.stroke }}
            aria-hidden="true"
          />
          <span className="font-medium text-slate-800">{p.community_name || "Community"}</span>
          {typeof p.wbi_score === "number" && (
            <span className="text-[10px] text-slate-400">WBI {p.wbi_score}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-slate-600">{p.ntg_region || "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
        {typeof p.population_count === "number" ? p.population_count.toLocaleString() : "—"}
      </td>
      <td className="px-3 py-2">
        <HazardBadges hazards={hazards} />
      </td>
      <td className="px-3 py-2">
        <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold ${STATUS_BADGE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <Link
          to={`/map?${params.toString()}`}
          className="font-semibold text-indigo-600 hover:text-indigo-800"
        >
          View on Map
        </Link>
      </td>
    </tr>
  );
}

function HazardBadges({ hazards }: { hazards: CommunityExposure[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {hazards.map((hazard) => (
        <span
          key={`${hazard.event.kind}-${hazard.event.eventId}-${hazard.event.episodeId}`}
          className={`inline-block px-2 py-0.5 rounded-md border text-[10px] ${ALERT_BADGE_CLASS[hazard.event.alertLevel]}`}
          title={hazard.event.name}
        >
          {DISASTER_KIND_LABELS[hazard.event.kind]}
        </span>
      ))}
    </div>
  );
}

function communityRowKey(group: CommunityExposureGroup): number {
  return group.community.properties.community_id ?? group.community.properties.objectid;
}
