import React from 'react';
import { 
  Bot, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  X 
} from 'lucide-react';

const AGENT_DESCRIPTIONS = {
  "Orchestrator": "Schedules runs, assigns work, tracks health",
  "Source Discovery": "Discovers and ranks verified tender & RFP sources",
  "Fetcher": "Retrieves pages & APIs politely (robots.txt, rate limits)",
  "Extractor": "Pulls title, buyer, specs, budget, dates, real source URL",
  "Classifier": "Hard-rejects non-b2b / employment / news & tags AI domain",
  "Verifier & Deduplicator": "Cosine deduplication, checks links, filters spam",
  "Company Enricher": "Enriches official website, location & verified B2B contacts",
  "Fit Scorer": "Ranks 0-100 with penalties for expired / low-confidence items",
  "Deadline & Alert": "Tracks closing countdowns & triggers urgent notices",
  "Outreach Drafter": "Generates tailored proposals (Human approval gate required)",
  "Compliance & Audit": "Enforces ToS, honors opt-outs, logs immutable provenance",
};

export default function AgentStatusPanel({ 
  agents, 
  onClose, 
  onTriggerCrawl, 
  isCrawling 
}) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mb-6 shadow-xl transition-colors duration-200">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
            <Cpu className="w-5 h-5 text-zinc-900 dark:text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white m-0 flex items-center gap-2">
              <span>The 11 Multi-Agent System</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 font-mono">
                TELEMETRY ACTIVE
              </span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 m-0 mt-0.5">
              Autonomous ingestion, verification, scoring, and compliance guardrails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerCrawl}
            disabled={isCrawling}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCrawling ? 'animate-spin' : ''}`} />
            <span>{isCrawling ? 'Running...' : 'Run Ingestion'}</span>
          </button>
          <button
            onClick={onClose}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of 11 Agents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {agents.map((agent, index) => {
          const isHealthy = agent.status === 'HEALTHY';
          const isRunning = agent.status === 'RUNNING';

          return (
            <div
              key={agent.agent_name}
              className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-all text-xs shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-[10px] text-zinc-700 dark:text-zinc-400 font-mono">
                      {index + 1}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {agent.agent_name}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {isRunning ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 dark:bg-white text-white dark:text-black">
                      <Zap className="w-3 h-3 text-white dark:text-black animate-pulse" />
                      <span>RUNNING</span>
                    </span>
                  ) : isHealthy ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
                      <CheckCircle2 className="w-3 h-3 text-zinc-900 dark:text-white" />
                      <span>HEALTHY</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{agent.status}</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                  {AGENT_DESCRIPTIONS[agent.agent_name] || "Autonomous pipeline agent."}
                </p>
              </div>

              {/* Metrics strip */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <div>Processed: <span className="text-zinc-900 dark:text-zinc-200 font-bold">{agent.items_processed_24h || 0}</span></div>
                <div>Latency: <span className="text-zinc-900 dark:text-zinc-200 font-bold">{agent.avg_latency_ms || 120}ms</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
