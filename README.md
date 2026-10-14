# TransitPulse AI — Smart Informal Transit Intelligence

> **AI-assisted Disruption Intelligence & GPS-based Driver Ping Tracker for Informal Transit**

---

## 📌 Problem Statement

In Indian metropolitan corridors and secondary tier-2/3 towns, informal transit systems—specifically **shared auto-rickshaws** (Bajaj RE, Piaggio Ape), **shared vans/tum-tums** (Tata Magic, Force Cruiser), and **electric rickshaws**—form the backbone of urban mobility, catering to **over 45%–65% of daily last-mile and feeder trips**.

However, unlike formal metro networks or municipal bus agencies (BMTC, BEST, DTC), informal transit has:
- **No GTFS static or real-time schedules**
- **No hardware GPS telematics** (OBD tracking boxes are cost-prohibitive for individual owner-drivers)
- **Zero central dispatch infrastructure**

During flash monsoons, flooded flyover underpasses (e.g. Hebbal, Silk Board), metro construction barricades, tree falls, or peak-hour surges, passengers arrive at stands completely blind—frequently stranded in hazardous conditions for hours or subjected to unauthorized fare spikes.

---

## 💡 The TransitPulse AI Solution

**TransitPulse AI** establishes an agile, sensor-less transit intelligence layer designed specifically for the realities of informal transit:

1. **Lightweight Driver Telemetry Micro-Pings:**
   Stand managers or drivers broadcast lightweight check-ins (seats available, route, status) via a 2-tap interface with automated **15-minute staleness decay**.

2. **Dynamic Capacity Tiering:**
   Visual capacity gauges categorize each hub in real time:
   - 🟢 **High Availability:** 3+ vehicles & 8+ seats available
   - 🟡 **Moderate Availability:** 2 vehicles or 3–7 seats available
   - 🟠 **Low Availability:** 1 vehicle or 1–2 seats available
   - 🔴 **Critical / Depleted:** 0 seats or severe disruption blockage

3. **Server-Side Gemini 2.5 Flash Disruption Analyzer:**
   Parses unstructured commuter reports in natural language (English & Hinglish) into structured incident intelligence:
   - Correlates closest urban corridor hub
   - Identifies disruption classification (Waterlogging, Gridlock, Road Closure, Strike, Local Event)
   - Evaluates severity conservatively based on cited evidence
   - Suggests concrete commuter detours & alternative boarding hubs
   - Enforces **Strict Uncertainty Labeling** (`UNVERIFIED_COMMUTER_REPORT`)—never misrepresenting social crowd reports as confirmed city advisories.

4. **Smart Ride Matcher with Sample-Data Verified Fallback:**
   Matches commuters to vehicles with compatible routes and available seats. If a stand is depleted, it intelligently searches neighboring corridor hubs and suggests an alternate pickup **only when sample data supports it**.

---

## 🗺️ Live Location and Pickup Points

- The map uses real OpenStreetMap street tiles.
- On load, the browser asks for location permission and watches the device location while the app is open.
- The app starts with **no invented vehicles or pickup hubs**. A pickup point is created when a driver sends a valid GPS ping; pings within roughly 150 metres share a pickup point.
- Vehicle locations and seat counts update when drivers submit pings. Records become stale after 15 minutes without a fresh ping.
- This project is **not connected to a municipal fleet GPS feed**. It cannot show vehicles whose drivers have not submitted a ping through this app.

## 🔐 Data and deployment notes

The current server stores pings in **in-memory state**. Data is shared across visitors connected to the same running server process, but it is cleared when the server restarts and is not a durable database. For production, connect a persistent database (for example, Firebase/Firestore or PostgreSQL) and add driver authentication before publishing real driver information.

## 🏗️ Technical Architecture

```
                   ┌────────────────────────────────────────────────────────┐
                   │             Client SPA (React 19 + Vite 8)             │
                   │  - Leaflet + OpenStreetMap Map with Browser Geolocation            │
                   │  - Dynamic Capacity Hub Panels (High / Mod / Low)      │
                   │  - Smart Ride Matcher with Alternative Hub Routing     │
                   │  - Citizen Disruption Submission & Scenario Presets    │
                   │  - Driver Telemetry & Seat Broadcast Modal             │
                   └───────────────────────────┬────────────────────────────┘
                                               │ HTTP / REST API (Port 3000)
                                               ▼
                   ┌────────────────────────────────────────────────────────┐
                   │            Express 4 Backend (Node.js 20)              │
                   │  - In-Memory Driver-Ping Store (not durable)                   │
                   │  - 15-Minute Automated Ping Staleness Decay Engine     │
                   │  - Capacity Tiering & Queue Length Recalculation       │
                   │  - Alternative Node Proximity Evaluator                │
                   └───────────────────────────┬────────────────────────────┘
                                               │ Server-Side SDK (Never in Browser)
                                               ▼
                   ┌────────────────────────────────────────────────────────┐
                   │               Google Gemini 2.5 Flash                  │
                   │  - Model: gemini-2.5-flash                             │
                   │  - Strict JSON Schema via Type.OBJECT                  │
                   │  - Evidence Extraction & Uncertainty Qualification     │
                   │  - Zero Hallucination: Explicit failure reporting      │
                   └────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup & Local Execution

### Prerequisites
- Node.js 20+ installed
- A valid Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation Steps

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/your-username/transitpulse-ai.git
   cd transitpulse-ai
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and add your Gemini API Key:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   PORT=3000
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production Deployment:**
   ```bash
   npm run build
   npm start
   ```

---

## 🔑 Gemini API Configuration & Security

- **Server-Side Execution Only:** The `@google/genai` SDK is imported exclusively in `server.ts`.
- **Zero Browser Exposure:** `process.env.GEMINI_API_KEY` is never bundled into client Vite code or accessible via `window`.
- **SDK Compliance:** Uses `@google/genai` v2+ with `new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })`.
- **Honest Error Handling:** If the Gemini API key is missing or quota is exceeded, TransitPulse displays an explicit, actionable error card. It **never fabricates a fake AI response**.

---

## 🛡️ Limitations & Future Roadmap

- **Fleet coverage:** Only drivers who submit GPS pings appear. No public transit agency or municipal fleet feed is connected.
- **Persistence:** Pings are held in server memory and are lost when the server restarts; configure a database for production.
- **Crowdsourcing Validation:** Production deployments will require multi-source consensus (minimum 3 independent passenger reports within 10 minutes) before elevating reports to confirmed status.
- **USSD / WhatsApp Gateway:** Non-smartphone drivers can be onboarded via WhatsApp conversational bots or toll-free missed-call triggers.
- **Dynamic Fare Protection:** Visualizes benchmark informal fares (₹20–₹40) to combat predatory surge pricing during monsoon disruptions.

---

## 📤 How to Export & Push to GitHub

1. Download the complete codebase using the AI Studio Export tool.
2. Initialize Git in the project root:
   ```bash
   git init
   git add .
   git commit -m "feat: complete TransitPulse AI hackathon submission"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/transitpulse-ai.git
   git push -u origin main
   ```

---

## 📄 License
TransitPulse AI is open-sourced under the Apache-2.0 License.
