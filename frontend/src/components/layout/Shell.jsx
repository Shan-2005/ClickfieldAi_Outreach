import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '../common/CommandPalette';

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

  // Global key navigation (g t, g l, g o, Esc)
  useEffect(() => {
    let pendingG = false;
    let gTimeout = null;

    const handleKeyDown = (e) => {
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
    </div>
  );
}
