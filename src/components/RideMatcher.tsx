import React, { useState } from 'react';
import {
  PickupPoint,
  Vehicle,
  VehicleType,
  RideMatchResult
} from '../types/transit';
import {
  Search,
  Car,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Compass,
  Filter,
  Info
} from 'lucide-react';

interface RideMatcherProps {
  pickupPoints: PickupPoint[];
  vehicles: Vehicle[];
  onBoardRide: (vehicleId: string, passengers: number) => void;
  onViewOnMap: (hubId: string) => void;
  preselectedHubId?: string;
}

export const RideMatcher: React.FC<RideMatcherProps> = ({
  pickupPoints,
  vehicles,
  onBoardRide,
  onViewOnMap,
  preselectedHubId,
}) => {
  const [selectedPickup, setSelectedPickup] = useState<string>(preselectedHubId || pickupPoints[0]?.id || 'node-1');
  const [selectedDestination, setSelectedDestination] = useState<string>('Shivajinagar Market');
  const [passengers, setPassengers] = useState<number>(1);
  const [transportType, setTransportType] = useState<string>('all');
  const [boardSuccessMessage, setBoardSuccessMessage] = useState<string | null>(null);

  // All unique destinations from pickup points and vehicles
  const allDestinations = Array.from(
    new Set([
      ...pickupPoints.flatMap(p => p.connectedDestinations),
      ...vehicles.map(v => v.destination),
    ])
  ).sort();

  const currentHub = pickupPoints.find(p => p.id === selectedPickup);

  // 1. Direct matches at chosen pickup point with filters
  const directMatches = vehicles.filter(v => {
    const isAtHub = v.currentPickupPointId === selectedPickup;
    const matchesDest = v.destination.toLowerCase().includes(selectedDestination.toLowerCase()) ||
      selectedDestination.toLowerCase().includes(v.destination.toLowerCase());
    const hasSeats = v.availableSeats >= passengers;
    const isNotStale = !v.isStale;
    const isNotDeparted = v.status !== 'departed';
    const matchesType = transportType === 'all' || v.vehicleType === transportType;
    return isAtHub && matchesDest && hasSeats && isNotStale && isNotDeparted && matchesType;
  });

  // 2. Alternative hub suggestion: only if no direct match exists
  let alternativeSuggestion: {
    hub: PickupPoint;
    vehicle: Vehicle;
    distanceInfo: string;
    reason: string;
  } | null = null;

  if (directMatches.length === 0) {
    const candidateVehicles = vehicles.filter(v => {
      const isOtherHub = v.currentPickupPointId !== selectedPickup;
      const matchesDest = v.destination.toLowerCase().includes(selectedDestination.toLowerCase()) ||
        selectedDestination.toLowerCase().includes(v.destination.toLowerCase());
      const hasSeats = v.availableSeats >= passengers;
      const isNotStale = !v.isStale;
      const isNotDeparted = v.status !== 'departed';
      const matchesType = transportType === 'all' || v.vehicleType === transportType;
      return isOtherHub && matchesDest && hasSeats && isNotStale && isNotDeparted && matchesType;
    });

    if (candidateVehicles.length > 0) {
      candidateVehicles.sort((a, b) => b.availableSeats - a.availableSeats);
      const bestAlt = candidateVehicles[0];
      const altHub = pickupPoints.find(p => p.id === bestAlt.currentPickupPointId);
      if (altHub) {
        alternativeSuggestion = {
          hub: altHub,
          vehicle: bestAlt,
          distanceInfo: 'Adjacent corridor stand (~800m - 1.2km walk/feeder)',
          reason: `No vehicle directly at ${currentHub?.name || selectedPickup} has ${passengers} seat(s) for "${selectedDestination}" ${transportType !== 'all' ? `(${transportType.replace('_', ' ')})` : ''}. However, ${altHub.name} has ${bestAlt.availableSeats} seat(s) on ${bestAlt.model} (${bestAlt.registrationNumber}) heading there right now.`,
        };
      }
    }
  }

  const handleBoard = (vehicle: Vehicle) => {
    onBoardRide(vehicle.id, passengers);
    setBoardSuccessMessage(`Boarded ${passengers} passenger(s) on ${vehicle.registrationNumber} to ${vehicle.destination}! Telemetry capacity updated.`);
    setTimeout(() => {
      setBoardSuccessMessage(null);
    }, 4500);
  };

  const getVehicleBadge = (type: string) => {
    switch (type) {
      case 'shared_van': return '🚐 Shared Van (Tum-Tum)';
      case 'e_rickshaw': return '⚡ E-Rickshaw Feeder';
      case 'local_minibus': return '🚌 Local Minibus Shuttle';
      default: return '🛺 Shared Auto-Rickshaw';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="max-w-3xl mb-4">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Smart Informal Ride Matcher</h2>

          </div>
          <p className="text-xs text-slate-400 mt-1">
            Search for shared autos, vans, and feeder shuttles with verified available seat counts, fresh telemetry pings, and intelligent fallback to nearby stands when local stands are depleted.
          </p>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Pickup Point */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Pickup Point</span>
            </label>
            <select
              value={selectedPickup}
              onChange={(e) => setSelectedPickup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              {pickupPoints.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.name} ({hub.totalAvailableSeats} seats)
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Destination</span>
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              {allDestinations.map((dest, i) => (
                <option key={i} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>

          {/* Transport Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Transport Type</span>
            </label>
            <select
              value={transportType}
              onChange={(e) => setTransportType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Vehicles (Autos &amp; Vans)</option>
              <option value="shared_auto">🛺 Shared Auto-Rickshaws (3S)</option>
              <option value="shared_van">🚐 Shared Vans / Tum-Tums (6S)</option>
              <option value="e_rickshaw">⚡ Electric Rickshaws (4S)</option>
              <option value="local_minibus">🚌 Local Minibuses (9S)</option>
            </select>
          </div>

          {/* Passengers Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Passengers</span>
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPassengers(num)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    passengers === num
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Informative Disclaimer */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Only driver-submitted GPS pings are listed. Availability can be stale if a driver has not checked in recently; fares are driver-reported.</span>
        </div>
      </div>

      {/* Success Notification */}
      {boardSuccessMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-200 flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{boardSuccessMessage}</span>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Matching Rides for {passengers} passenger(s)</span>
            <span className="text-xs text-slate-400 font-normal">
              from <strong className="text-amber-400 font-semibold">{currentHub?.name}</strong> to <strong className="text-emerald-400 font-semibold">{selectedDestination}</strong>
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {directMatches.length} vehicle(s) ready with &ge;{passengers} seat(s)
          </span>
        </div>

        {/* Direct Matches Cards */}
        {directMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {directMatches.map((v) => {
              const minutesAgo = Math.max(1, Math.floor((Date.now() - v.lastPingTimestamp) / 60000));
              const totalFare = v.farePerHead * passengers;

              return (
                <div
                  key={v.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-amber-500/50 transition-all"
                >
                  <div className="space-y-3">
                    {/* Top Row: Type and Telemetry Freshness */}
                    <div className="flex items-start justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-300">
                        {getVehicleBadge(v.vehicleType)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        <Clock className="w-3 h-3" />
                        Pinged {minutesAgo}m ago
                      </span>
                    </div>

                    {/* Driver & Reg Details */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-white font-mono">{v.registrationNumber}</h4>
                        <span className="text-xs font-semibold text-amber-400">★ {v.rating}</span>
                      </div>
                      <p className="text-xs text-slate-400">{v.model} &bull; Driver: {v.driverName}</p>
                    </div>

                    {/* Route Corridor */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="text-slate-400 flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>Via: {v.routeVia}</span>
                      </div>
                      <div className="text-slate-300 font-medium">
                        Destination: <strong className="text-emerald-400">{v.destination}</strong>
                      </div>
                    </div>

                    {/* Seats & Fare */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Seats Remaining</span>
                        <span className="text-emerald-400 font-mono font-bold text-sm">
                          {v.availableSeats} of {v.totalCapacity}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Fare ({passengers} Pax)</span>
                        <span className="text-amber-400 font-mono font-bold text-sm">
                          ₹{totalFare} (₹{v.farePerHead}/ea)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                    <button
                      onClick={() => handleBoard(v)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Board Ride (Demo Simulation)</span>
                    </button>

                    <button
                      onClick={() => onViewOnMap(v.currentPickupPointId)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Pickup on Street Map</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct match empty card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <div>
                <h4 className="text-white font-bold text-sm">No Suitable Vehicle Available Right Now</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  There are no informal vehicles currently staged at <strong className="text-white">{currentHub?.name}</strong> with at least <strong className="text-white">{passengers} seat(s)</strong> {transportType !== 'all' ? `of type "${transportType.replace('_', ' ')}"` : ''} heading to <strong className="text-white">{selectedDestination}</strong>.
                </p>
              </div>
            </div>

            {/* Smart Alternative Hub Suggestion (ONLY when sample data supports it) */}
            {alternativeSuggestion && (
              <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>TransitPulse Smart Fallback: Nearby Stand Found</span>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded uppercase">
                    Sample Data Confirmed
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {alternativeSuggestion.reason}
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nearby Stand: {alternativeSuggestion.hub.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {alternativeSuggestion.distanceInfo} &bull; {alternativeSuggestion.hub.landmark}
                    </div>
                    <div className="text-xs text-emerald-400 font-mono font-medium">
                      Vehicle: {alternativeSuggestion.vehicle.model} ({alternativeSuggestion.vehicle.registrationNumber}) &bull; {alternativeSuggestion.vehicle.availableSeats} seats ready &bull; ₹{alternativeSuggestion.vehicle.farePerHead}/seat
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewOnMap(alternativeSuggestion!.hub.id)}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      View Stand on Map
                    </button>
                    <button
                      onClick={() => handleBoard(alternativeSuggestion!.vehicle)}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                    >
                      Board Alternate Vehicle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!alternativeSuggestion && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 text-center leading-relaxed">
                No recently pinged vehicle is currently heading towards &quot;{selectedDestination}&quot; across any monitored stands. Try selecting another destination such as &quot;Shivajinagar Market&quot; or &quot;Manyata Tech Park Gate 1&quot;.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
