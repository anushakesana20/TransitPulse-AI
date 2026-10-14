/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PickupPoint,
  Vehicle,
  DisruptionIncident,
  UserLocation,
  PingLogEntry
} from './types/transit';
import { Navbar } from './components/Navbar';
import { InteractiveMap } from './components/InteractiveMap';
import { DynamicCapacityPanel } from './components/DynamicCapacityPanel';
import { RideMatcher } from './components/RideMatcher';
import { AIDisruptionAnalyzer } from './components/AIDisruptionAnalyzer';
import { KnowledgeBase } from './components/KnowledgeBase';
import { DriverPingModal } from './components/DriverPingModal';
import {
  AlertTriangle,
  Car,
  MapPin,
  Users,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('map');
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionIncident[]>([]);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [geminiOnline, setGeminiOnline] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  // Driver Ping states
  const [isDriverPingOpen, setIsDriverPingOpen] = useState<boolean>(false);
  const [driverPingHubId, setDriverPingHubId] = useState<string | undefined>(undefined);
  const [pingNotification, setPingNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pingLogs, setPingLogs] = useState<PingLogEntry[]>([
    {
      id: 'log-001',
      vehicleId: 'veh-001',
      registrationNumber: 'KA-01-AA-4291',
      driverName: 'Ramesh K. Gowda',
      hubId: 'node-1',
      hubName: 'Majestic Central Interchange',
      destination: 'Shivajinagar Market',
      timestamp: Date.now() - 2 * 60 * 1000,
      seats: 2,
      status: 'available',
    },
    {
      id: 'log-002',
      vehicleId: 'veh-005',
      registrationNumber: 'KA-51-AB-8102',
      driverName: 'Suresh Reddy',
      hubId: 'node-2',
      hubName: 'Silk Board Junction Hub',
      destination: 'Electronic City Phase 1',
      timestamp: Date.now() - 3 * 60 * 1000,
      seats: 2,
      status: 'filling',
    },
  ]);

  // Real Geolocation state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);

  const [lastUpdateTime, setLastUpdateTime] = useState<string>('Just now');

  // Ask permission once and keep the user's device location updated while the app is open.
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocationError('This browser does not support location.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp });
        setUserLocationError(null);
      },
      (err) => {
        const message = err.code === err.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser to use live location.'
          : err.code === err.TIMEOUT ? 'Location request timed out. Try again.' : 'Your device location is unavailable.';
        setUserLocationError(message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch live state from backend
  const fetchTransitData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [dataRes, statusRes] = await Promise.all([
        fetch('/api/transit-data'),
        fetch('/api/status'),
      ]);

      if (dataRes.ok) {
        const data = await dataRes.json();
        if (data.pickupPoints) setPickupPoints(data.pickupPoints);
        if (data.vehicles) setVehicles(data.vehicles);
        if (data.disruptions) setDisruptions(data.disruptions);
        setLastUpdateTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }

      if (statusRes.ok) {
        const status = await statusRes.json();
        setGeminiOnline(status.geminiConfigured);
      }
    } catch (err) {
      console.warn('Backend unavailable, using client memory state:', err);
      setLastUpdateTime('Cached telemetry');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransitData();
    const interval = setInterval(fetchTransitData, 40000);
    return () => clearInterval(interval);
  }, [fetchTransitData]);

  // Helper to recalculate hub seat totals
  const recalculateHubCapacities = (updatedVehs: Vehicle[]) => {
    setPickupPoints(prev =>
      prev.map(hub => {
        const hubVehs = updatedVehs.filter(
          v => v.currentPickupPointId === hub.id && !v.isStale && v.status !== 'departed'
        );
        const totalSeats = hubVehs.reduce((sum, v) => sum + v.availableSeats, 0);
        return {
          ...hub,
          availableVehiclesCount: hubVehs.length,
          totalAvailableSeats: totalSeats,
          capacityTier: totalSeats >= 8 ? 'high' : totalSeats >= 3 ? 'moderate' : totalSeats > 0 ? 'low' : 'critical',
        };
      })
    );
  };

  // Quick Heartbeat Ping for any vehicle
  const handleQuickVehiclePing = async (vehicleId: string) => {
    const veh = vehicles.find(v => v.id === vehicleId);
    if (!veh) return;

    try {
      const currentPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by this browser.'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      const hub = pickupPoints.find(p => p.id === veh.currentPickupPointId);
      const res = await fetch('/api/driver-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: veh.id,
          registrationNumber: veh.registrationNumber,
          vehicleType: veh.vehicleType,
          driverName: veh.driverName,
          pickupPointId: veh.currentPickupPointId,
          destination: veh.destination,
          availableSeats: veh.availableSeats,
          farePerHead: veh.farePerHead,
          lat: currentPosition.coords.latitude,
          lng: currentPosition.coords.longitude,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'The server rejected this GPS ping.');
      }
      const pingResponse = await res.json();
      const now = Date.now();
      const updatedVehs = vehicles.map(v =>
        v.id === vehicleId ? { ...v, lastPingTimestamp: now, isStale: false } : v
      );
      setVehicles(updatedVehs);
      if (Array.isArray(pingResponse.pickupPoints)) setPickupPoints(pingResponse.pickupPoints);
      if (pingResponse.vehicle) setVehicles(prev => [pingResponse.vehicle, ...prev.filter(v => v.id !== pingResponse.vehicle.id)]);
      recalculateHubCapacities(updatedVehs);

      // Add to ping logs
      const newEntry: PingLogEntry = {
        id: `ping-${now.toString().slice(-5)}`,
        vehicleId: veh.id,
        registrationNumber: veh.registrationNumber,
        driverName: veh.driverName,
        hubId: veh.currentPickupPointId,
        hubName: hub?.name || 'Corridor Stand',
        destination: veh.destination,
        timestamp: now,
        seats: veh.availableSeats,
        status: veh.status,
      };
      setPingLogs(prev => [newEntry, ...prev.slice(0, 19)]);

      setPingNotification({
        type: 'success',
        message: `Live GPS ping sent for ${veh.registrationNumber}.`,
      });
      setTimeout(() => setPingNotification(null), 5000);
      setLastUpdateTime('Just now');
    } catch (err: any) {
      setPingNotification({
        type: 'error',
        message: `Failed to broadcast ping: ${err.message}`,
      });
    }
  };

  // Update vehicle seats directly
  const handleUpdateVehicleSeats = async (vehicleId: string, newSeats: number) => {
    const updatedVehs = vehicles.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          availableSeats: newSeats,
          status: (newSeats > 0 ? 'available' : 'filling') as any,
          lastPingTimestamp: Date.now(),
          isStale: false,
        };
      }
      return v;
    });

    setVehicles(updatedVehs);
    recalculateHubCapacities(updatedVehs);

    // Call backend API
    try {
      await fetch(`/api/vehicles/${vehicleId}/update-seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableSeats: newSeats }),
      });
      setLastUpdateTime('Just now');
    } catch (err) {
      console.warn('Backend update failed:', err);
    }
  };

  // Board ride from RideMatcher
  const handleBoardRide = (vehicleId: string, passengers: number) => {
    const veh = vehicles.find(v => v.id === vehicleId);
    if (!veh) return;
    const newSeats = Math.max(0, veh.availableSeats - passengers);
    handleUpdateVehicleSeats(vehicleId, newSeats);
  };

  // Simulate demand actions
  const handleSimulateAction = async (action: string) => {
    setIsSimulating(true);
    try {
      const response = await fetch('/api/simulate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.pickupPoints) setPickupPoints(data.pickupPoints);
        if (data.vehicles) setVehicles(data.vehicles);
        if (data.disruptions) setDisruptions(data.disruptions);
        setLastUpdateTime('Scenario test applied');
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Open driver ping modal
  const handleOpenDriverPing = (hubId?: string) => {
    setDriverPingHubId(hubId);
    setIsDriverPingOpen(true);
  };

  // Switch to Ride Matcher tab with preselected hub
  const handleMatchRideFromHub = (hubId: string) => {
    setSelectedHubId(hubId);
    setActiveTab('match');
  };

  // Switch to Map and select hub
  const handleViewOnMap = (hubId: string) => {
    setSelectedHubId(hubId);
    setActiveTab('map');
  };

  // After driver ping submitted from modal
  const handleDriverPingSubmitted = (data: any) => {
    if (data.pickupPoints) setPickupPoints(data.pickupPoints);
    if (data.vehicle) {
      setVehicles(prev => {
        const filtered = prev.filter(v => v.id !== data.vehicle.id);
        return [data.vehicle, ...filtered];
      });

      const hub = pickupPoints.find(p => p.id === data.vehicle.currentPickupPointId);
      const newEntry: PingLogEntry = {
        id: `ping-${Date.now().toString().slice(-5)}`,
        vehicleId: data.vehicle.id,
        registrationNumber: data.vehicle.registrationNumber,
        driverName: data.vehicle.driverName,
        hubId: data.vehicle.currentPickupPointId,
        hubName: hub?.name || 'Corridor Stand',
        destination: data.vehicle.destination,
        timestamp: Date.now(),
        seats: data.vehicle.availableSeats,
        status: data.vehicle.status,
      };
      setPingLogs(prev => [newEntry, ...prev.slice(0, 19)]);
    }

    setPingNotification({
      type: 'success',
      message: `⚡ Driver Ping broadcast confirmed: ${data.message || 'Telemetry updated successfully.'}`,
    });
    setTimeout(() => setPingNotification(null), 5000);
    setLastUpdateTime('Just now');
    fetchTransitData();
  };

  // After AI disruption analyzed
  const handleDisruptionAnalyzed = (incident: DisruptionIncident) => {
    setDisruptions(prev => [incident, ...prev]);
    if (incident.closestHubId) {
      setSelectedHubId(incident.closestHubId);
      if (['High', 'Critical'].includes(incident.severity)) {
        setPickupPoints(prev =>
          prev.map(h => (h.id === incident.closestHubId ? { ...h, activeDisruptionId: incident.id, capacityTier: 'critical' } : h))
        );
      }
    }
    setLastUpdateTime('Just now');
    fetchTransitData();
  };

  const totalAvailableSeats = pickupPoints.reduce((sum, h) => sum + h.totalAvailableSeats, 0);
  const activeVehiclesCount = vehicles.filter(v => !v.isStale && v.status !== 'departed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        geminiOnline={geminiOnline}
        activeDisruptionsCount={disruptions.length}
        totalSeats={totalAvailableSeats}
        activeVehiclesCount={activeVehiclesCount}
        onRefresh={fetchTransitData}
        isRefreshing={isRefreshing}
        onOpenDriverPing={() => handleOpenDriverPing()}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast / Ping Notification */}
        {pingNotification && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-fade-in shadow-xl ${
              pingNotification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {pingNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{pingNotification.message}</span>
            </div>
            <button
              onClick={() => setPingNotification(null)}
              className="text-slate-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Hero Header */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <span>TransitPulse AI</span>
                <span>&bull;</span>
                <span className="text-slate-300 font-normal">Real-Time Transit Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Informal Transit Intelligence
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Helping commuters discover reported transport availability, real-time shared vehicle capacity, and crowdsourced transit disruptions across urban corridors.
              </p>
            </div>

            {/* Prominent Primary Actions */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <button
                onClick={() => setActiveTab('analyzer')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm transition-all shadow-xl shadow-rose-600/20 group cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Report a Disruption</span>
              </button>

              <button
                onClick={() => setActiveTab('match')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-xl shadow-amber-500/20 group cursor-pointer"
              >
                <Car className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                <span>Find a Ride</span>
              </button>

              <button
                onClick={() => handleOpenDriverPing()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer"
                title="Broadcast Driver Ping / Telemetry"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Driver Ping</span>
              </button>
            </div>
          </div>

          {/* Real-Time Dashboard KPI Cards Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-slate-800/80">
            {/* 1. Pickup Points */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Pickup Points</span>
                <span className="text-base sm:text-lg font-black text-white font-mono">{pickupPoints.length} Hubs</span>
              </div>
            </div>

            {/* 2. Available Vehicles */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Available Fleet</span>
                <span className="text-base sm:text-lg font-black text-sky-400 font-mono">{activeVehiclesCount} Active</span>
              </div>
            </div>

            {/* 3. Available Seats */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Available Seats</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">{totalAvailableSeats} Seats</span>
              </div>
            </div>

            {/* 4. Disruption Alerts */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Disruptions</span>
                <span className="text-base sm:text-lg font-black text-rose-400 font-mono">{disruptions.length} Active</span>
              </div>
            </div>

            {/* 5. Latest Data Update */}
            <div className="col-span-2 sm:col-span-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Last Updated</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-300 font-mono">{lastUpdateTime}</span>
              </div>
            </div>
          </div>

          {/* Availability Indicators Guide Strip */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <span className="font-semibold text-slate-300">Live Availability Indicators:</span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <strong className="text-white">High Availability</strong> (&ge;8 seats, short wait)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <strong className="text-white">Moderate Availability</strong> (3&ndash;7 seats)
              </span>
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
                <strong className="text-white">Low Availability</strong> (1&ndash;2 seats, queues forming)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <strong className="text-white">Critical / Blocked</strong> (0 seats or severe hazard)
              </span>
            </div>
          </div>
        </section>

        {/* Tab Views */}
        {activeTab === 'map' && (
          <InteractiveMap
            pickupPoints={pickupPoints}
            vehicles={vehicles}
            disruptions={disruptions}
            selectedHubId={selectedHubId}
            onSelectHub={(id) => setSelectedHubId(id)}
            onMatchRideFromHub={handleMatchRideFromHub}
            onDriverPingAtHub={(id) => handleOpenDriverPing(id)}
            onQuickVehiclePing={handleQuickVehiclePing}
            onUpdateVehicleSeats={handleUpdateVehicleSeats}
            userLocation={userLocation}
            onUserLocationFound={(loc) => {
              setUserLocation(loc);
              setUserLocationError(null);
            }}
            userLocationError={userLocationError}
            setUserLocationError={setUserLocationError}
          />
        )}

        {activeTab === 'capacity' && (
          <DynamicCapacityPanel
            pickupPoints={pickupPoints}
            vehicles={vehicles}
            disruptions={disruptions}
            onOpenDriverPing={(id) => handleOpenDriverPing(id)}
            onSelectHub={(id) => {
              setSelectedHubId(id);
              setActiveTab('map');
            }}
            onSimulateAction={handleSimulateAction}
            isSimulating={isSimulating}
            onUpdateVehicleSeats={handleUpdateVehicleSeats}
            onQuickVehiclePing={handleQuickVehiclePing}
            pingLogs={pingLogs}
          />
        )}

        {activeTab === 'match' && (
          <RideMatcher
            pickupPoints={pickupPoints}
            vehicles={vehicles}
            onBoardRide={handleBoardRide}
            onViewOnMap={handleViewOnMap}
            preselectedHubId={selectedHubId || undefined}
          />
        )}

        {activeTab === 'analyzer' && (
          <AIDisruptionAnalyzer
            pickupPoints={pickupPoints}
            disruptions={disruptions}
            onDisruptionAnalyzed={handleDisruptionAnalyzed}
            onSelectHub={(id) => {
              setSelectedHubId(id);
              setActiveTab('map');
            }}
          />
        )}

        {activeTab === 'knowledge' && <KnowledgeBase />}
      </main>

      {/* Driver Ping Simulator Modal */}
      <DriverPingModal
        isOpen={isDriverPingOpen}
        onClose={() => setIsDriverPingOpen(false)}
        pickupPoints={pickupPoints}
        vehicles={vehicles}
        preselectedHubId={driverPingHubId}
        onDriverPingSubmitted={handleDriverPingSubmitted}
      />

      {/* Minimal Public-Facing Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">TransitPulse AI</span>
            <span>&bull;</span>
            <span>Informal Transit Intelligence</span>
          </div>
          <span className="text-amber-500 font-mono text-[11px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
            LIVE DRIVER PINGS ONLY &bull; AVAILABILITY DEPENDS ON DRIVER UPDATES
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('knowledge')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => setActiveTab('analyzer')}
              className="text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Report Incident
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
