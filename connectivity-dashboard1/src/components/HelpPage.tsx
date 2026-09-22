import {
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  MapIcon,
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
          NT Warning Blackspot Index & Remote Connectivity Operations Guide
        </p>
      </div>

      <div className="max-w-4xl space-y-6 mt-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
            Project Background
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mt-2">
            This dashboard was developed for the <strong>CDU IT Code Fair 2026 | Data Innovation Challenge</strong> under
            the theme <em>Remote Connectivity</em>. It monitors bushfire hazard vulnerability and emergency warning
            reachability across <strong>792 remote communities and homelands</strong> throughout the Northern Territory of
            Australia.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
            Data Sources & Provenance
          </h2>
          <div className="mt-3 space-y-2.5 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">Com_BushTel_Profile_CMC_2024 (792 Communities)</strong>
              Custodian: Department of Infrastructure, Transport, Regional Development, Communications and the Arts / BushTel NT. Contains official coordinates, community names, council, electorate, language, and population records.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">NT Remote Areas Mobile Coverage (Carrier Contours)</strong>
              Custodian: Spatial Infrastructure & Carriers. Models predicted cellular coverage footprints (Telstra / Optus 3G/4G/5G).
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <strong className="text-slate-800 block">Northern Territory Administrative Boundary</strong>
              Custodian: NT Land Information System (LIS) / DLPE. Official geospatial polygon boundary of the Northern Territory.
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-indigo-600" />
            How to Use the Platform
          </h2>
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-slate-600 leading-relaxed">
            <li><strong>Live Map:</strong> Toggle mobile coverage polygons, remote community markers, and territorial boundaries. Click any marker to view the community profile and population.</li>
            <li><strong>Communities Directory:</strong> Search and filter through all 792 communities by region, type, council, and population. Directly fly to any community on the live map.</li>
            <li><strong>Analytics:</strong> Review regional population reachability, blackspot counts, and community type distributions.</li>
            <li><strong>Node Directory:</strong> Monitor cellular masts, solar repeaters, and satellite gateways across the NT network.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

