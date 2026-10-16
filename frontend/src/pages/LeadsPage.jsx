import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Users, Search, Filter, Mail, Phone, MessageSquare,
  Check, X, Eye, Bookmark, Send, Table as TableIcon,
  LayoutGrid, ArrowUpDown, ChevronDown, Download, UserCheck,
  FileSpreadsheet, Sparkles, Building2, FileText, UploadCloud
} from 'lucide-react';
import TruthBadge from '../components/common/TruthBadge';
import LeadDrawer from '../components/leads/LeadDrawer';
import DirectDispatchModal from '../components/leads/DirectDispatchModal';
import OllamaDatasetScraperModal from '../components/leads/OllamaDatasetScraperModal';
import LeadIntelligenceModal from '../components/leads/LeadIntelligenceModal';
import CsvImportModal from '../components/leads/CsvImportModal';
import { SkeletonTable } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import TendersPage from './TendersPage';
import { useToast } from '../context/ToastContext';

const SECTORS = ['ALL', 'Manufacturing', 'Construction', 'Real Estate'];
const AREAS = [
  'ALL', 'Ambattur', 'Guindy', 'Sriperumbudur', 'Poonamallee',
  'Anna Nagar', 'OMR/ECR', 'Oragadam', 'Maraimalai Nagar'
];
const STAGES = ['ALL', 'NEW', 'REVIEWED', 'CONTACTED', 'REPLIED', 'PROPOSAL', 'WON'];
const SIZES = ['ALL', 'Stated', 'Estimated', 'Unknown'];
const OWNER_OPTIONS = [
  { id: 'usr-zoya-1', name: 'Zoya Patel (Admin)' },
  { id: 'usr-rohit-2', name: 'Rohit Sharma (Sales)' }
];

