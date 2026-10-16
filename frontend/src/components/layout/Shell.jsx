import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '../common/CommandPalette';
import RadarAssistantModal from '../RadarAssistantModal';

export default function Shell({
  activeTab,
  onSelectTab,
  pageTitle,
  searchQuery,
  onSearchChange,
  children,
  onTriggerCrawl
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Auto-collapse sidebar below 1100px as required
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global key navigation (g t, g l, g o, ⌘J for Assistant)
  useEffect(() => {
    let pendingG = false;
    let gTimeout = null;

    const handleKeyDown = (e) => {
      // ⌘J or Ctrl+J to toggle AI Assistant
      if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setAssistantOpen((prev) => !prev);
        return;
      }

      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable;

      if (isInput) return;

      if (e.key === 'g' || e.key === 'G') {
        pendingG = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          pendingG = false;
        }, 1000);
        return;
      }

      if (pendingG) {
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          onSelectTab('today');
          pendingG = false;
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          onSelectTab('leads');
          pendingG = false;
        } else if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          onSelectTab('outreach');
          pendingG = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [onSelectTab]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-250">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {/* Top Bar */}
      <TopBar
        pageTitle={pageTitle}
        collapsed={collapsed}
        onOpenCommandPalette={() => setCmdOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onTriggerCrawl={onTriggerCrawl}
      />

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={onSelectTab}
        onTriggerCrawl={onTriggerCrawl}
      />

      {/* Main Content Area: max-width 1440, 24px gutters, 24px between blocks */}
      <main
        className={`pt-[56px] min-h-screen transition-[margin-left] duration-240 ease-[cubic-bezier(0.2,0,0,1)] ${
          collapsed ? 'ml-[72px]' : 'ml-[240px]'
        }`}
      >
        <div className="max-w-[1440px] mx-auto p-6 space-y-6">
          {children}
        </div>
      </main>

      {/* Floating Radar Assistant Copilot Button */}
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-[44px] px-4 rounded-[999px] bg-[var(--primary)] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 font-medium text-[13px] border border-white/15 cursor-pointer"
        title="Open AI Radar Assistant (⌘J)"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <Bot className="w-4 h-4" />
        <span>Radar Copilot</span>
        <kbd className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded ml-1">⌘J</kbd>
      </button>

      {/* Assistant Modal */}
      <RadarAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onNavigateToOutreach={(lead) => {
          setAssistantOpen(false);
          onSelectTab('outreach');
        }}
      />
    </div>
  );
}
