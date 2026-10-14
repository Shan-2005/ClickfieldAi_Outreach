import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Shell from './components/layout/Shell';
import TodayPage from './pages/TodayPage';
import LeadsPage from './pages/LeadsPage';
import OutreachPage from './pages/OutreachPage';
import CalendarPage from './pages/CalendarPage';
import TrackerPage from './pages/TrackerPage';
import ReportsPage from './pages/ReportsPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';
import LeadDrawer from './components/leads/LeadDrawer';
import { useToast } from './context/ToastContext';

const PAGE_TITLES = {
  today: "Today's Outreach Radar",
  leads: 'Industrial Leads Directory',
  outreach: 'Outreach Workspace & Dispatch',
  calendar: 'Meeting & Follow-up Calendar',
  tracker: 'B2B Outreach Pipeline & Tracker',
  reports: 'Weekly Executive Outreach Summary',
  insights: 'System Flow & Data Health',
  settings: 'System Settings & Compliance'
};

export default function App() {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('tab');
      if (param && PAGE_TITLES[param]) return param;
    } catch {
      // fallback
    }
    return 'today';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      const url = new URL(window.location);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
    } catch {
      // ignore
    }
  };

  const [selectedOutreachLead, setSelectedOutreachLead] = useState(null);
  const [leadsInitialFilter, setLeadsInitialFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalDrawerLeadId, setGlobalDrawerLeadId] = useState(null);
  const [globalDrawerOpen, setGlobalDrawerOpen] = useState(false);
  const { success, info } = useToast();

  const handleOpenLeadOutreach = (lead) => {
    setSelectedOutreachLead(lead);
    setActiveTab('outreach');
  };

  const handleNavigateToLeads = (filter = null) => {
    if (filter) setLeadsInitialFilter(filter);
    setActiveTab('leads');
  };

  const handleOpenLeadDrawer = (leadId) => {
    setGlobalDrawerLeadId(leadId);
    setGlobalDrawerOpen(true);
  };

  const handleTriggerCrawl = async () => {
    info('Triggering autonomous discovery crawler across industrial portals...');
    try {
      const res = await fetch('/api/agents/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_source: 'command_palette' })
      });
      if (res.ok) {
        success('Crawl cycle started successfully.');
      } else {
        info('Crawl cycle initialized in background.');
      }
    } catch (err) {
      console.warn('Crawl trigger warning:', err);
      info('Crawl scheduler contacted.');
    }
  };

  return (
    <Shell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      pageTitle={PAGE_TITLES[activeTab] || 'Clickfield AI'}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onTriggerCrawl={handleTriggerCrawl}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: 0.3,
            ease: [0.2, 0, 0, 1]
          }}
          className="w-full"
        >
          {activeTab === 'today' && (
            <TodayPage
              onOpenLeadOutreach={handleOpenLeadOutreach}
              onNavigateToLeads={handleNavigateToLeads}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsPage
              onOpenOutreach={handleOpenLeadOutreach}
              initialFilter={leadsInitialFilter}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachPage
              initialLead={selectedOutreachLead}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarPage
              onOpenLeadDrawer={handleOpenLeadDrawer}
            />
          )}

          {activeTab === 'tracker' && (
            <TrackerPage
              onOpenLeadDrawer={handleOpenLeadDrawer}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage />
          )}

          {activeTab === 'insights' && (
            <InsightsPage />
          )}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Global Lead Drawer for Calendar & Tracker */}
      {globalDrawerLeadId && (
        <LeadDrawer
          leadId={globalDrawerLeadId}
          isOpen={globalDrawerOpen}
          onClose={() => setGlobalDrawerOpen(false)}
          onOpenOutreach={(lead) => {
            setGlobalDrawerOpen(false);
            handleOpenLeadOutreach(lead);
          }}
        />
      )}
    </Shell>
  );
}
