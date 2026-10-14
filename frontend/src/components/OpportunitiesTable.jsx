import React, { useState } from 'react';
import { 
  ExternalLink, 
  Clock, 
  MapPin, 
  FileText, 
  ChevronRight, 
  AlertCircle,
  ShieldCheck,
  Info
} from 'lucide-react';

export default function OpportunitiesTable({ 
  opportunities, 
  onSelectLead, 
  selectedLeadId 
}) {
  const [hoveredScoreId, setHoveredScoreId] = useState(null);

  if (opportunities.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-900 dark:text-white">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No Opportunities Match Current Filters</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Try clearing your search query or reset category, score, and view filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs transition-colors duration-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-black text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="py-3 px-4">Buyer Entity & Region</th>
              <th className="py-3 px-4 min-w-[280px]">Requirement & Scope</th>
              <th className="py-3 px-3">Type & Source</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Deadline</th>
              <th className="py-3 px-3 text-center">Fit Score</th>
              <th className="py-3 px-3 text-center">Source Notice</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
            {opportunities.map((opp) => {
              const isSelected = selectedLeadId === opp.id;
              
              // Countdown badge colors (monochrome tiers)
              let countdownBadge = 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700';
              if (opp.countdown === 'Expired' || opp.is_expired) {
                countdownBadge = 'text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800';
              } else if (opp.urgency === 'CRITICAL' || opp.urgency === 'URGENT') {
                countdownBadge = 'text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 font-bold';
              }

              const fitBreakdown = opp.fit_breakdown || {};

              return (
                <tr
                  key={opp.id}
                  onClick={() => onSelectLead(opp.id)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-zinc-100 dark:bg-zinc-900 border-l-2 border-zinc-900 dark:border-white' 
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  {/* Buyer & Location */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-bold text-zinc-900 dark:text-white group-hover:underline">
                      {opp.company?.name || 'Unknown Buyer'}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                      <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                      <span>{opp.company?.country || 'Unknown'}</span>
                      {opp.company?.city && opp.company.city !== 'Unknown' && (
                        <span className="text-zinc-400 dark:text-zinc-500">· {opp.company.city}</span>
                      )}
                    </div>
                  </td>

                  {/* Title & Technical Scope */}
                  <td className="py-3.5 px-4 align-top">
                    <div 
                      className="font-semibold text-zinc-900 dark:text-white text-xs line-clamp-2 leading-snug"
                      title={opp.title}
                    >
                      {opp.title}
                    </div>
                    
                    {/* Tech stack tags */}
                    {opp.tech_stack && opp.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {opp.tech_stack.slice(0, 3).map((tech, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 font-mono"
                          >
                            {tech}
                          </span>
                        ))}
                        {opp.tech_stack.length > 3 && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 self-center font-mono">
                            +{opp.tech_stack.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Content Type & Source Trust */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700">
                        {opp.content_type || 'Tender/RFP'}
                      </span>
                      {opp.is_demo_data ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                          Demo data
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
                          Live Crawl
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                      <span>{opp.source_trust || 'Official'}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                      {opp.primary_category.replace(/_/g, ' ')}
                    </span>
                  </td>

                  {/* Deadline & Countdown */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${countdownBadge}`}>
                      <Clock className="w-3 h-3" />
                      <span>{opp.countdown}</span>
                    </div>
                    {opp.deadline && (
                      <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                        {new Date(opp.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </td>

                  {/* Fit Score with Hover Breakdown */}
                  <td 
                    className="py-3.5 px-3 align-top text-center relative"
                    onMouseEnter={() => setHoveredScoreId(opp.id)}
                    onMouseLeave={() => setHoveredScoreId(null)}
                  >
                    <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 shadow-xs">
                      {opp.fit_score}/100
                    </span>

                    {/* Hover breakdown tooltip */}
                    {hoveredScoreId === opp.id && (
                      <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-[11px] text-left shadow-2xl text-zinc-800 dark:text-zinc-300 pointer-events-none">
                        <div className="font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1 mb-2 flex items-center justify-between">
                          <span>Fit Score Breakdown</span>
                          <span className="text-zinc-900 dark:text-white font-mono">{opp.fit_score}/100</span>
                        </div>
                        <div className="space-y-1 font-mono text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Service Match:</span>
                            <span className="text-zinc-900 dark:text-white">{fitBreakdown.service ?? 40}/40</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Region Fit:</span>
                            <span className="text-zinc-900 dark:text-white">{fitBreakdown.region ?? 25}/25</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Budget Match:</span>
                            <span className="text-zinc-900 dark:text-white">{fitBreakdown.budget ?? 15}/20</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Timeline Urgency:</span>
                            <span className="text-zinc-900 dark:text-white">{fitBreakdown.urgency ?? 12}/15</span>
                          </div>
                          {fitBreakdown.penalty > 0 && (
                            <div className="flex justify-between text-red-600 dark:text-red-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                              <span>Penalties:</span>
                              <span>-{fitBreakdown.penalty}</span>
                            </div>
                          )}
                        </div>
                        {fitBreakdown.reasoning && (
                          <div className="mt-2 pt-1 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                            {fitBreakdown.reasoning}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Real Source Link */}
                  <td className="py-3.5 px-3 align-top text-center" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={opp.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                      title="Inspect Original Tender on Official Portal"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>

                  {/* Pipeline Status */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                      {opp.status}
                    </span>
                  </td>

                  {/* Detail Action */}
                  <td className="py-3.5 px-4 align-top text-right">
                    <button
                      onClick={() => onSelectLead(opp.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-white hover:underline bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                    >
                      <span>Proposal</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
