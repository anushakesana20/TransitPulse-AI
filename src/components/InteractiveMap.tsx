import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  PickupPoint,
  Vehicle,
  DisruptionIncident,
  CapacityTier,
  UserLocation
} from '../types/transit';
import {
  MapPin,
  AlertTriangle,
  CloudRain,
  Car,
  Clock,
  Navigation,
  ShieldAlert,
  Users,
  Filter,
  ArrowRight,
  Zap,
  Locate,
  RotateCcw,
  Maximize2,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';

interface InteractiveMapProps {
  pickupPoints: PickupPoint[];
  vehicles: Vehicle[];
  disruptions: DisruptionIncident[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string) => void;
  onMatchRideFromHub: (hubId: string) => void;
  onDriverPingAtHub: (hubId: string) => void;
  onQuickVehiclePing: (vehicleId: string) => void;
  onUpdateVehicleSeats?: (vehicleId: string, delta: number) => void;
  userLocation: UserLocation | null;
  onUserLocationFound: (loc: UserLocation) => void;
  userLocationError: string | null;
  setUserLocationError: (err: string | null) => void;
}

// Neutral initial view. The map recenters to browser GPS when permission is granted.
const INITIAL_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickupPoints,
  vehicles,
  disruptions,
  selectedHubId,
  onSelectHub,
  onMatchRideFromHub,
  onDriverPingAtHub,
  onQuickVehiclePing,
  onUpdateVehicleSeats,
  userLocation,
  onUserLocationFound,
  userLocationError,
  setUserLocationError,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [showVehicles, setShowVehicles] = useState<boolean>(true);
  const [showDisruptions, setShowDisruptions] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [tileError, setTileError] = useState<boolean>(false);

  const selectedHub = pickupPoints.find(p => p.id === selectedHubId) || null;

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: userLocation ? [userLocation.lat, userLocation.lng] : INITIAL_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: true,
      });

      // Standard OpenStreetMap Tiles with attribution
      const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);

      // Markers LayerGroup
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Invalidate size after mounting to fix layout shifts
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.error('Failed to initialize Leaflet map:', err);
      setTileError(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], Math.max(mapInstanceRef.current.getZoom(), 14), { animate: true });
    }
  }, [userLocation]);

  // Recenter / Fit All
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (userLocation) mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15, { animate: true });
    else mapInstanceRef.current.setView(INITIAL_CENTER, DEFAULT_ZOOM, { animate: true });
  };

  const handleFitAllMarkers = () => {
    if (!mapInstanceRef.current) return;
    const allCoords: [number, number][] = [
      ...pickupPoints.map(p => [p.lat, p.lng] as [number, number]),
      ...vehicles.map(v => [v.lat, v.lng] as [number, number]),
    ];
    if (userLocation) {
      allCoords.push([userLocation.lat, userLocation.lng]);
    }
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  // Browser Geolocation API ("Use My Location")
  const handleRequestUserLocation = () => {
    if (!navigator.geolocation) {
      setUserLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setUserLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        onUserLocationFound(loc);

        // Center map to real location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([loc.lat, loc.lng], 14, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setUserLocationError('Location permission denied. Please allow location access in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setUserLocationError('Location information is unavailable on this device.');
            break;
          case err.TIMEOUT:
            setUserLocationError('Location request timed out. Please try again.');
            break;
          default:
            setUserLocationError('An unknown error occurred while retrieving your location.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Redraw markers when data or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 1. Render User Location Marker if available
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-sky-500/30 user-location-pin absolute"></div>
            <div class="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-lg relative z-10 flex items-center justify-center text-[8px] text-slate-950 font-bold">
              •
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindPopup(`
        <div class="p-3 bg-slate-900 text-white min-w-[200px]">
          <div class="flex items-center gap-1.5 text-sky-400 font-bold text-xs mb-1">
            <span>📍 Your Real Geolocation</span>
          </div>
          <div class="text-[11px] text-slate-300">
            Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}
          </div>
          <div class="text-[10px] text-slate-400 mt-1">
            Browser GPS Accuracy: ±${Math.round(userLocation.accuracy || 10)}m
          </div>
        </div>
      `);
      layer.addLayer(userMarker);
      userMarkerRef.current = userMarker;
    }

    // 2. Render Pickup Points (Hubs)
    pickupPoints.forEach((hub) => {
      const isSelected = selectedHubId === hub.id;
      const hasDisruption = !!hub.activeDisruptionId;
      const tierColor =
        hub.capacityTier === 'high' ? '#10b981' :
        hub.capacityTier === 'moderate' ? '#f59e0b' :
        hub.capacityTier === 'low' ? '#f97316' : '#ef4444';

      const hubIcon = L.divIcon({
        className: 'custom-hub-icon',
        html: `
          <div class="cursor-pointer group flex flex-col items-center">
            <div style="background-color: ${tierColor}; box-shadow: 0 4px 14px ${tierColor}80;"
                 class="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-950 font-black border-2 border-white transition-transform ${isSelected ? 'scale-125 ring-4 ring-amber-400' : ''}">
              ${hasDisruption ? '⚠️' : '📍'}
              <div class="absolute -bottom-1 -right-1 px-1 rounded-full text-[9px] font-black bg-slate-950 text-white border border-slate-700">
                ${hub.totalAvailableSeats}s
              </div>
            </div>
            <div class="bg-slate-950/95 border border-slate-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 whitespace-nowrap shadow-md">
              ${hub.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [42, 54],
        iconAnchor: [21, 27],
      });

      const hubMarker = L.marker([hub.lat, hub.lng], { icon: hubIcon });

      const popupHtml = `
        <div class="p-3.5 bg-slate-900 text-white min-w-[240px] space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded border" style="background-color: ${tierColor}25; color: ${tierColor}; border-color: ${tierColor}60;">
              ${hub.capacityTier.toUpperCase()} AVAILABILITY
            </span>
            
          </div>
          <div>
            <h4 class="font-bold text-sm text-white">${hub.name}</h4>
            <p class="text-[11px] text-amber-400 font-mono">${hub.localName}</p>
            <p class="text-[10px] text-slate-400 mt-0.5">${hub.landmark}</p>
          </div>
          <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-center">
            <div>
              <span class="text-slate-400 block text-[9px]">Staged Vehicles</span>
              <strong class="text-amber-400 text-xs">${hub.availableVehiclesCount}</strong>
            </div>
            <div>
              <span class="text-slate-400 block text-[9px]">Available Seats</span>
              <strong class="text-emerald-400 text-xs">${hub.totalAvailableSeats} seats</strong>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Lat: ${hub.lat.toFixed(4)}, Lng: ${hub.lng.toFixed(4)}</span>
            <span>Risk: ${hub.waterloggingRisk}</span>
          </div>
        </div>
      `;

      hubMarker.bindPopup(popupHtml);
      hubMarker.on('click', () => {
        onSelectHub(hub.id);
      });

      layer.addLayer(hubMarker);
    });

    // 3. Render Vehicles if enabled
    if (showVehicles) {
      const filteredVehs = vehicles.filter(v => {
        if (vehicleFilter === 'all') return true;
        return v.vehicleType === vehicleFilter;
      });

      filteredVehs.forEach((v) => {
        const isStale = v.isStale;
        const minutesAgo = Math.max(1, Math.floor((Date.now() - v.lastPingTimestamp) / 60000));
        const iconSymbol =
          v.vehicleType === 'shared_van' ? '🚐' :
          v.vehicleType === 'e_rickshaw' ? '⚡' :
          v.vehicleType === 'local_minibus' ? '🚌' : '🛺';

        const vehIcon = L.divIcon({
          className: 'custom-veh-icon',
          html: `
            <div class="cursor-pointer transition-transform hover:scale-125 ${isStale ? 'opacity-60 grayscale' : ''}">
              <div class="bg-slate-900 border ${isStale ? 'border-rose-500' : 'border-amber-400'} rounded-lg px-1.5 py-1 flex items-center gap-1 shadow-lg text-white">
                <span class="text-xs">${iconSymbol}</span>
                <span class="text-[10px] font-bold font-mono ${v.availableSeats > 0 ? 'text-emerald-400' : 'text-slate-400'}">
                  ${v.availableSeats}s
                </span>
                ${isStale ? '<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>' : ''}
              </div>
            </div>
          `,
          iconSize: [44, 26],
          iconAnchor: [22, 13],
        });

        const vehMarker = L.marker([v.lat, v.lng], { icon: vehIcon });

        const vehPopupHtml = `
          <div class="p-3.5 bg-slate-900 text-white min-w-[250px] space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase font-mono">
                LIVE GPS VEHICLE
              </span>
              <span class="text-[10px] ${isStale ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${isStale ? '⚠️ STALE PING (>15m)' : `Pinged ${minutesAgo}m ago`}
              </span>
            </div>
            <div>
              <div class="font-bold text-sm text-white flex items-center justify-between">
                <span>${v.registrationNumber}</span>
                <span class="text-amber-400 text-xs">★ ${v.rating}</span>
              </div>
              <p class="text-[11px] text-slate-400">${v.model} &bull; Driver: ${v.driverName}</p>
            </div>
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <div>Route: <strong class="text-emerald-400">${v.destination}</strong></div>
              <div class="text-[10px] text-slate-400">Via: ${v.routeVia}</div>
              <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span class="text-slate-400">Available: <strong class="text-emerald-400 font-mono">${v.availableSeats}/${v.totalCapacity}</strong></span>
                <span class="text-amber-400 font-mono font-bold">₹${v.farePerHead}/seat</span>
              </div>
            </div>
            <div class="text-[9px] text-slate-500">
              Geo: ${v.lat.toFixed(4)}, ${v.lng.toFixed(4)} &bull; Status: ${v.status}
            </div>
          </div>
        `;

        vehMarker.bindPopup(vehPopupHtml);
        layer.addLayer(vehMarker);
      });
    }

    // 4. Render Disruption Reports if enabled
    if (showDisruptions) {
      disruptions.forEach((d) => {
        if (!d.lat || !d.lng) return;

        const dispIcon = L.divIcon({
          className: 'custom-disp-icon',
          html: `
            <div class="relative cursor-pointer animate-bounce">
              <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white text-xs shadow-xl">
                ${d.disruptionType.includes('Waterlogging') ? '🌧️' : '⚠️'}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const dispMarker = L.marker([d.lat, d.lng], { icon: dispIcon });
        const dispPopupHtml = `
          <div class="p-3.5 bg-slate-900 text-white min-w-[240px] space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 uppercase">
                ${d.severity} DISRUPTION
              </span>
              <span class="text-[10px] text-slate-400">${d.reportedAt}</span>
            </div>
            <h4 class="font-bold text-xs text-white">${d.title}</h4>
            <p class="text-[11px] text-slate-300 leading-relaxed">${d.passengerImpactSummary}</p>
            <div class="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-amber-300">
              <strong>Commuter Detour:</strong> ${d.suggestedAction}
            </div>
            <div class="text-[9px] text-slate-400 pt-1 border-t border-slate-800">
              Verification: ${d.verificationStatus.replace(/_/g, ' ')}
            </div>
          </div>
        `;
        dispMarker.bindPopup(dispPopupHtml);
        layer.addLayer(dispMarker);
      });
    }
  }, [pickupPoints, vehicles, disruptions, selectedHubId, vehicleFilter, showVehicles, showDisruptions, userLocation]);

  return (
    <div className="space-y-4">
      {/* Map Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl">
        {/* Left: Filter by transport type */}
        <div className="flex flex-wrap items-center gap-2 text-slate-300">
          <Filter className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white">Filter Fleet:</span>
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'all', label: 'All Fleet' },
              { id: 'shared_auto', label: '🛺 Autos' },
              { id: 'shared_van', label: '🚐 Vans' },
              { id: 'e_rickshaw', label: '⚡ E-Rickshaws' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setVehicleFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  vehicleFilter === f.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center / Right: Map toggles and location actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white text-xs">
            <input
              type="checkbox"
              checked={showVehicles}
              onChange={(e) => setShowVehicles(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span>Show Vehicles ({vehicles.length})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white text-xs">
            <input
              type="checkbox"
              checked={showDisruptions}
              onChange={(e) => setShowDisruptions(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
            />
            <span>Show Hazards ({disruptions.length})</span>
          </label>

          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
            {/* Geolocation Button */}
            <button
              onClick={handleRequestUserLocation}
              disabled={isLocating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                userLocation
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              } disabled:opacity-50`}
              title="Show my current real location on map"
            >
              <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-sky-400' : 'text-sky-400'}`} />
              <span>{isLocating ? 'Locating...' : userLocation ? 'My Location Active' : 'Use My Location'}</span>
            </button>

            {/* Recenter button */}
            <button
              onClick={handleRecenter}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Recenter map to my current location"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Fit all */}
            <button
              onClick={handleFitAllMarkers}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Fit all markers in viewport"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Geolocation Error Alert if any */}
      {userLocationError && (
        <div className="bg-amber-950/70 border border-amber-600/50 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{userLocationError}</span>
          </div>
          <button
            onClick={() => setUserLocationError(null)}
            className="text-amber-400 hover:text-white font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Leaflet Map + Station Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Real Geographic Map Viewport */}
        <div className="lg:col-span-2 relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl min-h-[520px] flex flex-col">
          {/* Header Overlay Badges */}
          <div className="absolute top-3 left-12 z-20 pointer-events-none flex items-center gap-2">
            <div className="bg-slate-900/90 border border-slate-800 backdrop-blur rounded-lg px-2.5 py-1 text-[11px] text-slate-300 flex items-center gap-2 pointer-events-auto shadow-lg">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-white">Live Nearby Transit Map</span>
            </div>
          </div>

          {/* Fallback Error Overlay if tile fails */}
          {tileError && (
            <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <div>
                <h4 className="font-bold text-white text-sm">Map Tile Connection Issue</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Could not load OpenStreetMap street tiles from the network. Check internet connectivity.
                </p>
              </div>
              <button
                onClick={() => {
                  setTileError(false);
                  if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Retry Map Tiles
              </button>
            </div>
          )}

          {/* Leaflet Map DOM Element */}
          <div ref={mapContainerRef} className="w-full h-[520px] rounded-2xl" />

          {/* Map Footer Disclaimer & Attribution */}
          <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 z-20">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">Station Capacity:</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> High (8+ seats)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Mod (3-7)
              </span>
              <span className="flex items-center gap-1 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Low (1-2)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical / 0
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              OpenStreetMap streets &bull; Vehicle markers appear only after a driver sends a GPS ping
            </div>
          </div>
        </div>

        {/* Selected Station Inspector Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          {selectedHub ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedHub.capacityTier === 'high' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                    selectedHub.capacityTier === 'moderate' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
                    selectedHub.capacityTier === 'low' ? 'bg-orange-950 text-orange-300 border border-orange-600' :
                    'bg-rose-950 text-rose-300 border border-rose-600'
                  }`}>
                    {selectedHub.capacityTier} Availability
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated {selectedHub.lastUpdated}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1.5">{selectedHub.name}</h3>
                <p className="text-xs text-amber-400/90 font-mono mt-0.5">{selectedHub.localName}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{selectedHub.landmark}</span>
                </p>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Coordinates: {selectedHub.lat.toFixed(4)}° N, {selectedHub.lng.toFixed(4)}° E
                </div>
              </div>

              {/* Active Disruption Notice if any */}
              {selectedHub.activeDisruptionId && (() => {
                const disp = disruptions.find(d => d.id === selectedHub.activeDisruptionId);
                if (!disp) return null;
                return (
                  <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-300 font-bold">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>{disp.title}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{disp.passengerImpactSummary}</p>
                    <div className="text-[10px] text-rose-300/80 bg-rose-900/40 p-1.5 rounded">
                      <strong>Detour advice:</strong> {disp.suggestedAction}
                    </div>
                  </div>
                );
              })()}

              {/* Station Metrics */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Staged Vehicles</div>
                  <div className="text-xl font-black text-amber-400 font-mono">{selectedHub.availableVehiclesCount}</div>
                  <div className="text-[10px] text-slate-500">Demo telemetry</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Available Seats</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">{selectedHub.totalAvailableSeats}</div>
                  <div className="text-[10px] text-slate-500">Ready to board</div>
                </div>
              </div>

              {/* Vehicles Staged at this Hub */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Vehicles at Station</span>
                  <span className="text-[10px] text-slate-500 font-normal">Click to Ping / Heartbeat</span>
                </h4>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                  {vehicles
                    .filter(v => v.currentPickupPointId === selectedHub.id)
                    .map((v) => {
                      const minutesAgo = Math.max(1, Math.floor((Date.now() - v.lastPingTimestamp) / 60000));
                      return (
                        <div
                          key={v.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            v.isStale
                              ? 'bg-slate-950/50 border-rose-900/60 text-slate-400'
                              : 'bg-slate-950 border-slate-800 text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{v.registrationNumber}</span>
                              {v.isStale && (
                                <span className="text-[9px] bg-rose-950 text-rose-300 px-1 py-0.2 rounded border border-rose-800">
                                  STALE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              to {v.destination} &bull; ₹{v.farePerHead}/seat
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className={`font-mono font-bold ${v.availableSeats > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {v.availableSeats}/{v.totalCapacity}s
                              </div>
                              <div className="text-[9px] text-slate-500">
                                {minutesAgo}m ago
                              </div>
                            </div>

                            {/* Quick Ping / Heartbeat Action */}
                            <button
                              onClick={() => onQuickVehiclePing(v.id)}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                              title="Send Demo Ping / Heartbeat for this vehicle"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {vehicles.filter(v => v.currentPickupPointId === selectedHub.id).length === 0 && (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                      No vehicles currently registered at this bay.
                    </div>
                  )}
                </div>
              </div>

              {/* Station Actions */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onMatchRideFromHub(selectedHub.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Find Ride Here</span>
                </button>
                <button
                  onClick={() => onDriverPingAtHub(selectedHub.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ping as Driver</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
              <MapPin className="w-12 h-12 text-slate-700 animate-pulse" />
              <div>
                <h4 className="text-white font-semibold text-sm">Select a Geographic Station</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Click on any station marker or vehicle pin on the real OpenStreetMap street map to inspect availability, real coordinates, and send demo heartbeats.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {pickupPoints.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectHub(p.id);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([p.lat, p.lng], 14, { animate: true });
                      }
                    }}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
