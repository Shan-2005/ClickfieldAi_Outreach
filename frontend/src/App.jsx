import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import OverviewCards from './components/OverviewCards';
import FiltersBar from './components/FiltersBar';
import OpportunitiesTable from './components/OpportunitiesTable';
import PipelineBoard from './components/PipelineBoard';
import AgentStatusPanel from './components/AgentStatusPanel';
import LeadDrawer from './components/LeadDrawer';
import DigestModal from './components/DigestModal';
import ChennaiLeadsView from './components/ChennaiLeadsView';
import DailyOutreachView from './components/DailyOutreachView';
import RadarAssistantModal from './components/RadarAssistantModal';
import { Building2, Radar as RadarIcon, Mail, Bot, Sparkles } from 'lucide-react';

export default function App() {
  const [activeModule, setActiveModule] = useState('chennai'); // 'chennai' | 'rfp'
  const [opportunities, setOpportunities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCrawling, setIsCrawling] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showAgentsPanel, setShowAgentsPanel] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [showAssistantModal, setShowAssistantModal] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('clickfield_theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('clickfield_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [filters, setFilters] = useState({
    view: 'active', // 'active' | 'expired' | 'all'
    category: 'ALL',
    country: 'ALL',
    status: 'ALL',
    minScore: 0,
    keyword: '',
  });

  const fetchSummary = useCallback(() => {
    fetch('/api/opportunities/summary')
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error('Failed to load summary', err));
  }, []);

  const fetchAgents = useCallback(() => {
    fetch('/api/agents/status')
      .then((res) => res.json())
      .then((data) => setAgents(data))
      .catch((err) => console.error('Failed to load agent statuses', err));
  }, []);

  const fetchOpportunities = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('view', filters.view || 'active');
    if (filters.category !== 'ALL') params.append('category', filters.category);
    if (filters.country !== 'ALL') params.append('country', filters.country);
    if (filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.minScore > 0) params.append('min_score', filters.minScore);
    if (filters.keyword.trim()) params.append('keyword', filters.keyword.trim());

    fetch(`/api/opportunities?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setOpportunities(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load opportunities', err);
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    fetchSummary();
    fetchAgents();
    fetchOpportunities();
  }, [fetchSummary, fetchAgents, fetchOpportunities]);

  // Global keyboard shortcut: / to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      view: 'active',
      category: 'ALL',
      country: 'ALL',
      status: 'ALL',
      minScore: 0,
      keyword: '',
    });
  };

  const handleTriggerCrawl = async () => {
    setIsCrawling(true);
    try {
      await fetch('/api/agents/run', { method: 'POST' });
      // Poll agent statuses and reload data after crawl
      setTimeout(() => {
        fetchOpportunities();
        fetchSummary();
        fetchAgents();
        setIsCrawling(false);
      }, 3500);
    } catch (err) {
      console.error('Failed to trigger agent crawl', err);
      setIsCrawling(false);
    }
  };

  const handleUpdateStatus = async (oppId, newStatus) => {
    try {
      await fetch(`/api/opportunities/${oppId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOpportunities();
      fetchSummary();
    } catch (err) {
      console.error('Failed to update lead status', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100/70 dark:bg-black text-zinc-900 dark:text-white flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200">
      {/* Top Application Header - Dual Theme */}
      <Header
        onTriggerCrawl={handleTriggerCrawl}
        isCrawling={isCrawling}
        onOpenDigest={() => setShowDigestModal(true)}
        onToggleAgents={() => setShowAgentsPanel((prev) => !prev)}
        showAgentsPanel={showAgentsPanel}
        totalOpportunities={summary?.total_active || opportunities.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Module Switcher Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-200/60 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveModule('chennai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'chennai'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Chennai B2B Leads (&lt; 50 Staff)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 text-white">194 Leads</span>
            </button>

            <button
              onClick={() => setActiveModule('outreach')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'outreach'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Daily 15 Outreach (&lt; 50 Staff)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 text-white">15 Ready</span>
            </button>

            <button
              onClick={() => setActiveModule('rfp')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'rfp'
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <RadarIcon className="w-4 h-4" />
              <span>AI & Software RFP Radar</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAssistantModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600/20 to-indigo-600/20 hover:from-emerald-600/30 hover:to-indigo-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>Radar Copilot</span>
              <Sparkles className="w-3 h-3 text-indigo-400" />
            </button>
          </div>
        </div>

        {activeModule === 'chennai' ? (
          <ChennaiLeadsView onNavigateToOutreach={() => setActiveModule('outreach')} />
        ) : activeModule === 'outreach' ? (
          <DailyOutreachView />
        ) : (
          <>
            {/* Agent Telemetry Status Panel (collapsible) */}
            {showAgentsPanel && (
              <AgentStatusPanel
                agents={agents}
                onClose={() => setShowAgentsPanel(false)}
                onTriggerCrawl={handleTriggerCrawl}
                isCrawling={isCrawling}
              />
            )}

            {/* 5 KPI Metric Cards */}
            <OverviewCards
              summary={summary}
              currentStatusFilter={filters.status}
              onSelectStatusFilter={(statusVal) => handleFilterChange('status', statusVal)}
            />

            {/* Filter Controls Bar */}
            <FiltersBar
              filters={filters}
              onChangeFilter={handleFilterChange}
              onResetFilters={handleResetFilters}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              totalResults={opportunities.length}
            />

            {/* Primary View: Main Table vs Pipeline Kanban */}
            {loading ? (
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-16 text-center text-zinc-600 dark:text-zinc-400 text-xs shadow-xs">
                <div className="inline-block w-6 h-6 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                <div className="font-mono">Loading verified B2B opportunities...</div>
              </div>
            ) : viewMode === 'table' ? (
              <OpportunitiesTable
                opportunities={opportunities}
                onSelectLead={(id) => setSelectedLeadId(id)}
                selectedLeadId={selectedLeadId}
              />
            ) : (
              <PipelineBoard
                opportunities={opportunities}
                onSelectLead={(id) => setSelectedLeadId(id)}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
          </>
        )}

      </main>

      {/* Slide-out Lead Detail Drawer */}
      {selectedLeadId && (
        <LeadDrawer
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onStatusUpdated={() => {
            fetchOpportunities();
            fetchSummary();
          }}
        />
      )}

      {/* Daily Digest Modal */}
      {showDigestModal && (
        <DigestModal
          opportunities={opportunities}
          summary={summary}
          onClose={() => setShowDigestModal(false)}
        />
      )}

      {/* Radar Copilot Assistant Modal */}
      <RadarAssistantModal
        isOpen={showAssistantModal}
        onClose={() => setShowAssistantModal(false)}
        onNavigateToOutreach={() => setActiveModule('outreach')}
      />

      {/* Floating Dynamic Copilot Launcher (Accessible from Any View) */}
      <button
        onClick={() => setShowAssistantModal(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-full shadow-2xl shadow-emerald-500/30 border border-white/20 font-bold text-xs transition-all hover:scale-105 cursor-pointer backdrop-blur-md group"
        title="Open Dynamic Project Copilot"
      >
        <div className="relative">
          <Bot className="w-4 h-4 text-emerald-200" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span>Radar Copilot</span>
        <Sparkles className="w-3 h-3 text-indigo-300 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Footer Compliance Badge */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black py-4 px-6 text-center text-zinc-500 text-xs font-mono transition-colors duration-200">
        <p className="m-0">
          ClickfieldAI Opportunity Radar · 11 Autonomous Crawling & Evaluation Agents · India DPDP Act 2023, CAN-SPAM & GDPR Compliant
        </p>
      </footer>
    </div>
  );
}
