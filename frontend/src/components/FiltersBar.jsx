import React from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Table as TableIcon, 
  Kanban 
} from 'lucide-react';

export default function FiltersBar({
  filters,
  onChangeFilter,
  onResetFilters,
  viewMode,
  onChangeViewMode,
  totalResults
}) {
  const hasActiveFilters = 
    filters.category !== 'ALL' ||
    filters.country !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.minScore !== 0 ||
    filters.view !== 'active' ||
    filters.keyword.trim() !== '';

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5 shadow-xs transition-colors duration-200">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tender specification, AI model, Python, React, agency scope... (press / to focus)"
            value={filters.keyword}
            onChange={(e) => onChangeFilter('keyword', e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white focus:outline-none rounded-lg pl-10 pr-9 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors"
          />
          {filters.keyword && (
            <button
              onClick={() => onChangeFilter('keyword', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Scope Toggle (Active / Expired / All) */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => onChangeFilter('view', 'active')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              (filters.view || 'active') === 'active'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => onChangeFilter('view', 'expired')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              filters.view === 'expired'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Expired
          </button>
          <button
            onClick={() => onChangeFilter('view', 'all')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              filters.view === 'all'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Notices
          </button>
        </div>

        {/* View Layout Toggle (Table vs Kanban) */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 self-end md:self-auto">
          <button
            onClick={() => onChangeViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
          <button
            onClick={() => onChangeViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Pipeline</span>
          </button>
        </div>

      </div>

      {/* Dropdown Filters row */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs border-t border-zinc-100 dark:border-zinc-900 pt-3">
        <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
          <span>Filters:</span>
        </span>

        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) => onChangeFilter('category', e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-xs cursor-pointer"
        >
          <option value="ALL">All Tech Categories</option>
          <option value="GENAI">Generative AI & LLMs</option>
          <option value="ML_DATA_SCIENCE">Machine Learning & Computer Vision</option>
          <option value="AUTOMATION_RPA">Automation & RPA</option>
          <option value="DATA_ENGINEERING">Data Engineering & Lakehouse</option>
          <option value="WEB_MOBILE">Web & Mobile Platforms</option>
          <option value="EMBEDDED_IOT">Embedded IoT & Telemetry</option>
          <option value="ERP_INTEGRATION">ERP & Cloud Integration</option>
        </select>

        {/* Country Filter */}
        <select
          value={filters.country}
          onChange={(e) => onChangeFilter('country', e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-xs cursor-pointer"
        >
          <option value="ALL">All Regions</option>
          <option value="India">🇮🇳 India (Priority)</option>
          <option value="European Union">🇪🇺 European Union</option>
          <option value="United States">🇺🇸 United States</option>
          <option value="Global">🌐 Global</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onChangeFilter('status', e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-xs cursor-pointer"
        >
          <option value="ALL">All Stages</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="CONTACTED">Contacted</option>
          <option value="REPLIED">Replied</option>
          <option value="PROPOSAL">Proposal</option>
          <option value="WON">Won</option>
        </select>

        {/* Min Score Filter */}
        <select
          value={filters.minScore}
          onChange={(e) => onChangeFilter('minScore', Number(e.target.value))}
          className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-xs cursor-pointer"
        >
          <option value={0}>Any Fit Score</option>
          <option value={85}>Score ≥ 85 (High Priority)</option>
          <option value={75}>Score ≥ 75 (Good Fit)</option>
          <option value={60}>Score ≥ 60 (Moderate)</option>
        </select>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white py-1 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}

        <span className="text-zinc-500 text-[11px] ml-auto font-mono">
          Showing <strong className="text-zinc-900 dark:text-white">{totalResults}</strong> records
        </span>
      </div>
    </div>
  );
}
