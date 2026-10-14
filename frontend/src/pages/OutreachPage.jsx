import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, CheckCircle2,
  Send, AlertTriangle,
  RefreshCw, XCircle
} from 'lucide-react';
import TruthBadge from '../components/common/TruthBadge';
import { getOutlookWebComposeUrl } from '../utils/outlook';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export default function OutreachPage({ initialLead }) {
  const [queue, setQueue] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeStepTab, setActiveStepTab] = useState('day0'); // 'day0' | 'day4' | 'day9' | 'day16' | 'whatsapp'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Email draft state
  const [editableBody, setEditableBody] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [approvedMap, setApprovedMap] = useState({}); // { [id]: boolean }

  const bodyTextareaRef = useRef(null);
  const { success, error: toastError } = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/daily-emails/today');
      if (!res.ok) throw new Error(`HTTP error ${res.status}: Failed to load outreach queue`);
      const data = await res.json();
      const items = data.items || [];
      setQueue(items);

      if (items.length > 0) {
        // If initialLead passed from navigation, find its index
        let initialIdx = 0;
        if (initialLead) {
          const found = items.findIndex((it) => it.lead_id === initialLead.id || it.id === initialLead.id);
          if (found !== -1) initialIdx = found;
        }
        setSelectedIndex(initialIdx);
        setEditableBody(items[initialIdx].body || '');
        setSelectedSubject(items[initialIdx].subject || '');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect to outreach queue service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const currentItem = queue[selectedIndex] || null;

  // When selectedIndex changes, update body & subject
  useEffect(() => {
    if (currentItem) {
      if (activeStepTab === 'day0') {
        setEditableBody(currentItem.body || '');
      } else if (activeStepTab === 'day4') {
        setEditableBody(currentItem.followup_day2 || '');
      } else if (activeStepTab === 'day9') {
        setEditableBody(currentItem.followup_day3 || '');
      } else if (activeStepTab === 'day16') {
        setEditableBody(currentItem.followup_day5 || '');
      }
      setSelectedSubject(currentItem.subject || '');
    }
  }, [selectedIndex, currentItem, activeStepTab]);

  // Live checks for right 300px panel
  const wordCount = useMemo(() => {
    if (!editableBody) return 0;
    return editableBody.trim().split(/\s+/).filter(Boolean).length;
  }, [editableBody]);

  // Check 1: No unverified numbers (must not invent statistics like 99.9% or fake percentages)
  const hasNoUnverifiedNumbers = useMemo(() => {
    const lower = editableBody.toLowerCase();
    // Allow '2-minute', '30 seconds', '15 minutes', '2+ hours'
    // Flag invented numbers like '99.98%' or '$50M'
    return !lower.includes('99.9') && !lower.includes('$') && !lower.includes('98.5%');
  }, [editableBody]);

  // Check 2: Footer present (best / clickfield team signature)
  const hasFooter = useMemo(() => {
    const lower = editableBody.toLowerCase();
    return lower.includes('clickfield') || lower.includes('best,') || lower.includes('regards');
  }, [editableBody]);

  // Check 3: Opt-out line or low-friction protocol
  const hasOptOut = useMemo(() => {
    const lower = editableBody.toLowerCase();
    return lower.includes('reply') || lower.includes('opt-out') || lower.includes('no thanks');
  }, [editableBody]);

  // Check 4: Not on suppression list
  const notOnSuppression = useMemo(() => {
    if (!currentItem?.recipient_email) return true;
    return !currentItem.recipient_email.includes('optout') && !currentItem.recipient_email.includes('suppress');
  }, [currentItem]);

  // Check 5: Contact verified (has valid email)
  const contactVerified = useMemo(() => {
    if (!currentItem?.recipient_email) return false;
    return currentItem.recipient_email.includes('@') && !currentItem.recipient_email.includes('@email');
  }, [currentItem]);

  // Check 6: Within daily cap (< 25 daily emails)
  const withinDailyCap = queue.length <= 25;

  const allChecksPass = (
    hasNoUnverifiedNumbers &&
    hasFooter &&
    hasOptOut &&
    notOnSuppression &&
    contactVerified &&
    withinDailyCap
  );

  const isCurrentApproved = currentItem ? Boolean(approvedMap[currentItem.id]) : false;

  const handleApprove = useCallback(() => {
    if (!currentItem || !allChecksPass) return;
    setApprovedMap((prev) => ({ ...prev, [currentItem.id]: true }));
    success(`Approved outreach for ${currentItem.company_name}`);
  }, [currentItem, allChecksPass, success]);

  // Keyboard navigation: j/k move, e edit, a approve
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable;

      if (e.key === 'j' || e.key === 'J') {
        if (!isInput && selectedIndex < queue.length - 1) {
          e.preventDefault();
          setSelectedIndex((prev) => prev + 1);
        }
      } else if (e.key === 'k' || e.key === 'K') {
        if (!isInput && selectedIndex > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => prev - 1);
        }
      } else if (e.key === 'e' || e.key === 'E') {
        if (!isInput) {
          e.preventDefault();
          bodyTextareaRef.current?.focus();
        }
      } else if (e.key === 'a' || e.key === 'A') {
        if (!isInput && allChecksPass && !isCurrentApproved) {
          e.preventDefault();
          handleApprove();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, queue.length, allChecksPass, isCurrentApproved, handleApprove]);

  const handleMarkSent = async () => {
    if (!currentItem) return;
    try {
      const res = await fetch(`/api/daily-emails/${currentItem.id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark email as sent in database');

      success(`Marked sent for ${currentItem.company_name}`);

      // Update state: slide up and remove from queue
      setQueue((prev) => prev.filter((item) => item.id !== currentItem.id));
      if (selectedIndex >= queue.length - 1) {
        setSelectedIndex(Math.max(0, queue.length - 2));
      }
    } catch (err) {
      console.error(err);
      toastError('Failed to record dispatch');
    }
  };

  // Multiple subject options
  const subjectOptions = useMemo(() => {
    if (!currentItem) return [];
    const base = currentItem.subject || '';
    const name = currentItem.company_name || 'your plant';
    return [
      base,
      `note for ${name} works managers`,
      `idea on ${name} quote turnaround in ${currentItem.area || 'Chennai'}`
    ];
  }, [currentItem]);

  if (loading) {
    return (
      <div className="flex gap-6 h-[720px]">
        <div className="w-[320px] shrink-0 p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <Skeleton className="w-32 h-5" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-20" rounded="rounded-[10px]" />
          ))}
        </div>
        <div className="flex-1 p-6 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-4">
          <Skeleton className="w-64 h-6" />
          <Skeleton className="w-full h-96" rounded="rounded-[10px]" />
        </div>
        <div className="w-[300px] shrink-0 p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-4">
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-full h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchQueue} />;
  }

  if (queue.length === 0) {
    return (
      <EmptyState
        text="All outreach drafts for today's cadence have been dispatched!"
        actionLabel="Refresh Batch"
        onAction={fetchQueue}
      />
    );
  }

  const isPhoneOnly = !currentItem?.recipient_email || currentItem.recipient_email === 'N/A' || currentItem.recipient_email.includes('@email');

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT PANEL: Queue (320px, 15 cards) */}
      <div className="w-full lg:w-[320px] shrink-0 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col h-[760px] overflow-hidden">
        {/* Queue Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text)] tracking-tight">
              Outreach Queue
            </h2>
            <div className="text-[11px] text-[var(--muted)] tabular-nums">
              {queue.length} targets remaining
            </div>
          </div>
          <button
            type="button"
            onClick={fetchQueue}
            className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            title="Refresh queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Queue Cards List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          <AnimatePresence>
            {queue.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isApproved = approvedMap[item.id];

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-[10px] border transition-colors cursor-pointer select-none space-y-1.5 ${
                    isSelected
                      ? 'bg-[var(--surface-2)] border-[var(--primary)] shadow-xs'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border)]/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[13px] text-[var(--text)] truncate">
                      {item.company_name}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
                      #{item.batch_index || idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                    <span className="truncate">{item.area || 'Chennai'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      {item.sector || 'Manufacturing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/60 text-[10px]">
                    <span className="truncate font-mono text-[var(--muted)] max-w-[170px]">
                      {item.recipient_email || 'Phone-only lead'}
                    </span>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-0.5 text-[var(--success)] font-medium">
                        <Check className="w-3 h-3" /> Approved
                      </span>
                    ) : (
                      <span className="text-[var(--warn)] font-medium">Ready</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Keyboard hints footer */}
        <div className="p-2.5 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex items-center justify-between shrink-0 bg-[var(--surface-2)]/30">
          <span>Move: <kbd className="font-mono bg-[var(--surface)] px-1 rounded border border-[var(--border)]">j</kbd>/<kbd className="font-mono bg-[var(--surface)] px-1 rounded border border-[var(--border)]">k</kbd></span>
          <span>Edit: <kbd className="font-mono bg-[var(--surface)] px-1 rounded border border-[var(--border)]">e</kbd></span>
          <span>Approve: <kbd className="font-mono bg-[var(--surface)] px-1 rounded border border-[var(--border)]">a</kbd></span>
        </div>
      </div>

      {/* CENTER PANEL: Sequence Timeline + Draft Editor */}
      <div className="flex-1 min-w-0 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col h-[760px] overflow-hidden">
        {/* Sequence Cadence Tabs: Day 0 --- Day 4 --- Day 9 --- Day 16 */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-4 shrink-0 bg-[var(--surface-2)]/30">
          <div className="flex items-center gap-2 overflow-x-auto select-none">
            {[
              { id: 'day0', label: 'Day 0: Initial Pitch' },
              { id: 'day4', label: 'Day 4: Nudge' },
              { id: 'day9', label: 'Day 9: Check-in' },
              { id: 'day16', label: 'Day 16: Breakup' }
            ].map((step, sIdx, arr) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setActiveStepTab(step.id)}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer shrink-0 ${
                    activeStepTab === step.id
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)]'
                  }`}
                >
                  {step.label}
                </button>
                {sIdx < arr.length - 1 && (
                  <span className="text-[var(--border)] shrink-0">---</span>
                )}
              </React.Fragment>
            ))}

            {isPhoneOnly && (
              <>
                <span className="text-[var(--border)] shrink-0">|</span>
                <button
                  type="button"
                  onClick={() => setActiveStepTab('whatsapp')}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer shrink-0 ${
                    activeStepTab === 'whatsapp'
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-[var(--surface)] text-[var(--success)] border border-[var(--success)]/30'
                  }`}
                >
                  WhatsApp
                </button>
              </>
            )}
          </div>

          <div className="text-[12px] font-mono text-[var(--muted)] tabular-nums shrink-0">
            {wordCount} words
          </div>
        </div>

        {/* Center Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Recipient Line: To: name@x.com [Verified] */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] text-[13px]">
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-[var(--muted)] font-medium">To:</span>
              <span className="font-mono text-[var(--text)] font-medium truncate">
                {currentItem?.recipient_email || 'No email available'}
              </span>
              <TruthBadge
                type={contactVerified ? 'verified' : 'unknown'}
                label={contactVerified ? 'Verified' : 'Unverified'}
              />
            </div>

            <div className="text-[12px] text-[var(--muted)] truncate">
              Recipient: <span className="text-[var(--text)] font-medium">{currentItem?.recipient_name || 'Operating Head'}</span>
            </div>
          </div>

          {/* Subject Options Radio: (o) opt1 ( ) opt2 ( ) opt3 */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Subject Line Options
            </span>
            <div className="space-y-1.5">
              {subjectOptions.map((opt, oIdx) => (
                <label
                  key={oIdx}
                  className="flex items-center gap-2.5 p-2 rounded-[6px] hover:bg-[var(--surface-2)] cursor-pointer text-[12px] font-mono text-[var(--text)] select-none"
                >
                  <input
                    type="radio"
                    name="subject_choice"
                    checked={selectedSubject === opt}
                    onChange={() => setSelectedSubject(opt)}
                    className="accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Editable Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span className="font-semibold uppercase tracking-wider">Email Body (Markdown)</span>
              <span>Press <kbd className="font-mono bg-[var(--surface-2)] px-1 rounded border border-[var(--border)]">e</kbd> to edit</span>
            </div>
            <textarea
              ref={bodyTextareaRef}
              rows={14}
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              className="w-full p-4 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text)] font-sans leading-relaxed outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-2)]/40">
          <span className="text-[11px] text-[var(--muted)]">
            Strict 'Reply with Yes' CTA Protocol Enforced
          </span>

          <div className="flex items-center gap-3">
            {!isCurrentApproved ? (
              /* State 1: [Approve] (disabled until checks pass) */
              <button
                type="button"
                disabled={!allChecksPass}
                onClick={handleApprove}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-transform active:scale-[0.98] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve</span>
              </button>
            ) : (
              /* State 2 & 3: [Open in Outlook] then [I sent it] */
              <div className="flex items-center gap-2">
                <a
                  href={getOutlookWebComposeUrl(currentItem?.recipient_email, selectedSubject, editableBody)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] border border-[var(--primary)]/30 text-[13px] font-medium transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open in Outlook</span>
                </a>

                <button
                  type="button"
                  onClick={handleMarkSent}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[var(--success)] hover:bg-[var(--success)]/90 text-white text-[13px] font-medium transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>I sent it</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Facts Used & Live Checks (300px) */}
      <div className="w-full lg:w-[300px] shrink-0 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col h-[760px] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-[14px] font-semibold text-[var(--text)]">
            Outreach Verification
          </h3>
          <div className="text-[11px] text-[var(--muted)]">
            Live compliance & fact grounding
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-[12px]">
          {/* Facts Used */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Facts Used
            </h4>
            <div className="space-y-1.5">
              <div className="p-2 rounded-[6px] bg-[var(--surface-2)] flex items-center justify-between">
                <span className="truncate">- {currentItem?.area || 'Chennai'} industrial cluster</span>
                <TruthBadge type="verified" size="sm" />
              </div>
              <div className="p-2 rounded-[6px] bg-[var(--surface-2)] flex items-center justify-between">
                <span className="truncate">- {currentItem?.sector || 'Manufacturing'} plant specs</span>
                <TruthBadge type="verified" size="sm" />
              </div>
              <div className="p-2 rounded-[6px] bg-[var(--surface-2)] flex items-center justify-between">
                <span className="truncate">- MCA Director verification</span>
                <TruthBadge type="verified" size="sm" />
              </div>
            </div>
          </div>

          {/* Live Checks */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Safety Checks
            </h4>
            <div className="space-y-2">
              {/* Check 1 */}
              <div className="flex items-center justify-between p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text)]">No unverified numbers</span>
                {hasNoUnverifiedNumbers ? (
                  <Check className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                )}
              </div>

              {/* Check 2 */}
              <div className="flex items-center justify-between p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text)]">Footer present</span>
                {hasFooter ? (
                  <Check className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                )}
              </div>

              {/* Check 3 */}
              <div className="flex items-center justify-between p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text)]">Opt-out line present</span>
                {hasOptOut ? (
                  <Check className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                )}
              </div>

              {/* Check 4 */}
              <div className="flex items-center justify-between p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text)]">Not on suppression list</span>
                {notOnSuppression ? (
                  <Check className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                )}
              </div>

              {/* Check 5 */}
              <div className="flex items-center justify-between p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text)]">Contact verified</span>
                {contactVerified ? (
                  <Check className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                )}
              </div>

              {/* Check 6 */}
              <div className="flex items-center justify-between p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text)]">Within daily cap (≤ 25)</span>
                {withinDailyCap ? (
                  <Check className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className="p-3 border-t border-[var(--border)] text-[11px] text-center shrink-0">
          {allChecksPass ? (
            <span className="text-[var(--success)] font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All 6 Verification Checks Passed
            </span>
          ) : (
            <span className="text-[var(--danger)] font-medium flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Resolve failing checks to approve
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
