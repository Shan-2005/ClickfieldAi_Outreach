import React, { useRef, useEffect } from 'react';
import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function TopBar({
  pageTitle = 'Today',
  collapsed = false,
  onOpenCommandPalette,
  searchQuery,
  onSearchChange
}) {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef(null);

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

      {/* Right Side: Theme toggle, Bell, Avatar */}
      <div className="flex items-center gap-2.5">
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

        {/* Avatar */}
        <div className="w-[36px] h-[36px] rounded-[8px] bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] font-semibold text-[13px] select-none">
          SP
        </div>
      </div>
    </header>
  );
}
