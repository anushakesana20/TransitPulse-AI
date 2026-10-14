import React from 'react';
import {
  Info,
  Sparkles,
  ShieldAlert,
  Zap,
  MapPin,
  Users,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Cpu
} from 'lucide-react';

export const KnowledgeBase: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Problem Statement */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
          <Info className="w-3.5 h-3.5" />
          <span>The Informal Transit Challenge in India</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Why Informal Transit Intelligence Matters
        </h2>
        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
          In Indian metropolitan corridors and secondary towns, informal shared transit—such as 3-wheeler shared autos (Bajaj RE), shared vans (Tata Magic, Force Cruiser "Tum-Tums"), and electric rickshaw feeders—accounts for <strong>over 45% to 65% of all first-mile and last-mile urban trips</strong>.
        </p>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Despite carrying millions of daily passengers, this sector operates completely off the formal grid: <strong>no GTFS static schedules, no GPS hardware, no live arrival countdowns, and no central control rooms</strong>. During flash rains, flooded flyover underpasses, VIP road closures, or sudden vehicle shortages, commuters arrive at stands blind, enduring hour-long waits or stranded conditions.
        </p>
      </div>

      {/* How TransitPulse AI Solves It */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>How TransitPulse AI Operates: 4-Pillar Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h4 className="text-base font-bold text-white">Sensor-Less Driver Micro-Pings</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equipping thousands of informal auto-rickshaws with $120+ GPS OBD hardware is economically unviable and prone to power disconnection. TransitPulse utilizes zero-hardware lightweight micro-pings: informal stand captains or drivers broadcast seat availability, destination, and status via a simple 2-tap web interface or WhatsApp bot gateway.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h4 className="text-base font-bold text-white">Dynamic Capacity Tiering &amp; Decay</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instead of false continuous GPS trails, TransitPulse computes node-level capacity tiers (High, Moderate, Low, Critical). Crucially, all telemetry features automated 15-minute staleness decay: unconfirmed or aged pings are automatically flagged as stale and excluded from matching to avoid false expectations.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h4 className="text-base font-bold text-white">Natural Language Disruption Extraction</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              When waterlogging, tree falls, or traffic police barricades disrupt transit, commuters submit informal reports in everyday language. Server-side AI extracts the exact corridor, disruption category, transit modes affected, severity, verbatim evidence, and concrete detour suggestions.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h4 className="text-base font-bold text-white">Sample-Data Grounded Alternative Hub Routing</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              If a passenger searches for a ride at a depleted hub (e.g. Hebbal underpass with 0 seats), the matcher does NOT fail silently or fabricate a ghost vehicle. It evaluates connected hubs (e.g. KR Puram) and suggests an actionable alternate walk/feeder only when sample data confirms available seats.
            </p>
          </div>
        </div>
      </div>

      {/* AI Insights & Transparency */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">AI Reliability &amp; Transparency Governance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              <span>Strict Structured Schemas</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              The AI extraction pipeline enforces strict machine-validated schema constraints. This guarantees consistent location parsing, severity categorizations, and passenger impact recommendations.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Uncertainty &amp; Verification Rules</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Citizen reports are always stamped with clear verification tiers. The application never claims an unconfirmed social report is an officially validated municipal disruption.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-sky-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>No AI Hallucination Fallbacks</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              If the AI service is unreachable or credentials are unconfigured, TransitPulse displays a transparent error banner with troubleshooting guidance. We never fabricate a fake successful AI response.
            </p>
          </div>
        </div>
      </div>

      {/* Real-World Limitations */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">Real-World Limitations &amp; Ethical Considerations</h3>
        </div>

        <ul className="space-y-3 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-slate-200">Data Source:</strong> User location comes from browser geolocation after permission is granted. Vehicle availability comes only from driver-submitted GPS pings; there is no municipal or third-party fleet feed connected.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-slate-200">Sybil &amp; False Report Attacks:</strong> In production deployments, bad actors or competing operators could submit fake waterlogging or road block reports. A multi-source consensus threshold (minimum 3 distinct passenger pings within 10 minutes) would be mandatory before issuing push alerts.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-slate-200">Digital Divide &amp; Driver Incentives:</strong> Many informal auto drivers use low-end Android or feature phones. The production vision includes a toll-free Missed Call or IVR/USSD confirmation system where drivers simply give a missed call to signal arrival at a stand.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-slate-200">Anti-Gouging Protections:</strong> During heavy rains, informal auto fares often double or triple illegally. TransitPulse highlights standard benchmark fares (₹20-₹40) to anchor passenger expectations and discourage extortion.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