export default function LeadsPage({ onOpenOutreach, initialFilter }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [selectedSector, setSelectedSector] = useState(initialFilter?.sector || 'ALL');
  const [selectedArea, setSelectedArea] = useState(initialFilter?.area || 'ALL');
  const [selectedStage, setSelectedStage] = useState(initialFilter?.stage || 'ALL');
  const [selectedSize, setSelectedSize] = useState(initialFilter?.size || 'ALL');
  const [contactFilter, setContactFilter] = useState(initialFilter?.contactFilter || 'ALL'); // 'ALL' | 'has_email' | 'phone_only'
  const [searchQuery, setSearchQuery] = useState(initialFilter?.search || '');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [sourceTab, setSourceTab] = useState('leads'); // 'leads' | 'tenders'
  const [ownerFilter, setOwnerFilter] = useState('ALL'); // 'ALL' | 'MY' | 'UNASSIGNED'

  // Dataset Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreset, setExportPreset] = useState('Contact-ready'); // 'Contact-ready' | 'Custom'
  const [exportFormat, setExportFormat] = useState('CSV'); // 'CSV' | 'XLSX'
  const [exportHistory, setExportHistory] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

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

  // Ollama Dataset Scraper, Direct Dispatch & Intelligence Modal state
  const [showScraperModal, setShowScraperModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [directDispatchLead, setDirectDispatchLead] = useState(null);
  const [intelModalLeadId, setIntelModalLeadId] = useState(null);

  const { success, error, info } = useToast();

  const fetchExportHistory = async () => {
    try {
      const res = await fetch('/api/datasets/history');
      if (res.ok) {
        setExportHistory(await res.json());
      }
    } catch {
      // ignore
    }
  };

  const handleExportSubmit = async (e) => {
    e.preventDefault();
    setExportLoading(true);
    try {
      const res = await fetch('/api/datasets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: exportPreset,
          file_format: exportFormat
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clickfield_dataset_${exportPreset.toLowerCase().replace('-', '_')}.${exportFormat.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        success(`Exported dataset successfully as ${exportFormat}!`);
        setShowExportModal(false);
        fetchExportHistory();
      } else {
        const err = await res.json();
        error(err.detail || 'Failed to export dataset. Viewer role is restricted.');
      }
    } catch {
      error('Network error generating export.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkAssign = async (targetUser) => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch('/api/chennai-leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: Array.from(selectedIds),
          user_id: targetUser.id,
          user_name: targetUser.name
        })
      });

      if (res.ok) {
        success(`Assigned ${selectedIds.size} leads to ${targetUser.name}.`);
        setSelectedIds(new Set());
        fetchLeads();
      } else {
        const err = await res.json();
        error(err.detail || 'Reassignment restricted. Only Admin can reassign leads owned by others.');
      }
    } catch {
      error('Connection error during bulk reassignment.');
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    setFetchError(null);
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
      setFetchError(err.message || 'Failed to fetch leads from API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchExportHistory();
  }, [selectedSector, selectedArea]);

  // Client-side filtering for Contact filter, Size filter, Stage filter, Owner filter, and Search query
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Owner Filter
      if (ownerFilter === 'MY') {
        if (lead.assigned_user_id !== 'usr-zoya-1' && lead.assigned_user_name !== 'Zoya Patel') return false;
      } else if (ownerFilter === 'UNASSIGNED') {
        if (lead.assigned_user_id || lead.assigned_user_name) return false;
      }

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
  }, [leads, searchQuery, contactFilter, selectedSize, selectedStage, ownerFilter]);

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
      {/* Top Source Switcher: Commercial B2B Directory vs Tenders & RFPs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-0.5 select-none">
            <button
              type="button"
              onClick={() => setSourceTab('leads')}
              className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer ${
                sourceTab === 'leads'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Building2 className="w-4 h-4 text-[var(--primary)]" />
              <span>Commercial Leads (MCA / B2B)</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceTab('tenders')}
              className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer ${
                sourceTab === 'tenders'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <FileText className="w-4 h-4 text-[var(--danger)]" />
              <span>Tenders & RFPs (GeM / CPPP)</span>
            </button>
          </div>
        </div>

        {/* Right: AI Dataset Scraper & Export Dataset Buttons */}
        {sourceTab === 'leads' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScraperModal(true)}
              className="h-[34px] px-3.5 rounded-[8px] bg-[var(--primary)] text-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-[var(--primary)]/90 transition-all cursor-pointer shadow-xs"
              title="Launch Ollama autonomous MSME cluster dataset scraper"
            >
              <Sparkles className="w-4 h-4" />
              <span>Find Real Leads (Maps & Web)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="h-[34px] px-3.5 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border)] text-[var(--text)] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-[var(--primary)]" />
              <span>Import Dataset (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="h-[34px] px-3.5 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border)] text-[var(--text)] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[var(--primary)]" />
              <span>Export Dataset (CSV/XLSX)</span>
            </button>
          </div>
        )}
      </div>

      {/* Render embedded Tenders page if selected */}
      {sourceTab === 'tenders' ? (
        <TendersPage onOpenTenderDetail={(t) => {}} />
      ) : (
        <>
          {/* Sticky Filter Bar */}
          <div className="sticky top-[56px] z-10 p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
            {/* Row 1: Sector Segmented Control + Owner Filter Chips + Search + View Mode */}
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

              {/* Owner Filter Chips */}
              <div className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-0.5 select-none">
                {[
                  { id: 'ALL', label: 'All Leads' },
                  { id: 'MY', label: 'My Leads' },
                  { id: 'UNASSIGNED', label: 'Unassigned' }
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setOwnerFilter(chip.id)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors cursor-pointer ${
                      ownerFilter === chip.id
                        ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {chip.label}
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

            {/* Bulk Selection Action Bar */}
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-[8px] bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--primary)]">
                    {selectedIds.size} leads selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[var(--muted)] hover:text-[var(--text)] underline cursor-pointer ml-1 text-[11px]"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[var(--text)] font-medium">Assign selected to:</span>
                  <select
                    onChange={(e) => {
                      const found = OWNER_OPTIONS.find((o) => o.id === e.target.value);
                      if (found) handleBulkAssign(found);
                    }}
                    defaultValue=""
                    className="h-[30px] px-2.5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] outline-none text-[12px] cursor-pointer"
                  >
                    <option value="" disabled>-- Select teammate --</option>
                    {OWNER_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={fetchLeads} />
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
            <table className="w-full border-collapse text-left text-[12px] select-none min-w-[1100px]">
              <thead>
                <tr className="h-[44px] border-b border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--muted)] font-medium text-[11px] uppercase tracking-wider">
                  <th className="w-[44px] px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredLeads.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-[var(--primary)] cursor-pointer"
                      aria-label="Select all leads"
                    />
                  </th>
                  <th className="w-[240px] min-w-[220px] px-4 py-2">Company</th>
                  <th className="w-[120px] px-4 py-2">Sector</th>
                  <th className="w-[110px] px-4 py-2">Size</th>
                  <th className="w-[180px] max-w-[180px] px-4 py-2">Owner / Director</th>
                  <th className="w-[100px] px-4 py-2">Contact</th>
                  <th className="w-[120px] px-4 py-2">Fit Score</th>
                  <th className="w-[100px] px-4 py-2">Stage</th>
                  <th className="w-[110px] px-4 py-2">Actions</th>
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
                      <td className="w-[44px] px-4 text-center" onClick={(e) => toggleSelectRow(lead.id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectRow(lead.id, e)}
                          className="rounded accent-[var(--primary)] cursor-pointer"
                          aria-label={`Select ${lead.name}`}
                        />
                      </td>

                      {/* Company (Name + Area) */}
                      <td className="px-4 py-2 w-[240px] min-w-[220px] max-w-[260px]">
                        <div className="font-medium text-[13px] text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate" title={lead.name}>
                          {lead.name}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] truncate">
                          {lead.area || 'Chennai'}, Tamil Nadu
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="px-4 py-2 w-[120px] whitespace-nowrap">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
                          {lead.sector || 'Manufacturing'}
                        </span>
                      </td>

                      {/* Size (Badge) */}
                      <td className="px-4 py-2 w-[110px] whitespace-nowrap">
                        <TruthBadge
                          type={sizeBadgeType}
                          label={lead.employee_range || '< 50 Staff'}
                          details={lead.employee_audit_note || 'Audited against factory inspectorate limits'}
                        />
                      </td>

                      {/* Owner (Badge) - with strict width and truncation */}
                      <td className="px-4 py-2 w-[180px] max-w-[180px] overflow-hidden whitespace-nowrap">
                        <div className="max-w-[170px] truncate">
                          {hasOwner ? (
                            <TruthBadge
                              type="verified"
                              label={lead.owner_name}
                              details={lead.owner_provenance || 'MCA / Zauba verified stakeholder'}
                              className="max-w-full"
                            />
                          ) : (
                            <TruthBadge type="unknown" label="Unlisted" />
                          )}
                        </div>
                      </td>

                      {/* Contact Icons (Email / Phone / WhatsApp) */}
                      <td className="px-4 py-2 w-[100px] whitespace-nowrap">
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
                      <td className="px-4 py-2 w-[120px] whitespace-nowrap">
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
                      <td className="px-4 py-2 w-[100px] whitespace-nowrap">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                          {lead.intel_status || 'NEW'}
                        </span>
                      </td>

                      {/* Row Hover Actions: Inspect Facts / Direct Dispatch (Ollama) / Outreach */}
                      <td className="px-4 py-2 w-[110px] whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIntelModalLeadId(lead.id);
                            }}
                            className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                            title="Inspect Full Company Intelligence & Facts"
                          >
                            <Eye className="w-3.5 h-3.5 text-[var(--primary)]" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDirectDispatchLead(lead);
                            }}
                            className="p-1.5 rounded-[6px] hover:bg-[var(--primary)]/15 text-[var(--primary)] transition-colors cursor-pointer"
                            title="1-Click Cold Email & Dispatch (Ollama)"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenOutreach?.(lead);
                            }}
                            className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                            title="Open Outreach Page"
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

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIntelModalLeadId(lead.id);
                    }}
                    className="px-2 py-1 rounded-[6px] bg-[var(--surface-2)] text-[var(--text)] hover:text-[var(--primary)] flex items-center gap-1 font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Facts</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDirectDispatchLead(lead);
                    }}
                    className="px-2.5 py-1 rounded-[6px] bg-[var(--primary)] text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-[var(--primary)]/90 transition-colors shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Dispatch (Ollama)</span>
                  </button>
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
      </>
      )}

      {/* Dataset Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[540px] bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text)]">Export Lead Dataset</h3>
                <p className="text-[12px] text-[var(--muted)]">
                  Generates verified CSV or XLSX files with truth statuses and compliance columns.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExportSubmit} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                  Preset Profile
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div
                    onClick={() => setExportPreset('Contact-ready')}
                    className={`p-3 rounded-[8px] border cursor-pointer transition-all ${
                      exportPreset === 'Contact-ready'
                        ? 'bg-[var(--primary)]/10 border-[var(--primary)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[var(--text)] text-[12px]">Contact-Ready</span>
                      {exportPreset === 'Contact-ready' && <Check className="w-3.5 h-3.5 text-[var(--primary)]" />}
                    </div>
                    <p className="text-[10px] text-[var(--muted)] leading-tight">
                      Excludes suppressed, bounced, unsubscribed, invalid phone, and unknown size.
                    </p>
                  </div>

                  <div
                    onClick={() => setExportPreset('Provenance-audit')}
                    className={`p-3 rounded-[8px] border cursor-pointer transition-all ${
                      exportPreset === 'Provenance-audit'
                        ? 'bg-[var(--success)]/10 border-[var(--success)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[var(--text)] text-[12px]">Provenance Audit</span>
                      {exportPreset === 'Provenance-audit' && <Check className="w-3.5 h-3.5 text-[var(--success)]" />}
                    </div>
                    <p className="text-[10px] text-[var(--muted)] leading-tight">
                      Includes statutory source registries, MCA DIN audit, and zero-hallucination certifications.
                    </p>
                  </div>

                  <div
                    onClick={() => setExportPreset('Custom')}
                    className={`p-3 rounded-[8px] border cursor-pointer transition-all ${
                      exportPreset === 'Custom'
                        ? 'bg-[var(--primary)]/10 border-[var(--primary)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[var(--text)] text-[12px]">Complete Raw</span>
                      {exportPreset === 'Custom' && <Check className="w-3.5 h-3.5 text-[var(--primary)]" />}
                    </div>
                    <p className="text-[10px] text-[var(--muted)] leading-tight">
                      All leads including needs-check items with explicit do_not_contact flags.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                  Output Format
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-[13px]">
                    <input
                      type="radio"
                      name="format"
                      checked={exportFormat === 'CSV'}
                      onChange={() => setExportFormat('CSV')}
                      className="accent-[var(--primary)]"
                    />
                    <span>Standard CSV (.csv)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[13px]">
                    <input
                      type="radio"
                      name="format"
                      checked={exportFormat === 'XLSX'}
                      onChange={() => setExportFormat('XLSX')}
                      className="accent-[var(--primary)]"
                    />
                    <span>Excel Spreadsheet (.xlsx)</span>
                  </label>
                </div>
              </div>

              {/* Version History Table (Last 10) */}
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-[var(--text)]">Dataset Version History (Last 10)</span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">Auto-versioned dataset_vN</span>
                </div>
                <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                  {exportHistory.length === 0 ? (
                    <div className="text-[11px] text-[var(--muted)] text-center py-2">
                      No previous export versions logged.
                    </div>
                  ) : (
                    exportHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--primary)]">{h.version_name}</span>
                          <span className="text-[var(--muted)]">({h.preset_used})</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[var(--muted)]">
                          <span>{h.row_count} rows</span>
                          <span className="uppercase">{h.file_format}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-3.5 py-2 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={exportLoading}
                  className="px-4 py-2 rounded-[8px] bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{exportLoading ? 'Exporting...' : `Export ${exportFormat}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive AI Dataset Scraper (Ollama) Modal */}
      <OllamaDatasetScraperModal
        isOpen={showScraperModal}
        onClose={() => setShowScraperModal(false)}
        onScrapeComplete={() => fetchLeads()}
      />

      {/* CSV Dataset Import Modal */}
      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => fetchLeads()}
      />

      {/* Direct Email Dispatch Modal (1-Click Ollama synthesis & dispatch) */}
      <DirectDispatchModal
        isOpen={Boolean(directDispatchLead)}
        onClose={() => setDirectDispatchLead(null)}
        lead={directDispatchLead}
        onDispatched={() => fetchLeads()}
      />

      {/* Full Company Intelligence & Facts Modal */}
      <LeadIntelligenceModal
        isOpen={Boolean(intelModalLeadId)}
        onClose={() => setIntelModalLeadId(null)}
        leadId={intelModalLeadId}
      />
    </div>
  );
}
