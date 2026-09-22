import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import LayersPanel from "./components/LayersPanel";
import CommunitiesPage from "./components/CommunitiesPage";
import Dashboard from "./components/Dashboard";
import NodesPage from "./components/NodesPage";
import HelpPage from "./components/HelpPage";

function App() {
  const [layers, setLayers] = useState({
    towers: true,
    communities: true, // Default to true so community markers appear on map
    coverage: false,
    activeNodes: true,
    offlineNodes: false,
    communityHubs: true,
    nodeDensity: false,
    signalStrength: true,
    baseMap: true,
    ntBoundary: true,
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
      </div>
    </div>
  );
}

export default App;
