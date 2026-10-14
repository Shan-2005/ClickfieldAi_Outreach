import React from 'react';
import { Mail, Clock, Target, X, Check, Copy } from 'lucide-react';

export default function DigestModal({ onClose, opportunities, summary }) {
  const [copied, setCopied] = React.useState(false);

  const highFitOpps = opportunities.filter((o) => o.fit_score >= 80).slice(0, 5);
  const closingSoonOpps = opportunities.filter((o) => o.countdown && o.countdown.includes('days') && parseInt(o.countdown) <= 7).slice(0, 5);

  const handleCopy = () => {
    const text = `ClickfieldAI Daily Executive Radar Digest
Generated: ${new Date().toLocaleDateString()}

Summary:
- New Today: ${summary?.new_today || 0}
- Closing in 7 Days: ${summary?.closing_in_7_days || 0}
- High-Fit Leads: ${summary?.high_fit_leads || 0}

Top High-Fit Opportunities:
${highFitOpps.map(o => `• [${o.fit_score}/100] ${o.title} (${o.company?.name}) - ${o.source_url}`).join('\n')}

Closing Soon Tenders:
${closingSoonOpps.map(o => `• [${o.countdown}] ${o.title} (${o.company?.name})`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white m-0">Daily Executive Radar Digest</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 m-0">Leadership summary of verified public procurement intelligence</p>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 text-xs space-y-4 mb-5 max-h-[400px] overflow-y-auto font-mono">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-600 dark:text-zinc-400">
            <strong>Subject:</strong> [Clickfield Radar] {highFitOpps.length} High-Fit AI Tenders & {summary?.closing_in_7_days || 0} Closing Soon
          </div>

          <div>
            <h4 className="text-zinc-900 dark:text-white font-bold text-xs mb-2 flex items-center gap-1.5 font-sans">
              <Target className="w-3.5 h-3.5" />
              <span>Priority High-Fit Opportunities (Score ≥ 80)</span>
            </h4>
            <div className="space-y-2">
              {highFitOpps.map((o) => (
                <div key={o.id} className="p-2.5 rounded bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="font-bold text-zinc-900 dark:text-white truncate font-sans text-xs">{o.title}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex justify-between mt-1">
                    <span>{o.company?.name}</span>
                    <span className="text-zinc-900 dark:text-white font-bold">{o.fit_score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-zinc-900 dark:text-white font-bold text-xs mb-2 flex items-center gap-1.5 font-sans">
              <Clock className="w-3.5 h-3.5" />
              <span>Urgent Closing Soon Tenders</span>
            </h4>
            <div className="space-y-1.5">
              {closingSoonOpps.length === 0 ? (
                <div className="text-zinc-500 italic text-[11px]">No tenders closing in next 7 days.</div>
              ) : (
                closingSoonOpps.map((o) => (
                  <div key={o.id} className="p-2.5 rounded bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex justify-between text-[11px] shadow-xs">
                    <span className="text-zinc-800 dark:text-zinc-200 truncate pr-2 font-sans">{o.title}</span>
                    <span className="text-zinc-900 dark:text-white font-bold shrink-0">{o.countdown}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Digest Markdown'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
