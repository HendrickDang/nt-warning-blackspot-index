import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { Bars3Icon, XMarkIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import LayersPanel from "./components/LayersPanel";
import { DataProvider } from "./context/DataProvider";
import { DEFAULT_LAYERS } from "./types";
import type { LayerState } from "./types";

// Code-split the non-map routes. This keeps heavy deps (plotly.js in
// Dashboard, the tables/modals elsewhere) out of the initial bundle.
const CommunitiesPage = lazy(() => import("./components/CommunitiesPage"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const HelpPage = lazy(() => import("./components/HelpPage"));

const LAYER_KEYS = Object.keys(DEFAULT_LAYERS) as (keyof LayerState)[];

function parseLayers(value: string | null): LayerState {
  if (value === null) return { ...DEFAULT_LAYERS };
  const enabled = new Set(value.split(",").map((s) => s.trim()).filter(Boolean));
  const next = { ...DEFAULT_LAYERS };
  for (const key of LAYER_KEYS) next[key] = enabled.has(key);
  return next;
}

function encodeLayers(layers: LayerState): string {
  return LAYER_KEYS.filter((key) => layers[key]).join(",");
}

function PageLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function MapLayout({
  layers,
  setLayers,
}: {
  layers: LayerState;
  setLayers: React.Dispatch<React.SetStateAction<LayerState>>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      {/* Map takes remaining space, shrinks naturally when panel is present */}
      <div className="flex-1 relative h-full">
        <MapView layers={layers} />

        {/* Layers drawer trigger (small screens) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden absolute top-4 right-4 z-[1000] flex items-center gap-1.5 bg-white/95 border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
          aria-label="Open map layers"
        >
          <Squares2X2Icon className="h-4 w-4" />
          Layers
        </button>
      </div>

      {/* Layers panel (large screens) */}
      <div className="hidden lg:block w-80 h-screen bg-white border-l border-slate-200 overflow-hidden z-10 shrink-0 shadow-lg">
        <LayersPanel layers={layers} setLayers={setLayers} />
      </div>

      {/* Layers drawer (small screens) */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[1100] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Close map layers"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <LayersPanel layers={layers} setLayers={setLayers} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [layers, setLayers] = useState<LayerState>(() =>
    parseLayers(searchParams.get("layers"))
  );
  const [navOpen, setNavOpen] = useState(false);

  // On the map the trigger sits top-left; on content pages it would overlap the
  // page header, so it moves to the bottom-left instead.
  const isMapRoute = location.pathname === "/" || location.pathname === "/map";

  // Keep layer visibility in the URL so views are shareable.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("layers", encodeLayers(layers));
        return next;
      },
      { replace: true }
    );
  }, [layers, setSearchParams]);

  return (
    <DataProvider>
      <div className="flex w-screen h-screen overflow-hidden bg-slate-900 font-sans">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

        <div className="flex-1 h-screen overflow-hidden relative">
          {/* Nav trigger (small screens) */}
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className={`md:hidden absolute z-[1000] bg-white/95 border border-slate-200 shadow-lg rounded-lg p-2 text-slate-700 hover:bg-white ${
              isMapRoute ? "top-4 left-4" : "bottom-4 left-4"
            }`}
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MapLayout layers={layers} setLayers={setLayers} />} />
              <Route path="/map" element={<MapLayout layers={layers} setLayers={setLayers} />} />
              <Route path="/community" element={<CommunitiesPage />} />
              <Route path="/communities" element={<CommunitiesPage />} />
              <Route path="/analytics" element={<Dashboard />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </DataProvider>
  );
}

export default App;
