import React, { useState, useEffect } from 'react';
import {
  X, Mail, Send, Sparkles, RefreshCw, CheckCircle2,
  Clock, ShieldCheck, AlertTriangle, ExternalLink, UserCheck
} from 'lucide-react';
import { getOutlookWebComposeUrl } from '../../utils/outlook';
import { useToast } from '../../context/ToastContext';
import TruthBadge from '../common/TruthBadge';

export default function DirectDispatchModal({ isOpen, onClose, lead, onDispatched }) {
  const { success, error: toastError, info } = useToast();

  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState(null);

  // Email form state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [cadence, setCadence] = useState([]);
  const [customInstructions, setCustomInstructions] = useState('');

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const isCtaVerified = /reply (with )?yes/i.test(body);

  const generateWithOllama = async (instructions = '') => {
    if (!lead?.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agentic/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          sender_name: 'Zoya Patel',
          custom_instructions: instructions || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to synthesize email with Ollama');
      }

      const data = await res.json();
      setSubject(data.subject || `Quick note regarding ${lead.name} operations`);
      setBody(data.body || '');
      setCadence(data.cadence || []);
      setRecipientEmail(lead.email || '');
      setRecipientName(lead.owner_name || 'Promoter');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with Ollama synthesis engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead) {
      setRecipientEmail(lead.email || '');
      setRecipientName(lead.owner_name || 'Promoter');
      generateWithOllama();
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleDirectDispatch = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toastError('Cannot dispatch: No valid business email found for this lead.');
      return;
    }

    setDispatching(true);
    try {
      const followup_d2 = cadence[0]?.body || null;
      const followup_d3 = cadence[1]?.body || null;
      const followup_d5 = cadence[2]?.body || null;

      const res = await fetch('/api/agentic/direct-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject,
          body,
          followup_day2: followup_d2,
          followup_day3: followup_d3,
          followup_day5: followup_d5,
          sender_name: 'Zoya Patel'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Dispatch failed.');
      }

      success(`Dispatched cold email to ${recipientEmail} and scheduled follow-ups.`);
      onDispatched?.(lead.id);
      onClose();
    } catch (err) {
      console.error(err);
      toastError(err.message || 'Dispatch operation failed.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-[760px] max-h-[92vh] bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4.5 border-b border-[var(--border)] bg-[var(--surface-2)]/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-[8px] bg-[var(--primary)]/15 text-[var(--primary)]">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text)] tracking-tight">
                Direct Cold Email Dispatch (Ollama Synthesis)
              </h3>
              <p className="text-[12px] text-[var(--muted)]">
                Bespoke outreach for <strong className="text-[var(--text)]">{lead.name}</strong> ({lead.area || 'Chennai'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px]">
          {/* Target Metadata Bar */}
          <div className="p-3 rounded-[8px] bg-[var(--surface-2)]/70 border border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--text)]">{lead.owner_name || 'Promoter Head'}</span>
              <span className="text-[var(--muted)]">·</span>
              <span className="font-mono text-[var(--primary)]">{lead.email || 'N/A'}</span>
              <TruthBadge type="verified" label="MCA Director" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--muted)]">Model:</span>
              <span className="px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] font-mono text-[10px] border border-[var(--success)]/30 font-bold">
                llama3.2:3b
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-7 h-7 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-[var(--muted)]">
                Synthesizing custom, factory-specific pitch with Ollama (&lt;80 words constraint)...
              </p>
            </div>
          ) : error ? (
            <div className="p-3 rounded-[8px] bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] space-y-2 text-[12px]">
              <div>{error}</div>
              <button
                type="button"
                onClick={() => generateWithOllama()}
                className="px-3 py-1 rounded-[6px] bg-[var(--danger)] text-white text-[11px] font-medium"
              >
                Retry Generation
              </button>
            </div>
          ) : (
            <>
              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Body (Bespoke Pitch)
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-[4px] font-mono text-[11px] border ${
                        wordCount <= 80
                          ? 'bg-[var(--success)]/10 border-[var(--success)]/40 text-[var(--success)]'
                          : 'bg-[var(--danger)]/10 border-[var(--danger)]/40 text-[var(--danger)]'
                      }`}
                    >
                      {wordCount} words {wordCount <= 80 ? '(✓ ≤80 words)' : '(Exceeds 80 words)'}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-[4px] text-[11px] border flex items-center gap-1 ${
                        isCtaVerified
                          ? 'bg-[var(--success)]/10 border-[var(--success)]/40 text-[var(--success)]'
                          : 'bg-[var(--warn)]/10 border-[var(--warn)]/40 text-[var(--warn)]'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isCtaVerified ? "'Reply Yes' CTA" : "Missing 'Reply Yes' CTA"}</span>
                    </span>
                  </div>
                </div>

                <textarea
                  rows={7}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text)] font-sans leading-relaxed outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              {/* Staged Follow-Up Cadence Previews */}
              {cadence.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Scheduled Automated Follow-Up Cadence</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {cadence.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-[8px] bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                        <div className="flex items-center justify-between font-semibold text-[var(--text)]">
                          <span>Day +{item.stage_day}</span>
                          <span className="font-mono text-[10px] text-[var(--muted)]">{item.due_date}</span>
                        </div>
                        <p className="text-[var(--muted)] line-clamp-3 text-[11px] leading-tight">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regenerate with Custom Instructions */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Optional prompt tweak: e.g. 'focus on CNC stamping scrap costs'..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] text-[var(--text)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => generateWithOllama(customInstructions)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--text)] border border-[var(--border)] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
            <span>DPDP & CAN-SPAM compliant RFC-2142 mailbox</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getOutlookWebComposeUrl(recipientEmail, subject, body)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] text-[12px] font-medium transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Open in Outlook Web</span>
            </a>

            <button
              type="button"
              onClick={handleDirectDispatch}
              disabled={dispatching || loading || !body}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-medium text-[12px] transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{dispatching ? 'Dispatching...' : 'Direct 1-Click Dispatch'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
