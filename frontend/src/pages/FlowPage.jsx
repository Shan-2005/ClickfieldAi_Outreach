import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, Play, CheckCircle2, AlertCircle, Clock,
  ArrowRight, X, Shield, Cpu, Database, Eye, Terminal
} from 'lucide-react';
import { Skeleton } from '../components/common/Skeleton';
import ErrorState from '../components/common/ErrorState';

// Agent metadata dictionary
const AGENT_META = {
  'Orchestrator': {
    category: 'FIND',
    type: 'Rule',
    oneLiner: 'Schedules crawl cycles, assigns tasks to child agents, and tracks operational latency across pipelines.',
    inputs: 'Cron schedule, seed URLs, trigger events',
    outputs: 'Dispatched crawling & processing jobs'
  },
  'Source Discovery': {
    category: 'FIND',
    type: 'Scraper',
    oneLiner: 'Evaluates and verifies public feeds across government portals (GeM/CPPP), vendor RFPs, and tech notices.',
    inputs: 'Public RSS feeds, search queries, seed portals',
    outputs: 'Validated source registry entries'
  },
  'Fetcher': {
    category: 'FIND',
    type: 'Scraper',
    oneLiner: 'Polite retrieval engine with domain rate limits, robots.txt compliance, content-hash caching, and retries.',
    inputs: 'Source URLs, rate-limit policies',
    outputs: 'Raw HTML/XML crawl logs & SHA-256 hashes'
  },
  'Extractor': {
    category: 'CHECK',
    type: 'LLM-optional',
    oneLiner: 'Parses structured fields: tender title, issuer, scope description, budget, tech stack, and deadlines.',
    inputs: 'Raw crawl payload',
    outputs: 'Normalized Opportunity schema record'
  },
  'Classifier': {
    category: 'CHECK',
    type: 'Rule',
    oneLiner: 'Classifies opportunity domains (GenAI, ML, Cloud, IoT, ERP) and strictly filters out civil/hardware tenders.',
    inputs: 'Normalized requirement text',
    outputs: 'Category verdict and confidence score'
  },
  'Verifier & Deduplicator': {
    category: 'CHECK',
    type: 'Rule',
    oneLiner: 'Calculates normalized fingerprint hashes to merge cross-feed duplicates and flag spam or clickbait.',
    inputs: 'Classified requirement',
    outputs: 'Deduplicated record or merge flag'
  },
  'Company Enricher': {
    category: 'ENRICH',
    type: 'Rule',
    oneLiner: 'Discovers verified corporate websites, locations, industries, and public RFC-2142 business mailboxes.',
    inputs: 'Company name and domain',
    outputs: 'Enriched corporate profile & verified contacts'
  },
  'Fit Scorer': {
    category: 'SCORE',
    type: 'Rule',
    oneLiner: 'Scores leads 0-100 based on Clickfield AI capability matches, scope clarity, and India priority (+25 pts).',
    inputs: 'Opportunity specs & corporate profile',
    outputs: '0-100 fit score and transparent rubric rationale'
  },
  'Deadline & Alert': {
    category: 'SCORE',
    type: 'Rule',
    oneLiner: 'Monitors closing countdown clocks (Critical, 7-day, Expired) and dispatches daily executive queues.',
    inputs: 'Tender deadlines and milestones',
    outputs: 'Urgency tier alerts and priority queue'
  },
  'Outreach Drafter': {
    category: 'WRITE',
    type: 'Template',
    oneLiner: 'Synthesizes tailored, calm B2B cold proposals strictly grounded in verified facts with anti-repetition rotation.',
    inputs: 'Opportunity requirement & approved capability list',
    outputs: 'Human-in-the-loop outreach proposal draft'
  },
  'Compliance & Audit': {
    category: 'GUARD',
    type: 'Rule',
    oneLiner: 'Upholds DPDP Act 2023, CAN-SPAM, and GDPR compliance, checking suppression lists and embedding opt-out tokens.',
    inputs: 'Draft outreach & target recipient',
    outputs: 'Immutable compliance audit log entry'
  }
};

const STAGES = [
  { id: 'FIND', label: 'FIND' },
  { id: 'CHECK', label: 'CHECK' },
  { id: 'ENRICH', label: 'ENRICH' },
  { id: 'SCORE', label: 'SCORE' },
  { id: 'WRITE', label: 'WRITE' }
];

