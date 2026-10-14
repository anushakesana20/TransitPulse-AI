import React, { useState } from 'react';
import {
  Terminal,
  Github,
  Compass,
  Check,
  Copy,
  ExternalLink,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const DeveloperExportGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const steps = [
    {
      title: '1. Export / Download Source Code from AI Studio',
      desc: 'In the top-right toolbar of Google AI Studio Build, click on the "Export" or "Download ZIP" button to download the entire codebase as a zip archive, or clone via git if enabled.',
      command: '# If downloading the ZIP archive, extract it into your project folder:\nunzip transitpulse-ai.zip\ncd transitpulse-ai',
    },
    {
      title: '2. Initialize Git Repository & Push to GitHub',
      desc: 'Create a new empty repository on GitHub (e.g. github.com/your-username/transitpulse-ai), then run these commands:',
      command: `git init
git add .
git commit -m "feat: complete TransitPulse AI hackathon submission"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/transitpulse-ai.git
git push -u origin main`,
    },
    {
      title: '3. Local Development Setup',
      desc: 'Install dependencies and configure your Gemini API Key in .env:',
      command: `# Install all packages
npm install

# Copy example env
cp .env.example .env

# Edit .env and supply your GEMINI_API_KEY
# GEMINI_API_KEY="your_actual_gemini_api_key_here"

# Start the fullstack development server (Express + Vite)
npm run dev`,
    },
    {
      title: '4. Production Build & Cloud Run / Container Deployment',
      desc: 'The project is packaged with a unified Express + Vite production build pipeline:',
      command: `# Compile React frontend with Vite & backend server with esbuild
npm run build

# Start production server on port 3000
npm start`,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Overview Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Github className="w-4 h-4" />
          <span>Hackathon Submission &amp; Source Code Export</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          How to Export &amp; Push TransitPulse AI to GitHub
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
          Follow these step-by-step instructions to export the full codebase from AI Studio, publish to your GitHub portfolio, and run it anywhere with Docker or Node.js.
        </p>
      </div>

      {/* Steps Container */}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">{step.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
              </div>
              <button
                onClick={() => copyToClipboard(step.command, idx)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors shrink-0"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Commands</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-amber-300/90 overflow-x-auto">
              <pre className="whitespace-pre">{step.command}</pre>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Stack Architecture Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Full-Stack Technical Architecture</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-200">Frontend (Client SPA)</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>&bull; React 19 + TypeScript + Vite 8</li>
              <li>&bull; Tailwind CSS v4 styling with accessible color contrast</li>
              <li>&bull; Interactive Vector Schematic Transit Map with capacity rings</li>
              <li>&bull; Real-time dynamic seat decrement and simulation actions</li>
              <li>&bull; Zero exposure of Gemini API keys in browser bundles</li>
            </ul>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-200">Backend Server (Express &bull; Node 20)</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>&bull; Express 4 running full-stack on single port 3000</li>
              <li>&bull; Server-side <code className="text-amber-300">@google/genai</code> SDK integration</li>
              <li>&bull; Model: <code className="text-amber-300">gemini-3.8-flash</code> with strict JSON schemas</li>
              <li>&bull; Automated 15-minute staleness decay and dynamic capacity tiering</li>
              <li>&bull; Sample-data verified alternative hub matching algorithm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
