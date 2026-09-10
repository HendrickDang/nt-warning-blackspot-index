interface LayerState {
  towers: boolean;
  communities: boolean;
  coverage: boolean;
  activeNodes: boolean;
  offlineNodes: boolean;
  communityHubs: boolean;
  nodeDensity: boolean;
  signalStrength: boolean;
  baseMap: boolean;
  ntBoundary: boolean;
}

interface Props {
  layers: LayerState;
  setLayers: React.Dispatch<React.SetStateAction<LayerState>>;
}

export default function LayersPanel({ layers, setLayers }: Props) {
  const toggle = (key: keyof LayerState) =>
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="w-80 h-full bg-white border-l p-4">
        <h2 className="text-xl font-bold mb-4 text-black">Layers</h2>
        <div className="ml-5">

        {/* Map Layers */}
        <Section title="Map Layers">
            <Checkbox label="Communities" checked={layers.communities} onClick={() => toggle("communities")} />
            <Checkbox label="Coverage" checked={layers.coverage} onClick={() => toggle("coverage")} />
        </Section>

        {/* Network Infrastructure */}
        <Section title="Network Infrastructure">
            <Checkbox label="Active Nodes" checked={layers.activeNodes} onClick={() => toggle("activeNodes")} />
            <Checkbox label="Offline Nodes" checked={layers.offlineNodes} onClick={() => toggle("offlineNodes")} />
            <Checkbox label="Community Hubs" checked={layers.communityHubs} onClick={() => toggle("communityHubs")} />
        </Section>

    

        {/* Base Map */}
        <Section title="Base Map">
            <Checkbox label="Base Map" checked={layers.baseMap} onClick={() => toggle("baseMap")} />
            <Checkbox label="NT Boundary" checked={layers.ntBoundary} onClick={() => toggle("ntBoundary")} />
        </Section>
        </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-600 mb-2">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onClick} />
      <span className="text-gray-800">{label}</span>
    </label>
  );
}
