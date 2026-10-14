export type CapacityTier = 'high' | 'moderate' | 'low' | 'critical';

export type VehicleType = 'shared_auto' | 'shared_van' | 'e_rickshaw' | 'local_minibus';

export type DisruptionSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface PickupPoint {
  id: string;
  name: string;
  localName: string; // e.g. Kannada / Hindi
  zone: string;
  landmark: string;
  coordinates: { x: number; y: number }; // Relative coordinates for vector overlays
  lat: number;
  lng: number;
  connectedDestinations: string[];
  normalDailyBoardings: string;
  capacityTier: CapacityTier;
  availableVehiclesCount: number;
  totalAvailableSeats: number;
  lastUpdated: string;
  activeDisruptionId?: string;
  hasShelter: boolean;
  waterloggingRisk: 'Low' | 'Medium' | 'Severe';
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  model: string; // e.g. "Bajaj Compact 4S", "Tata Magic Express", "Force Cruiser"
  driverName: string;
  driverPhoneDemo: string;
  currentPickupPointId: string;
  destination: string;
  routeVia: string;
  totalCapacity: number;
  availableSeats: number;
  farePerHead: number; // in INR (₹)
  lastPingTimestamp: number; // epoch ms
  isStale: boolean; // calculated if > 15 mins
  status: 'available' | 'filling' | 'departed' | 'delayed_traffic';
  rating: number;
  ecoFriendly?: boolean;
  lat: number;
  lng: number;
}

export interface DisruptionIncident {
  id: string;
  title: string;
  locationName: string;
  closestHubId: string;
  lat?: number;
  lng?: number;
  disruptionType: string;
  severity: DisruptionSeverity;
  affectedTransport: string[];
  evidence: string;
  suggestedAction: string;
  confidenceScore: number; // 0 - 100
  verificationStatus: 'UNVERIFIED_COMMUTER_REPORT' | 'MULTI_SOURCE_PENDING' | 'CONFIRMED_ANOMALY';
  reportedAt: string;
  reportRawText: string;
  isAiAnalyzed: boolean;
  passengerImpactSummary: string;
  recommendedAlternateNodeId?: string;
}

export interface RideMatchRequest {
  pickupPointId: string;
  destination: string;
  passengers: number;
  vehicleType?: VehicleType | 'all';
}

export interface RideMatchResult {
  matchedVehicles: Vehicle[];
  recommendedAlternativeHub?: {
    hub: PickupPoint;
    vehicle: Vehicle;
    distanceInfo: string;
    reason: string;
  };
  totalDirectMatches: number;
}

export interface DriverPingPayload {
  vehicleId?: string;
  registrationNumber?: string;
  vehicleType?: VehicleType;
  driverName?: string;
  pickupPointId: string;
  destination: string;
  availableSeats: number;
  totalCapacity?: number;
  farePerHead?: number;
  lat?: number;
  lng?: number;
}

export interface PingLogEntry {
  id: string;
  vehicleId: string;
  registrationNumber: string;
  driverName: string;
  hubId: string;
  hubName: string;
  destination: string;
  timestamp: number;
  seats: number;
  status: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface AIAnalysisResponse {
  success: boolean;
  incident?: DisruptionIncident;
  error?: string;
  details?: string;
  apiKeyConfigured?: boolean;
}
