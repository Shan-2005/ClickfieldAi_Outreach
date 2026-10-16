import React, { useRef, useEffect, useState } from 'react';
import { Search, Bell, Moon, Sun, Zap, RefreshCw, Cpu, Play, Square, Power } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export default function TopBar({
  pageTitle = 'Today',
  collapsed = false,
  onOpenCommandPalette,
  searchQuery,
  onSearchChange,
  onTriggerCrawl
}) {
  const { theme, toggleTheme } = useTheme();
  const { success, info } = useToast();
  const searchInputRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isTogglingOllama, setIsTogglingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({
    online: null,
    model: 'llama3.2:3b',
    host: 'http://localhost:11434'
  });

  const checkOllama = async () => {
    try {
      const res = await fetch('/api/agentic/ollama-status');
      if (res.ok) {
        const data = await res.json();
        setOllamaStatus({
          online: data.online,
          model: data.model || 'llama3.2:3b',
          host: data.host || 'http://localhost:11434',
          models: data.models || []
        });
      } else {
        setOllamaStatus(prev => ({ ...prev, online: false }));
      }
    } catch {
      setOllamaStatus(prev => ({ ...prev, online: false }));
    }
  };

  const handleToggleOllama = async () => {
    if (isTogglingOllama) return;
    setIsTogglingOllama(true);
    const isCurrentlyOnline = ollamaStatus.online === true;
    if (!isCurrentlyOnline) {
      info('Starting local Ollama daemon (llama3.2:3b)...');
    } else {
      info('Stopping Ollama daemon and releasing VRAM/RAM...');
    }

    try {
      const endpoint = !isCurrentlyOnline ? '/api/agentic/ollama-start' : '/api/agentic/ollama-stop';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (data.online) {
        success('Ollama daemon online & ready for multi-agent generation!');
        setOllamaStatus(prev => ({ ...prev, online: true }));
      } else {
        success('Ollama daemon stopped. Memory and VRAM released.');
        setOllamaStatus(prev => ({ ...prev, online: false }));
      }
    } catch (err) {
      info('Completed action. Updating status...');
    } finally {
      setTimeout(() => {
        checkOllama();
        setIsTogglingOllama(false);
      }, 1200);
    }
  };

  useEffect(() => {
    checkOllama();
    const interval = setInterval(checkOllama, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAgents = async () => {
    if (isRunning) return;
    setIsRunning(true);
    info('Dispatched 26-agent swarm pipeline across Chennai SMB clusters & tender portals...');
    try {
      if (onTriggerCrawl) {
        await onTriggerCrawl();
      } else {
        const res = await fetch('/api/agents/run', { method: 'POST' });
        if (res.ok) {
          success('Multi-agent crawl and ranking run completed successfully.');
        }
      }
    } catch {
      info('Agent pipeline executing in background.');
    } finally {
      setTimeout(() => setIsRunning(false), 2000);
    }
  };

  // Press / to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 h-[56px] z-20 flex items-center justify-between px-6 bg-[var(--surface)] border-b border-[var(--border)] transition-[left] duration-240 ease-[cubic-bezier(0.2,0,0,1)] ${
        collapsed ? 'left-[72px]' : 'left-[240px]'
      }`}
    >
      {/* Left: Page Title */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <h1 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Search 480px (press / to focus, Cmd/Ctrl+K opens palette) */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-[480px] px-2">
        <div
          onClick={onOpenCommandPalette}
          className="w-full h-[36px] flex items-center justify-between px-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/60 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search leads, tenders, or press '/' to filter..."
              className="w-full text-[13px] bg-transparent text-[var(--text)] placeholder-[var(--muted)] outline-none border-none cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)] shrink-0">
            <span>⌘K</span>
          </kbd>
        </div>
      </div>

      {/* Right Side: Run Agents, Theme toggle, Bell, Avatar */}
      <div className="flex items-center gap-2.5">
        {/* Ollama Online Verification Indicator & Start/Stop Controls */}
        <div className="flex items-center gap-1.5">
          <div
            className={`h-[34px] px-2.5 rounded-[8px] border flex items-center gap-2 select-none text-[11px] font-medium transition-colors ${
              ollamaStatus.online === true
                ? 'bg-[var(--success)]/10 border-[var(--success)]/40 text-[var(--text)]'
                : ollamaStatus.online === false
                ? 'bg-[var(--danger)]/10 border-[var(--danger)]/40 text-[var(--muted)]'
                : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]'
            }`}
            title={
              ollamaStatus.online === true
                ? `Ollama Daemon Online (${ollamaStatus.host}) - Model: ${ollamaStatus.model}`
                : `Ollama Daemon Offline on ${ollamaStatus.host}`
            }
          >
            <span className="relative flex h-2 w-2">
              {ollamaStatus.online === true && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  ollamaStatus.online === true
                    ? 'bg-[var(--success)]'
                    : ollamaStatus.online === false
                    ? 'bg-[var(--danger)]'
                    : 'bg-[var(--muted)]'
                }`}
              ></span>
            </span>
            <span className="hidden sm:inline font-mono">
              {ollamaStatus.online === true ? 'Ollama: llama3.2' : ollamaStatus.online === false ? 'Ollama Offline' : 'Ollama...'}
            </span>
            {ollamaStatus.online === true && (
              <span className="hidden xl:inline text-[9px] uppercase tracking-wider font-bold text-[var(--success)] bg-[var(--success)]/15 px-1 py-0.5 rounded border border-[var(--success)]/30">
                Online
              </span>
            )}
          </div>

          {/* Interactive Start / Stop Button */}
          <button
            type="button"
            onClick={handleToggleOllama}
            disabled={isTogglingOllama}
            className={`h-[34px] px-2.5 rounded-[8px] border flex items-center gap-1.5 text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-60 ${
              ollamaStatus.online === true
                ? 'bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 border-[var(--danger)]/40 text-[var(--danger)]'
                : 'bg-[var(--success)]/15 hover:bg-[var(--success)]/25 border-[var(--success)]/40 text-[var(--success)]'
            }`}
            title={ollamaStatus.online === true ? 'Stop Ollama & free up system VRAM / RAM' : 'Start Ollama local LLM daemon (llama3.2:3b)'}
          >
            {isTogglingOllama ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : ollamaStatus.online === true ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span className="hidden lg:inline">
              {isTogglingOllama ? 'Working...' : ollamaStatus.online === true ? 'Stop Ollama' : 'Start Ollama'}
            </span>
          </button>
        </div>

        {/* Run Pipeline Button */}
        <button
          type="button"
          onClick={handleRunAgents}
          disabled={isRunning}
          className="h-[36px] px-3 rounded-[8px] bg-[var(--primary)] text-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-[var(--primary)]/90 transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50"
          title="Trigger live crawl & ranking across all 26 agents"
        >
          <Zap className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Run Pipeline'}</span>
        </button>
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)] transition-transform active:scale-[0.98] cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[var(--warn)]" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--info)]" />
          )}
        </button>

        {/* Bell (Notification) */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative w-[36px] h-[36px] rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)] transition-transform active:scale-[0.98] cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--primary)]" />
        </button>

        {/* Active Operator Badge with Role */}
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)] select-none">
          <div className="w-[34px] h-[34px] rounded-[8px] bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] font-bold text-[12px]">
            ZP
          </div>
          <div className="hidden xl:flex flex-col text-left leading-tight">
            <span className="text-[12px] font-semibold text-[var(--text)]">
              Zoya Patel
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] mt-0.5">
              <span className="px-1 py-0.2 rounded bg-[var(--primary)]/15 text-[var(--primary)] font-mono font-bold text-[9px] border border-[var(--primary)]/30">
                ADMIN
              </span>
              <span className="font-mono truncate max-w-[120px]">zoya@clickfield.ai</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
