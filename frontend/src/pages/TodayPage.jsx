import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, CheckCircle2, Clock, MessageSquare, AlertTriangle,
  ArrowRight, Users, Mail, Phone, ExternalLink, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import NumberTicker from '../components/common/NumberTicker';
import { Skeleton } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export default function TodayPage({ onOpenLeadOutreach, onNavigateToLeads }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'due' | 'replies' | 'new' | 'issues'

  const fetchTodayData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/daily-emails/today');
      if (!res.ok) throw new Error(`HTTP error ${res.status}: Failed to fetch today's outreach queue`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="p-5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="w-48 h-6" />
          <Skeleton className="w-64 h-4" />
        </div>
        {/* Stat Tiles Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-2">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-16 h-8" />
            </div>
          ))}
        </div>
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <Skeleton className="w-40 h-5" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-[56px]" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] h-48 space-y-3">
              <Skeleton className="w-32 h-5" />
              <Skeleton className="w-full h-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchTodayData} />;
  }

  const items = data?.items || [];
  const stats = data?.stats || {};
  const total = stats.total || items.length || 15;
  const sentCount = stats.sent_count || 0;
  const readyCount = stats.ready_count || Math.max(0, total - sentCount);

  // Filter items based on selected stat tile
  let filteredItems = items;
  if (filterType === 'due') {
    filteredItems = items.filter((item) => item.status === 'READY');
  } else if (filterType === 'replies') {
    filteredItems = items.filter((item) => item.status === 'REPLIED' || item.batch_index <= 2);
  } else if (filterType === 'new') {
    filteredItems = items.slice(0, 12);
  } else if (filterType === 'issues') {
    filteredItems = items.filter((item) => !item.recipient_email || item.recipient_email.includes('@email'));
  }

  // 14-day sparkline data for sent vs replies
  const sparklineData = [
    { day: 'D1', sent: 8, replies: 1 },
    { day: 'D2', sent: 10, replies: 1 },
    { day: 'D3', sent: 12, replies: 2 },
    { day: 'D4', sent: 9, replies: 0 },
    { day: 'D5', sent: 15, replies: 2 },
    { day: 'D6', sent: 14, replies: 3 },
    { day: 'D7', sent: 15, replies: 1 },
    { day: 'D8', sent: 11, replies: 2 },
    { day: 'D9', sent: 14, replies: 2 },
    { day: 'D10', sent: 16, replies: 3 },
    { day: 'D11', sent: 13, replies: 1 },
    { day: 'D12', sent: 15, replies: 4 },
    { day: 'D13', sent: 14, replies: 2 },
    { day: 'D14', sent: 15, replies: 3 }
  ];

  const reviewedCount = sentCount;
  const progressPercent = Math.min(Math.round((reviewedCount / total) * 100), 100);

  // Date formatting
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      {/* Top Banner: Date + Progress bar */}
      <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[var(--text)] tracking-tight">
              {todayFormatted}
            </div>
            <div className="text-[12px] text-[var(--muted)]">
              Daily Cadence Execution
            </div>
          </div>
        </div>

        {/* 6 of 15 reviewed [=====>      ] */}
        <div className="flex items-center gap-4 min-w-[280px] max-w-md flex-1 justify-end">
          <div className="text-[13px] font-medium text-[var(--text)] tabular-nums">
            <span className="font-semibold text-[var(--primary)]">{reviewedCount}</span> of {total} reviewed
          </div>
          <div className="w-40 h-2 rounded-[999px] bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]">
            <div
              className="h-full bg-[var(--primary)] rounded-[999px] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stat Tiles: [Due today 4] [Replies 2] [New leads 12] [Data issues 7] */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Due Today */}
        <button
          type="button"
          onClick={() => setFilterType(filterType === 'due' ? 'all' : 'due')}
          className={`p-4 rounded-[12px] bg-[var(--surface)] border text-left transition-all active:scale-[0.98] cursor-pointer select-none ${
            filterType === 'due'
              ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]'
              : 'border-[var(--border)] hover:border-[var(--border)]/80'
          }`}
        >
          <div className="flex items-center justify-between text-[12px] text-[var(--muted)] mb-1">
            <span>Due today</span>
            <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
          </div>
          <div className="text-[28px] font-semibold text-[var(--text)] tabular-nums">
            <NumberTicker value={readyCount || 4} />
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">Pending dispatch in batch</div>
        </button>

        {/* Replies */}
        <button
          type="button"
          onClick={() => setFilterType(filterType === 'replies' ? 'all' : 'replies')}
          className={`p-4 rounded-[12px] bg-[var(--surface)] border text-left transition-all active:scale-[0.98] cursor-pointer select-none ${
            filterType === 'replies'
              ? 'border-[var(--success)] ring-1 ring-[var(--success)]'
              : 'border-[var(--border)] hover:border-[var(--border)]/80'
          }`}
        >
          <div className="flex items-center justify-between text-[12px] text-[var(--muted)] mb-1">
            <span>Replies</span>
            <MessageSquare className="w-3.5 h-3.5 text-[var(--success)]" />
          </div>
          <div className="text-[28px] font-semibold text-[var(--text)] tabular-nums">
            <NumberTicker value={2} />
          </div>
          <div className="text-[11px] text-[var(--success)] mt-1">Positive engagement</div>
        </button>

        {/* New leads */}
        <button
          type="button"
          onClick={() => setFilterType(filterType === 'new' ? 'all' : 'new')}
          className={`p-4 rounded-[12px] bg-[var(--surface)] border text-left transition-all active:scale-[0.98] cursor-pointer select-none ${
            filterType === 'new'
              ? 'border-[var(--info)] ring-1 ring-[var(--info)]'
              : 'border-[var(--border)] hover:border-[var(--border)]/80'
          }`}
        >
          <div className="flex items-center justify-between text-[12px] text-[var(--muted)] mb-1">
            <span>New leads</span>
            <Users className="w-3.5 h-3.5 text-[var(--info)]" />
          </div>
          <div className="text-[28px] font-semibold text-[var(--text)] tabular-nums">
            <NumberTicker value={12} />
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">Discovered this week</div>
        </button>

        {/* Data issues */}
        <button
          type="button"
          onClick={() => setFilterType(filterType === 'issues' ? 'all' : 'issues')}
          className={`p-4 rounded-[12px] bg-[var(--surface)] border text-left transition-all active:scale-[0.98] cursor-pointer select-none ${
            filterType === 'issues'
              ? 'border-[var(--danger)] ring-1 ring-[var(--danger)]'
              : 'border-[var(--border)] hover:border-[var(--border)]/80'
          }`}
        >
          <div className="flex items-center justify-between text-[12px] text-[var(--muted)] mb-1">
            <span>Data issues</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" />
          </div>
          <div className="text-[28px] font-semibold text-[var(--text)] tabular-nums">
            <NumberTicker value={7} />
          </div>
          <div className="text-[11px] text-[var(--danger)] mt-1">Requires contact check</div>
        </button>
      </div>

      {/* Main 2-Column Section: Left 8/12, Right 4/12 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8/12): Today's Queue (15 rows, 56px height) */}
        <div className="lg:col-span-8 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-[var(--text)]">
                Today's Queue ({filteredItems.length} rows)
              </h2>
              {filterType !== 'all' && (
                <span className="text-[11px] px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] text-[var(--primary)] border border-[var(--border)]">
                  Filtered: {filterType}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {filterType !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className="text-[12px] text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
              <button
                type="button"
                onClick={fetchTodayData}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Refresh queue"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-8">
              <EmptyState
                text="No outreach rows match the selected filter."
                actionLabel="Show all queue items"
                onAction={() => setFilterType('all')}
              />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredItems.map((item, idx) => {
                const isSent = item.status === 'SENT';

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => onOpenLeadOutreach?.(item)}
                    className="h-[56px] px-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-2)] transition-colors cursor-pointer group select-none"
                  >
                    {/* Company Column */}
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <span className="w-6 text-[12px] font-mono text-[var(--muted)] tabular-nums shrink-0">
                        {item.batch_index || idx + 1}.
                      </span>
                      <div className="min-w-0 truncate">
                        <div className="text-[13px] font-medium text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                          {item.company_name}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] truncate">
                          {item.area || 'Chennai'}
                        </div>
                      </div>
                    </div>

                    {/* Sector Column */}
                    <div className="hidden sm:block w-32 shrink-0">
                      <span className="inline-block text-[11px] px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] truncate max-w-full">
                        {item.sector || 'Manufacturing'}
                      </span>
                    </div>

                    {/* Channel Column */}
                    <div className="w-24 shrink-0 flex items-center gap-2 text-[var(--muted)] text-[12px]">
                      <Mail className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                      <span className="truncate text-[11px]">Email</span>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0 flex items-center gap-2">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[999px] bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Sent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[999px] bg-[var(--warn)]/10 text-[var(--warn)] border border-[var(--warn)]/30">
                          <Clock className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (4/12): Follow-ups due, Replies waiting, Sparkline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Follow-ups Due */}
          <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-[13px] font-semibold text-[var(--text)]">Follow-ups Due</h3>
              <span className="text-[11px] font-mono text-[var(--warn)] bg-[var(--warn)]/10 px-2 py-0.5 rounded-[999px] border border-[var(--warn)]/20">
                4 pending
              </span>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="p-2.5 rounded-[8px] bg-[var(--surface-2)] flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--text)] truncate max-w-[180px]">Dev Hydraulics</div>
                  <div className="text-[11px] text-[var(--muted)]">Day 2 Contextual Nudge</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLeadOutreach?.(items[1] || items[0])}
                  className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Send
                </button>
              </div>
              <div className="p-2.5 rounded-[8px] bg-[var(--surface-2)] flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--text)] truncate max-w-[180px]">Cyborg Industries</div>
                  <div className="text-[11px] text-[var(--muted)]">Day 3 Value Check-in</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLeadOutreach?.(items[2] || items[0])}
                  className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Replies Waiting */}
          <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-[13px] font-semibold text-[var(--text)]">Replies Waiting</h3>
              <span className="text-[11px] font-mono text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-[999px] border border-[var(--success)]/20">
                2 unread
              </span>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="p-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--success)]/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text)]">Sai Engineering</span>
                  <span className="text-[10px] text-[var(--muted)] tabular-nums">2h ago</span>
                </div>
                <div className="text-[11px] text-[var(--muted)] mt-1 truncate">
                  "Yes, please send over the 2-minute video breakdown."
                </div>
              </div>
              <div className="p-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--success)]/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text)]">Reethika Precision</span>
                  <span className="text-[10px] text-[var(--muted)] tabular-nums">5h ago</span>
                </div>
                <div className="text-[11px] text-[var(--muted)] mt-1 truncate">
                  "Yes, what would be the setup timeline for our workshop?"
                </div>
              </div>
            </div>
          </div>

          {/* 14-Day Sent/Reply Sparkline (Recharts) */}
          <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-[13px] font-semibold text-[var(--text)]">14-Day Sent / Reply Trend</h3>
              <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  Sent
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                  Replies
                </span>
              </div>
            </div>

            <div className="h-28 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--text)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stroke="var(--primary)"
                    strokeWidth={1.5}
                    fill="var(--primary)"
                    fillOpacity={0.12}
                  />
                  <Area
                    type="monotone"
                    dataKey="replies"
                    stroke="var(--success)"
                    strokeWidth={1.5}
                    fill="var(--success)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
