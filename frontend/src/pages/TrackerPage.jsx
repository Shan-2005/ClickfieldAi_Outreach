import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown,
  UserCheck, CheckCircle2, XCircle, Clock, ChevronRight,
  Filter, Sparkles, Building2, ExternalLink
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const STAGES = [
  { id: 'DRAFTED', label: 'Drafted', color: 'border-[var(--muted)]/40 text-[var(--muted)]', bg: 'bg-[var(--surface-2)]/60' },
  { id: 'APPROVED', label: 'Approved', color: 'border-[var(--primary)]/40 text-[var(--primary)]', bg: 'bg-[var(--primary)]/10' },
  { id: 'SENT', label: 'Sent', color: 'border-[var(--info)]/40 text-[var(--info)]', bg: 'bg-[var(--info)]/10' },
  { id: 'BOUNCED', label: 'Bounced', color: 'border-[var(--danger)]/40 text-[var(--danger)]', bg: 'bg-[var(--danger)]/10' },
  { id: 'REPLIED', label: 'Replied', color: 'border-[var(--warn)]/40 text-[var(--warn)]', bg: 'bg-[var(--warn)]/10' },
  { id: 'INTERESTED', label: 'Interested', color: 'border-[var(--success)]/40 text-[var(--success)]', bg: 'bg-[var(--success)]/10' },
  { id: 'MEETING', label: 'Meeting', color: 'border-[var(--primary)]/50 text-[var(--primary)] font-semibold', bg: 'bg-[var(--primary)]/15' },
  { id: 'WON_LOST', label: 'Won / Lost', color: 'border-emerald-500/40 text-emerald-400', bg: 'bg-emerald-500/10' }
];

