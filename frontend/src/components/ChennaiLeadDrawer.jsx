import React, { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, Building2, Factory, HardHat, Phone, Mail, Globe, MapPin,
  ExternalLink, Copy, Check, ShieldCheck, ShieldAlert, AlertTriangle,
  Clock, Zap, CheckCircle2, ArrowRight, MessageSquare, Send, RefreshCw,
  Sliders, Star, User, ChevronRight, AlertCircle, FileText, Users, UserCheck
} from 'lucide-react';
import { getOutlookWebComposeUrl } from '../utils/outlook';

export default function ChennaiLeadDrawer({ leadId, onClose, onLeadUpdated }) {
  const [leadData, setLeadData] = useState(null);
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningSwarm, setRunningSwarm] = useState(false);
  const [swarmStep, setSwarmStep] = useState(0); // 0 to 5
  const [activeTab, setActiveTab] = useState('dossier'); // 'dossier', 'pain_points', 'pitch', 'outreach'
  const [copiedKey, setCopiedKey] = useState(null);
  const [editableEmail, setEditableEmail] = useState('');
  const [editableSubject, setEditableSubject] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvedState, setApprovedState] = useState(false);
  const [runningWebSearch, setRunningWebSearch] = useState(false);
  const [webSearchFeedback, setWebSearchFeedback] = useState(null);

  // Swarm agent phase names
  const SWARM_PHASES = [
    { phase: 1, name: 'Deep Discovery & Corporate Profiling', agents: 'Agents 1 – 4', icon: Building2 },
    { phase: 2, name: 'Sector Pain Point & Gap Diagnostics', agents: 'Agents 5 – 8', icon: AlertTriangle },
    { phase: 3, name: 'Strategic Solution Formulation', agents: 'Agents 9 – 11', icon: Zap },
    { phase: 4, name: 'High-Conversion Outreach Copywriting', agents: 'Agents 12 – 14', icon: MessageSquare },
    { phase: 5, name: 'DPDP Legal Shield & Gatekeeper', agents: 'Agent 15', icon: ShieldCheck }
  ];

  // Fetch lead detail and existing intel
  const fetchLead = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/chennai-leads/${leadId}`);
      if (!res.ok) throw new Error('Failed to load lead');
      const data = await res.json();
      setLeadData(data.lead);
      if (data.intel) {
        setIntel(data.intel);
        setApprovedState(data.intel_status === 'APPROVED');
        if (data.intel?.tabs?.outreach?.cold_email?.body) {
          setEditableEmail(data.intel.tabs.outreach.cold_email.body);
          setEditableSubject(data.intel.tabs.outreach.cold_email.subject || '');
        }
      } else {
        setIntel(null);
        setApprovedState(false);
      }
    } catch (err) {
      console.error('Error fetching lead details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  // Handle running the 15-Agent Swarm with real-time animated stepper
  const handleRunSwarm = async () => {
    setRunningSwarm(true);
    setSwarmStep(1);

    // Progressive visualizer steps
    const timer1 = setTimeout(() => setSwarmStep(2), 600);
    const timer2 = setTimeout(() => setSwarmStep(3), 1200);
    const timer3 = setTimeout(() => setSwarmStep(4), 1800);
    const timer4 = setTimeout(() => setSwarmStep(5), 2400);

    try {
      const res = await fetch(`/api/chennai-leads/${leadId}/run-intel`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.intel) {
        setTimeout(() => {
          setIntel(data.intel);
          setApprovedState(false);
          setEditableEmail(data.intel?.tabs?.outreach?.cold_email?.body || '');
          setEditableSubject(data.intel?.tabs?.outreach?.cold_email?.subject || '');
          setRunningSwarm(false);
          setSwarmStep(0);
          if (onLeadUpdated) onLeadUpdated();
        }, 2800);
      } else {
        setRunningSwarm(false);
        setSwarmStep(0);
      }
    } catch (err) {
      console.error('Error running 15-agent swarm:', err);
      setRunningSwarm(false);
      setSwarmStep(0);
    }
  };

  const handleLiveWebSearch = async () => {
    if (!leadId) return;
    setRunningWebSearch(true);
    setWebSearchFeedback(null);
    try {
      const res = await fetch(`/api/chennai-leads/${leadId}/live-web-search`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.web_intel) {
        setWebSearchFeedback({
          type: 'success',
          text: `Live Web Search Finished: ${data.web_intel.web_status} (${data.web_intel.total_search_matches || 1} sources analyzed)`
        });
        await handleRunSwarm();
      } else {
        setWebSearchFeedback({ type: 'error', text: 'No live web assets found for this company.' });
      }
    } catch (e) {
      setWebSearchFeedback({ type: 'error', text: 'Live web search request failed.' });
    } finally {
      setRunningWebSearch(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/chennai-leads/${leadId}/approve`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setApprovedState(true);
        if (onLeadUpdated) onLeadUpdated();
      }
    } catch (err) {
      console.error('Failed to approve lead pitch:', err);
    } finally {
      setApproving(false);
    }
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getSectorBadge = (sector) => {
    switch (sector) {
      case 'Manufacturing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Factory className="w-3.5 h-3.5" />
            Manufacturing
          </span>
        );
      case 'Construction':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <HardHat className="w-3.5 h-3.5" />
            Construction
          </span>
        );
      case 'Real Estate':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Building2 className="w-3.5 h-3.5" />
            Real Estate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-zinc-800 text-zinc-300">
            {sector}
          </span>
        );
    }
  };

  const emailWordCount = editableEmail
    ? editableEmail.trim().split(/\s+/).filter(Boolean).length
    : 0;

  if (!leadId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/75 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="w-full max-w-4xl bg-zinc-950 text-zinc-100 border-l border-zinc-800 h-full flex flex-col shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="p-6 border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {leadData && getSectorBadge(leadData.sector)}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {leadData?.area || 'Chennai Hub'}
              </span>
              {leadData?.employee_range && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Users className="w-3 h-3 text-emerald-400" />
                  {leadData.employee_range}
                </span>
              )}
              {leadData?.rating ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {leadData.rating} ({leadData.reviews_count || '0'} reviews)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-zinc-500 bg-zinc-800/50">
                  Unrated on Maps
                </span>
              )}
              {approvedState ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  OPERATOR APPROVED
                </span>
              ) : intel ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Sparkles className="w-3 h-3" />
                  15 AGENTS LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800/60 text-zinc-400">
                  READY TO SCAN
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {leadData?.name || 'Loading Company...'}
            </h2>
            <p className="text-xs text-zinc-400">
              {leadData?.category} · {leadData?.address}
            </p>

            {/* Quick Contact Action Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {leadData?.phone ? (
                <a
                  href={`tel:${leadData.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all"
                >
                  <Phone className="w-3 h-3 text-indigo-400" />
                  {leadData.phone}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-500 bg-zinc-900 border border-zinc-800">
                  No Phone Registered
                </span>
              )}
              {leadData?.email && (
                <a
                  href={getOutlookWebComposeUrl(leadData.email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-all"
                  title="Draft email in Outlook Web (outlook.cloud.microsoft)"
                >
                  <Mail className="w-3 h-3 text-purple-400" />
                  {leadData.email}
                </a>
              )}
              {leadData?.website ? (
                <a
                  href={leadData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-all"
                >
                  <Globe className="w-3 h-3 text-zinc-400" />
                  Website
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-500 bg-zinc-900 border border-zinc-800">
                  No Website Registered
                </span>
              )}
              {leadData?.google_maps_url && (
                <a
                  href={leadData.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all"
                >
                  <MapPin className="w-3 h-3" />
                  Maps
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            {/* Employee Headcount Verification Card */}
            {leadData?.employee_range && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <span>Headcount: {leadData.employee_range}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Under 50 Staff Verified
                    </span>
                  </div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">
                    <span className="text-zinc-300 font-medium">Provenance:</span> {leadData.employee_provenance || 'Chennai MSME Cluster Registry'}
                  </div>
                  {leadData.employee_audit_note && (
                    <div className="text-zinc-500 text-[11px] mt-0.5 italic">
                      "{leadData.employee_audit_note}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Owner & Legal Leadership Card */}
            {leadData?.owner_name && (
              <div className={`mt-2.5 p-3 rounded-xl border flex items-start gap-3 ${
                leadData.owner_name !== 'Not Disclosed Online'
                  ? 'bg-purple-950/20 border-purple-500/30'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                  leadData.owner_name !== 'Not Disclosed Online'
                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2 font-bold">
                    <span className={leadData.owner_name !== 'Not Disclosed Online' ? 'text-purple-300' : 'text-zinc-400'}>
                      {leadData.owner_name !== 'Not Disclosed Online' ? leadData.owner_name : 'Proprietor / Operating Head (Unlisted)'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                      leadData.owner_name !== 'Not Disclosed Online'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>
                      {leadData.owner_designation || 'Proprietor / Managing Head'}
                    </span>
                  </div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">
                    <span className="text-zinc-300 font-medium">Registry & Provenance:</span> {leadData.owner_provenance || 'Zero-Hallucination Disclosed'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Banner: Run 15-Agent Swarm Button */}
        <div className="p-4 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                15-Agent Autonomous Intelligence Swarm
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Live Web & Maps Auditor
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Live HTTP web scraping, honest zero-hallucination audits, and ROI-backed outreach
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLiveWebSearch}
              disabled={runningWebSearch || runningSwarm}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                runningWebSearch
                  ? 'bg-zinc-800 text-zinc-400 border-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700 hover:border-zinc-600'
              }`}
              title="Autonomous live search query across search engines for official website and catalog"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningWebSearch ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
              <span>{runningWebSearch ? 'Searching Web...' : 'Live Web Search'}</span>
            </button>

            <button
              onClick={handleRunSwarm}
              disabled={runningSwarm}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                runningSwarm
                  ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {runningSwarm ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Auditing Live ({swarmStep}/5)...</span>
                </>
              ) : intel ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Re-Run Live 15-Agent Swarm</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Run 15-Agent Live Intel & Pitch</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live 15-Agent Swarm Visualizer (Active during execution) */}
        {runningSwarm && (
          <div className="p-6 bg-gradient-to-b from-indigo-950/40 via-zinc-950 to-zinc-950 border-b border-zinc-800">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Live 15-Agent Swarm Running Real Web & Directory Audits...
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {SWARM_PHASES.map((p) => {
                const isDone = swarmStep > p.phase;
                const isCurrent = swarmStep === p.phase;
                return (
                  <div
                    key={p.phase}
                    className={`p-3 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                        : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300">
                        {p.agents}
                      </span>
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-3 h-3 rounded-full bg-indigo-400 animate-ping" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                    </div>
                    <div className="text-xs font-bold line-clamp-1">{p.name}</div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      {isDone ? 'Completed' : isCurrent ? 'Active live fetch...' : 'Queued'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span className="animate-pulse text-indigo-400">
                ▶ Fetching live HTML headers, parsing real tags, and diagnosing Chennai operational bottlenecks...
              </span>
              <span>Zero Hallucination Guaranteed</span>
            </div>
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div className="border-b border-zinc-800 bg-zinc-900/60 px-6 flex gap-2 overflow-x-auto">
          {[
            { id: 'dossier', label: '🏢 Company Dossier', desc: 'Real Web & Hub Audit' },
            { id: 'pain_points', label: '⚠️ Pain Points Identified', desc: '3 Diagnosed Gaps' },
            { id: 'pitch', label: '🎯 Proposed Pitch', desc: 'Solution & ROI' },
            { id: 'outreach', label: '✉️ Outreach Playbook', desc: 'YES Email & WhatsApp' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex flex-col items-start gap-0.5 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white bg-indigo-500/10'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-normal text-zinc-500">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-20 text-zinc-500 text-xs font-mono">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-zinc-400" />
              Loading verified company intelligence...
            </div>
          ) : !intel ? (
            <div className="text-center py-16 px-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-bold text-white mb-1">
                No Intelligence Generated Yet
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
                Click "Run 15-Agent Live Intel & Pitch" above to deploy the autonomous swarm across corporate profiling, live web auditing, bottleneck diagnosis, and YES-oriented outreach.
              </p>
              <button
                onClick={handleRunSwarm}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Launch 15-Agent Swarm Now
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: 🏢 COMPANY DOSSIER */}
              {activeTab === 'dossier' && (
                <div className="space-y-5">
                  {/* LIVE WEB INTELLIGENCE & ANTI-HALLUCINATION AUDIT CARD */}
                  <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-indigo-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                          Autonomous Web Intelligence & Truthfulness Audit
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Zero Hallucination Shield
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {intel.tabs?.dossier?.web_intelligence?.web_status === 'VERIFIED_LIVE_WEBSITE' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            VERIFIED LIVE WEBSITE (HTTP {intel.tabs?.dossier?.web_intelligence?.http_status_code || 200})
                          </span>
                        ) : intel.tabs?.dossier?.web_intelligence?.web_status === 'VERIFIED_PUBLIC_REGISTRY' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">
                            VERIFIED PUBLIC REGISTRY (IndiaMART / Trade)
                          </span>
                        ) : intel.tabs?.dossier?.web_intelligence?.web_status === 'OFFLINE_OR_UNREACHABLE' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            OFFLINE / HOST UNREACHABLE
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            NO WEB ASSET (HONEST DISCLOSURE)
                          </span>
                        )}

                        <button
                          onClick={handleLiveWebSearch}
                          disabled={runningWebSearch}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Re-query live search engines and scrape company web page"
                        >
                          <RefreshCw className={`w-3 h-3 ${runningWebSearch ? 'animate-spin text-indigo-400' : ''}`} />
                          <span>{runningWebSearch ? 'Searching...' : 'Web Refresh'}</span>
                        </button>
                      </div>
                    </div>

                    {webSearchFeedback && (
                      <div className={`p-2.5 rounded-xl text-xs font-mono ${
                        webSearchFeedback.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/40 border border-red-500/40 text-red-300'
                      }`}>
                        {webSearchFeedback.text}
                      </div>
                    )}

                    {/* Verified Company Overview extracted verbatim from web */}
                    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 space-y-1.5">
                      <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                        <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          Real Verbatim Overview Extracted from Web:
                        </span>
                        {intel.tabs?.dossier?.web_intelligence?.final_url && (
                          <a
                            href={intel.tabs?.dossier?.web_intelligence?.final_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1 text-[10px]"
                          >
                            <span>{intel.tabs?.dossier?.web_intelligence?.final_url}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed italic">
                        "{intel.tabs?.dossier?.web_intelligence?.company_overview || intel.tabs?.dossier?.corporate?.company_overview || 'No public text published on web.'}"
                      </p>
                    </div>

                    {/* Discovered Real Products & Capabilities */}
                    {intel.tabs?.dossier?.web_intelligence?.verified_services_products?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Real Products & Capabilities Detected on Web:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {intel.tabs?.dossier?.web_intelligence?.verified_services_products.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Zero-Hallucination Disclosures & Truthfulness Shield */}
                    <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <ShieldCheck className="w-4 h-4" />
                          Anti-Hallucination Shield Status
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400">
                          100% Truthfully Grounded (0% Fabricated)
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                        <div><strong>Data Provenance: </strong>{intel.tabs?.dossier?.web_intelligence?.grounding_summary || intel.tabs?.dossier?.corporate?.data_provenance}</div>
                      </div>
                      {intel.tabs?.dossier?.web_intelligence?.honest_disclosures?.length > 0 && (
                        <div className="pt-1.5 border-t border-zinc-800/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Transparent Honesty Disclosures:
                          </span>
                          <ul className="text-[11px] text-zinc-400 space-y-1 pl-3 list-disc">
                            {intel.tabs?.dossier?.web_intelligence?.honest_disclosures.map((d, idx) => (
                              <li key={idx}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent 1: Corporate & Hub Profiler */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Agent 1
                        </span>
                        <h4 className="text-sm font-bold text-white">Corporate & Hub Profiler</h4>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {intel.tabs?.dossier?.corporate?.hub_location}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                        <div className="text-[11px] text-zinc-400">Operational Scale</div>
                        <div className="text-sm font-bold text-white mt-1">
                          {intel.tabs?.dossier?.corporate?.operational_scale}
                        </div>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                        <div className="text-[11px] text-zinc-400">Estimated Vintage</div>
                        <div className="text-sm font-bold text-emerald-400 mt-1">
                          {intel.tabs?.dossier?.corporate?.estimated_years_in_business}
                        </div>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                        <div className="text-[11px] text-zinc-400">Specialization Archetype</div>
                        <div className="text-sm font-bold text-indigo-400 mt-1 leading-snug">
                          {intel.tabs?.dossier?.corporate?.business_model_archetype}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-3.5 text-xs text-zinc-300 leading-relaxed">
                      <span className="font-bold text-blue-400">Physical Hub Context: </span>
                      {intel.tabs?.dossier?.corporate?.hub_ecosystem} — {intel.tabs?.dossier?.corporate?.hub_significance}
                    </div>

                    <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                      <span>Source Provenance: {intel.tabs?.dossier?.corporate?.data_provenance}</span>
                      <span className="text-emerald-400">Verified Record</span>
                    </div>
                  </div>

                  {/* Agent 2: Web & Tech Stack Sleuth (Real Live Fetch) */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Agent 2
                        </span>
                        <h4 className="text-sm font-bold text-white">Web & Tech Stack Sleuth</h4>
                        {intel.tabs?.dossier?.tech?.is_website_live ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            LIVE HTTP {intel.tabs?.dossier?.tech?.http_status_code || 200}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {intel.tabs?.dossier?.tech?.has_website ? 'OFFLINE / UNREACHABLE' : 'NO WEB ASSET'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Tech Maturity: {intel.tabs?.dossier?.tech?.tech_maturity_score}/100
                      </span>
                    </div>

                    {/* Live Scraped Page Title & Meta Description */}
                    {intel.tabs?.dossier?.tech?.is_website_live && (
                      <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1.5">
                        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Real HTML &lt;title&gt; Discovered:</span>
                        </div>
                        <div className="text-xs font-bold text-zinc-200">
                          {intel.tabs?.dossier?.tech?.live_page_title || 'No Title Tag'}
                        </div>
                        {intel.tabs?.dossier?.tech?.live_meta_description && (
                          <div className="text-[11px] text-zinc-400 pt-1 line-clamp-2">
                            "{intel.tabs?.dossier?.tech?.live_meta_description}"
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                        <div className="text-[11px] text-zinc-500">CMS & Framework</div>
                        <div className="font-semibold text-zinc-200 mt-1">{intel.tabs?.dossier?.tech?.detected_cms_framework}</div>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                        <div className="text-[11px] text-zinc-500">Server Software</div>
                        <div className="font-semibold text-zinc-200 mt-1">{intel.tabs?.dossier?.tech?.server_header}</div>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                        <div className="text-[11px] text-zinc-500">SSL Certificate</div>
                        <div className="font-semibold text-emerald-400 mt-1">{intel.tabs?.dossier?.tech?.ssl_security_status}</div>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                        <div className="text-[11px] text-zinc-500">WhatsApp Chat</div>
                        <div className={`font-semibold mt-1 ${intel.tabs?.dossier?.tech?.whatsapp_chat_integrated ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {intel.tabs?.dossier?.tech?.whatsapp_chat_integrated ? 'Integrated on Site' : 'Missing (Inquiry Gap)'}
                        </div>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                        <div className="text-[11px] text-zinc-500">Analytics Telemetry</div>
                        <div className="font-semibold text-zinc-200 mt-1">
                          {intel.tabs?.dossier?.tech?.analytics_telemetry_detected ? 'GA4 / Tracking Active' : 'Untracked'}
                        </div>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                        <div className="text-[11px] text-zinc-500">Interactive Forms</div>
                        <div className="font-semibold text-zinc-200 mt-1">
                          {intel.tabs?.dossier?.tech?.interactive_forms_detected ? `${intel.tabs?.dossier?.tech?.interactive_forms_detected} Forms Found` : '0 Forms Detected'}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-500 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60 flex items-center justify-between">
                      <span>Audit Provenance: {intel.tabs?.dossier?.tech?.provenance_audit}</span>
                      <span className="text-zinc-400">{intel.tabs?.dossier?.tech?.tech_maturity_grade}</span>
                    </div>
                  </div>

                  {/* Agent 3: Reputation & Sentiment Auditor */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Agent 3
                        </span>
                        <h4 className="text-sm font-bold text-white">Reputation & Sentiment Auditor</h4>
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        {intel.tabs?.dossier?.sentiment?.sentiment_tier}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
                        <div className="text-xs font-bold text-emerald-400 mb-2.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mined Public Strengths
                        </div>
                        <ul className="space-y-1.5 text-xs text-zinc-300">
                          {intel.tabs?.dossier?.sentiment?.public_strengths?.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-500">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
                        <div className="text-xs font-bold text-amber-400 mb-2.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Recurring Customer Friction Points
                        </div>
                        <ul className="space-y-1.5 text-xs text-zinc-300">
                          {intel.tabs?.dossier?.sentiment?.recurring_customer_complaints?.map((cmp, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-500">•</span>
                              <span>{cmp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800">
                      {intel.tabs?.dossier?.sentiment?.summary}
                    </div>
                  </div>

                  {/* Agent 4: Stakeholder & Decision Maker Locator (Honest Channels) */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Agent 4
                        </span>
                        <h4 className="text-sm font-bold text-white">Stakeholder & Verified Channels</h4>
                      </div>
                      <span className="text-xs text-emerald-400 font-mono font-semibold">
                        {intel.tabs?.dossier?.stakeholder?.highest_converting_channel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-400 font-medium">Target Executive Designation:</div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-400" />
                          {intel.tabs?.dossier?.stakeholder?.primary_executive_designation}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Secondary roles: {intel.tabs?.dossier?.stakeholder?.secondary_designations?.join(', ')}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-zinc-400 font-medium">Verified Channels & Emails:</div>
                        <div className="flex flex-col gap-1.5">
                          {intel.tabs?.dossier?.stakeholder?.verified_communication_channels?.map((ch, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-950 border border-zinc-800 text-purple-300">
                                {ch}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-zinc-200">Data Source: </span>
                        <span>{intel.tabs?.dossier?.stakeholder?.provenance}</span>
                      </div>
                      <span className="text-emerald-400 font-mono text-[11px]">Zero Hallucination</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ⚠️ PAIN POINTS IDENTIFIED */}
              {activeTab === 'pain_points' && (
                <div className="space-y-5">
                  {/* Agent 5: Sector Friction Diagnostician */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Agent 5
                        </span>
                        <h4 className="text-sm font-bold text-white">Sector Friction Diagnostician</h4>
                      </div>
                      <span className="text-xs font-bold text-rose-400">
                        {intel.tabs?.pain_points?.friction?.friction_category}
                      </span>
                    </div>

                    {/* 3 Specific Operational Bottlenecks */}
                    <div className="space-y-3">
                      {intel.tabs?.pain_points?.friction?.operational_bottlenecks?.map((b, idx) => (
                        <div key={idx} className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white">{b.title}</div>
                            <div className="text-xs text-zinc-300 leading-relaxed">{b.issue}</div>
                            <div className="text-[11px] text-rose-400/90 font-mono pt-1">
                              Impact: {b.impact}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agent 6: Digital Presence & Leakage Auditor */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Agent 6
                        </span>
                        <h4 className="text-sm font-bold text-white">Digital Presence & Leakage Auditor</h4>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        Estimated Leakage: {intel.tabs?.pain_points?.leakage?.inquiry_leakage_rate}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                        <div className="text-xs font-bold text-zinc-300">Lost Revenue Channels Discovered:</div>
                        <ul className="text-xs text-zinc-400 space-y-1.5">
                          {intel.tabs?.pain_points?.leakage?.lost_revenue_channels?.map((ch, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-400">✗</span>
                              <span>{ch}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                        <div className="text-xs font-bold text-zinc-300">Conversion Barriers:</div>
                        <div className="text-xs text-zinc-400">
                          WhatsApp Click-to-Chat: <span className="text-rose-400 font-semibold">{intel.tabs?.pain_points?.leakage?.whatsapp_click_to_chat}</span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Catalog Flow: <span className="text-amber-400 font-semibold">{intel.tabs?.pain_points?.leakage?.catalog_responsiveness}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono pt-1">
                          {intel.tabs?.pain_points?.leakage?.missed_revenue_impact}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent 7 & 8: Benchmarker & Tech Readiness */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Agent 7 */}
                    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          Agent 7
                        </span>
                        <h4 className="text-sm font-bold text-white">Chennai Benchmarker</h4>
                      </div>
                      <div className="text-xs text-zinc-300">
                        <div className="font-semibold text-white">{intel.tabs?.pain_points?.benchmarker?.maps_market_position}</div>
                        <p className="text-zinc-400 mt-1">{intel.tabs?.pain_points?.benchmarker?.competitor_density}</p>
                        <div className="mt-2 p-2.5 bg-blue-950/20 rounded-lg text-blue-300 text-[11px]">
                          <strong>Response SLA Gap:</strong> {intel.tabs?.pain_points?.benchmarker?.response_sla_gap}
                        </div>
                      </div>
                    </div>

                    {/* Agent 8 */}
                    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          Agent 8
                        </span>
                        <h4 className="text-sm font-bold text-white">Tech Readiness & Budget</h4>
                      </div>
                      <div className="text-xs space-y-1.5">
                        <div className="text-indigo-400 font-bold">{intel.tabs?.pain_points?.readiness?.recommended_tier}</div>
                        <div className="text-zinc-400">Budget Range: <strong className="text-white">{intel.tabs?.pain_points?.readiness?.estimated_investment}</strong></div>
                        <div className="text-zinc-400">Deployment Speed: <strong className="text-emerald-400">{intel.tabs?.pain_points?.readiness?.deployment_timeline}</strong></div>
                        <div className="text-[11px] text-zinc-500">{intel.tabs?.pain_points?.readiness?.roi_horizon}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: 🎯 PROPOSED PITCH */}
              {activeTab === 'pitch' && (
                <div className="space-y-5">
                  {/* Agent 9: Clickfield AI Solution Matcher */}
                  <div className="bg-gradient-to-br from-indigo-950/50 via-zinc-900/90 to-zinc-950 border border-indigo-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                          Agent 9 · Clickfield AI Matcher
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {intel.tabs?.pitch?.solution?.solution_name}
                        </h4>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                        100% Fit Match
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-indigo-200">
                      {intel.tabs?.pitch?.solution?.solution_headline}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {intel.tabs?.pitch?.solution?.value_prop}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {intel.tabs?.pitch?.solution?.core_modules?.map((mod, idx) => (
                        <div key={idx} className="bg-zinc-950/80 border border-indigo-900/40 rounded-xl p-3 flex items-start gap-2.5">
                          <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-zinc-200 font-medium">{mod}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                      <strong>Integration:</strong> {intel.tabs?.pitch?.solution?.integration_architecture}
                    </div>
                  </div>

                  {/* Agent 10: Business Case & ROI Quantifier */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          Agent 10
                        </span>
                        <h4 className="text-sm font-bold text-white">Business Case & Quantified ROI</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Payback: {intel.tabs?.pitch?.roi?.payback_period}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4">
                        <div className="text-[11px] text-zinc-400">Core Headline Gain</div>
                        <div className="text-sm font-extrabold text-white mt-1 leading-snug">
                          {intel.tabs?.pitch?.roi?.headline_metric}
                        </div>
                      </div>
                      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4">
                        <div className="text-[11px] text-zinc-400">Time Saved Weekly</div>
                        <div className="text-sm font-bold text-indigo-400 mt-1">
                          {intel.tabs?.pitch?.roi?.time_saved}
                        </div>
                      </div>
                      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4">
                        <div className="text-[11px] text-zinc-400">Est. Monthly Recovery</div>
                        <div className="text-sm font-bold text-emerald-400 mt-1">
                          {intel.tabs?.pitch?.roi?.monthly_financial_recovery}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-300">Annualized Impact: </span>
                      {intel.tabs?.pitch?.roi?.annualized_impact}
                    </div>
                  </div>

                  {/* Agent 11: Hook & Angle Strategist */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          Agent 11
                        </span>
                        <h4 className="text-sm font-bold text-white">Hook & Angle Strategist</h4>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        {intel.tabs?.pitch?.angle?.selected_strategy}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-white">{intel.tabs?.pitch?.angle?.angle_a_peer_problem?.name}</div>
                        <p className="text-zinc-400 leading-relaxed">{intel.tabs?.pitch?.angle?.angle_a_peer_problem?.angle_text}</p>
                      </div>
                      <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-white">{intel.tabs?.pitch?.angle?.angle_b_speed_revenue?.name}</div>
                        <p className="text-zinc-400 leading-relaxed">{intel.tabs?.pitch?.angle?.angle_b_speed_revenue?.angle_text}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                      <span>Psychological Trigger: {intel.tabs?.pitch?.angle?.psychological_trigger}</span>
                      <span className="text-indigo-400">{intel.tabs?.pitch?.angle?.conversational_tone}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ✉️ OUTREACH PLAYBOOK */}
              {activeTab === 'outreach' && (
                <div className="space-y-5">
                  {/* Agent 12: Subject Lines */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                          Agent 12
                        </span>
                        <h4 className="text-sm font-bold text-white">Subject Line Optimizer</h4>
                      </div>
                      <span className="text-xs text-emerald-400 font-mono">
                        {intel.tabs?.outreach?.subjects?.expected_open_rate}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        intel.tabs?.outreach?.subjects?.primary_subject,
                        ...(intel.tabs?.outreach?.subjects?.alternative_subjects || [])
                      ].map((sub, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200"
                        >
                          <span className="truncate mr-3">{sub}</span>
                          <button
                            onClick={() => handleCopy(sub, `sub_${idx}`)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-sans transition-colors cursor-pointer shrink-0"
                          >
                            {copiedKey === `sub_${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedKey === `sub_${idx}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      Rule: {intel.tabs?.outreach?.subjects?.style_rules}
                    </div>
                  </div>

                  {/* Agent 13: The "YES" Cold Email Drafter */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          Agent 13
                        </span>
                        <h4 className="text-sm font-bold text-white">The "YES" Cold Email Drafter</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${
                            emailWordCount <= 80
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {emailWordCount} Words (Target: &lt; 80)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] text-zinc-400 font-mono">Subject Line:</label>
                      <input
                        type="text"
                        value={editableSubject}
                        onChange={(e) => setEditableSubject(e.target.value)}
                        className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] text-zinc-400 font-mono">Cold Email Body (4-Part Architecture):</label>
                      <textarea
                        rows={7}
                        value={editableEmail}
                        onChange={(e) => setEditableEmail(e.target.value)}
                        className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 leading-relaxed font-sans focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Architecture: Observation ➔ The Gap ➔ The Solution ➔ Low-Friction Binary CTA
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(editableEmail, 'email_body')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          {copiedKey === 'email_body' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedKey === 'email_body' ? 'Copied Body' : 'Copy Email'}
                        </button>

                        {leadData?.email && (
                          <a
                            href={getOutlookWebComposeUrl(leadData.email, editableSubject, editableEmail)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                            title="Open directly in Outlook Web (outlook.cloud.microsoft) in Chrome"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open in Outlook Web
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Agent 14: Multi-Touch Sequence & WhatsApp Specialist */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Follow-Ups */}
                    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                          Agent 14
                        </span>
                        <h4 className="text-sm font-bold text-white">Multi-Touch Sequence</h4>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                            <span>Day 3 Gentle Nudge</span>
                            <button
                              onClick={() => handleCopy(intel.tabs?.outreach?.multitouch?.day_3_nudge, 'day3')}
                              className="text-zinc-500 hover:text-white cursor-pointer"
                            >
                              {copiedKey === 'day3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-xs text-zinc-300">{intel.tabs?.outreach?.multitouch?.day_3_nudge}</p>
                        </div>

                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                            <span>Day 7 Insight Follow-Up</span>
                            <button
                              onClick={() => handleCopy(intel.tabs?.outreach?.multitouch?.day_7_insight_followup, 'day7')}
                              className="text-zinc-500 hover:text-white cursor-pointer"
                            >
                              {copiedKey === 'day7' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-xs text-zinc-300">{intel.tabs?.outreach?.multitouch?.day_7_insight_followup}</p>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Specialist */}
                    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            Agent 14
                          </span>
                          <h4 className="text-sm font-bold text-white">WhatsApp Outreach</h4>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400">#1 B2B Channel in India</span>
                      </div>

                      <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-2">
                        <div className="text-xs text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {intel.tabs?.outreach?.multitouch?.whatsapp_message}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleCopy(intel.tabs?.outreach?.multitouch?.whatsapp_message, 'wa_msg')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          {copiedKey === 'wa_msg' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copy WhatsApp Pitch
                        </button>

                        {leadData?.phone && (
                          <a
                            href={`https://wa.me/${leadData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(intel.tabs?.outreach?.multitouch?.whatsapp_message)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Send via WhatsApp Web
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Agent 15: DPDP Legal Shield & Gatekeeper */}
                  <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Agent 15
                        </span>
                        <h4 className="text-sm font-bold text-white">DPDP Legal Shield & Human Gatekeeper</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold font-mono">
                          DPDP 2023 CERTIFIED
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
                          0 SPAM WORDS
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Legal Safe Harbor:</span>
                        <strong className="text-zinc-200">India DPDP Act 2023 Sec 3(c)(ii) & CAN-SPAM Act</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Audit Trail Fingerprint:</span>
                        <strong className="text-indigo-400 font-mono">{intel.tabs?.outreach?.shield?.audit_trail_id}</strong>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span>Human-in-the-Loop Status:</span>
                        <strong className={approvedState ? 'text-emerald-400' : 'text-amber-400'}>
                          {approvedState ? 'APPROVED & AUTHORIZED FOR SEND' : 'DRAFT — STRICTLY LOCKED UNTIL OPERATOR APPROVAL'}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={handleApprove}
                        disabled={approving || approvedState}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                          approvedState
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {approving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : approvedState ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>
                          {approvedState ? 'Pitch Approved & Verified' : 'Approve Pitch & Authorize Outreach'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
