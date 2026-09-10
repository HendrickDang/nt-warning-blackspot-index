import { NavLink } from "react-router-dom";
import type { ReactElement } from "react";
import {
  MapIcon,
  ChartBarIcon,
  UserGroupIcon,
  ServerStackIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-purple-100 flex flex-col justify-between p-4">
      {/* Top Section */}
      <div>
        <h1 className="text-xl font-bold mb-6">NetPulse Network Ops</h1>

        <nav className="flex flex-col gap-2">
          <SidebarItem to="/map" label="Map" icon={<MapIcon className="h-5 w-5" />} />
          <SidebarItem to="/analytics" label="Analytics" icon={<ChartBarIcon className="h-5 w-5" />} />
          <SidebarItem to="/community" label="Community" icon={<UserGroupIcon className="h-5 w-5" />} />
          <SidebarItem to="/nodes" label="Nodes" icon={<ServerStackIcon className="h-5 w-5" />} />
        </nav>

        <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700">
          <PlusIcon className="h-5 w-5" />
          Add Node
        </button>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-2">
        <SidebarItem to="/help" label="Help" icon={<QuestionMarkCircleIcon className="h-5 w-5" />} />
        <SidebarItem to="/logout" label="Logout" icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />} />
      </div>
    </div>
  );
}

interface SidebarItemProps {
  to: string;
  label: string;
  icon: ReactElement;
}

function SidebarItem({ to, label, icon }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition
        ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-purple-200"}`
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}
