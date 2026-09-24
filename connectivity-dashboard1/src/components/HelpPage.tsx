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
            The composite <strong>Warning Blackspot Index (WBI)</strong> evaluates community risk on a scale of 0 to 100 using four weighted pillars:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-indigo-900 block font-semibold">1. Connectivity Gap (35%)</strong>
              Evaluates cellular network coverage contours (Telstra/Optus) and multi-carrier redundancy in the immediate area.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-indigo-900 block font-semibold">2. Natural Hazard Exposure (25%)</strong>
              Mapped directly from the official <code>Community_Bushfire_Risk.csv</code> rating (High = 90, Moderate = 65, Low = 30).
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-indigo-900 block font-semibold">3. Infrastructure Proximity (20%)</strong>
              Measures geographical distance to the nearest active communications tower site using Haversine calculation.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-indigo-900 block font-semibold">4. Digital Exclusion (20%)</strong>
              Accounts for community scale (outstation vs major town) and primary spoken language barriers.
            </div>
          </div>
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
              <strong className="text-slate-800 block">NT Remote Mobile Coverage & Towers</strong>
              Custodians: ACMA / Carrier Data. Contains cell tower coordinates and cellular coverage contours.
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
            <li><strong>Live Map:</strong> Toggle mobile coverage contours, remote community markers, and regional boundaries. Click any marker to view its WBI score and hazard breakdown.</li>
            <li><strong>Bushfire (Live):</strong> Overlay live satellite fire hotspots detected in the last 24 hours and current-month burnt areas from the NAFI / FireNorth service to see active bushfire activity against community risk.</li>
            <li><strong>Communities Directory:</strong> Search and filter through communities by region, type, council, population, or WBI risk tier. Click any entry to fly directly to it on the map.</li>
            <li><strong>Analytics:</strong> Review regional vulnerability trends, blackspot counts, and population exposure metrics across Northern Territory regions.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
