import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import LayersPanel from "./components/LayersPanel";
import type { LayerState } from "./types";

// Code-split the non-map routes. This keeps heavy deps (plotly.js in
// Dashboard, the tables/modals elsewhere) out of the initial bundle.
const CommunitiesPage = lazy(() => import("./components/CommunitiesPage"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const NodesPage = lazy(() => import("./components/NodesPage"));
const HelpPage = lazy(() => import("./components/HelpPage"));

function PageLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const [layers, setLayers] = useState<LayerState>({
    towers: true,
    communities: true, // Default to true so community markers appear on map
    coverage: false,
    baseMap: true,
    ntBoundary: true,
    activeBushfires: true,
    burntAreas: false,
  });

  const MapLayout = (
    <div className="flex w-full h-full relative overflow-hidden">
      {/* Map takes remaining space, shrinks naturally when panel is present */}
      <div className="flex-1 relative h-full">
        <MapView layers={layers} />
      </div>

      {/* Layers panel */}
      <div className="w-80 h-screen bg-white border-l border-slate-200 overflow-y-auto overflow-x-hidden z-10 shrink-0 shadow-lg">
        <LayersPanel layers={layers} setLayers={setLayers} />
      </div>
    </div>
  );

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 h-screen overflow-hidden relative">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={MapLayout} />
            <Route path="/map" element={MapLayout} />
            <Route path="/community" element={<CommunitiesPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/analytics" element={<Dashboard />} />
            <Route path="/nodes" element={<NodesPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
