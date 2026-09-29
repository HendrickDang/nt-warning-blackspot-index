import { NavLink } from "react-router-dom";
import type { ReactElement } from "react";
import {
  MapIcon,
  ChartBarIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 h-screen bg-slate-900 text-slate-300 flex flex-col justify-between flex-shrink-0 border-r border-slate-800 font-sans select-none transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Top Section */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand / Logo */}
          <div className="h-16 flex items-center px-5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30 shrink-0">
                <SignalIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="text-base font-bold tracking-wide leading-none whitespace-nowrap">
                Blackspot <span className="text-indigo-400 font-medium">Ops</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
              Overview
            </div>
            <SidebarItem to="/map" label="Live Map" icon={<MapIcon className="h-5 w-5" />} onNavigate={onClose} />
            <SidebarItem to="/analytics" label="Analytics" icon={<ChartBarIcon className="h-5 w-5" />} onNavigate={onClose} />
            <SidebarItem to="/community" label="Communities" icon={<UserGroupIcon className="h-5 w-5" />} onNavigate={onClose} />
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="px-3 py-4 border-t border-slate-800 bg-slate-900/50">
          <div className="space-y-1 mb-4">
            <SidebarItem
              to="/help"
              label="Help & Support"
              icon={<QuestionMarkCircleIcon className="h-5 w-5" />}
              onNavigate={onClose}
            />
          </div>

          <p className="px-3 text-[10px] leading-relaxed text-slate-500">
            Prototype • Data: BushTel, ACCC/RFNSA, NAFI/FireNorth, NT LIS
          </p>
        </div>
      </aside>
    </>
  );
}

// --- Subcomponents ---

interface SidebarItemProps {
  to: string;
  label: string;
  icon: ReactElement;
  onNavigate: () => void;
}

function SidebarItem({ to, label, icon, onNavigate }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border-l-2 ${
          isActive
            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500 font-medium"
            : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800 hover:border-slate-700"
        }`
      }
    >
      <div className="flex-shrink-0">{icon}</div>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
