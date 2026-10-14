import React from 'react';
import { 
  Sparkles, 
  Clock, 
  Target, 
  Send, 
  Trophy 
} from 'lucide-react';

export default function OverviewCards({ summary, currentStatusFilter, onSelectStatusFilter }) {
  const cards = [
    {
      id: 'NEW_TODAY',
      title: 'New Today',
      value: summary?.new_today ?? 0,
      subtext: 'Ingested in last 24h',
      icon: Sparkles,
      filterValue: 'NEW',
    },
    {
      id: 'CLOSING_SOON',
      title: 'Closing in 7 Days',
      value: summary?.closing_in_7_days ?? 0,
      subtext: 'Active urgent tenders',
      icon: Clock,
      hasPulse: (summary?.closing_in_7_days ?? 0) > 0,
      filterValue: 'ALL',
    },
    {
      id: 'HIGH_FIT',
      title: 'High-Fit Leads',
      value: summary?.high_fit_leads ?? 0,
      subtext: 'Fit score ≥ 80%',
      icon: Target,
      filterValue: 'ALL',
    },
    {
      id: 'CONTACTED',
      title: 'Contacted',
      value: summary?.contacted ?? 0,
      subtext: 'Approved outreach',
      icon: Send,
      filterValue: 'CONTACTED',
    },
    {
      id: 'WON',
      title: 'Won Contracts',
      value: summary?.won ?? 0,
      subtext: 'Signed deliverables',
      icon: Trophy,
      filterValue: 'WON',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = currentStatusFilter === card.filterValue && card.filterValue !== 'ALL';

        return (
          <button
            key={card.id}
            onClick={() => onSelectStatusFilter(card.filterValue)}
            className={`group text-left p-4 rounded-xl border bg-white dark:bg-zinc-950 transition-all duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer shadow-xs ${
              isSelected 
                ? 'border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white shadow-sm' 
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">
                {card.title}
              </span>
              <div className="relative">
                <Icon className="w-4 h-4 text-zinc-900 dark:text-white" />
                {card.hasPulse && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 dark:bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-800 dark:bg-zinc-300"></span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {card.value}
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1 font-medium">
              {card.subtext}
            </div>
          </button>
        );
      })}
    </div>
  );
}
