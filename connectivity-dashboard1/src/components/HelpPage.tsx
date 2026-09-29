import {
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  MapIcon,
  CalculatorIcon,
} from "@heroicons/react/24/outline";

export default function HelpPage() {
  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto p-6 text-slate-800">
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <QuestionMarkCircleIcon className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900 my-0">Documentation & Methodology</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          NT Warning Blackspot Index (WBI) & Remote Connectivity Operations Guide
        </p>
      </div>

      <div className="max-w-4xl space-y-6 mt-6">
        {/* Project Background */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
            Project Background
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mt-2">
            This dashboard was developed for the <strong>CDU IT Code Fair 2026 | Data Innovation Challenge</strong> under
            the theme <em>Remote Connectivity</em>. It evaluates bushfire hazard exposure and emergency warning
            reachability across remote communities and homelands throughout the Northern Territory of Australia.
          </p>
        </div>

        {/* WBI Calculation Methodology */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalculatorIcon className="h-5 w-5 text-indigo-600" />
            Warning Blackspot Index (WBI) Framework
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mt-2">
            The <strong>Warning Blackspot Index (WBI)</strong> asks one question of each of the 765 communities in the
            Bushfires NT risk dataset: if a fire threatens this community tomorrow, can anyone tell them? It combines
            three components, each scaled 0 to 1:
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-3 text-center">WBI = 100 × (H × U × E)^(1/3)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-indigo-900 block font-semibold">H: Hazard</strong>
              The published Bushfires NT risk rating: High = 1.0, Moderate = 0.6, Low = 0.3.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-indigo-900 block font-semibold">U: Unreachability</strong>
              Average of three terms: outside predicted coverage (a registered tower within 5 km counts as covered),
              distance to the nearest tower (worst at 50 km), and how few of the three carriers have a tower within
              35 km.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-indigo-900 block font-semibold">E: Exposure</strong>
              Population on a log scale so small outstations stay visible. Where no population is recorded, the
              median for that community type is used and flagged.
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mt-3">
            A geometric mean means one strong component cannot hide another: a well-connected community is not a
            warning blackspot however high its fire risk. Bands: Critical 60+, High 50 to 59, Moderate 35 to 49,
            Low under 35. Scores are computed by <code>Bushfire_analysis/wbi_index.py</code>, which also tests how
            stable the ranking is under alternative choices.
          </p>
        </div>

        {/* Data Sources & Provenance */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
            Data Sources & Provenance
          </h2>
          <div className="mt-3 space-y-2.5 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">Com_BushTel_Profile_CMC_2024 (792 Communities)</strong>
              Custodians: BushTel NT / DIPL. Contains official geospatial coordinates, community names, councils, languages, and population records.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">Community_Bushfire_Risk.csv</strong>
              Custodians: Bushfires NT / NT Fire and Emergency Services (NTFES). Provides bushfire hazard risk ratings, fire plan status, firebreaks, and fuel reduction status.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">Mobile Coverage & Tower Sites</strong>
              Predicted mobile coverage polygons and mobile tower site locations by carrier (RFNSA site IDs).
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">NAFI / FireNorth — Active Fire Hotspots & Burnt Areas (WMS)</strong>
              Custodians: Darwin Centre for Bushfire Research (CDU) / Bushfires NT. Live satellite thermal hotspot
              detections and current-month burnt-area mapping for northern Australia, streamed from the FireNorth Web
              Map Service (<code>firenorth.org.au</code>).
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">Northern Territory Administrative Boundary</strong>
              Custodian: NT Land Information System (LIS). Official geospatial boundary polygon of the Northern Territory.
            </div>
          </div>
        </div>

        {/* How to Use */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-indigo-600" />
            How to Use the Platform
          </h2>
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-slate-600 leading-relaxed">
            <li><strong>Live Map:</strong> Toggle mobile coverage contours, remote community markers, cell towers, and the NT boundary. Community markers are coloured by WBI tier — click any marker to view its score, pillar breakdown and hazard context.</li>
            <li><strong>Bushfire (Live):</strong> Overlay live satellite fire hotspots detected in the last 24 hours and current-month burnt areas from the NAFI / FireNorth service to see active bushfire activity against community risk.</li>
            <li><strong>Communities Directory:</strong> Search and filter through communities by region, type, council, population, or WBI risk tier. Filters are reflected in the URL, so any view can be shared or bookmarked. Click any entry for its full breakdown or to fly directly to it on the map.</li>
            <li><strong>Analytics:</strong> Review regional vulnerability trends, the WBI distribution, risk-tier counts, and the highest-risk communities across the Northern Territory.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
