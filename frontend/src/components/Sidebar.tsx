import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  Users,
  Building2,
  BarChart3,
  Layers,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  conflictCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ conflictCount = 0 }) => {
  const { user } = useAuth();
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/timetable', label: 'Timetable Grid', icon: Calendar },
    { to: '/conflicts', label: 'Conflict Engine', icon: AlertTriangle, badge: conflictCount > 0 ? conflictCount : undefined, badgeColor: 'bg-rose-500 text-white' },
    { to: '/examinations', label: 'Exam Planner', icon: GraduationCap },
    { to: '/modules', label: 'Modules', icon: BookOpen },
    { to: '/lecturers', label: 'Lecturers', icon: Users },
    { to: '/cohorts', label: 'Cohorts', icon: Layers },
    { to: '/rooms', label: 'Rooms & Venues', icon: Building2 },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 font-bold text-lg tracking-wider">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-white tracking-tight flex items-center gap-1.5 text-base">
            IAP <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">Core</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Academic Planner</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Scheduling Core
        </div>
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shadow-sm ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Academic Entities
        </div>
        {navItems.slice(4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">{user?.name || 'Academic Administrator'}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role || 'Administrator'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
