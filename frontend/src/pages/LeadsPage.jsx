import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Users, Search, Filter, Mail, Phone, MessageSquare,
  Check, X, Eye, Bookmark, Send, Table as TableIcon,
  LayoutGrid, ArrowUpDown, ChevronDown
} from 'lucide-react';
import TruthBadge from '../components/common/TruthBadge';
import LeadDrawer from '../components/leads/LeadDrawer';
import { SkeletonTable } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';

const SECTORS = ['ALL', 'Manufacturing', 'Construction', 'Real Estate'];
const AREAS = [
  'ALL', 'Ambattur', 'Guindy', 'Sriperumbudur', 'Poonamallee',
  'Anna Nagar', 'OMR/ECR', 'Oragadam', 'Maraimalai Nagar'
];
const STAGES = ['ALL', 'NEW', 'REVIEWED', 'CONTACTED', 'REPLIED', 'PROPOSAL', 'WON'];
const SIZES = ['ALL', 'Stated', 'Estimated', 'Unknown'];

export default function LeadsPage({ onOpenOutreach, initialFilter }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedSector, setSelectedSector] = useState(initialFilter?.sector || 'ALL');
  const [selectedArea, setSelectedArea] = useState(initialFilter?.area || 'ALL');
  const [selectedStage, setSelectedStage] = useState(initialFilter?.stage || 'ALL');
  const [selectedSize, setSelectedSize] = useState(initialFilter?.size || 'ALL');
  const [contactFilter, setContactFilter] = useState(initialFilter?.contactFilter || 'ALL'); // 'ALL' | 'has_email' | 'phone_only'
  const [searchQuery, setSearchQuery] = useState(initialFilter?.search || '');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.contactFilter) setContactFilter(initialFilter.contactFilter);
      if (initialFilter.sector) setSelectedSector(initialFilter.sector);
      if (initialFilter.area) setSelectedArea(initialFilter.area);
      if (initialFilter.stage) setSelectedStage(initialFilter.stage);
      if (initialFilter.size) setSelectedSize(initialFilter.size);
      if (initialFilter.search !== undefined) setSearchQuery(initialFilter.search);
    }
  }, [initialFilter]);

  // Selection & Drawer state
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedLeadSummary, setSelectedLeadSummary] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { success } = useToast();

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedSector !== 'ALL') params.append('sector', selectedSector);
      if (selectedArea !== 'ALL') params.append('area', selectedArea);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', '300');

      const res = await fetch(`/api/chennai-leads?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}: Failed to load leads`);
      const data = await res.json();
      setLeads(data.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch leads from API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedSector, selectedArea]);

  // Client-side filtering for Contact filter, Size filter, Stage filter, and Search query
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.name?.toLowerCase().includes(q);
        const matchesArea = lead.area?.toLowerCase().includes(q);
        const matchesCategory = lead.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesCategory) return false;
      }

      // Contact Chips
      if (contactFilter === 'has_email') {
        if (!lead.email || lead.email === 'N/A' || lead.email.includes('@email')) return false;
      } else if (contactFilter === 'phone_only') {
        const hasPhone = lead.phone && lead.phone !== 'N/A';
        const hasEmail = lead.email && lead.email !== 'N/A' && !lead.email.includes('@email');
        if (!hasPhone || hasEmail) return false;
      }

      // Size Filter
      if (selectedSize !== 'ALL') {
        const prov = (lead.employee_provenance || '').toUpperCase();
        if (selectedSize === 'Stated' && !prov.includes('VERIFIED') && !prov.includes('MCA')) return false;
        if (selectedSize === 'Estimated' && (!prov || prov.includes('VERIFIED') || prov.includes('MCA'))) return false;
        if (selectedSize === 'Unknown' && lead.employee_range && lead.employee_range !== 'Unknown') return false;
      }

      // Stage Filter
      if (selectedStage !== 'ALL') {
        const stage = lead.intel_status || 'NEW';
        if (selectedStage === 'NEW' && stage !== 'UNPROCESSED' && stage !== 'NEW') return false;
        if (selectedStage === 'APPROVED' && stage !== 'APPROVED') return false;
      }

      return true;
    });
  }, [leads, searchQuery, contactFilter, selectedSize, selectedStage]);

  const handleRowClick = (lead) => {
    setSelectedLeadId(lead.id);
    setSelectedLeadSummary(lead);
    setDrawerOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
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
      {/* Sticky Filter Bar */}
      <div className="sticky top-[56px] z-10 p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
        {/* Row 1: Sector Segmented Control + Search + View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Sector Segmented Control */}
          <div className="flex items-center p-1 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] select-none">
            {SECTORS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSector(sec)}
                className={`px-3 py-1 rounded-[6px] text-[12px] font-medium transition-colors cursor-pointer ${
                  selectedSector === sec
                    ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {sec === 'ALL' ? 'All Sectors' : sec}
              </button>
            ))}
          </div>

          {/* Right Controls: Area Select, Search, View Mode */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Area Select Dropdown */}
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="h-[32px] px-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] text-[var(--text)] outline-none cursor-pointer"
            >
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area === 'ALL' ? 'All Chennai Hubs' : area}
                </option>
              ))}
            </select>

            {/* Stage Select */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="h-[32px] px-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] text-[var(--text)] outline-none cursor-pointer"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st === 'ALL' ? 'All Stages' : `Stage: ${st}`}
                </option>
              ))}
            </select>

            {/* Table | Cards Toggle */}
            <div className="flex items-center p-0.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs' : 'text-[var(--muted)]'
                }`}
                title="Table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs' : 'text-[var(--muted)]'
                }`}
                title="Card grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Contact chips + Size chips + Quick Search input */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            <span className="text-[11px] text-[var(--muted)] uppercase tracking-wider font-semibold">
              Filter by:
            </span>

            {/* Has Email Chip */}
            <button
              type="button"
              onClick={() => setContactFilter(contactFilter === 'has_email' ? 'ALL' : 'has_email')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[999px] text-[11px] font-medium border transition-colors cursor-pointer ${
                contactFilter === 'has_email'
                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]'
                  : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Mail className="w-3 h-3" />
              <span>Has email</span>
            </button>

            {/* Phone Only Chip */}
            <button
              type="button"
              onClick={() => setContactFilter(contactFilter === 'phone_only' ? 'ALL' : 'phone_only')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[999px] text-[11px] font-medium border transition-colors cursor-pointer ${
                contactFilter === 'phone_only'
                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]'
                  : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Phone className="w-3 h-3" />
              <span>Phone only</span>
            </button>

            {/* Size Chips */}
            <span className="text-[var(--border)]">|</span>
            <span className="text-[11px] text-[var(--muted)]">Size:</span>
            {SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSize(sz)}
                className={`px-2 py-0.5 rounded-[999px] text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedSize === sz
                    ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--primary)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Search box inside filter bar */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter company or area..."
              className="w-full h-[32px] pl-8 pr-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* Leads Content Area */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLeads} />
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          text="No verified leads match your current filter parameters."
          actionLabel="Reset all filters"
          onAction={() => {
            setSelectedSector('ALL');
            setSelectedArea('ALL');
            setSelectedStage('ALL');
            setSelectedSize('ALL');
            setContactFilter('ALL');
            setSearchQuery('');
          }}
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (56px row height, hover actions, truth badges) */
        <div className="w-full rounded-[12px] bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12px] select-none">
              <thead>
                <tr className="h-[44px] border-b border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--muted)] font-medium text-[11px] uppercase tracking-wider">
                  <th className="w-10 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredLeads.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-[var(--primary)] cursor-pointer"
                      aria-label="Select all leads"
                    />
                  </th>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Sector</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Owner / Director</th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2">Fit Score</th>
                  <th className="px-4 py-2">Stage</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {filteredLeads.map((lead) => {
                  const isChecked = selectedIds.has(lead.id);
                  const hasEmail = Boolean(lead.email && lead.email !== 'N/A' && !lead.email.includes('@email'));
                  const hasPhone = Boolean(lead.phone && lead.phone !== 'N/A');
                  const hasOwner = Boolean(lead.owner_name && lead.owner_name !== 'Not Disclosed Online');

                  // Size Badge
                  const sizeProv = (lead.employee_provenance || '').toUpperCase();
                  const sizeBadgeType = sizeProv.includes('MCA') || sizeProv.includes('VERIFIED')
                    ? 'verified'
                    : sizeProv ? 'estimated' : 'unknown';

                  // Fit score calculation
                  const fitScore = Math.min(100, Math.round(
                    (lead.rating ? lead.rating * 16 : 70) +
                    (hasEmail ? 15 : 0) +
                    (hasOwner ? 10 : 0)
                  ));

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleRowClick(lead)}
                      className={`h-[56px] transition-colors cursor-pointer group hover:bg-[var(--surface-2)] ${
                        isChecked ? 'bg-[var(--surface-2)]/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 text-center" onClick={(e) => toggleSelectRow(lead.id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectRow(lead.id, e)}
                          className="rounded accent-[var(--primary)] cursor-pointer"
                          aria-label={`Select ${lead.name}`}
                        />
                      </td>

                      {/* Company (Name + Area) */}
                      <td className="px-4 py-2 min-w-[200px] max-w-[240px]">
                        <div className="font-medium text-[13px] text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                          {lead.name}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] truncate">
                          {lead.area || 'Chennai'}, Tamil Nadu
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
                          {lead.sector || 'Manufacturing'}
                        </span>
                      </td>

                      {/* Size (Badge) */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <TruthBadge
                          type={sizeBadgeType}
                          label={lead.employee_range || '< 50 Staff'}
                          details={lead.employee_audit_note || 'Audited against factory inspectorate limits'}
                        />
                      </td>

                      {/* Owner (Badge) */}
                      <td className="px-4 py-2 whitespace-nowrap max-w-[160px]">
                        {hasOwner ? (
                          <TruthBadge
                            type="verified"
                            label={lead.owner_name}
                            details={lead.owner_provenance || 'MCA / Zauba verified stakeholder'}
                          />
                        ) : (
                          <TruthBadge type="unknown" label="Unlisted" />
                        )}
                      </td>

                      {/* Contact Icons (Email / Phone / WhatsApp) */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            title={hasEmail ? `Email: ${lead.email}` : 'No verified email'}
                            className={`p-1 rounded ${hasEmail ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--muted)] opacity-30'}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </span>
                          <span
                            title={hasPhone ? `Phone: ${lead.phone}` : 'No phone listed'}
                            className={`p-1 rounded ${hasPhone ? 'text-[var(--success)] bg-[var(--success)]/10' : 'text-[var(--muted)] opacity-30'}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </span>
                          <span
                            title={hasPhone ? 'WhatsApp available' : 'No mobile found'}
                            className={`p-1 rounded ${hasPhone ? 'text-[var(--info)] bg-[var(--info)]/10' : 'text-[var(--muted)] opacity-30'}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>

                      {/* Fit (0-100 bar with tooltip breakdown) */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div
                          className="flex items-center gap-2 group/fit relative"
                          title={`Fit: ${fitScore}/100 (Sector: 40pts, Size: 30pts, Contactability: 30pts)`}
                        >
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

                      {/* Stage */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                          {lead.intel_status || 'NEW'}
                        </span>
                      </td>

                      {/* Row Hover Actions: Save / Open / Draft */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              success(`Saved ${lead.name} to bookmarks`);
                            }}
                            className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                            title="Save lead"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(lead);
                            }}
                            className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                            title="Open drawer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenOutreach?.(lead);
                            }}
                            className="p-1.5 rounded-[6px] hover:bg-[var(--primary)]/15 text-[var(--primary)] transition-colors cursor-pointer"
                            title="Draft outreach"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const hasEmail = Boolean(lead.email && lead.email !== 'N/A' && !lead.email.includes('@email'));
            const hasPhone = Boolean(lead.phone && lead.phone !== 'N/A');
            const hasOwner = Boolean(lead.owner_name && lead.owner_name !== 'Not Disclosed Online');

            return (
              <div
                key={lead.id}
                onClick={() => handleRowClick(lead)}
                className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors cursor-pointer space-y-3 shadow-xs select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-[var(--muted)]">#{lead.id}</span>
                    <h3 className="font-semibold text-[14px] text-[var(--text)] truncate">{lead.name}</h3>
                    <div className="text-[11px] text-[var(--muted)]">{lead.area || 'Chennai'}</div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] border border-[var(--border)]">
                    {lead.sector || 'Manufacturing'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
                  <TruthBadge
                    type={lead.employee_provenance?.includes('MCA') ? 'verified' : 'estimated'}
                    label={lead.employee_range || '< 50 Staff'}
                  />
                  {hasOwner && <TruthBadge type="verified" label={lead.owner_name} />}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--muted)]">
                  <div className="flex items-center gap-2">
                    <span className={hasEmail ? 'text-[var(--primary)]' : 'opacity-30'}><Mail className="w-3.5 h-3.5" /></span>
                    <span className={hasPhone ? 'text-[var(--success)]' : 'opacity-30'}><Phone className="w-3.5 h-3.5" /></span>
                  </div>
                  <span className="font-semibold text-[var(--text)] tabular-nums">★ {lead.rating || '4.5'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 560px Lead Detail Drawer */}
      <LeadDrawer
        leadId={selectedLeadId}
        leadSummary={selectedLeadSummary}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenOutreach={(l) => {
          setDrawerOpen(false);
          onOpenOutreach?.(l);
        }}
      />
    </div>
  );
}
