import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import {
  Calendar, Users, Kanban, Mail, FileText, Activity,
  Database, Settings, Moon, Sun, Play, Search, X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onTriggerCrawl
}) {
  const { theme, toggleTheme } = useTheme();

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-[12px] bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden animate-in zoom-in-98 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Global Command Menu" className="w-full">
          <div className="flex items-center px-3 border-b border-[var(--border)]">
            <Search className="w-4 h-4 text-[var(--muted)] shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search pages... (Esc to close)"
              className="w-full px-3 py-3 text-[14px] bg-transparent text-[var(--text)] placeholder-[var(--muted)] outline-none border-none"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 divide-y divide-[var(--border)] text-[13px]">
            <Command.Empty className="py-6 text-center text-[var(--muted)] text-[13px]">
              No matching commands found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="py-1">
              <Command.Item
                onSelect={() => {
                  onNavigate('today');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[var(--primary)]" />
                  <span>Today (Home)</span>
                </div>
                <kbd className="text-[11px] font-mono text-[var(--muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                  g t
                </kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onNavigate('leads');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[var(--primary)]" />
                  <span>Leads Directory</span>
                </div>
                <kbd className="text-[11px] font-mono text-[var(--muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                  g l
                </kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onNavigate('pipeline');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Kanban className="w-4 h-4 text-[var(--primary)]" />
                  <span>Pipeline Kanban</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onNavigate('outreach');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[var(--primary)]" />
                  <span>Outreach Workspace</span>
                </div>
                <kbd className="text-[11px] font-mono text-[var(--muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                  g o
                </kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onNavigate('tenders');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[var(--primary)]" />
                  <span>Tenders & RFPs</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onNavigate('flow');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-[var(--primary)]" />
                  <span>Flow (System Architecture)</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onNavigate('health');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-[var(--primary)]" />
                  <span>Data Health</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onNavigate('settings');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-[var(--primary)]" />
                  <span>Settings & Configuration</span>
                </div>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Quick Actions" className="py-1">
              <Command.Item
                onSelect={() => {
                  toggleTheme();
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-[var(--warn)]" /> : <Moon className="w-4 h-4 text-[var(--info)]" />}
                  <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                </div>
              </Command.Item>

              {onTriggerCrawl && (
                <Command.Item
                  onSelect={() => {
                    onTriggerCrawl();
                    onOpenChange(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-[6px] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Play className="w-4 h-4 text-[var(--success)]" />
                    <span>Run Multi-Agent Pipeline Now</span>
                  </div>
                </Command.Item>
              )}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
