import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Users, Kanban, Mail, FileText, Activity,
  Database, Settings, ChevronLeft, ChevronRight, Radar,
  CalendarDays, BarChart3, Sparkles
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'today', label: 'Today', icon: Calendar, shortcut: 'g t' },
  { id: 'leads', label: 'Leads', icon: Users, shortcut: 'g l' },
  { id: 'outreach', label: 'Outreach', icon: Mail, shortcut: 'g o' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, shortcut: 'g c' },
  { id: 'tracker', label: 'Tracker', icon: Kanban, shortcut: 'g k' },
  { id: 'reports', label: 'Reports', icon: BarChart3, shortcut: 'g r' },
  { id: 'insights', label: 'Insights', icon: Sparkles, shortcut: 'g i' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'g s' }
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse
}) {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col bg-[var(--surface)] border-r border-[var(--border)] transition-[width] duration-240 ease-[cubic-bezier(0.2,0,0,1)] ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-[56px] px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-[8px] bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center shrink-0 text-[var(--primary)]">
            <Radar className="w-4 h-4 animate-spin-slow" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="min-w-0"
            >
              <div className="text-[14px] font-semibold tracking-tight text-[var(--text)] truncate">
                Clickfield AI
              </div>
              <div className="text-[11px] text-[var(--muted)] truncate">
                Opportunity Radar
              </div>
            </motion.div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List in exact order: Today, Leads, Pipeline, Outreach, Tenders, Flow, Data Health, Settings */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative w-full h-[40px] flex items-center gap-3 px-3 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer select-none group ${
                isActive
                  ? 'bg-[var(--surface-2)] text-[var(--text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60'
              }`}
            >
              {/* Active sliding indicator bar (3px primary) */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[var(--primary)]"
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                />
              )}

              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] group-hover:text-[var(--text)]'
                }`}
              />

              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="truncate flex-1 text-left"
                >
                  {item.label}
                </motion.span>
              )}

              {!collapsed && item.shortcut && (
                <span className="text-[10px] font-mono text-[var(--muted)] opacity-50 group-hover:opacity-100 transition-opacity">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Info */}
      <div className="p-3 border-t border-[var(--border)] shrink-0">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-[11px] text-[var(--muted)] ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--success)] shrink-0" />
          {!collapsed && (
            <span className="truncate">
              DPDP & RFC-2142 Shield Active
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
