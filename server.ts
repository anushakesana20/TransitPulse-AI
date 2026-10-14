import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  PickupPoint,
  Vehicle,
  DisruptionIncident,
  CapacityTier,
  RideMatchResult
} from './src/types/transit.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory persistent state across requests during runtime
// Start empty: never present invented fleet telemetry as live data. Vehicles appear only after a real GPS ping.
let pickupPoints: PickupPoint[] = [];
let vehicles: Vehicle[] = [];
let disruptions: DisruptionIncident[] = [];

// Stale threshold: 15 minutes
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

function recalculateCapacities() {
  const now = Date.now();

  // 1. Update vehicle staleness
  for (const v of vehicles) {
    v.isStale = (now - v.lastPingTimestamp) > STALE_THRESHOLD_MS;
  }

  // 2. Update pickup points metrics
  for (const hub of pickupPoints) {
    const activeVehicles = vehicles.filter(
      v => v.currentPickupPointId === hub.id && !v.isStale && v.status !== 'departed'
    );

    const totalSeats = activeVehicles.reduce((sum, v) => sum + Math.max(0, v.availableSeats), 0);
    hub.availableVehiclesCount = activeVehicles.length;
    hub.totalAvailableSeats = totalSeats;

    // Check active disruption
    const activeDisp = disruptions.find(d => d.id === hub.activeDisruptionId);

    if (activeDisp && activeDisp.severity === 'Critical') {
      hub.capacityTier = 'critical';
    } else if (activeVehicles.length === 0 || totalSeats === 0) {
      hub.capacityTier = 'critical';
    } else if (activeVehicles.length >= 3 && totalSeats >= 8) {
      hub.capacityTier = 'high';
    } else if (activeVehicles.length >= 2 && totalSeats >= 3) {
      hub.capacityTier = 'moderate';
    } else {
      hub.capacityTier = 'low';
    }
  }
}

