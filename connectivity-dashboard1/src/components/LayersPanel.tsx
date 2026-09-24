import React from 'react';
import type { LayerState } from '../types';
import { BURNT_AREA_MONTHS, HOTSPOT_BANDS } from '../bushfire';

interface Props {
  layers: LayerState;
  setLayers: React.Dispatch<React.SetStateAction<LayerState>>;
}

export default function LayersPanel({ layers, setLayers }: Props) {
  const toggle = (key: keyof LayerState) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  // Helper to bulk-toggle an array of layer keys
  const toggleSection = (keys: (keyof LayerState)[], enable: boolean) => {
    setLayers((prev) => {
      const next = { ...prev };
      keys.forEach((k) => (next[k] = enable));
      return next;
    });
  };

  return (
    <aside className="w-80 h-full bg-white border-l border-slate-200 flex flex-col select-none shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Map Layers
          </h2>
          <p className="text-xs text-slate-500">
            Toggle visibility of map data layers
          </p>
        </div>
      </div>

      {/* Scrollable Layer Groups */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Map Overlays */}
        <Section
          title="Map Layers"
          onSelectAll={() =>
            toggleSection(['communities', 'coverage'], true)
          }
          onClearAll={() =>
            toggleSection(['communities', 'coverage'], false)
          }
        >
          <CheckboxItem
            label="Communities"
            checked={layers.communities}
            onChange={() => toggle('communities')}
          />
          <CheckboxItem
            label="Coverage"
            checked={layers.coverage}
            onChange={() => toggle('coverage')}
          />
        </Section>

        {/* Live Bushfire (NAFI / FireNorth WMS) */}
        <Section
          title="Bushfire (Live)"
          onSelectAll={() =>
            toggleSection(['activeBushfires', 'burntAreas'], true)
          }
          onClearAll={() =>
            toggleSection(['activeBushfires', 'burntAreas'], false)
          }
        >
          <CheckboxItem
            label="Active Fire Hotspots (24h)"
            badge="Live"
            checked={layers.activeBushfires}
            onChange={() => toggle('activeBushfires')}
          />
          {layers.activeBushfires && <HotspotLegend />}

          <CheckboxItem
            label="Burnt Areas (Current Year)"
            checked={layers.burntAreas}
            onChange={() => toggle('burntAreas')}
          />
          {layers.burntAreas && <BurntAreaLegend />}
        </Section>

        {/* Network Infrastructure */}
        <Section
          title="Network Infrastructure"
          onSelectAll={() => toggleSection(['towers'], true)}
          onClearAll={() => toggleSection(['towers'], false)}
        >
          <CheckboxItem
            label="Cell Towers"
            checked={layers.towers}
            onChange={() => toggle('towers')}
          />
        </Section>

        {/* Base Map Settings */}
        <Section title="Base Map & Boundaries">
          <CheckboxItem
            label="Base Map"
            checked={layers.baseMap}
            onChange={() => toggle('baseMap')}
          />
          <CheckboxItem
            label="NT Boundary"
            checked={layers.ntBoundary}
            onChange={() => toggle('ntBoundary')}
          />
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
  onSelectAll,
  onClearAll,
}: {
  title: string;
  children: React.ReactNode;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          {title}
        </h3>
        {onSelectAll && onClearAll && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckboxItem({
  label,
  badge,
  checked,
  onChange,
}: {
  label: string;
  badge?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      onClick={onChange}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 border ${
        checked
          ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950'
          : 'bg-transparent border-transparent text-slate-700 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            checked
              ? 'bg-indigo-600 border-indigo-600'
              : 'border-slate-300 bg-white group-hover:border-slate-400'
          }`}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-white fill-current"
              viewBox="0 0 20 20"
            >
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>

      {badge && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          {badge}
        </span>
      )}
    </label>
  );
}

function HotspotLegend() {
  return (
    <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        Hotspot age (satellite)
      </p>
      <ul className="space-y-1.5">
        {HOTSPOT_BANDS.map((band) => (
          <li key={band.label} className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="w-4 text-center text-sm leading-none"
              style={{ color: band.color }}
              aria-hidden="true"
            >
              {band.glyph}
            </span>
            <span>{band.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate-400 mt-2 leading-snug">
        Symbol size does not indicate fire size. Locations accurate to ~1.5 km.
      </p>
    </div>
  );
}

function BurntAreaLegend() {
  return (
    <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        Burnt area — colour = month burnt
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {BURNT_AREA_MONTHS.map((month) => (
          <div key={month.label} className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="h-3.5 w-3.5 rounded-sm border border-black/10 shrink-0"
              style={{ backgroundColor: month.color, opacity: 0.6 }}
              aria-hidden="true"
            />
            <span>{month.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-2 leading-snug">
        Warmer colours (yellow → pink → purple) mark the hotter, later months when fires are generally more intense.
      </p>
    </div>
  );
}