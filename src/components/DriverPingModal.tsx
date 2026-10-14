import React, { useState } from 'react';
import {
  PickupPoint,
  Vehicle,
  VehicleType
} from '../types/transit';
import {
  Zap,
  X,
  Car,
  MapPin,
  Users,
  Navigation,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface DriverPingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickupPoints: PickupPoint[];
  vehicles: Vehicle[];
  preselectedHubId?: string;
  onDriverPingSubmitted: (data: any) => void;
}

export const DriverPingModal: React.FC<DriverPingModalProps> = ({
  isOpen,
  onClose,
  pickupPoints,
  vehicles,
  preselectedHubId,
  onDriverPingSubmitted,
}) => {
  const [mode, setMode] = useState<'existing' | 'new'>(vehicles.length ? 'existing' : 'new');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  
  // New vehicle fields
  const [pickupPointId, setPickupPointId] = useState<string>(preselectedHubId || pickupPoints[0]?.id || 'current-location');
  const [vehicleType, setVehicleType] = useState<VehicleType>('shared_auto');
  const [registrationNumber, setRegistrationNumber] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [availableSeats, setAvailableSeats] = useState<number>(3);
  const [farePerHead, setFarePerHead] = useState<number>(30);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setStatusMessage('Sending driver ping...');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('This browser does not support GPS location.'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      const liveLat = position.coords.latitude;
      const liveLng = position.coords.longitude;
      let payload: any;

      if (mode === 'existing' && selectedVehicle) {
        payload = {
          vehicleId: selectedVehicle.id,
          registrationNumber: selectedVehicle.registrationNumber,
          vehicleType: selectedVehicle.vehicleType,
          driverName: selectedVehicle.driverName,
          pickupPointId: 'current-location',
          destination: selectedVehicle.destination,
          availableSeats: availableSeats,
          farePerHead: selectedVehicle.farePerHead,
          lat: liveLat,
          lng: liveLng,
        };
      } else {
        payload = {
          pickupPointId: 'current-location',
          vehicleType,
          registrationNumber,
          driverName,
          destination,
          availableSeats,
          farePerHead,
          lat: liveLat,
          lng: liveLng,
        };
      }

      const response = await fetch('/api/driver-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit driver ping');
      }

      onDriverPingSubmitted(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error broadcasting driver ping. Please check backend connection.');
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Broadcast Driver Telemetry</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                  GPS PING
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Send this device's GPS position and available seats to the server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Ping Existing Vehicle vs Register New */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-800/80 pb-3">
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'existing'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Update Existing Vehicle ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'new'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            + Register New Vehicle Ping
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500 text-amber-200 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {mode === 'existing' ? (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  <span>Select vehicle to update:</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                    const v = vehicles.find(veh => veh.id === e.target.value);
                    if (v) setAvailableSeats(v.availableSeats);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                >
                  {vehicles.map((v) => {
                    const hub = pickupPoints.find(p => p.id === v.currentPickupPointId);
                    return (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.model}) &bull; {hub?.name?.split(' ')[0] || v.currentPickupPointId} &bull; {v.isStale ? '[STALE]' : '[ONLINE]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedVehicle && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Driver: <strong className="text-white">{selectedVehicle.driverName}</strong></span>
                    <span className="text-amber-400 font-mono">{selectedVehicle.destination}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Fare: ₹{selectedVehicle.farePerHead}/seat</span>
                    <span>Status: <strong className={selectedVehicle.isStale ? 'text-rose-400' : 'text-emerald-400'}>{selectedVehicle.isStale ? 'Stale (>15m)' : 'Fresh'}</strong></span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pickup Stand */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Staged Station / Stand</span>
                </label>
                <select
                  value={pickupPointId}
                  onChange={(e) => setPickupPointId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="current-location">Use my current GPS location</option>
                  {pickupPoints.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.landmark})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Vehicle Classification</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'shared_auto', label: '🛺 Auto (3S)' },
                    { id: 'shared_van', label: '🚐 Van (6S)' },
                    { id: 'e_rickshaw', label: '⚡ E-Rickshaw' },
                    { id: 'local_minibus', label: '🚌 Minibus (9S)' },
                  ].map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setVehicleType(t.id as VehicleType)}
                      className={`py-2 px-2 text-[11px] font-semibold rounded-xl border text-center transition-all ${
                        vehicleType === t.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Driver Name & Reg Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Enter driver name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Registration #</label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Vehicle registration"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Destination & Fare */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-sky-400" />
                    <span>Destination Route</span>
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Where are you going?"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Fare (₹/seat)</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={farePerHead}
                    onChange={(e) => setFarePerHead(parseInt(e.target.value, 10) || 20)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Seat Capacity Control (Shared between both modes) */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Available Seats (Now Empty):</span>
              </span>
              <span className="text-amber-400 font-mono font-bold text-sm">
                {availableSeats} seats available
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={mode === 'existing' && selectedVehicle ? selectedVehicle.totalCapacity : (vehicleType === 'shared_van' ? 6 : (vehicleType === 'local_minibus' ? 9 : 4))}
              value={availableSeats}
              onChange={(e) => setAvailableSeats(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0 (Full / In-Transit)</span>
              <span>Max Capacity</span>
            </div>
          </div>

          {/* Honest Disclaimer notice */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Simulates an informal driver check-in. Resets stale timer and updates capacity metrics.</span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending driver ping...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Send Demo Driver Ping</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
