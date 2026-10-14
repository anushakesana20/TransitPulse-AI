import React from 'react';
import {
  Navigation,
  RefreshCw,
  AlertTriangle,
  Users,
  Zap,
  Info,
  Car
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  geminiOnline: boolean;
  activeDisruptionsCount: number;
  totalSeats: number;
  activeVehiclesCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenDriverPing: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  geminiOnline,
  activeDisruptionsCount,
  totalSeats,
  activeVehiclesCount,
  onRefresh,
  isRefreshing,
  onOpenDriverPing,
}) => {
  const tabs = [
    { id: 'map', label: 'Live Street Map', icon: Navigation },
    { id: 'capacity', label: 'Dynamic Capacity', icon: Users },
    { id: 'match', label: 'Find a Ride', icon: Car },
    { id: 'analyzer', label: 'Report Disruption', icon: AlertTriangle, highlight: true },
    { id: 'knowledge', label: 'How It Works', icon: Info },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur">
      {/* Main App Bar - Announcement banner removed per requirement A */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('map')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-black text-xl tracking-tight">
            TP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                TransitPulse <span className="text-amber-400">AI</span>
              </h1>

            </div>
            <p className="text-xs text-slate-400">
              Informal Transit Intelligence &bull; Shared Autos, Vans &amp; Feeder Shuttles
            </p>
          </div>
        </div>

        {/* Live Metrics & Actions */}
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          {/* AI Intelligence Live Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${geminiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium hidden md:inline">AI Intelligence Feed</span>
            <span className={`text-[10px] uppercase font-semibold ${geminiOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {geminiOnline ? 'Live' : 'Standby'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className="text-slate-500">Vehicles:</span> <strong className="text-amber-400 font-mono">{activeVehiclesCount}</strong>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className="text-slate-500">Available Seats:</span> <strong className="text-emerald-400 font-mono">{totalSeats}</strong>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className="text-slate-500">Disruptions:</span> <strong className="text-rose-400 font-mono">{activeDisruptionsCount}</strong>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh transit telemetry"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Driver Ping CTA */}
          <button
            onClick={onOpenDriverPing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            title="Broadcast Driver Ping / Seat Availability"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Driver Ping</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-slate-900 scrollbar-none py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'} ${tab.highlight && !isActive ? 'text-amber-500' : ''}`} />
              <span>{tab.label}</span>
              {tab.id === 'analyzer' && activeDisruptionsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
