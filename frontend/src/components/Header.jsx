import React from 'react';
import { 
  Radar, 
  RefreshCw, 
  Download, 
  Mail, 
  Activity, 
  ShieldCheck, 
  Globe2,
  Sun,
  Moon
} from 'lucide-react';

export default function Header({ 
  onTriggerCrawl, 
  isCrawling, 
  onOpenDigest, 
  onToggleAgents, 
  showAgentsPanel, 
  totalOpportunities,
  theme,
  onToggleTheme
}) {
  const handleExportCSV = () => {
    window.open('/api/opportunities/export/csv', '_blank');
  };

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-md sticky top-0 z-30 px-6 py-4 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Brand identity - Light & Dark adaptive */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-black dark:bg-white text-white dark:text-black shadow-sm font-black transition-colors">
            <Radar className="w-5 h-5 text-white dark:text-black" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 dark:bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-600 dark:bg-zinc-300"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white m-0">ClickfieldAI</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800">
                Opportunity Radar
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
              <span>Multi-Agent Procurement Intelligence</span>
              <span className="inline-block w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-700"></span>
              <span className="text-zinc-900 dark:text-white font-semibold">{totalOpportunities} Active Opportunities</span>
              <span className="text-[10px] text-zinc-500 font-mono">(Accepted + Not Expired Only)</span>
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
            <Globe2 className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
            <span>Target: <strong className="text-zinc-900 dark:text-white">India First</strong> & Global</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
            <span>DPDP & CAN-SPAM Compliant</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all border bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-zinc-300" />
                <span className="hidden sm:inline font-mono">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-zinc-700" />
                <span className="hidden sm:inline font-mono">Dark</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleAgents}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
              showAgentsPanel
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">11 Agents</span>
          </button>

          <button
            onClick={onOpenDigest}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Digest</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
            title="Export filtered leads with real source URLs to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={onTriggerCrawl}
            disabled={isCrawling}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCrawling ? 'animate-spin' : ''}`} />
            <span>{isCrawling ? 'Crawling...' : 'Run Live Crawl'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
