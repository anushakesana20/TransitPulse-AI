import React, { useState } from 'react';
import {
  PickupPoint,
  Vehicle,
  DisruptionIncident,
  CapacityTier,
  PingLogEntry
} from '../types/transit';
import {
  Users,
  AlertTriangle,
  Clock,
  Car,
  Zap,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Activity,
  MapPin
} from 'lucide-react';

interface DynamicCapacityPanelProps {
  pickupPoints: PickupPoint[];
  vehicles: Vehicle[];
  disruptions: DisruptionIncident[];
  onOpenDriverPing: (hubId?: string) => void;
  onSelectHub: (hubId: string) => void;
  onSimulateAction: (action: string) => void;
  isSimulating: boolean;
  onUpdateVehicleSeats: (vehicleId: string, newSeats: number) => void;
  onQuickVehiclePing: (vehicleId: string) => void;
  pingLogs: PingLogEntry[];
}

export const DynamicCapacityPanel: React.FC<DynamicCapacityPanelProps> = ({
  pickupPoints,
  vehicles,
  disruptions,
  onOpenDriverPing,
  onSelectHub,
  onSimulateAction,
  isSimulating,
  onUpdateVehicleSeats,
  onQuickVehiclePing,
  pingLogs,
}) => {
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(true);

  const getTierMeta = (tier: CapacityTier) => {
    switch (tier) {
      case 'high':
        return {
          label: 'High Availability',
          badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-600/50',
          dotClass: 'bg-emerald-400',
          barClass: 'bg-emerald-500',
          description: '3+ vehicles & 8+ seats available. Short wait times (< 4 mins).',
        };
      case 'moderate':
        return {
          label: 'Moderate Availability',
          badgeClass: 'bg-amber-950 text-amber-300 border-amber-600/50',
          dotClass: 'bg-amber-400',
          barClass: 'bg-amber-500',
          description: '2 vehicles or 3-7 seats available. Typical wait times (5-9 mins).',
        };
      case 'low':
        return {
          label: 'Low Availability',
          badgeClass: 'bg-orange-950 text-orange-300 border-orange-600/50',
          dotClass: 'bg-orange-400',
          barClass: 'bg-orange-500',
          description: '1 vehicle or 1-2 seats available. Long queues forming (> 10 mins).',
        };
      case 'critical':
      default:
        return {
          label: 'Critical / Depleted',
          badgeClass: 'bg-rose-950 text-rose-300 border-rose-600/50',
          dotClass: 'bg-rose-500 animate-pulse',
          barClass: 'bg-rose-500',
          description: '0 available seats or severe disruption alert. Severe bottleneck.',
        };
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'shared_van': return '🚐';
      case 'e_rickshaw': return '⚡';
      case 'local_minibus': return '🚌';
      default: return '🛺';
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Controls Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Live Capacity &amp; Telemetry Controls</h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-bold">
                SCENARIO TESTING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Optional scenario controls for testing capacity recalculation. These actions change the current in-memory session data and are not real-world demand feeds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onSimulateAction('rush_hour_drain')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-950/80 hover:bg-orange-900 border border-orange-700/50 text-orange-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Simulate Peak Rush (Drain Seats)</span>
            </button>

            <button
              onClick={() => onSimulateAction('fleet_resupply')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Fleet Resupply (Boost Seats)</span>
            </button>

            <button
              onClick={() => onSimulateAction('age_pings_stale')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Age Telemetry to Stale (&gt;15m)</span>
            </button>

            <button
              onClick={() => onSimulateAction('reset')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Sample Pickup Points Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pickupPoints.map((hub) => {
          const tierMeta = getTierMeta(hub.capacityTier);
          const activeDisp = disruptions.find(d => d.id === hub.activeDisruptionId);
          const hubVehicles = vehicles.filter(v => v.currentPickupPointId === hub.id);
          const freshVehicles = hubVehicles.filter(v => !v.isStale);
          const staleVehicles = hubVehicles.filter(v => v.isStale);

          return (
            <div
              key={hub.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div className="space-y-3.5">
                {/* Header & Capacity Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tierMeta.badgeClass}`}>
                      <span className={`w-2 h-2 rounded-full ${tierMeta.dotClass}`} />
                      {tierMeta.label}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5 group-hover:text-amber-400 transition-colors">
                      {hub.name}
                    </h4>
                    <p className="text-xs text-amber-300/80 font-mono">{hub.localName}</p>
                  </div>
                  <button
                    onClick={() => onSelectHub(hub.id)}
                    className="text-xs text-slate-400 hover:text-amber-400 p-1.5 rounded-lg bg-slate-950 border border-slate-800 transition-colors"
                    title="View on Interactive Geographic Map"
                  >
                    View Map
                  </button>
                </div>

                {/* Disruption Alert Tag */}
                {activeDisp && (
                  <div className="bg-rose-950/60 border border-rose-600/40 rounded-xl p-2.5 text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{activeDisp.title}</div>
                      <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                        {activeDisp.passengerImpactSummary}
                      </div>
                    </div>
                  </div>
                )}

                {/* Seat Capacity Gauge */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Available Seats / Active Fleet:</span>
                    <span className="font-mono font-bold text-white">
                      <strong className="text-emerald-400 text-sm">{hub.totalAvailableSeats}</strong> seats &bull; {freshVehicles.length} vehicles
                    </span>
                  </div>

                  {/* Progress Meter */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${tierMeta.barClass}`}
                      style={{ width: `${Math.min(100, (hub.totalAvailableSeats / 14) * 100)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">{tierMeta.description}</p>
                </div>

                {/* Fleet Breakdown & Interactive Seat Adjusters */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1.5">
                    <span>Staged Vehicles ({hubVehicles.length})</span>
                    {staleVehicles.length > 0 && (
                      <span className="text-rose-400 text-[10px] flex items-center gap-1 font-bold">
                        <AlertCircle className="w-3 h-3" />
                        {staleVehicles.length} Stale (&gt;15m)
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {hubVehicles.map((v) => {
                      const minutesAgo = Math.max(1, Math.floor((Date.now() - v.lastPingTimestamp) / 60000));
                      return (
                        <div
                          key={v.id}
                          className={`p-2.5 rounded-xl text-xs border transition-all ${
                            v.isStale
                              ? 'bg-slate-950/40 border-rose-900/40 text-slate-400'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{getVehicleIcon(v.vehicleType)}</span>
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1">
                                  <span>{v.registrationNumber}</span>
                                  {v.ecoFriendly && (
                                    <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1 rounded font-bold">EV</span>
                                  )}
                                  {v.isStale && (
                                    <span className="text-[9px] bg-rose-950 text-rose-300 px-1 rounded font-bold border border-rose-800">STALE</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  to {v.destination} &bull; ₹{v.farePerHead}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`font-mono font-bold text-xs ${v.availableSeats > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {v.availableSeats}/{v.totalCapacity} seats
                              </span>
                              <div className="text-[9px] text-slate-500">
                                {minutesAgo}m ago
                              </div>
                            </div>
                          </div>

                          {/* Interactive Seat Adjuster & Quick Ping Heartbeat Controls */}
                          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400 font-medium">Adjust Seats (Demo):</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onUpdateVehicleSeats(v.id, Math.max(0, v.availableSeats - 1))}
                                disabled={v.availableSeats <= 0}
                                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold"
                                title="Board 1 Passenger (Decrement Seat)"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-bold text-white px-1 text-xs">
                                {v.availableSeats}
                              </span>
                              <button
                                onClick={() => onUpdateVehicleSeats(v.id, Math.min(v.totalCapacity, v.availableSeats + 1))}
                                disabled={v.availableSeats >= v.totalCapacity}
                                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold"
                                title="Add 1 Seat (Disembark Pax)"
                              >
                                <Plus className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => onQuickVehiclePing(v.id)}
                                className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-semibold transition-colors"
                                title="Send Heartbeat Demo Ping for this vehicle"
                              >
                                <Zap className="w-3 h-3 fill-current" />
                                <span>Ping</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {hubVehicles.length === 0 && (
                      <div className="text-center py-2 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800">
                        No vehicles staged at this bay
                      </div>
                    )}
                  </div>
                </div>

                {/* Hub Metadata */}
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                  <span>Shelter: <strong className="text-slate-300">{hub.hasShelter ? 'Yes' : 'No'}</strong></span>
                  <span>Flood Risk: <strong className={hub.waterloggingRisk === 'Severe' ? 'text-rose-400' : 'text-slate-300'}>{hub.waterloggingRisk}</strong></span>
                  <span>Est. Trips: <strong className="text-slate-300">{hub.normalDailyBoardings.split(' ')[0]}</strong></span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => onOpenDriverPing(hub.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Broadcast Driver Ping at Stand</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver Ping Activity Log Drawer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Driver Telemetry Heartbeat Activity Log</h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {pingLogs.length} pings recorded
            </span>
          </div>
          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="text-xs text-slate-400 hover:text-white"
          >
            {showLogDrawer ? 'Hide Log' : 'Show Log'}
          </button>
        </div>

        {showLogDrawer && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {pingLogs.map((log) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <div
                  key={log.id}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between gap-3 text-slate-300"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <strong className="text-amber-400">{log.registrationNumber}</strong>
                    <span className="text-slate-400">({log.driverName})</span>
                  </div>

                  <div className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{log.hubName} &rarr; <span className="text-emerald-400">{log.destination}</span></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-400 font-bold">{log.seats} seats empty</span>
                    <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                  </div>
                </div>
              );
            })}

            {pingLogs.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800/80">
                No telemetry pings registered yet. Click &quot;Ping&quot; on any vehicle or use the &quot;Driver Ping&quot; button to broadcast.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
