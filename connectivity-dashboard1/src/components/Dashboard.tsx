import { useEffect, useMemo } from "react";import Plot from "react-plotly.js";
import {
  ChartBarIcon,
  ArrowPathIcon,
  UsersIcon,
  MapPinIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useData } from "../context/dataContext";
import { getWbiTierStyle, WBI_TIERS } from "../utils/wbi";

export default function Dashboard() {
  const { communities, wbiCommunities, status, error, wbiStatus, wbiError, ensureWbi } =
    useData();

  useEffect(() => {
    ensureWbi();
  }, [ensureWbi]);

  const data = useMemo(() => wbiCommunities ?? communities, [wbiCommunities, communities]);
  const loading = status === "loading" || wbiStatus === "loading" || wbiStatus === "idle";
  const failure = status === "error" ? error : wbiStatus === "error" ? wbiError : null;

  const stats = useMemo(() => {
    const regionMap: Record<string, { count: number; pop: number }> = {};
    const typeMap: Record<string, number> = {};
    let totalPop = 0;

    data.forEach((c) => {
      const p = c.properties;
      const reg = p.ntg_region || "Unknown";
      const ctype = p.community_type || "Outstation";
      const pop = p.population_count || 0;

      totalPop += pop;
      if (!regionMap[reg]) regionMap[reg] = { count: 0, pop: 0 };
      regionMap[reg].count += 1;
      regionMap[reg].pop += pop;
      typeMap[ctype] = (typeMap[ctype] || 0) + 1;
    });

    const regions = Object.keys(regionMap).sort();
    const types = Object.keys(typeMap).sort();

    return {
      totalCommunities: data.length,
      totalPop,
      regions,
      regionCounts: regions.map((r) => regionMap[r].count),
      regionPops: regions.map((r) => regionMap[r].pop),
      types,
      typeCounts: types.map((t) => typeMap[t]),
    };
  }, [data]);

  const wbi = useMemo(() => {
    const scored = data.filter((c) => typeof c.properties.wbi_score === "number");
    const tierCounts = WBI_TIERS.map(
      (tier) => scored.filter((c) => c.properties.wbi_tier === tier).length
    );
    const avg = scored.length
      ? Math.round(scored.reduce((sum, c) => sum + (c.properties.wbi_score || 0), 0) / scored.length)
      : 0;
    const top = [...scored]
      .sort((a, b) => (b.properties.wbi_score || 0) - (a.properties.wbi_score || 0))
      .slice(0, 10);
    const scatter = scored.filter((c) => (c.properties.population_count || 0) > 0);

    return { scoredCount: scored.length, scores: scored.map((c) => c.properties.wbi_score), tierCounts, avg, top, scatter };
  }, [data]);

  const criticalCount = wbi.tierCounts[0];

  if (failure) {
    return (
      <div className="h-full flex flex-col bg-slate-50 p-6 text-slate-800">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl max-w-lg mx-auto mt-24 text-center">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="font-semibold">Unable to load analytics</p>
          <p className="text-xs mt-1 text-red-600">{failure}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto p-6 text-slate-800">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 my-0">Network &amp; Regional Analytics</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Demographic, regional and Warning Blackspot Index insights across Northern Territory remote locations
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500">Calculating territorial analytics…</p>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Communities"
              value={stats.totalCommunities.toLocaleString()}
              hint="Remote & regional NT sites"
              icon={<MapPinIcon className="h-5 w-5 text-indigo-500" />}
            />
            <StatCard
              label="Recorded Population"
              value={stats.totalPop.toLocaleString()}
              hint="ABS & Homelands reports"
              icon={<UsersIcon className="h-5 w-5 text-emerald-500" />}
            />
            <StatCard
              label="Regions Covered"
              value={stats.regions.length.toLocaleString()}
              hint="Territory administrative zones"
              icon={<ShieldExclamationIcon className="h-5 w-5 text-amber-500" />}
            />
            <StatCard
              label="Critical Blackspots"
              value={criticalCount.toLocaleString()}
              hint="WBI ≥ 75 (severe warning risk)"
              icon={<ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Communities by Northern Territory Region">
              <Plot
                data={[{ x: stats.regions, y: stats.regionCounts, type: "bar", marker: { color: "#4f46e5" } }]}
                layout={{
                  autosize: true,
                  margin: { l: 40, r: 20, t: 20, b: 80 },
                  xaxis: { tickangle: -25, tickfont: { size: 10 } },
                  yaxis: { title: { text: "Number of Communities" } },
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false }}
              />
            </ChartCard>

            <ChartCard title="Recorded Population by Region">
              <Plot
                data={[{ x: stats.regions, y: stats.regionPops, type: "bar", marker: { color: "#059669" } }]}
                layout={{
                  autosize: true,
                  margin: { l: 50, r: 20, t: 20, b: 80 },
                  xaxis: { tickangle: -25, tickfont: { size: 10 } },
                  yaxis: { title: { text: "Population" } },
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false }}
              />
            </ChartCard>
          </div>

          {/* Charts Row 2 — WBI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Warning Blackspot Index Distribution"
              subtitle={`${wbi.scoredCount} communities scored • territory average ${wbi.avg}/100`}
            >
              <Plot
                data={[
                  {
                    x: wbi.scores,
                    type: "histogram",
                    nbinsx: 20,
                    marker: { color: "#6366f1" },
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 40, r: 20, t: 20, b: 50 },
                  xaxis: { title: { text: "WBI score" } },
                  yaxis: { title: { text: "Communities" } },
                  bargap: 0.05,
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false }}
              />
            </ChartCard>

            <ChartCard title="Communities by WBI Risk Tier">
              <Plot
                data={[
                  {
                    labels: WBI_TIERS,
                    values: wbi.tierCounts,
                    type: "bar",
                    marker: { color: WBI_TIERS.map((t) => getWbiTierStyle(t).fill) },
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 40, r: 20, t: 20, b: 50 },
                  yaxis: { title: { text: "Communities" } },
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false }}
              />
            </ChartCard>
          </div>

          {/* Charts Row 3 — scatter + top list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="WBI vs Recorded Population"
              subtitle="Each point is a community with a recorded population"
            >
              <Plot
                data={[
                  {
                    x: wbi.scatter.map((c) => c.properties.population_count),
                    y: wbi.scatter.map((c) => c.properties.wbi_score),
                    text: wbi.scatter.map((c) => c.properties.community_name),
                    type: "scatter",
                    mode: "markers",
                    marker: { color: "#0ea5e9", size: 7, opacity: 0.7 },
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 40, r: 20, t: 20, b: 50 },
                  xaxis: { title: { text: "Population" } },
                  yaxis: { title: { text: "WBI score" } },
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false }}
              />
            </ChartCard>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Highest-Risk Communities</h2>
              <p className="text-[11px] text-slate-400 mb-3">Top 10 by Warning Blackspot Index</p>
              <ol className="space-y-1.5">
                {wbi.top.map((c, index) => {
                  const style = getWbiTierStyle(c.properties.wbi_tier);
                  return (
                    <li
                      key={c.properties.community_id || c.properties.objectid}
                      className="flex items-center justify-between text-xs gap-3"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-right text-slate-400 tabular-nums">{index + 1}.</span>
                        <span className="truncate font-medium text-slate-800">
                          {c.properties.community_name}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] border ${style.badge}`}>
                          {c.properties.wbi_score}
                        </span>
                        <span className="text-slate-400 hidden sm:inline">{c.properties.ntg_region}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-[11px] text-slate-400 mb-2">{subtitle}</p>}
      <div
        className="w-full h-80 flex items-center justify-center"
        role="img"
        aria-label={title}
      >
        {children}
      </div>
    </div>
  );
}
