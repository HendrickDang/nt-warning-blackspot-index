import { useState } from "react";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import LayersPanel from "./components/LayersPanel";

function App() {
  const [layers, setLayers] = useState({
    towers: true,
    communities: false,
    coverage: false,
    activeNodes: true,
    offlineNodes: false,
    communityHubs: true,
    nodeDensity: false,
    signalStrength: true,
    baseMap: true,
    ntBoundary: true,
  });

  return (
    <div className="flex w-screen h-screen overflow-hidden">
  <Sidebar />

  <div className="flex-1 flex relative">
    {/* Map takes remaining space, shrinks naturally when panel is present */}
    <div className="flex-1 relative">
      <MapView layers={layers} />
    </div>

    {/* Layers panel now part of flex flow, not fixed */}
    <div className="w-80 h-screen bg-white border-l overflow-y-auto overflow-x-hidden z-10 shrink-0">
      <LayersPanel layers={layers} setLayers={setLayers} />
    </div>
  </div>
</div>
  );
}

export default App;
