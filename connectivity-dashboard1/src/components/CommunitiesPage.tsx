import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

// Import the updated WBI calculation utilities
import {
  buildCoverageIndex,
  extractNTTowerSites,
  createBushfireRiskMap,
  computeCommunityWBI,
} from "../utils/wbiCalculators";

export interface CommunityFeature {
  type: string;
  properties: {
    objectid: number;
    community_id: number;
    bushtel_url: string;
    community_name: string;
    community_aliases: string;
    community_type: string;
    main_language: string;
    local_govt_council: string;
    ward: string;
    land_council: string;
    electorate: string;
    ntg_region: string;
    population_source: string;
    population_count: number | null;
    longitude: number;
    latitude: number;
    RATING?: string;
    // WBI Enriched Fields
    wbi_score?: number;
    wbi_tier?: "Critical" | "High" | "Moderate" | "Low";
    hazard_risk?: "Extreme" | "High" | "Moderate" | "Low";
    coverage_status?: string;
    has_coverage?: boolean;
    nearby_carriers?: number;
    carrier_names?: string;
    nearest_tower_km?: number;
    nearest_tower_carriers?: string;
    nearest_tower_4g?: boolean;
    nearest_tower_5g?: boolean;
    connectivity_gap_score?: number;
    hazard_score?: number;
    proximity_score?: number;
    digital_exclusion_score?: number;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<CommunityFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedCouncil, setSelectedCouncil] = useState("ALL");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [popFilter, setPopFilter] = useState<"ALL" | "RECORDED" | "GT50" | "GT100">("ALL");
  const [sortBy, setSortBy] = useState<
    "wbi-desc" | "wbi-asc" | "name-asc" | "name-desc" | "pop-desc" | "pop-asc" | "region"
  >("wbi-desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Selected for detail modal
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityFeature | null>(null);

  // Helper to parse simple CSV text into objects
  const parseCSV = (csvText: string) => {
    const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      return row;
    });
  };

  // Load and compute WBI pipeline client-side
  useEffect(() => {
    setLoading(true);

    async function loadDataAndComputeWBI() {
      try {
        const [commRes, covRes, towerRes, riskRes] = await Promise.all([
          fetch("/data/communities.geojson").catch(() => fetch("src/data/communities.geojson")),
          fetch("/data/coverage.geojson").catch(() => fetch("src/data/coverage.geojson")),
          fetch("/data/towers.geojson").catch(() => fetch("src/data/towers.geojson")),
          fetch("/data/Community_Bushfire_Risk.csv").catch(() => fetch("src/data/Community_Bushfire_Risk.csv")),
        ]);

        if (!commRes.ok) throw new Error("Failed to load communities dataset");

        const commData = await commRes.json();
        const covData = covRes.ok ? await covRes.json() : null;
        const towerData = towerRes.ok ? await towerRes.json() : null;

        let bushfireRiskMap: Map<string, string> | undefined;
        if (riskRes.ok) {
          const csvText = await riskRes.text();
          const parsedRecords = parseCSV(csvText);
          bushfireRiskMap = createBushfireRiskMap(parsedRecords as any);
        }

        // Process spatial indexes if extra datasets exist
        const covRings = covData ? buildCoverageIndex(covData) : [];
        const towerSites = towerData ? extractNTTowerSites(towerData) : [];

        // Enrich communities with WBI scores using CSV risk ratings
        const enrichedFeatures = commData.features.map((feature: CommunityFeature) => ({
          ...feature,
          properties: computeCommunityWBI(feature, towerSites, covRings, bushfireRiskMap),
        }));

        setCommunities(enrichedFeatures);
        setLoading(false);
      } catch (err: any) {
        console.error("Error running WBI pipeline:", err);
        setError(err.message || "Failed to load communities pipeline");
        setLoading(false);
      }
    }

    loadDataAndComputeWBI();
  }, []);

  // Filter options derived from data
  const regions = useMemo(() => {
    const set = new Set<string>();
    communities.forEach((c) => {
      if (c.properties.ntg_region) set.add(c.properties.ntg_region);
    });
    return Array.from(set).sort();
  }, [communities]);

  const communityTypes = useMemo(() => {
    const set = new Set<string>();
    communities.forEach((c) => {
      if (c.properties.community_type) set.add(c.properties.community_type);
    });
    return Array.from(set).sort();
  }, [communities]);

  const councils = useMemo(() => {
    const set = new Set<string>();
    communities.forEach((c) => {
      if (c.properties.local_govt_council) set.add(c.properties.local_govt_council);
    });
    return Array.from(set).sort();
  }, [communities]);

  // Filter & Sort computation
  const filteredCommunities = useMemo(() => {
    let result = communities.filter((item) => {
      const p = item.properties;

      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.community_name?.toLowerCase().includes(query);
        const matchesAlias = p.community_aliases?.toLowerCase().includes(query);
        const matchesLang = p.main_language?.toLowerCase().includes(query);
        const matchesCouncil = p.local_govt_council?.toLowerCase().includes(query);
        if (!matchesName && !matchesAlias && !matchesLang && !matchesCouncil) {
          return false;
        }
      }

      // Region
      if (selectedRegion !== "ALL" && p.ntg_region !== selectedRegion) {
        return false;
      }

      // Type
      if (selectedType !== "ALL" && p.community_type !== selectedType) {
        return false;
      }

      // Council
      if (selectedCouncil !== "ALL" && p.local_govt_council !== selectedCouncil) {
        return false;
      }

      // WBI Tier Filter
      if (selectedTier !== "ALL" && p.wbi_tier !== selectedTier) {
        return false;
      }

      // Population Filter
      if (popFilter === "RECORDED" && (p.population_count === null || p.population_count === undefined)) {
        return false;
      }
      if (popFilter === "GT50" && (p.population_count === null || p.population_count < 50)) {
        return false;
      }
      if (popFilter === "GT100" && (p.population_count === null || p.population_count < 100)) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      const pa = a.properties;
      const pb = b.properties;

      if (sortBy === "wbi-desc") {
        return (pb.wbi_score || 0) - (pa.wbi_score || 0);
      }
      if (sortBy === "wbi-asc") {
        return (pa.wbi_score || 0) - (pb.wbi_score || 0);
      }
      if (sortBy === "name-asc") {
        return (pa.community_name || "").localeCompare(pb.community_name || "");
      }
      if (sortBy === "name-desc") {
        return (pb.community_name || "").localeCompare(pa.community_name || "");
      }
      if (sortBy === "pop-desc") {
        return (pb.population_count || 0) - (pa.population_count || 0);
      }
      if (sortBy === "pop-asc") {
        return (pa.population_count || 0) - (pb.population_count || 0);
      }
      if (sortBy === "region") {
        return (pa.ntg_region || "").localeCompare(pb.ntg_region || "");
      }
      return 0;
    });

    return result;
  }, [communities, searchTerm, selectedRegion, selectedType, selectedCouncil, selectedTier, popFilter, sortBy]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRegion, selectedType, selectedCouncil, selectedTier, popFilter, sortBy]);

  // Pagination slice
  const totalPages = Math.ceil(filteredCommunities.length / pageSize) || 1;
  const paginatedCommunities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCommunities.slice(start, start + pageSize);
  }, [filteredCommunities, currentPage, pageSize]);

  // Summary Metrics
  const totalPopulation = useMemo(() => {
    return filteredCommunities.reduce((sum, c) => sum + (c.properties.population_count || 0), 0);
  }, [filteredCommunities]);

  const criticalCount = useMemo(() => {
    return filteredCommunities.filter((c) => c.properties.wbi_tier === "Critical").length;
  }, [filteredCommunities]);

  const handleLocateOnMap = (community: CommunityFeature) => {
    const { community_id, longitude, latitude, community_name } = community.properties;
    navigate(`/map?commId=${community_id}&lat=${latitude}&lng=${longitude}&name=${encodeURIComponent(community_name)}`);
  };

  const getWbiBadgeClass = (tier?: string) => {
    switch (tier) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-300 font-bold";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-300 font-bold";
      case "Moderate":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold";
    }
  };

  const getTypeBadgeClass = (type: string) => {
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
  };

  const getRegionBadgeClass = (region: string) => {
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
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BuildingLibraryIcon className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight my-0">
                Northern Territory Communities & WBI Vulnerability Index
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Live multi-dimensional Warning Blackspot Index (WBI) calculated using CSV bushfire hazard ratings
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
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition ${
                  viewMode === "table" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table View"
              >
                <TableCellsIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition ${
                  viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, alias, language, council..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* WBI Tier Dropdown */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          >
            <option value="ALL">All WBI Tiers</option>
            <option value="Critical">🔴 Critical (≥75)</option>
            <option value="High">🟠 High (60-74)</option>
            <option value="Moderate">🟡 Moderate (40-59)</option>
            <option value="Low">🟢 Low (&lt;40)</option>
          </select>

          {/* Region Dropdown */}
          <div className="flex items-center gap-1.5">
            <FunnelIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
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

          {/* Type Dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Types ({communityTypes.length})</option>
            {communityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Council Dropdown */}
          <select
            value={selectedCouncil}
            onChange={(e) => setSelectedCouncil(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[160px]"
          >
            <option value="ALL">All Councils</option>
            {councils.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Population Filter */}
          <select
            value={popFilter}
            onChange={(e) => setPopFilter(e.target.value as any)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Population: Any</option>
            <option value="RECORDED">Population Recorded</option>
            <option value="GT50">Population &gt; 50</option>
            <option value="GT100">Population &gt; 100</option>
          </select>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="wbi-desc">WBI Risk (High &rarr; Low)</option>
              <option value="wbi-asc">WBI Risk (Low &rarr; High)</option>
              <option value="name-asc">Name (A &rarr; Z)</option>
              <option value="name-desc">Name (Z &rarr; A)</option>
              <option value="pop-desc">Population (High &rarr; Low)</option>
              <option value="pop-asc">Population (Low &rarr; High)</option>
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
            <p className="text-sm text-slate-500 font-medium">Computing Warning Blackspot Index for NT Communities...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center max-w-lg mx-auto mt-12">
            <p className="font-semibold">Unable to calculate WBI pipeline</p>
            <p className="text-xs mt-1 text-red-600">{error}</p>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 max-w-lg mx-auto mt-8">
            <BuildingLibraryIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No communities match your filter criteria</h3>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or adjusting the filters.</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedRegion("ALL");
                setSelectedType("ALL");
                setSelectedCouncil("ALL");
                setSelectedTier("ALL");
                setPopFilter("ALL");
              }}
              className="mt-4 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
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
                    return (
                      <tr
                        key={p.community_id || p.objectid}
                        className="hover:bg-indigo-50/50 transition cursor-pointer"
                        onClick={() => setSelectedCommunity(c)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-xs border ${getWbiBadgeClass(
                                p.wbi_tier
                              )}`}
                            >
                              {p.wbi_score} ({p.wbi_tier})
                            </span>
                          </div>
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
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(
                              p.community_type
                            )}`}
                          >
                            {p.community_type || "Outstation"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border ${getRegionBadgeClass(
                              p.ntg_region
                            )}`}
                          >
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
                              onClick={() => handleLocateOnMap(c)}
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-md text-xs font-medium transition flex items-center gap-1"
                              title="Locate on Leaflet Map"
                            >
                              <MapPinIcon className="h-3.5 w-3.5" />
                              <span>Map</span>
                            </button>
                            {p.bushtel_url && (
                              <a
                                href={p.bushtel_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition"
                                title="Open BushTel Profile"
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
          /* Card Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedCommunities.map((c) => {
              const p = c.properties;
              return (
                <div
                  key={p.community_id || p.objectid}
                  onClick={() => setSelectedCommunity(c)}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md hover:border-indigo-300 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs border ${getWbiBadgeClass(p.wbi_tier)}`}>
                        WBI: {p.wbi_score}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(
                          p.community_type
                        )}`}
                      >
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
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getRegionBadgeClass(
                            p.ntg_region
                          )}`}
                        >
                          {p.ntg_region || "NT"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleLocateOnMap(c)}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-md text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <MapPinIcon className="h-3.5 w-3.5" />
                      <span>View on Map</span>
                    </button>

                    {p.bushtel_url && (
                      <a
                        href={p.bushtel_url}
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
        {!loading && filteredCommunities.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-xs">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * pageSize, filteredCommunities.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{filteredCommunities.length}</span> communities
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                  }
                  if (pageNum > totalPages) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCommunity(null)}
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
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(
                      selectedCommunity.properties.community_type
                    )}`}
                  >
                    {selectedCommunity.properties.community_type || "Outstation"}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${getWbiBadgeClass(
                      selectedCommunity.properties.wbi_tier
                    )}`}
                  >
                    WBI Tier: {selectedCommunity.properties.wbi_tier}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1 mb-0">
                  {selectedCommunity.properties.community_name}
                </h2>
              </div>
            </div>

            {/* WBI Pillar Breakdown Grid */}
            <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Warning Blackspot Index (WBI)
                </span>
                <span className="text-lg font-bold text-amber-400">{selectedCommunity.properties.wbi_score} / 100</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Connectivity Gap:</span>
                  <span className="font-semibold text-white">{selectedCommunity.properties.connectivity_gap_score} / 100</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hazard Exposure:</span>
                  <span className="font-semibold text-white">{selectedCommunity.properties.hazard_score} / 100</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tower Proximity:</span>
                  <span className="font-semibold text-white">{selectedCommunity.properties.proximity_score} / 100</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Digital Exclusion:</span>
                  <span className="font-semibold text-white">{selectedCommunity.properties.digital_exclusion_score} / 100</span>
                </div>
              </div>
            </div>

            {/* Standard Community Specs */}
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
              {selectedCommunity.properties.bushtel_url && (
                <a
                  href={selectedCommunity.properties.bushtel_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>BushTel Profile</span>
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => {
                  handleLocateOnMap(selectedCommunity);
                  setSelectedCommunity(null);
                }}
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