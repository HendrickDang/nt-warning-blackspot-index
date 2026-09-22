import { useState } from "react";
import {
  ServerStackIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

interface NodeItem {
  id: string;
  name: string;
  type: string;
  carrier: string;
  region: string;
  status: "Active" | "Degraded" | "Offline";
  uptime: string;
  power: string;
  lastPing: string;
}

const initialNodes: NodeItem[] = [
  { id: "NODE-NT-001", name: "Darwin Central Macro Mast", type: "4G / 5G Macro", carrier: "Telstra", region: "TOP END", status: "Active", uptime: "99.98%", power: "Mains + Diesel Backup", lastPing: "Just now" },
  { id: "NODE-NT-002", name: "Palmerston Regional Hub", type: "4G / 5G Macro", carrier: "Telstra", region: "TOP END", status: "Active", uptime: "99.90%", power: "Mains + UPS", lastPing: "1m ago" },
  { id: "NODE-NT-003", name: "Adelaide River Highway Repeater", type: "4G LTE Repeater", carrier: "Optus", region: "TOP END", status: "Active", uptime: "99.20%", power: "Solar + Battery", lastPing: "3m ago" },
  { id: "NODE-NT-004", name: "Katherine North BTS", type: "4G / 5G Macro", carrier: "Telstra", region: "BIG RIVERS", status: "Active", uptime: "99.85%", power: "Mains + Diesel", lastPing: "Just now" },
  { id: "NODE-NT-005", name: "Maningrida Remote Site", type: "Satellite-fed 4G", carrier: "Telstra", region: "TOP END", status: "Degraded", uptime: "92.40%", power: "Diesel Generator (Maintenance)", lastPing: "12m ago" },
  { id: "NODE-NT-006", name: "Daly River / Nauiyu Node", type: "Microwave Link", carrier: "BushTel", region: "TOP END", status: "Offline", uptime: "0.00%", power: "Flood Damage - Repair Pending", lastPing: "2 days ago" },
  { id: "NODE-NT-007", name: "Tennant Creek Central Tower", type: "4G / 5G Macro", carrier: "Telstra", region: "BARKLY", status: "Active", uptime: "99.90%", power: "Mains + Grid", lastPing: "Just now" },
  { id: "NODE-NT-008", name: "Ali Curung Community Repeater", type: "4G Small Cell", carrier: "Telstra", region: "BARKLY", status: "Active", uptime: "98.50%", power: "Solar Hybrid", lastPing: "2m ago" },
  { id: "NODE-NT-009", name: "Alpurrurulam / Lake Nash Gateway", type: "Satellite 4G", carrier: "Telstra", region: "BARKLY", status: "Degraded", uptime: "91.00%", power: "Backhaul Congestion", lastPing: "8m ago" },
  { id: "NODE-NT-010", name: "Alice Springs Anzac Hill Mast", type: "4G / 5G Macro", carrier: "Telstra", region: "CENTRAL AUSTRALIA", status: "Active", uptime: "100.00%", power: "Mains + Dual Generator", lastPing: "Just now" },
  { id: "NODE-NT-011", name: "Hermannsburg / Ntaria Site", type: "4G LTE", carrier: "Telstra", region: "CENTRAL AUSTRALIA", status: "Active", uptime: "98.60%", power: "Solar Hybrid", lastPing: "4m ago" },
  { id: "NODE-NT-012", name: "Yulara / Uluru Gateway", type: "4G / 5G Macro", carrier: "Telstra", region: "CENTRAL AUSTRALIA", status: "Active", uptime: "99.95%", power: "Mains + Diesel", lastPing: "Just now" },
  { id: "NODE-NT-013", name: "Docker River Satellite Backhaul", type: "LEO Satellite Link", carrier: "BushTel", region: "CENTRAL AUSTRALIA", status: "Offline", uptime: "0.00%", power: "Storm Lightning Damage", lastPing: "18 hrs ago" },
  { id: "NODE-NT-014", name: "Nhulunbuy / Gove Tower", type: "4G / 5G Macro", carrier: "Telstra", region: "EAST ARNHEM", status: "Active", uptime: "99.90%", power: "Mains + Diesel", lastPing: "Just now" },
  { id: "NODE-NT-015", name: "Alyangula Groote Eylandt Node", type: "4G LTE", carrier: "Optus", region: "EAST ARNHEM", status: "Active", uptime: "99.60%", power: "Mains + Battery", lastPing: "1m ago" },
];

export default function NodesPage() {
  const [nodes, setNodes] = useState<NodeItem[]>(initialNodes);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);

  // Form state for adding node
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState("4G Small Cell");
  const [newNodeCarrier, setNewNodeCarrier] = useState("Telstra");
  const [newNodeRegion, setNewNodeRegion] = useState("CENTRAL AUSTRALIA");
  const [newNodePower, setNewNodePower] = useState("Solar Hybrid");

  const filteredNodes = nodes.filter((n) => {
    if (filterStatus !== "ALL" && n.status !== filterStatus) return false;
    return true;
  });

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    const createdNode: NodeItem = {
      id: `NODE-NT-${String(nodes.length + 1).padStart(3, "0")}`,
      name: newNodeName,
      type: newNodeType,
      carrier: newNodeCarrier,
      region: newNodeRegion,
      status: "Active",
      uptime: "100.00%",
      power: newNodePower,
      lastPing: "Just now",
    };

    setNodes([createdNode, ...nodes]);
    setNewNodeName("");
    setShowModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto p-6 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ServerStackIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 my-0">Telecommunication Nodes & Repeaters</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Infrastructure telemetry, solar health, and remote repeater operational statuses
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs self-start sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Deploy New Node</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Registered Nodes</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{nodes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircleIcon className="h-4 w-4" /> Active & Online
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {nodes.filter((n) => n.status === "Active").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <ExclamationTriangleIcon className="h-4 w-4" /> Degraded
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {nodes.filter((n) => n.status === "Degraded").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
            <XCircleIcon className="h-4 w-4" /> Offline / Incident
          </span>
          <p className="text-2xl font-bold text-red-700 mt-1">
            {nodes.filter((n) => n.status === "Offline").length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {["ALL", "Active", "Degraded", "Offline"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === st
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {st === "ALL" ? `All Nodes (${nodes.length})` : `${st} (${nodes.filter((n) => n.status === st).length})`}
          </button>
        ))}
      </div>

      {/* Nodes Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Node ID / Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Carrier</th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Uptime</th>
              <th className="py-3 px-4">Power Source</th>
              <th className="py-3 px-4 text-right">Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {filteredNodes.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{n.name}</div>
                  <span className="text-[11px] font-mono text-slate-400">{n.id}</span>
                </td>
                <td className="py-3 px-4">{n.type}</td>
                <td className="py-3 px-4 font-medium text-slate-800">{n.carrier}</td>
                <td className="py-3 px-4">{n.region}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      n.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : n.status === "Degraded"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        n.status === "Active"
                          ? "bg-emerald-500 animate-pulse"
                          : n.status === "Degraded"
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                    />
                    {n.status}
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-800">{n.uptime}</td>
                <td className="py-3 px-4 text-slate-500 text-[11px]">{n.power}</td>
                <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">{n.lastPing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Node Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <SignalIcon className="h-5 w-5 text-indigo-600" />
              Register New Telecommunications Node
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Add an emergency repeater, satellite relay, or cellular mast to the monitoring fleet.
            </p>

            <form onSubmit={handleAddNode} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Site / Location Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ti Tree Solar Repeater #2"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Node Type</label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="4G Small Cell">4G Small Cell</option>
                  <option value="4G / 5G Macro">4G / 5G Macro</option>
                  <option value="4G LTE Repeater">4G LTE Repeater</option>
                  <option value="LEO Satellite Link">LEO Satellite Link (Starlink / OneWeb)</option>
                  <option value="Microwave Backhaul">Microwave Backhaul</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Primary Carrier</label>
                  <select
                    value={newNodeCarrier}
                    onChange={(e) => setNewNodeCarrier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Telstra">Telstra</option>
                    <option value="Optus">Optus</option>
                    <option value="BushTel">BushTel</option>
                    <option value="Community Mesh">Community Mesh</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">NT Region</label>
                  <select
                    value={newNodeRegion}
                    onChange={(e) => setNewNodeRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="CENTRAL AUSTRALIA">Central Australia</option>
                    <option value="TOP END">Top End</option>
                    <option value="BIG RIVERS">Big Rivers</option>
                    <option value="BARKLY">Barkly</option>
                    <option value="EAST ARNHEM">East Arnhem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Power System</label>
                <input
                  type="text"
                  placeholder="e.g. Solar + LiFePO4 Battery"
                  value={newNodePower}
                  onChange={(e) => setNewNodePower(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  Deploy Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

