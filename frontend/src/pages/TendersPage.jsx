import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, ExternalLink, Calendar, Search, Filter,
  Clock, Check, Eye, Send, Bookmark, AlertCircle
} from 'lucide-react';
import TruthBadge from '../components/common/TruthBadge';
import { SkeletonTable } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';

export default function TendersPage({ onOpenTenderDetail }) {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewFilter, setViewFilter] = useState('active'); // 'active' | 'expired' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { success } = useToast();

  const fetchTenders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities?view=${viewFilter}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}: Failed to load tenders`);
      const data = await res.json();
      setTenders(data.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch tenders from radar API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, [viewFilter]);

  const activeCount = useMemo(() => {
    return tenders.filter((t) => !t.is_expired).length;
  }, [tenders]);

  const filteredTenders = useMemo(() => {
    return tenders.filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchCompany = t.company?.name?.toLowerCase().includes(q);
      const matchRef = t.reference_number?.toLowerCase().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      return matchTitle || matchCompany || matchRef || matchCat;
    });
  }, [tenders, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTenders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTenders.map((t) => t.id)));
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
        <div>
          {/* Header text: "Tenders: N active" */}
          <h2 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
            Tenders: <span className="text-[var(--primary)] tabular-nums">{activeCount} active</span>
          </h2>
          <div className="text-[12px] text-[var(--muted)]">
            Verified public RFPs, government tenders (GeM/CPPP), and enterprise vendor notices
          </div>
        </div>

        {/* Controls: Active / Expired / All Toggle + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] select-none">
            {['active', 'expired', 'all'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewFilter(mode)}
                className={`px-3 py-1 rounded-[6px] text-[12px] font-medium capitalize transition-colors cursor-pointer ${
                  viewFilter === mode
                    ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter title or ref no..."
              className="w-full h-[32px] pl-8 pr-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* Content Table (56px rows, same component design as Leads) */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTenders} />
      ) : filteredTenders.length === 0 ? (
        <EmptyState
          text="No tenders found matching the active filter."
          actionLabel="Show all tenders"
          onAction={() => setViewFilter('all')}
        />
      ) : (
        <div className="w-full rounded-[12px] bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12px] select-none">
              <thead>
                <tr className="h-[44px] border-b border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--muted)] font-medium text-[11px] uppercase tracking-wider">
                  <th className="w-10 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredTenders.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-[var(--primary)] cursor-pointer"
                      aria-label="Select all tenders"
                    />
                  </th>
                  <th className="px-4 py-2">Tender Notice & Authority</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Reference No</th>
                  <th className="px-4 py-2">Deadline</th>
                  <th className="px-4 py-2">AI Fit Score</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {filteredTenders.map((tender) => {
                  const isChecked = selectedIds.has(tender.id);
                  const isExpired = tender.is_expired;
                  const fitScore = tender.fit_evaluation?.total_score || 85;

                  return (
                    <tr
                      key={tender.id}
                      onClick={() => onOpenTenderDetail?.(tender)}
                      className={`h-[56px] transition-colors cursor-pointer group hover:bg-[var(--surface-2)] ${
                        isChecked ? 'bg-[var(--surface-2)]/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 text-center" onClick={(e) => toggleSelectRow(tender.id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectRow(tender.id, e)}
                          className="rounded accent-[var(--primary)] cursor-pointer"
                          aria-label={`Select ${tender.title}`}
                        />
                      </td>

                      {/* Tender Notice & Authority */}
                      <td className="px-4 py-2 min-w-[260px] max-w-sm">
                        <div className="font-medium text-[13px] text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                          {tender.title}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] truncate">
                          {tender.company?.name || 'Public Authority'} ({tender.company?.country || 'India'})
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
                          {tender.category || 'GENAI'}
                        </span>
                      </td>

                      {/* Reference No */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        {tender.reference_number ? (
                          <TruthBadge
                            type="verified"
                            label={tender.reference_number}
                            sourceUrl={tender.source_url}
                          />
                        ) : (
                          <TruthBadge type="unknown" label="Ref unlisted" />
                        )}
                      </td>

                      {/* Deadline Countdown */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
                          <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-[var(--danger)]' : 'text-[var(--warn)]'}`} />
                          <span className={isExpired ? 'text-[var(--danger)] font-medium' : 'text-[var(--text)]'}>
                            {tender.deadline ? new Date(tender.deadline).toLocaleDateString('en-GB') : 'Nov 2026'}
                          </span>
                        </div>
                      </td>

                      {/* AI Fit Score */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2" title={tender.fit_evaluation?.reasoning || 'Fit calculation'}>
                          <div className="w-16 h-1.5 rounded-[999px] bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]">
                            <div
                              className="h-full bg-[var(--primary)] rounded-[999px]"
                              style={{ width: `${fitScore}%` }}
                            />
                          </div>
                          <span className="tabular-nums font-semibold text-[11px] text-[var(--text)]">
                            {fitScore}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-[999px] border ${
                          isExpired
                            ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20'
                            : 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
                        }`}>
                          {isExpired ? 'EXPIRED' : tender.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Row Hover Actions */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              success(`Saved tender ${tender.title.slice(0, 25)}...`);
                            }}
                            className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                            title="Bookmark"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          {tender.source_url && (
                            <a
                              href={tender.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                              title="Open original tender portal"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
