import React, { useState } from 'react';
import {
  DisruptionIncident,
  PickupPoint
} from '../types/transit';
import { SAMPLE_CITIZEN_REPORTS } from '../data/mockTransitData';
import {
  Sparkles,
  Send,
  AlertTriangle,
  CloudRain,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  Car,
  Compass,
  ArrowRight
} from 'lucide-react';

interface AIDisruptionAnalyzerProps {
  pickupPoints: PickupPoint[];
  disruptions: DisruptionIncident[];
  onDisruptionAnalyzed: (incident: DisruptionIncident) => void;
  onSelectHub: (hubId: string) => void;
}

export const AIDisruptionAnalyzer: React.FC<AIDisruptionAnalyzerProps> = ({
  pickupPoints,
  disruptions,
  onDisruptionAnalyzed,
  onSelectHub,
}) => {
  const [reportText, setReportText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastAnalysis, setLastAnalysis] = useState<DisruptionIncident | null>(null);
  const [apiError, setApiError] = useState<{ message: string; details?: string; isApiKeyMissing?: boolean } | null>(null);

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = (textToAnalyze || reportText).trim();
    if (!text || text.length < 8) return;

    setIsAnalyzing(true);
    setApiError(null);
    setLastAnalysis(null);

    try {
      const response = await fetch('/api/disruptions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportText: text }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setApiError({
          message: data.error || 'Failed to analyze disruption report.',
          details: data.details || `Server responded with status code ${response.status}`,
          isApiKeyMissing: data.apiKeyConfigured === false,
        });
        return;
      }

      setLastAnalysis(data.incident);
      onDisruptionAnalyzed(data.incident);
    } catch (err: any) {
      setApiError({
        message: 'Network or client error connecting to TransitPulse backend.',
        details: err.message || 'Please check if the backend server is running.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectSample = (sampleText: string) => {
    setReportText(sampleText);
    setApiError(null);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-950 text-rose-300 border-rose-600';
      case 'High':
        return 'bg-orange-950 text-orange-300 border-orange-600';
      case 'Moderate':
        return 'bg-amber-950 text-amber-300 border-amber-600';
      case 'Low':
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-600';
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED_ANOMALY':
        return {
          label: 'Confirmed by Trusted Data Source',
          badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-600',
          desc: 'Verified by physical field supervisor or transport authority check.',
        };
      case 'MULTI_SOURCE_PENDING':
        return {
          label: 'Corroborated Commuter Alert',
          badgeClass: 'bg-sky-950 text-sky-300 border-sky-600',
          desc: 'Multiple commuter reports correlate across this corridor.',
        };
      case 'UNVERIFIED_COMMUTER_REPORT':
      default:
        return {
          label: 'Unverified Commuter Report',
          badgeClass: 'bg-amber-950 text-amber-300 border-amber-600',
          desc: 'Single citizen submission under community review. Do not treat as official advisory.',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white">AI Transit Disruption Intelligence Engine</h2>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Informal transit systems (shared autos, vans, e-rickshaws) have no central dispatch. When flash rains flood an underpass, road construction blocks service lanes, or vehicles run out, commuters are left in the dark. Submit natural language observations to extract structured location data, severity assessments, affected transit modes, and suggested commuter detours.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1.5 text-slate-400 max-w-xs">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Verification Transparency Rule</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              AI analysis organizes citizen reports into structured intelligence, but <strong>never certifies unverified observations as confirmed incidents</strong> without independent corroboration.
            </p>
          </div>
        </div>
      </div>

      {/* Report Submission Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center justify-between">
              <span>Report Transit Incident / Hazard</span>
              <span className="text-[11px] text-slate-500 font-normal">Rain, road closures, traffic, strikes, shortages</span>
            </label>
            <textarea
              rows={4}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe the transport situation (e.g., Heavy rain flooded the road under Hebbal flyover, shared autos are refusing to go down, 40+ people stranded, take outer ring road instead)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Min 8 characters</span>
              <span>{reportText.length} characters</span>
            </div>
          </div>

          {/* Quick Scenario Preset Chips */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-2">
              Or pick a sample scenario to analyze:
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_CITIZEN_REPORTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(preset.text)}
                  className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors text-left"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setReportText('')}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear Text
            </button>

            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || reportText.trim().length < 8}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Disruption...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Disruption with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Explicit Error Message Display (Requirement: Never replace failed AI with fabricated output) */}
          {apiError && (
            <div className="bg-rose-950/80 border-2 border-rose-600/70 rounded-xl p-4 text-xs text-rose-200 space-y-2 animate-shake">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>AI Disruption Analysis Unavailable</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {apiError.message}
              </p>
              {apiError.details && (
                <div className="bg-slate-950 p-2 rounded border border-rose-900 font-mono text-[10px] text-rose-300">
                  {apiError.details}
                </div>
              )}
              {apiError.isApiKeyMissing && (
                <div className="bg-amber-950/60 border border-amber-600/40 p-2.5 rounded text-[11px] text-amber-300">
                  <strong>Notice:</strong> The AI backend service is running, but requires an active API key to process unstructured language requests. In production, ensure <code className="bg-slate-950 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> is set in the server environment.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Structured AI Analysis Output Card */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          {lastAnalysis ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(lastAnalysis.severity)}`}>
                    {lastAnalysis.severity} Severity Disruption
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{lastAnalysis.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-400 font-mono font-bold block">
                    Confidence: {lastAnalysis.confidenceScore}%
                  </span>
                </div>
              </div>

              {/* Strict Verification Status Badge & Explanation */}
              {(() => {
                const verMeta = getVerificationBadge(lastAnalysis.verificationStatus);
                return (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${verMeta.badgeClass}`}>
                        {verMeta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {verMeta.desc}
                    </p>
                    <div className="text-[10px] text-amber-400/90 bg-amber-950/40 p-2 rounded border border-amber-800/40 font-medium">
                      ⚠️ Note: An incident is not confirmed merely because an AI model processed the text report. Independent verification is required.
                    </div>
                  </div>
                );
              })()}

              {/* Extracted Telemetry Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 text-xs space-y-2.5">
                <div className="flex items-start justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400 font-medium">Disruption Category:</span>
                  <span className="text-white font-semibold">{lastAnalysis.disruptionType}</span>
                </div>

                <div className="flex items-start justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400 font-medium">Reported Location:</span>
                  <span className="text-amber-400 font-semibold">{lastAnalysis.locationName}</span>
                </div>

                <div className="flex items-start justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400 font-medium">Affected Transport:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {lastAnalysis.affectedTransport.map((mode, i) => (
                      <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-slate-400 font-medium block">Extracted Evidence:</span>
                  <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800/60 italic leading-relaxed">
                    "{lastAnalysis.evidence}"
                  </p>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-emerald-400 font-medium block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Recommended Next Steps &amp; Action:</span>
                  </span>
                  <p className="text-[11px] text-emerald-200/90 bg-emerald-950/40 p-2 rounded border border-emerald-900/60 leading-relaxed">
                    {lastAnalysis.suggestedAction}
                  </p>
                </div>
              </div>

              {/* Associated Hub Link */}
              {lastAnalysis.closestHubId && (
                <div className="pt-2">
                  <button
                    onClick={() => onSelectHub(lastAnalysis.closestHubId)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Affected Station on Live Map</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
              <Sparkles className="w-12 h-12 text-slate-700" />
              <div>
                <h4 className="text-white font-bold text-sm">Structured AI Insight Card</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Enter a transport disruption description or select one of the presets. The AI will extract structured location data, evaluate passenger impact, and recommend commuter detours.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disruption Incident Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Live Disruption &amp; Hazard Incident Feed</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {disruptions.length} reported incidents
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disruptions.map((incident) => {
            const verMeta = getVerificationBadge(incident.verificationStatus);
            return (
              <div
                key={incident.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(incident.severity)}`}>
                      {incident.severity} &bull; {incident.disruptionType}
                    </span>
                    <h4 className="font-bold text-white mt-1 text-sm">{incident.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {incident.reportedAt}
                  </span>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {incident.passengerImpactSummary}
                </p>

                <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] text-slate-300">
                  <strong className="text-amber-400">Recommended Action:</strong> {incident.suggestedAction}
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
                  <span className={`px-1.5 py-0.5 rounded font-medium border ${verMeta.badgeClass}`}>
                    {verMeta.label}
                  </span>
                  <button
                    onClick={() => onSelectHub(incident.closestHubId)}
                    className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Inspect Hub</span>
                    &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
