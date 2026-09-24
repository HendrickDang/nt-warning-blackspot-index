import { useMemo, useState, useEffect } from "react";
import Plot from "react-plotly.js";
import { ChartBarIcon, ArrowPathIcon, UsersIcon, MapPinIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import type { CommunityFeature } from "../types";

export default function Dashboard() {
  const [communities, setCommunities] = useState<CommunityFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/communities.geojson")
      .then((r) => {
        if (!r.ok) return fetch("src/data/communities.geojson").then((res) => res.json());
        return r.json();
      })
      .then((data) => {
        if (data && data.features) setCommunities(data.features);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const regionMap: Record<string, { count: number; pop: number }> = {};
    const typeMap: Record<string, number> = {};
    let totalPop = 0;

    communities.forEach((c) => {
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
    const regionCounts = regions.map((r) => regionMap[r].count);
    const regionPops = regions.map((r) => regionMap[r].pop);

    const types = Object.keys(typeMap).sort();
    const typeCounts = types.map((t) => typeMap[t]);

    return {
      totalCommunities: communities.length,
      totalPop,
      regions,
      regionCounts,
      regionPops,
      types,
      typeCounts,
    };
  }, [communities]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto p-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 my-0">Network & Regional Analytics</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Demographic, regional, and connectivity insights across 792 Northern Territory remote locations
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500">Calculating territorial analytics...</p>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Communities</span>
                <MapPinIcon className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalCommunities}</p>
              <p className="text-[11px] text-slate-400 mt-1">Remote & regional NT sites</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Recorded Population</span>
                <UsersIcon className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalPop.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 mt-1">ABS & Homelands reports</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Regions Covered</span>
                <ShieldExclamationIcon className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.regions.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">Territory administrative zones</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Primary Outstations</span>
                <UsersIcon className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {stats.types.includes("Family Outstation")
                  ? stats.typeCounts[stats.types.indexOf("Family Outstation")]
                  : 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Homelands & outstation clusters</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Communities by Northern Territory Region</h2>
              <div className="w-full h-80 flex items-center justify-center">
                <Plot
                  data={[
                    {
                      x: stats.regions,
                      y: stats.regionCounts,
                      type: "bar",
                      marker: { color: "#4f46e5" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 40, r: 20, t: 20, b: 80 },
                    xaxis: { tickangle: -25, tickfont: { size: 10 } },
                    yaxis: { title: "Number of Communities" },
                  }}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Recorded Population by Region</h2>
              <div className="w-full h-80 flex items-center justify-center">
                <Plot
                  data={[
                    {
                      x: stats.regions,
                      y: stats.regionPops,
                      type: "bar",
                      marker: { color: "#059669" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 50, r: 20, t: 20, b: 80 },
                    xaxis: { tickangle: -25, tickfont: { size: 10 } },
                    yaxis: { title: "Population" },
                  }}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Community Classifications Distribution</h2>
            <div className="w-full h-80 flex items-center justify-center">
              <Plot
                data={[
                  {
                    labels: stats.types,
                    values: stats.typeCounts,
                    type: "pie",
                    hole: 0.4,
                    marker: {
                      colors: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#64748b"],
                    },
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 20, r: 20, t: 20, b: 20 },
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