// Initial calculation
recalculateCapacities();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Google GenAI client instance
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health and config status
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'online',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV || 'development',
      serverTime: new Date().toISOString(),
      activeNodes: pickupPoints.length,
      activeVehicles: vehicles.filter(v => !v.isStale).length,
      disruptionsCount: disruptions.length,
    });
  });

  // Get all transit state
  app.get('/api/transit-data', (req, res) => {
    recalculateCapacities();
    res.json({
      pickupPoints,
      vehicles,
      disruptions,
      lastUpdated: new Date().toISOString(),
      staleThresholdMinutes: 15,
      isDemoData: false,
      dataSource: 'driver-submitted GPS pings; no fleet feed is connected',
    });
  });

  // Driver Ping / Update Seat availability
  app.post('/api/driver-ping', (req, res) => {
    try {
      const {
        vehicleId,
        registrationNumber,
        vehicleType = 'shared_auto',
        driverName = 'Field Driver',
        pickupPointId,
        destination,
        availableSeats,
        farePerHead = 25,
        lat,
        lng,
      } = req.body;

      if (!destination || availableSeats === undefined || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return res.status(400).json({ error: 'destination, availableSeats, and a valid browser GPS latitude/longitude are required. Enable location permission and retry.' });
      }
      if (Number(lat) < -90 || Number(lat) > 90 || Number(lng) < -180 || Number(lng) > 180) {
        return res.status(400).json({ error: 'GPS coordinates are outside valid latitude/longitude ranges.' });
      }

      const seatsNum = Math.max(0, parseInt(availableSeats, 10));
      const now = Date.now();
      const gpsLat = Number(lat);
      const gpsLng = Number(lng);
      // Create/reuse a pickup point around the real reported position (150m radius).
      let hub = pickupPoints.find(p => Math.hypot((p.lat - gpsLat) * 111000, (p.lng - gpsLng) * 111000 * Math.cos(gpsLat * Math.PI / 180)) < 150);
      if (!hub) {
        hub = {
          id: `gps-${Date.now().toString(36)}`,
          name: 'Live GPS Pickup Point',
          localName: 'Current location',
          zone: 'GPS reported area',
          landmark: `GPS ${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`,
          coordinates: { x: 50, y: 50 },
          lat: gpsLat, lng: gpsLng,
          connectedDestinations: [String(destination)],
          normalDailyBoardings: 'Not available',
          capacityTier: 'low',
          availableVehiclesCount: 0, totalAvailableSeats: 0,
          lastUpdated: new Date(now).toISOString(),
          hasShelter: false, waterloggingRisk: 'Low',
        };
        pickupPoints.unshift(hub);
      }
      hub.lastUpdated = new Date(now).toISOString();
      if (!hub.connectedDestinations.includes(String(destination))) hub.connectedDestinations.push(String(destination));
      const pickupId = hub.id;

      let targetVehicle = vehicles.find(v => v.id === vehicleId || (registrationNumber && v.registrationNumber === registrationNumber));

      if (targetVehicle) {
        targetVehicle.currentPickupPointId = pickupId;
        targetVehicle.destination = destination;
        targetVehicle.availableSeats = seatsNum;
        targetVehicle.lastPingTimestamp = now;
        targetVehicle.isStale = false;
        targetVehicle.status = seatsNum > 0 ? 'available' : 'filling';
        if (farePerHead) targetVehicle.farePerHead = farePerHead;
        targetVehicle.lat = gpsLat;
        targetVehicle.lng = gpsLng;
      } else {
        const newVehicleId = `veh-${Date.now().toString().slice(-5)}`;
        const regNum = registrationNumber || `KA-${Math.floor(10 + Math.random() * 89)}-TR-${Math.floor(1000 + Math.random() * 8999)}`;
        targetVehicle = {
          id: newVehicleId,
          registrationNumber: regNum,
          vehicleType: vehicleType,
          model: vehicleType === 'shared_van' ? 'Tata Magic (6S)' : (vehicleType === 'e_rickshaw' ? 'Electric Feeder Rickshaw' : (vehicleType === 'local_minibus' ? 'Force Minibus 9S' : 'Bajaj RE 4S Auto')),
          driverName: driverName,
          driverPhoneDemo: '+91 98XXX XXXXX',
          currentPickupPointId: pickupId,
          destination: destination,
          routeVia: 'Direct Corridor Feeder',
          totalCapacity: vehicleType === 'shared_van' ? 6 : (vehicleType === 'local_minibus' ? 9 : (vehicleType === 'e_rickshaw' ? 4 : 3)),
          availableSeats: seatsNum,
          farePerHead: farePerHead,
          lastPingTimestamp: now,
          isStale: false,
          status: seatsNum > 0 ? 'available' : 'filling',
          rating: 4.8,
          lat: gpsLat,
          lng: gpsLng,
        };
        vehicles.unshift(targetVehicle);
      }

      recalculateCapacities();

      return res.json({
        success: true,
        message: `Live GPS ping registered for ${targetVehicle.registrationNumber} at ${hub.name}`,
        vehicle: targetVehicle,
        pickupPoints,
        timestamp: now,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to register driver ping' });
    }
  });

  // Update vehicle seats directly
  app.post('/api/vehicles/:id/update-seats', (req, res) => {
    try {
      const { id } = req.params;
      const { availableSeats } = req.body;
      const vehicle = vehicles.find(v => v.id === id);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
      const seats = Math.max(0, Math.min(vehicle.totalCapacity, parseInt(availableSeats, 10) || 0));
      vehicle.availableSeats = seats;
      vehicle.lastPingTimestamp = Date.now();
      vehicle.isStale = false;
      vehicle.status = seats > 0 ? 'available' : 'filling';
      recalculateCapacities();
      return res.json({ success: true, vehicle, pickupPoints });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update seats' });
    }
  });

  // Smart Ride Matching
  app.post('/api/ride-match', (req, res) => {
    try {
      recalculateCapacities();
      const { pickupPointId, destination, passengers = 1, vehicleType = 'all' } = req.body;

      if (!pickupPointId || !destination) {
        return res.status(400).json({ error: 'pickupPointId and destination are required' });
      }

      const passengerCount = parseInt(passengers, 10) || 1;
      const currentHub = pickupPoints.find(p => p.id === pickupPointId);

      // Direct matches at current pickup point
      const matchedVehicles = vehicles.filter(v => {
        const isAtHub = v.currentPickupPointId === pickupPointId;
        const matchesDest = v.destination.toLowerCase().includes(destination.toLowerCase()) ||
          destination.toLowerCase().includes(v.destination.toLowerCase());
        const hasSeats = v.availableSeats >= passengerCount;
        const isNotStale = !v.isStale;
        const isNotDeparted = v.status !== 'departed';
        const matchesType = vehicleType === 'all' || v.vehicleType === vehicleType;
        return isAtHub && matchesDest && hasSeats && isNotStale && isNotDeparted && matchesType;
      });

      let recommendedAlternativeHub = undefined;

      // If no direct matches, find if ANY other pickup point has available rides to that destination
      if (matchedVehicles.length === 0) {
        const alternateVehicles = vehicles.filter(v => {
          const isOtherHub = v.currentPickupPointId !== pickupPointId;
          const matchesDest = v.destination.toLowerCase().includes(destination.toLowerCase()) ||
            destination.toLowerCase().includes(v.destination.toLowerCase());
          const hasSeats = v.availableSeats >= passengerCount;
          const isNotStale = !v.isStale;
          const isNotDeparted = v.status !== 'departed';
          const matchesType = vehicleType === 'all' || v.vehicleType === vehicleType;
          return isOtherHub && matchesDest && hasSeats && isNotStale && isNotDeparted && matchesType;
        });

        if (alternateVehicles.length > 0) {
          // Sort by seat count descending
          alternateVehicles.sort((a, b) => b.availableSeats - a.availableSeats);
          const bestAltVehicle = alternateVehicles[0];
          const altHub = pickupPoints.find(p => p.id === bestAltVehicle.currentPickupPointId);

          if (altHub) {
            const distanceInfo = currentHub ? 'Connected corridor stand (~800m - 1.5km)' : 'Nearby transit stand';
            recommendedAlternativeHub = {
              hub: altHub,
              vehicle: bestAltVehicle,
              distanceInfo: distanceInfo,
              reason: `No vehicle with ${passengerCount} seat(s) directly at ${currentHub?.name || pickupPointId} for ${destination}. However, ${altHub.name} has ${bestAltVehicle.vehicleType.replace('_', ' ')} (${bestAltVehicle.registrationNumber}) with ${bestAltVehicle.availableSeats} available seat(s) departing to ${destination}.`,
            };
          }
        }
      }

      const result: RideMatchResult = {
        matchedVehicles,
        recommendedAlternativeHub,
        totalDirectMatches: matchedVehicles.length,
      };

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Ride matching failed' });
    }
  });

  // Interactive simulation actions for demo evaluation
  app.post('/api/simulate-action', (req, res) => {
    try {
      const { action } = req.body;
      const now = Date.now();

      if (action === 'rush_hour_drain') {
        // Drain seats to simulate evening rush
        vehicles.forEach(v => {
          v.availableSeats = Math.max(0, Math.floor(v.availableSeats / 2));
          if (v.availableSeats === 0) v.status = 'filling';
        });
      } else if (action === 'fleet_resupply') {
        // Boost seats & inject pings
        vehicles.forEach(v => {
          v.availableSeats = Math.min(v.totalCapacity, v.availableSeats + 2);
          v.lastPingTimestamp = now;
          v.isStale = false;
          v.status = 'available';
        });
      } else if (action === 'age_pings_stale') {
        // Age pings by 25 mins to show stale marker
        vehicles.forEach((v, index) => {
          if (index % 2 === 0) {
            v.lastPingTimestamp = now - 22 * 60 * 1000;
            v.isStale = true;
          }
        });
      } else if (action === 'reset') {
        pickupPoints = [];
        vehicles = [];
        disruptions = [];
      }

      recalculateCapacities();
      return res.json({
        success: true,
        action,
        pickupPoints,
        vehicles,
        disruptions,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Simulation action failed' });
    }
  });

  // AI Disruption Analyzer - Real Gemini API integration
  app.post('/api/disruptions/analyze', async (req, res) => {
    try {
      const { reportText } = req.body;

      if (!reportText || typeof reportText !== 'string' || reportText.trim().length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a detailed transport disruption description (at least 8 characters).',
        });
      }

      // Check if Gemini API key exists
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          success: false,
          error: 'GEMINI_API_KEY is not configured on the server.',
          details: 'Please ensure GEMINI_API_KEY is set in your environment variables. Never fabricate an AI response when the API is not available.',
          apiKeyConfigured: false,
        });
      }

      const hubSummary = pickupPoints
        .map(h => `- ${h.id}: ${h.name} (${h.landmark})`)
        .join('\n');

      const prompt = `Analyze the following citizen report regarding an informal transit disruption (shared autos, shared vans/tum-tums, e-rickshaws, minibuses) in an Indian urban corridor:

"${reportText}"

Known Transit Nodes:
${hubSummary}

Extract the location, match to closest known node ID (node-1 through node-6 or "unknown"), identify the disruption type, evaluate severity objectively based on user-provided evidence, list affected informal transit modes, identify specific factual evidence quoted from report, recommend concrete commuter actions (detour, alternative hub), and estimate confidence score (0-100).
Remember: This is an unverified citizen report, so flag verification status as UNVERIFIED_COMMUTER_REPORT.`;

      // Call Gemini 3.8 Flash with structured JSON output schema
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are TransitPulse AI Disruption Intelligence Engine. You analyze natural language field reports and passenger crowdsourcing for informal Indian transit systems.
Your job is to parse unstructured reports accurately into structured machine-readable JSON.
Always assess severity conservatively: Low (minor delay), Moderate (30m delay or lane slowdown), High (arterial blockage, fare gouging, partial route cutoff), Critical (waterlogging > 2ft, complete road closure, fleet stoppage).
Never claim unverified citizen reports are confirmed facts.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              location: {
                type: Type.STRING,
                description: 'Identified hub, junction, road, or landmark from report'
              },
              closestHubId: {
                type: Type.STRING,
                description: 'Best matching node ID: node-1, node-2, node-3, node-4, node-5, node-6, or unknown'
              },
              disruptionType: {
                type: Type.STRING,
                description: 'Category: Waterlogging & Rain, Traffic Gridlock, Road Closure, Low Vehicle Availability, Local Event, Strike / Fare Dispute, Vehicle Breakdown, Weather'
              },
              severity: {
                type: Type.STRING,
                description: 'Low, Moderate, High, or Critical'
              },
              affectedTransport: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of transit types affected (e.g. Shared Autos, Shared Vans, E-Rickshaws, Local Buses)'
              },
              evidence: {
                type: Type.STRING,
                description: 'Specific factual details and observations cited in report'
              },
              suggestedAction: {
                type: Type.STRING,
                description: 'Actionable detour or alternative guidance for commuters'
              },
              confidenceScore: {
                type: Type.INTEGER,
                description: 'Confidence score between 0 and 100 based on report clarity'
              },
              passengerImpactSummary: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence executive briefing for transit dispatchers'
              },
              recommendedAlternateNodeId: {
                type: Type.STRING,
                description: 'Suggested alternate node ID (e.g. node-1 to node-6) if applicable'
              }
            },
            required: [
              'location',
              'closestHubId',
              'disruptionType',
              'severity',
              'affectedTransport',
              'evidence',
              'suggestedAction',
              'confidenceScore',
              'passengerImpactSummary'
            ],
          },
        },
      });

      const rawJson = response.text?.trim();
      if (!rawJson) {
        throw new Error('Gemini model returned an empty response.');
      }

      let parsedAI: any;
      try {
        parsedAI = JSON.parse(rawJson);
      } catch (parseErr) {
        throw new Error(`Failed to parse AI response JSON: ${rawJson}`);
      }

      const validSeverity = ['Low', 'Moderate', 'High', 'Critical'].includes(parsedAI.severity)
        ? parsedAI.severity
        : 'Moderate';

      const matchedHubId = pickupPoints.some(h => h.id === parsedAI.closestHubId) ? parsedAI.closestHubId : (pickupPoints[0]?.id || 'unknown');

      const matchedHub = pickupPoints.find(h => h.id === matchedHubId);

      const newIncident: DisruptionIncident = {
        id: `disp-${Date.now().toString().slice(-4)}`,
        title: `${parsedAI.disruptionType} at ${parsedAI.location || 'Reported Junction'}`,
        locationName: parsedAI.location || 'Reported Area',
        closestHubId: matchedHubId,
        lat: matchedHub?.lat,
        lng: matchedHub?.lng,
        disruptionType: parsedAI.disruptionType || 'Unspecified Disruption',
        severity: validSeverity,
        affectedTransport: Array.isArray(parsedAI.affectedTransport) && parsedAI.affectedTransport.length > 0
          ? parsedAI.affectedTransport
          : ['Shared Autos', 'Shared Vans'],
        evidence: parsedAI.evidence || 'Extracted from user report.',
        suggestedAction: parsedAI.suggestedAction || 'Check alternative routes.',
        confidenceScore: Math.min(100, Math.max(10, parsedAI.confidenceScore || 75)),
        verificationStatus: 'UNVERIFIED_COMMUTER_REPORT',
        reportedAt: 'Just now',
        reportRawText: reportText,
        isAiAnalyzed: true,
        passengerImpactSummary: parsedAI.passengerImpactSummary || 'Crowdsourced alert under review.',
        recommendedAlternateNodeId: parsedAI.recommendedAlternateNodeId || undefined,
      };

      // Add to disruption feed
      disruptions.unshift(newIncident);

      // If high or critical, link to the hub
      if (['High', 'Critical'].includes(validSeverity) && matchedHubId) {
        const hub = pickupPoints.find(h => h.id === matchedHubId);
        if (hub) {
          hub.activeDisruptionId = newIncident.id;
        }
      }

      recalculateCapacities();

      return res.json({
        success: true,
        incident: newIncident,
        apiKeyConfigured: true,
        pickupPoints,
      });
    } catch (err: any) {
      console.error('Gemini Disruption Analysis Error:', err);
      return res.status(500).json({
        success: false,
        error: 'Gemini AI Disruption Analysis encountered an error.',
        details: err.message || 'Unknown error occurred while contacting the Gemini model.',
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
      });
    }
  });

  // Setup Vite in development or static serving in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: __dirname,
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TransitPulse AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[TransitPulse AI] Failed to start server:', err);
  process.exit(1);
});
