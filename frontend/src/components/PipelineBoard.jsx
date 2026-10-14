import React from 'react';
import { 
  Clock, 
  MapPin, 
  ExternalLink, 
  ArrowRight, 
  ChevronRight, 
  CheckCircle2 
} from 'lucide-react';

const STAGES = [
  { id: 'NEW', title: 'New Leads' },
  { id: 'REVIEWED', title: 'Reviewed' },
  { id: 'CONTACTED', title: 'Contacted' },
  { id: 'REPLIED', title: 'Replied' },
  { id: 'PROPOSAL', title: 'Proposal' },
  { id: 'WON', title: 'Won Contracts' },
];

export default function PipelineBoard({ 
  opportunities, 
  onSelectLead, 
  onUpdateStatus 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
      {STAGES.map((stage) => {
        const stageItems = opportunities.filter((o) => o.status === stage.id);

        return (
          <div
            key={stage.id}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 min-h-[480px] shadow-xs transition-colors duration-200"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black text-xs font-bold text-zinc-900 dark:text-white">
              <span>{stage.title}</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-[10px] text-zinc-800 dark:text-zinc-300 font-mono">
                {stageItems.length}
              </span>
            </div>

            {/* Stage Cards */}
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[700px] pr-0.5">
              {stageItems.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-xs italic">
                  No opportunities in stage
                </div>
              ) : (
                stageItems.map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => onSelectLead(opp.id)}
                    className="group bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-lg p-3 text-xs cursor-pointer transition-all hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-zinc-900 dark:text-white truncate group-hover:underline">
                        {opp.company?.name || 'Unknown Buyer'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 font-mono">
                        {opp.fit_score}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2 font-medium mb-2 leading-relaxed">
                      {opp.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-900 pt-2 mt-2">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                        <span>{opp.countdown}</span>
                      </span>
                      
                      {/* Move Stage Quick Action */}
                      <select
                        value={opp.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateStatus(opp.id, e.target.value)}
                        className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-zinc-900 dark:focus:border-white font-mono cursor-pointer"
                      >
                        <option value="NEW">New</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="REPLIED">Replied</option>
                        <option value="PROPOSAL">Proposal</option>
                        <option value="WON">Won</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
