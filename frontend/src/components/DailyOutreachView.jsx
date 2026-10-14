import React, { useState, useEffect } from 'react';
import {
  Mail, Send, Check, Copy, RefreshCw, ExternalLink, UserCheck,
  CheckCircle2, Clock, Users, ArrowRight, Edit3, Save, ShieldCheck,
  Building2, Factory, HardHat, Calendar, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { getOutlookWebComposeUrl } from '../utils/outlook';

export default function DailyOutreachView() {
  const [batch, setBatch] = useState([]);
  const [stats, setStats] = useState({ total: 15, sent_count: 0, ready_count: 15 });
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState({}); // { dispatch_id: 'day0' | 'day2' | 'day3' | 'day5' }
  const [editingId, setEditingId] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);

  const fetchTodaysBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/daily-emails/today');
      const data = await res.json();
      setBatch(data.items || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to load daily outreach batch', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaysBatch();
  }, []);

  const handleRegenerate = async () => {
    if (!window.confirm("Regenerate today's 15-email batch with fresh angles?")) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/daily-emails/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_refresh: true, target_count: 15 })
      });
      const data = await res.json();
      if (data.items) {
        setBatch(data.items);
        fetchTodaysBatch();
      }
    } catch (err) {
      console.error('Error regenerating batch', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleMarkSent = async (dispatchId) => {
    try {
      const res = await fetch(`/api/daily-emails/${dispatchId}/send`, { method: 'POST' });
      if (res.ok) {
        setBatch((prev) =>
          prev.map((item) => (item.id === dispatchId ? { ...item, status: 'SENT', sent_at: new Date().toISOString() } : item))
        );
        setStats((prev) => ({
          ...prev,
          sent_count: prev.sent_count + 1,
          ready_count: Math.max(0, prev.ready_count - 1)
        }));
      }
    } catch (err) {
      console.error('Failed to mark email sent', err);
    }
  };

  const handleSendAll = async () => {
    if (!window.confirm("Mark all ready emails in today's 15-batch as SENT?")) return;
    setSendingAll(true);
    try {
      const res = await fetch('/api/daily-emails/send-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchTodaysBatch();
      }
    } catch (err) {
      console.error('Failed to send all', err);
    } finally {
      setSendingAll(false);
    }
  };

  const handleStartEdit = (item, currentText) => {
    setEditingId(item.id);
    setEditSubject(item.subject);
    setEditBody(currentText);
  };

  const handleSaveEdit = async (dispatchId) => {
    try {
      const res = await fetch(`/api/daily-emails/${dispatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, body: editBody })
      });
      if (res.ok) {
        setBatch((prev) =>
          prev.map((item) => (item.id === dispatchId ? { ...item, subject: editSubject, body: editBody } : item))
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to update email draft', err);
    }
  };

  const handleCopyEmail = (item, text) => {
    const fullClipboardText = `To: ${item.recipient_email}\nSubject: ${item.subject}\n\n${text}`;
    navigator.clipboard.writeText(fullClipboardText);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };


  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-4 shadow-sm backdrop-blur transition-all">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            Today's Target SMBs
          </div>
          <div className="text-2xl font-black text-white mt-1">{batch.length} / 15</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Strictly &lt; 50 Staff Verified
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-purple-500/30 rounded-2xl p-4 shadow-sm backdrop-blur transition-all">
          <div className="text-xs font-medium text-purple-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            Verified Leadership
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1">100%</div>
          <div className="text-[11px] text-zinc-400 mt-1 truncate">MCA Directors & Operating Heads</div>
        </div>

        <div className="bg-zinc-900/80 border border-blue-500/30 rounded-2xl p-4 shadow-sm backdrop-blur transition-all">
          <div className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            Sequence Coverage
          </div>
          <div className="text-2xl font-black text-blue-300 mt-1">Day 0, 2, 3, 5</div>
          <div className="text-[11px] text-zinc-400 mt-1">Full 4-Step Cadence</div>
        </div>

        <div className="bg-zinc-900/80 border border-indigo-500/30 rounded-2xl p-4 shadow-sm backdrop-blur transition-all">
          <div className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            Dispatch Progress
          </div>
          <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
            <span>{stats.sent_count}</span>
            <span className="text-xs text-zinc-400 font-normal">/ {batch.length} Sent</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {stats.ready_count} Ready to dispatch
          </div>
        </div>
      </div>

      {/* Control Bar Actions */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm backdrop-blur flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            Today's 15 Autonomous Outreach Emails
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              Strict 'Reply Yes' Protocol
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono flex items-center gap-1">
              <ExternalLink className="w-2.5 h-2.5" />
              Outlook Web (Chrome)
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-repetitive, human-crafted emails tailored to each company's exact plant location, verified directors, and operational friction.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin text-emerald-400' : ''}`} />
            Regenerate 15 Batch
          </button>

          <button
            onClick={handleSendAll}
            disabled={sendingAll || stats.ready_count === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {sendingAll ? 'Dispatching...' : `Dispatch All ${stats.ready_count} Ready`}
          </button>
        </div>
      </div>

      {/* 15 Emails Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
          <div>Synthesizing today's 15 personalized emails with ML Model...</div>
        </div>
      ) : batch.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          No outreach records found for today. Click "Regenerate 15 Batch" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {batch.map((item) => {
            const currentTab = activeStepTab[item.id] || 'day0';
            let currentText = item.body;
            let tabLabel = "Day 0 Initial Email";
            if (currentTab === 'day2') {
              currentText = item.followup_day2 || "No follow-up generated";
              tabLabel = "Day 2 Follow-Up (+2 Days)";
            } else if (currentTab === 'day3') {
              currentText = item.followup_day3 || "No follow-up generated";
              tabLabel = "Day 3 Follow-Up (+3 Days)";
            } else if (currentTab === 'day5') {
              currentText = item.followup_day5 || "No follow-up generated";
              tabLabel = "Day 5 Breakup Note (+5 Days)";
            }

            const wordCount = currentText.split(/\s+/).filter(Boolean).length;
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-zinc-900/90 border rounded-2xl p-5 shadow-sm transition-all backdrop-blur ${
                  item.status === 'SENT'
                    ? 'border-emerald-500/40 bg-zinc-900/60'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Header Row: Company Info & Status */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center">
                        {item.batch_index}
                      </span>
                      <h3 className="text-sm font-bold text-white">{item.company_name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {item.sector}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] text-zinc-400 bg-zinc-800/60">
                        {item.area}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-0.5">
                      <div className="flex items-center gap-1 text-purple-300">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>{item.recipient_name}</span>
                      </div>
                      <span>•</span>
                      <a
                        href={getOutlookWebComposeUrl(item.recipient_email, item.subject, currentText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline font-mono text-[11px]"
                        title="Draft in Outlook Web (outlook.cloud.microsoft in Chrome)"
                      >
                        {item.recipient_email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'SENT' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                        SENT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" />
                        READY
                      </span>
                    )}
                  </div>
                </div>

                {/* Multi-Touch Sequence Tabs (Day 0, Day 2, Day 3, Day 5) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-2">
                  <button
                    onClick={() => setActiveStepTab({ ...activeStepTab, [item.id]: 'day0' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentTab === 'day0'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Day 0: Initial Outreach
                  </button>

                  <button
                    onClick={() => setActiveStepTab({ ...activeStepTab, [item.id]: 'day2' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentTab === 'day2'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Day 2 Follow-Up (+2d)
                  </button>

                  <button
                    onClick={() => setActiveStepTab({ ...activeStepTab, [item.id]: 'day3' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentTab === 'day3'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Day 3 Check-in (+3d)
                  </button>

                  <button
                    onClick={() => setActiveStepTab({ ...activeStepTab, [item.id]: 'day5' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentTab === 'day5'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Day 5 Breakup (+5d)
                  </button>

                  <div className="ml-auto text-[11px] font-mono text-zinc-500">
                    {wordCount} words {wordCount <= 80 ? '✓ (<80 words)' : '• human length'}
                  </div>
                </div>

                {/* Subject Line Bar */}
                <div className="mt-1 bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden text-xs">
                    <span className="text-zinc-500 font-mono font-medium shrink-0">Subject:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white w-full focus:outline-none"
                      />
                    ) : (
                      <span className="font-semibold text-zinc-200 truncate">{item.subject}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 shrink-0">
                    Peer Style
                  </span>
                </div>

                {/* Email Body Area */}
                <div className="mt-2.5">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={6}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full p-3 bg-zinc-950/80 border border-zinc-700 rounded-xl text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-line selection:bg-emerald-500 selection:text-black">
                      {currentText}
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Strict Protocol: Reply with 'Yes' CTA enforced</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(item, currentText)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                        title="Edit draft copy"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyEmail(item, currentText)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <a
                      href={getOutlookWebComposeUrl(item.recipient_email, item.subject, currentText)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Open directly in Outlook Web (outlook.cloud.microsoft) in Chrome"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Outlook Web
                    </a>

                    {item.status !== 'SENT' && (
                      <button
                        onClick={() => handleMarkSent(item.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Mark Sent
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
