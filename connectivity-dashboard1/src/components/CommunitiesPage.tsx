import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  UsersIcon,
  BuildingLibraryIcon,
  GlobeAmericasIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import type { CommunityFeature } from "../types";
import { useData } from "../context/dataContext";
import { getWbiTierStyle } from "../utils/wbi";
import { safeUrl } from "../utils/html";

type SortKey =
  | "wbi-desc"
  | "wbi-asc"
  | "name-asc"
  | "name-desc"
  | "pop-desc"
  | "pop-asc"
  | "region";

type PopFilter = "ALL" | "RECORDED" | "GT50" | "GT100";

const PAGE_SIZE = 20;

const SORT_KEYS: SortKey[] = [
  "wbi-desc",
  "wbi-asc",
  "name-asc",
  "name-desc",
  "pop-desc",
  "pop-asc",
  "region",
];
const POP_FILTERS: PopFilter[] = ["ALL", "RECORDED", "GT50", "GT100"];

function getTypeBadgeClass(type: string) {
  switch (type) {
    case "Major":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Town":
    case "City":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Village":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Town Camp":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Family Outstation":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getRegionBadgeClass(region: string) {
  switch (region) {
    case "CENTRAL AUSTRALIA":
      return "bg-red-50 text-red-700 border-red-200";
    case "TOP END":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "EAST ARNHEM":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "BIG RIVERS":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "BARKLY":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { wbiCommunities, wbiStatus, wbiError, status, error, ensureWbi } = useData();

  useEffect(() => {
    ensureWbi();
  }, [ensureWbi]);

  const communities = useMemo(() => wbiCommunities ?? [], [wbiCommunities]);
  const loading = status === "loading" || wbiStatus === "loading" || wbiStatus === "idle";
  const failure = status === "error" ? error : wbiStatus === "error" ? wbiError : null;

  // --- URL-backed controls -------------------------------------------------
  const searchTerm = searchParams.get("q") ?? "";
  const selectedRegion = searchParams.get("region") ?? "ALL";
  const selectedType = searchParams.get("type") ?? "ALL";
  const selectedCouncil = searchParams.get("council") ?? "ALL";
  const selectedTier = searchParams.get("tier") ?? "ALL";
  const popFilterRaw = searchParams.get("pop") ?? "ALL";
  const popFilter: PopFilter = POP_FILTERS.includes(popFilterRaw as PopFilter)
    ? (popFilterRaw as PopFilter)
    : "ALL";
  const sortRaw = searchParams.get("sort") ?? "";
  const sortBy: SortKey = SORT_KEYS.includes(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : "wbi-desc";
  const viewMode = searchParams.get("view") === "grid" ? "grid" : "table";
  const pageRaw = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const currentPage = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const updateParams = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === "" || value === "ALL") next.delete(key);
            else next.set(key, value);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        ["q", "region", "type", "council", "tier", "pop", "sort", "page", "view"].forEach((k) =>
          next.delete(k)
        );
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  // Filter options derived from data
  const regions = useMemo(
    () => uniqueSorted(communities.map((c) => c.properties.ntg_region)),
    [communities]
  );
  const communityTypes = useMemo(
    () => uniqueSorted(communities.map((c) => c.properties.community_type)),
    [communities]
  );
  const councils = useMemo(
    () => uniqueSorted(communities.map((c) => c.properties.local_govt_council)),
    [communities]
  );

  const filteredCommunities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const result = communities.filter((item) => {
      const p = item.properties;

      if (query) {
        const matches =
          p.community_name?.toLowerCase().includes(query) ||
          p.community_aliases?.toLowerCase().includes(query) ||
          p.main_language?.toLowerCase().includes(query) ||
          p.local_govt_council?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (selectedRegion !== "ALL" && p.ntg_region !== selectedRegion) return false;
      if (selectedType !== "ALL" && p.community_type !== selectedType) return false;
      if (selectedCouncil !== "ALL" && p.local_govt_council !== selectedCouncil) return false;
      if (selectedTier !== "ALL" && p.wbi_tier !== selectedTier) return false;
      if (popFilter === "RECORDED" && (p.population_count ?? null) === null) return false;
      if (popFilter === "GT50" && (p.population_count ?? 0) < 50) return false;
      if (popFilter === "GT100" && (p.population_count ?? 0) < 100) return false;
      return true;
    });

    result.sort((a, b) => {
      const pa = a.properties;
      const pb = b.properties;
      switch (sortBy) {
        case "wbi-desc":
          return (pb.wbi_score || 0) - (pa.wbi_score || 0);
        case "wbi-asc":
          return (pa.wbi_score || 0) - (pb.wbi_score || 0);
        case "name-asc":
          return (pa.community_name || "").localeCompare(pb.community_name || "");
        case "name-desc":
          return (pb.community_name || "").localeCompare(pa.community_name || "");
        case "pop-desc":
          return (pb.population_count || 0) - (pa.population_count || 0);
        case "pop-asc":
          return (pa.population_count || 0) - (pb.population_count || 0);
        case "region":
          return (pa.ntg_region || "").localeCompare(pb.ntg_region || "");
        default:
          return 0;
      }
    });

    return result;
  }, [
    communities,
    searchTerm,
    selectedRegion,
    selectedType,
    selectedCouncil,
    selectedTier,
    popFilter,
    sortBy,
  ]);

  const totalPages = Math.ceil(filteredCommunities.length / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCommunities = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredCommunities.slice(start, start + PAGE_SIZE);
  }, [filteredCommunities, safePage]);

  const totalPopulation = useMemo(
    () => filteredCommunities.reduce((sum, c) => sum + (c.properties.population_count || 0), 0),
    [filteredCommunities]
  );
  const criticalCount = useMemo(
    () => filteredCommunities.filter((c) => c.properties.wbi_tier === "Critical").length,
    [filteredCommunities]
  );

  // --- Detail modal --------------------------------------------------------
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityFeature | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleLocateOnMap = useCallback(
    (community: CommunityFeature) => {
      const { community_id, longitude, latitude, community_name } = community.properties;
      const params = new URLSearchParams({
        commId: String(community_id),
        lat: String(latitude),
        lng: String(longitude),
        name: community_name,
      });
      // Preserve the current map layer visibility when jumping to the map.
      const layersParam = searchParams.get("layers");
      if (layersParam !== null) params.set("layers", layersParam);
      navigate(`/map?${params.toString()}`);
    },
    [navigate, searchParams]
  );

  useEffect(() => {
    if (!selectedCommunity) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCommunity(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [selectedCommunity, setSelectedCommunity]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BuildingLibraryIcon className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight my-0">
                Northern Territory Communities &amp; WBI Vulnerability Index
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Live multi-dimensional Warning Blackspot Index (WBI) using official bushfire hazard ratings
            </p>
          </div>

          {/* Quick Stat Pill Cards */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
              <div className="text-xs">
                <span className="text-red-600 font-medium">Critical Risk: </span>
                <span className="font-bold text-red-900">{criticalCount}</span>
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <GlobeAmericasIcon className="h-4 w-4 text-indigo-500" />
              <div className="text-xs">
                <span className="text-slate-500">Communities: </span>
                <span className="font-bold text-slate-800">
                  {filteredCommunities.length}
                  {filteredCommunities.length !== communities.length && ` / ${communities.length}`}
                </span>
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-emerald-600" />
              <div className="text-xs">
                <span className="text-slate-500">Population: </span>
                <span className="font-bold text-slate-800">{totalPopulation.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center border border-slate-200 bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => updateParams({ view: null }, false)}
                aria-pressed={viewMode === "table"}
                aria-label="Table view"
                className={`p-1.5 rounded-md transition ${
                  viewMode === "table" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <TableCellsIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => updateParams({ view: "grid" }, false)}
                aria-pressed={viewMode === "grid"}
                aria-label="Card grid view"
                className={`p-1.5 rounded-md transition ${
                  viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => updateParams({ q: e.target.value })}
              placeholder="Search name, alias, language, council..."
              aria-label="Search communities"
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => updateParams({ q: null })}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={selectedTier}
            onChange={(e) => updateParams({ tier: e.target.value })}
            aria-label="Filter by WBI tier"
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          >
            <option value="ALL">All WBI Tiers</option>
            <option value="Critical">🔴 Critical (≥75)</option>
            <option value="High">🟠 High (60-74)</option>
            <option value="Moderate">🟡 Moderate (40-59)</option>
            <option value="Low">🟢 Low (&lt;40)</option>
          </select>

          <div className="flex items-center gap-1.5">
            <FunnelIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedRegion}
              onChange={(e) => updateParams({ region: e.target.value })}
              aria-label="Filter by region"
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Regions ({regions.length})</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedType}
            onChange={(e) => updateParams({ type: e.target.value })}
            aria-label="Filter by community type"
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Types ({communityTypes.length})</option>
            {communityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedCouncil}
            onChange={(e) => updateParams({ council: e.target.value })}
            aria-label="Filter by council"
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[160px]"
          >
            <option value="ALL">All Councils</option>
            {councils.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={popFilter}
            onChange={(e) => updateParams({ pop: e.target.value })}
            aria-label="Filter by population"
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Population: Any</option>
            <option value="RECORDED">Population Recorded</option>
            <option value="GT50">Population &gt; 50</option>
            <option value="GT100">Population &gt; 100</option>
          </select>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => updateParams({ sort: e.target.value })}
              aria-label="Sort communities"
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="wbi-desc">WBI Risk (High → Low)</option>
              <option value="wbi-asc">WBI Risk (Low → High)</option>
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="pop-desc">Population (High → Low)</option>
              <option value="pop-asc">Population (Low → High)</option>
              <option value="region">Region</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">
              Computing Warning Blackspot Index for NT Communities…
            </p>
          </div>
        ) : failure ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center max-w-lg mx-auto mt-12">
            <p className="font-semibold">Unable to calculate the WBI pipeline</p>
            <p className="text-xs mt-1 text-red-600">{failure}</p>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 max-w-lg mx-auto mt-8">
            <BuildingLibraryIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No communities match your filter criteria</h3>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or adjusting the filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "table" ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">WBI Score</th>
                    <th className="py-3 px-4">Community Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">NT Region</th>
                    <th className="py-3 px-4">Coverage Status</th>
                    <th className="py-3 px-4">Nearest Tower</th>
                    <th className="py-3 px-4">Population</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {paginatedCommunities.map((c) => {
                    const p = c.properties;
                    const style = getWbiTierStyle(p.wbi_tier);
                    return (
                      <tr
                        key={p.community_id || p.objectid}
                        tabIndex={0}
                        onClick={() => setSelectedCommunity(c)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCommunity(c);
                          }
                        }}
                        className="hover:bg-indigo-50/50 focus:bg-indigo-50/70 focus:outline-none transition cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs border ${style.badge}`}>
                            {p.wbi_score} ({p.wbi_tier})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex flex-col">
                            <span className="text-sm text-indigo-950 font-bold">{p.community_name}</span>
                            {p.community_aliases && p.community_aliases !== "No aliases recorded with NTG DIPL" && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={p.community_aliases}>
                                aka {p.community_aliases}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(p.community_type)}`}>
                            {p.community_type || "Outstation"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border ${getRegionBadgeClass(p.ntg_region)}`}>
                            {p.ntg_region || "NT"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              p.has_coverage ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                            }`}
                          >
                            <SignalIcon className="h-3 w-3" />
                            {p.coverage_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {p.nearest_tower_km !== undefined ? `${p.nearest_tower_km} km` : "N/A"}
                        </td>
                        <td className="py-3 px-4">
                          {p.population_count !== null ? (
                            <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {p.population_count.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unrecorded</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleLocateOnMap(c)}
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-md text-xs font-medium transition flex items-center gap-1"
                              title="Locate on map"
                            >
                              <MapPinIcon className="h-3.5 w-3.5" />
                              <span>Map</span>
                            </button>
                            {safeUrl(p.bushtel_url) && (
                              <a
                                href={safeUrl(p.bushtel_url)!}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition"
                                title="Open BushTel profile"
                              >
                                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedCommunities.map((c) => {
              const p = c.properties;
              const style = getWbiTierStyle(p.wbi_tier);
              return (
                <div
                  key={p.community_id || p.objectid}
                  tabIndex={0}
                  role="button"
                  onClick={() => setSelectedCommunity(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCommunity(c);
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md hover:border-indigo-300 focus:border-indigo-400 focus:outline-none transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs border ${style.badge}`}>WBI: {p.wbi_score}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(p.community_type)}`}>
                        {p.community_type || "Outstation"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-1">{p.community_name}</h3>
                    {p.community_aliases && p.community_aliases !== "No aliases recorded with NTG DIPL" && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">aka {p.community_aliases}</p>
                    )}

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Coverage:</span>
                        <span className={`font-semibold ${p.has_coverage ? "text-emerald-600" : "text-red-600"}`}>
                          {p.coverage_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Nearest Tower:</span>
                        <span className="font-medium text-slate-800">{p.nearest_tower_km} km</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Region:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getRegionBadgeClass(p.ntg_region)}`}>
                          {p.ntg_region || "NT"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleLocateOnMap(c)}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-md text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <MapPinIcon className="h-3.5 w-3.5" />
                      <span>View on Map</span>
                    </button>

                    {safeUrl(p.bushtel_url) && (
                      <a
                        href={safeUrl(p.bushtel_url)!}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition"
                      >
                        <span>BushTel</span>
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !failure && filteredCommunities.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-xs">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{(safePage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(safePage * PAGE_SIZE, filteredCommunities.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{filteredCommunities.length}</span> communities
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => updateParams({ page: String(Math.max(1, safePage - 1)) }, false)}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (safePage > 3) pageNum = safePage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                }
                return (
                  <button
                    type="button"
                    key={pageNum}
                    onClick={() => updateParams({ page: String(pageNum) }, false)}
                    aria-current={safePage === pageNum ? "page" : undefined}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                      safePage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => updateParams({ page: String(Math.min(totalPages, safePage + 1)) }, false)}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Community Detail Modal with WBI Pillar Breakdown */}
      {selectedCommunity && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCommunity(null)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedCommunity.properties.community_name} details`}
            tabIndex={-1}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedCommunity(null)}
              aria-label="Close details"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                <BuildingLibraryIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(selectedCommunity.properties.community_type)}`}>
                    {selectedCommunity.properties.community_type || "Outstation"}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${getWbiTierStyle(selectedCommunity.properties.wbi_tier).badge}`}>
                    WBI Tier: {selectedCommunity.properties.wbi_tier}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1 mb-0">
                  {selectedCommunity.properties.community_name}
                </h2>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Warning Blackspot Index (WBI)
                </span>
                <span className="text-lg font-bold text-amber-400">
                  {selectedCommunity.properties.wbi_score} / 100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Pillar label="Connectivity Gap" value={selectedCommunity.properties.connectivity_gap_score} />
                <Pillar label="Hazard Exposure" value={selectedCommunity.properties.hazard_score} />
                <Pillar label="Tower Proximity" value={selectedCommunity.properties.proximity_score} />
                <Pillar label="Digital Exclusion" value={selectedCommunity.properties.digital_exclusion_score} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block">Coverage Status</span>
                <span className={`font-semibold ${selectedCommunity.properties.has_coverage ? "text-emerald-700" : "text-red-700"}`}>
                  {selectedCommunity.properties.coverage_status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Nearest ACMA Tower</span>
                <span className="font-semibold text-slate-800">{selectedCommunity.properties.nearest_tower_km} km</span>
              </div>
              <div>
                <span className="text-slate-400 block">Region</span>
                <span className="font-semibold text-slate-800">{selectedCommunity.properties.ntg_region || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Population</span>
                <span className="font-semibold text-slate-800">
                  {selectedCommunity.properties.population_count !== null
                    ? selectedCommunity.properties.population_count.toLocaleString()
                    : "Not recorded"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {safeUrl(selectedCommunity.properties.bushtel_url) && (
                <a
                  href={safeUrl(selectedCommunity.properties.bushtel_url)!}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>BushTel Profile</span>
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => handleLocateOnMap(selectedCommunity)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <MapPinIcon className="h-4 w-4" />
                <span>Fly to on Map</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function uniqueSorted(values: Array<string | undefined | null>): string[] {
  const set = new Set<string>();
  values.forEach((value) => {
    if (value) set.add(value);
  });
  return Array.from(set).sort();
}

function Pillar({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <span className="text-slate-400 block">{label}:</span>
      <span className="font-semibold text-white">{value ?? "—"} / 100</span>
    </div>
  );
}