export default function TrackerPage({ onOpenLeadDrawer }) {
  const { success, error, info } = useToast();
  const [activeSubTab, setActiveSubTab] = useState('kanban'); // 'kanban' | 'replies'
  const [columns, setColumns] = useState({});
  const [metrics, setMetrics] = useState({
    sent: 0,
    bounced: 0,
    replies: 0,
    interested: 0,
    unsubscribed: 0,
    reply_rate: 'Not enough data',
    has_enough_data: false
  });
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [draggedLead, setDraggedLead] = useState(null);

  const fetchTrackerData = async () => {
    try {
      setLoading(true);
      const [kanbanRes, metricsRes, repliesRes] = await Promise.all([
        fetch(`/api/tracker/kanban${ownerFilter !== 'all' ? `?owner_filter=${ownerFilter}` : ''}`),
        fetch('/api/tracker/metrics'),
        fetch('/api/tracker/replies')
      ]);

      if (kanbanRes.ok) setColumns(await kanbanRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (repliesRes.ok) setReplies(await repliesRes.json());
    } catch (err) {
      console.error('Failed to load tracker data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [ownerFilter]);

  // Stage change handler
  const handleStageChange = async (leadId, targetStage) => {
    try {
      const res = await fetch('/api/tracker/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, stage: targetStage })
      });
      if (res.ok) {
        success(`Stage updated to ${targetStage}`);
        fetchTrackerData();
      } else {
        error('Failed to update stage.');
      }
    } catch {
      error('Network error updating stage.');
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e, lead, sourceCol) => {
    setDraggedLead({ ...lead, sourceCol });
    e.dataTransfer.setData('text/plain', lead.id.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnColumn = (e, targetCol) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.sourceCol === targetCol) return;

    // Optimistic local update
    const sourceCol = draggedLead.sourceCol;
    const item = draggedLead;
    setColumns((prev) => {
      const srcList = (prev[sourceCol] || []).filter((l) => l.id !== item.id);
      const destList = [...(prev[targetCol] || []), { ...item, stage: targetCol }];
      return { ...prev, [sourceCol]: srcList, [targetCol]: destList };
    });

    handleStageChange(item.id, targetCol);
    setDraggedLead(null);
  };

  // Reply classification feedback
  const handleReplyFeedback = async (replyId, feedback) => {
    try {
      const res = await fetch(`/api/tracker/replies/${replyId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });
      if (res.ok) {
        success(`Feedback '${feedback}' saved for rule optimizer.`);
        setReplies((prev) =>
          prev.map((r) => (r.id === replyId ? { ...r, user_feedback: feedback } : r))
        );
      }
    } catch {
      error('Failed to record feedback.');
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Weekly Metrics Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Sent */}
        <div className="p-3.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Sent (Week)</span>
          <div className="text-[22px] font-bold text-[var(--text)] font-mono tabular-nums mt-1">
            {metrics.sent}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">Plain text SMTP</span>
        </div>

        {/* Bounced */}
        <div className="p-3.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Bounced</span>
          <div className="text-[22px] font-bold text-[var(--danger)] font-mono tabular-nums mt-1">
            {metrics.bounced}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">Auto-suppressed</span>
        </div>

        {/* Replies */}
        <div className="p-3.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Replies</span>
          <div className="text-[22px] font-bold text-[var(--warn)] font-mono tabular-nums mt-1">
            {metrics.replies}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">Inbound IMAP</span>
        </div>

        {/* Interested */}
        <div className="p-3.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Interested</span>
          <div className="text-[22px] font-bold text-[var(--success)] font-mono tabular-nums mt-1">
            {metrics.interested}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">High-intent responses</span>
        </div>

        {/* Unsubscribed */}
        <div className="p-3.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Unsubscribed</span>
          <div className="text-[22px] font-bold text-[var(--muted)] font-mono tabular-nums mt-1">
            {metrics.unsubscribed}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">List-Unsubscribe</span>
        </div>

        {/* Reply Rate (Strict threshold: only shown after 30 sends) */}
        <div className="p-3.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-col relative overflow-hidden">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Reply Rate</span>
          <div className={`text-[18px] font-bold font-mono tabular-nums mt-1 ${metrics.has_enough_data ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
            {metrics.reply_rate}
          </div>
          <span className="text-[10px] text-[var(--muted)] mt-0.5">
            {metrics.has_enough_data ? 'Based on live dispatches' : 'Threshold: 30 sends'}
          </span>
        </div>
      </div>

      {/* Navigation Header / View Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-2">
          {/* Sub-tab Switch: Kanban vs Replies List */}
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-0.5">
            <button
              type="button"
              onClick={() => setActiveSubTab('kanban')}
              className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${
                activeSubTab === 'kanban'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Pipeline Kanban (8 Stages)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('replies')}
              className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'replies'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>Inbound Replies</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--primary)]/15 text-[var(--primary)]">
                {replies.length}
              </span>
            </button>
          </div>
        </div>

        {/* Owner Filter */}
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-[var(--muted)]">Owner Filter:</span>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-[32px] px-2.5 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none cursor-pointer"
          >
            <option value="all">All Owners</option>
            <option value="unassigned">Unassigned Only</option>
            <option value="usr-zoya-1">Zoya Patel (Admin)</option>
            <option value="usr-rohit-2">Rohit Sales</option>
          </select>
        </div>
      </div>

      {/* SUB-VIEW 1: 8-STAGE KANBAN */}
      {activeSubTab === 'kanban' && (
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-[1400px]">
            {STAGES.map((st) => {
              const colLeads = columns[st.id] || [];

              return (
                <div
                  key={st.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnColumn(e, st.id)}
                  className="flex-1 min-w-[170px] max-w-[240px] flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-3 transition-colors"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]">
                    <span className={`text-[12px] font-semibold uppercase tracking-wider ${st.color}`}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface-2)] text-[var(--muted)] font-semibold">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Column Leads Stack */}
                  <div className="flex-1 flex flex-col gap-2 min-h-[480px] overflow-y-auto max-h-[620px] pr-0.5">
                    {colLeads.length === 0 ? (
                      <div className="h-24 flex items-center justify-center text-[11px] text-[var(--muted)]/50 border border-dashed border-[var(--border)] rounded-[8px]">
                        Drop leads here
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead, st.id)}
                          onClick={() => onOpenLeadDrawer && onOpenLeadDrawer(lead.id)}
                          className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--primary)]/60 cursor-grab active:cursor-grabbing transition-all select-none group flex flex-col gap-1.5"
                        >
                          <div className="text-[12px] font-semibold text-[var(--text)] line-clamp-1">
                            {lead.name}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] flex items-center justify-between">
                            <span className="truncate">{lead.sector}</span>
                            <span className="shrink-0 text-[10px] font-mono">{lead.area}</span>
                          </div>
                          <div className="pt-1.5 border-t border-[var(--border)]/60 flex items-center justify-between text-[10px] text-[var(--muted)]">
                            <span className="truncate">{lead.owner}</span>
                            {lead.next_due_date && (
                              <span className="font-mono text-[var(--primary)]">
                                {lead.next_due_date.slice(5)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: INBOUND REPLIES LIST (300-CHAR SNIPPET + FEEDBACK) */}
      {activeSubTab === 'replies' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--text)]">Inbound Reply & Bounce Stream</h3>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">
                Polled via IMAP every 10 min. Truncated strictly to 300 characters. Classifications feed rule accuracy testing.
              </p>
            </div>
            <span className="text-[12px] text-[var(--muted)] font-mono">
              Never copies full inbox
            </span>
          </div>

          <div className="space-y-3">
            {replies.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted)] text-[13px]">
                No inbound replies detected yet. Check back after dispatches!
              </div>
            ) : (
              replies.map((rep) => {
                let badgeClass = 'bg-[var(--warn)]/15 border-[var(--warn)]/40 text-[var(--warn)]';
                if (rep.classification === 'INTERESTED') {
                  badgeClass = 'bg-[var(--success)]/15 border-[var(--success)]/40 text-[var(--success)]';
                } else if (rep.classification === 'BOUNCED') {
                  badgeClass = 'bg-[var(--danger)]/15 border-[var(--danger)]/40 text-[var(--danger)]';
                } else if (rep.classification === 'UNSUBSCRIBED') {
                  badgeClass = 'bg-[var(--muted)]/15 border-[var(--border)] text-[var(--muted)]';
                }

                return (
                  <div
                    key={rep.id}
                    className="p-4 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border ${badgeClass}`}>
                          {rep.classification}
                        </span>
                        <span className="text-[13px] font-semibold text-[var(--text)]">
                          {rep.subject}
                        </span>
                        <span className="text-[12px] text-[var(--muted)] font-mono">
                          from &lt;{rep.from_email}&gt;
                        </span>
                      </div>

                      {/* 300-char truncated snippet */}
                      <p className="text-[13px] text-[var(--text)]/90 bg-[var(--surface)] p-2.5 rounded-[6px] border border-[var(--border)] font-sans leading-relaxed">
                        "{rep.snippet_300}"
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-[var(--muted)] font-mono">
                        <span>Received: {rep.received_at ? rep.received_at.slice(0, 16).replace('T', ' ') : 'Just now'}</span>
                        {rep.lead_id && (
                          <button
                            type="button"
                            onClick={() => onOpenLeadDrawer && onOpenLeadDrawer(rep.lead_id)}
                            className="text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer font-sans"
                          >
                            <span>Open Lead Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Classification Feedback Buttons */}
                    <div className="shrink-0 flex items-center gap-2 border-t md:border-t-0 md:border-l border-[var(--border)] pt-2 md:pt-0 md:pl-4">
                      <button
                        type="button"
                        onClick={() => handleReplyFeedback(rep.id, 'CORRECT')}
                        className={`h-[32px] px-3 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                          rep.user_feedback === 'CORRECT'
                            ? 'bg-[var(--success)]/20 border-[var(--success)] text-[var(--success)]'
                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                        title="Classification is correct"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Correct</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReplyFeedback(rep.id, 'WRONG')}
                        className={`h-[32px] px-3 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                          rep.user_feedback === 'WRONG'
                            ? 'bg-[var(--danger)]/20 border-[var(--danger)] text-[var(--danger)]'
                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                        title="Classification was wrong"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>Wrong</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