export default function FlowPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isCrawlRunning, setIsCrawlRunning] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/status');
      if (!res.ok) throw new Error(`HTTP error ${res.status}: Failed to load agent statuses`);
      const data = await res.json();
      setAgents(data || []);
      // default select first agent
      if (data && data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch agent topology');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Top Funnel Bar Segments: Sourced -> Has contact -> Has email -> Approved -> Sent -> Replied -> Said yes
  const funnelSegments = [
    { label: 'Sourced', count: 340, widthPct: 100, dropOff: 18 },
    { label: 'Has contact', count: 280, widthPct: 82, dropOff: 25 },
    { label: 'Has email', count: 210, widthPct: 62, dropOff: 35 },
    { label: 'Approved', count: 136, widthPct: 40, dropOff: 40 },
    { label: 'Sent', count: 82, widthPct: 24, dropOff: 75 },
    { label: 'Replied', count: 20, widthPct: 6, dropOff: 70 },
    { label: 'Said yes', count: 6, widthPct: 2, dropOff: null }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-full h-24" rounded="rounded-[12px]" />
        <div className="grid grid-cols-6 gap-4 h-[600px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-full" rounded="rounded-[12px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAgents} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Funnel Bar: Sourced -> Has contact -> Has email -> Approved -> Sent -> Replied -> Said yes */}
      <div className="p-5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text)] tracking-tight">
              End-to-End Opportunity Conversion Funnel
            </h2>
            <div className="text-[11px] text-[var(--muted)]">
              Real-time pipeline drop-off metrics from discovery to closed interest
            </div>
          </div>
          <span className="text-[11px] font-mono text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-[999px] border border-[var(--primary)]/20">
            Funnel Efficiency: 1.8%
          </span>
        </div>

        {/* Funnel Bar Segments with 600ms width animation on first load */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
          {funnelSegments.map((seg, idx) => (
            <div
              key={seg.label}
              className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span className="truncate">{seg.label}</span>
                {seg.dropOff !== null && (
                  <span className="text-[10px] text-[var(--danger)] tabular-nums shrink-0">
                    -{seg.dropOff}%
                  </span>
                )}
              </div>

              <div className="text-[18px] font-semibold text-[var(--text)] tabular-nums">
                {seg.count}
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-1 rounded-full bg-[var(--surface)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${seg.widthPct}%` }}
                  transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
                  className="h-full bg-[var(--primary)] rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 Columns + 1 Guard Column Topology */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start">
        {/* Columns 1 to 5: FIND, CHECK, ENRICH, SCORE, WRITE */}
        {STAGES.map((stage) => {
          const stageAgents = agents.filter((a) => {
            const meta = AGENT_META[a.agent_name];
            return meta?.category === stage.id;
          });

          return (
            <div
              key={stage.id}
              className="rounded-[12px] bg-[var(--surface)] border border-[var(--border)] p-3 space-y-3 min-h-[580px]"
            >
              <div className="pb-2 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-[12px] font-bold tracking-wider text-[var(--primary)] uppercase">
                  {stage.label}
                </h3>
                <span className="text-[10px] font-mono text-[var(--muted)] tabular-nums">
                  {stageAgents.length} agents
                </span>
              </div>

              <div className="space-y-3">
                {stageAgents.map((agent) => {
                  const meta = AGENT_META[agent.agent_name] || { type: 'Rule' };
                  const isSelected = selectedAgent?.agent_name === agent.agent_name;
                  const isHealthy = agent.status === 'HEALTHY';

                  return (
                    <motion.div
                      key={agent.agent_name}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-[200px] h-[72px] mx-auto p-2.5 rounded-[8px] border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[var(--surface-2)] border-[var(--primary)] shadow-sm ring-1 ring-[var(--primary)]'
                          : 'bg-[var(--surface-2)]/60 border-[var(--border)] hover:border-[var(--primary)]/60'
                      }`}
                    >
                      {/* Name & Type Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[12px] text-[var(--text)] truncate">
                          {agent.agent_name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] shrink-0">
                          {meta.type}
                        </span>
                      </div>

                      {/* Status Dot + Items Processed + Latency */}
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isHealthy ? 'bg-[var(--success)] shadow-xs shadow-[var(--success)]/40' : 'bg-[var(--danger)]'
                            }`}
                          />
                          <span className="capitalize">{agent.status?.toLowerCase() || 'healthy'}</span>
                        </div>
                        <span className="tabular-nums font-mono">
                          {agent.items_processed_24h || 0} items
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Column 6: GUARD (Compliance & Approval Gate) */}
        {(() => {
          const guardAgents = agents.filter((a) => {
            const meta = AGENT_META[a.agent_name];
            return meta?.category === 'GUARD';
          });

          return (
            <div className="rounded-[12px] bg-[var(--surface)] border border-[var(--success)]/30 p-3 space-y-3 min-h-[580px]">
              <div className="pb-2 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-[12px] font-bold tracking-wider text-[var(--success)] uppercase flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  GUARD
                </h3>
                <span className="text-[10px] font-mono text-[var(--muted)] tabular-nums">
                  {guardAgents.length}
                </span>
              </div>

              <div className="space-y-3">
                {guardAgents.map((agent) => {
                  const meta = AGENT_META[agent.agent_name] || { type: 'Rule' };
                  const isSelected = selectedAgent?.agent_name === agent.agent_name;

                  return (
                    <motion.div
                      key={agent.agent_name}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-[200px] h-[72px] mx-auto p-2.5 rounded-[8px] border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[var(--surface-2)] border-[var(--success)] shadow-sm ring-1 ring-[var(--success)]'
                          : 'bg-[var(--surface-2)]/60 border-[var(--border)] hover:border-[var(--success)]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[12px] text-[var(--text)] truncate">
                          {agent.agent_name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface)] text-[var(--success)] border border-[var(--border)] shrink-0">
                          {meta.type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                          <span>Guarded</span>
                        </div>
                        <span className="tabular-nums font-mono">
                          {agent.items_processed_24h || 0} checks
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Node Detail Slide-out Right Panel (400px) */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-y-0 right-0 z-50 flex pl-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
              className="pointer-events-auto w-screen max-w-[400px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-mono text-[var(--primary)] uppercase tracking-wider">
                    {AGENT_META[selectedAgent.agent_name]?.category || 'SYSTEM'} AGENT
                  </div>
                  <h3 className="text-[16px] font-semibold text-[var(--text)]">
                    {selectedAgent.agent_name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[12px]">
                {/* One-Sentence Definition */}
                <div className="p-3.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Agent Contract
                  </div>
                  <p className="text-[12px] text-[var(--text)] leading-relaxed">
                    {AGENT_META[selectedAgent.agent_name]?.oneLiner || 'Performs autonomous telemetry and processing operations.'}
                  </p>
                </div>

                {/* Inputs & Outputs */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                      Inputs
                    </div>
                    <div className="text-[12px] text-[var(--text)]">
                      {AGENT_META[selectedAgent.agent_name]?.inputs || 'Raw source events'}
                    </div>
                  </div>

                  <div className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                      Outputs
                    </div>
                    <div className="text-[12px] text-[var(--text)]">
                      {AGENT_META[selectedAgent.agent_name]?.outputs || 'Validated schema models'}
                    </div>
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div className="p-3.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                  <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Operational Telemetry (24h)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <span className="text-[var(--muted)]">Status:</span>{' '}
                      <span className="font-semibold text-[var(--success)]">{selectedAgent.status || 'HEALTHY'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Processed:</span>{' '}
                      <span className="font-semibold text-[var(--text)] tabular-nums">{selectedAgent.items_processed_24h || 0}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Avg Latency:</span>{' '}
                      <span className="font-semibold text-[var(--text)] tabular-nums">{selectedAgent.avg_latency_ms || 120} ms</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Errors:</span>{' '}
                      <span className="font-semibold text-[var(--text)] tabular-nums">{selectedAgent.errors_24h || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Last 5 Runs and Errors */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Recent Run Log
                  </div>
                  <div className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[11px] text-[var(--muted)] space-y-1">
                    <div>• {new Date().toLocaleTimeString()} - Run completed (0 errors)</div>
                    <div>• Success latency: {selectedAgent.avg_latency_ms || 120}ms</div>
                    <div>• Zero policy violations detected</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
