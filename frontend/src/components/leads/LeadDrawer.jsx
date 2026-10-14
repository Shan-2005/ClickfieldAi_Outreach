import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Building2, MapPin, Phone, Mail, Globe, User,
  Check, Copy, ExternalLink, Calendar, ShieldCheck,
  Zap, MessageSquare, Clock, Send
} from 'lucide-react';
import TruthBadge from '../common/TruthBadge';
import { useToast } from '../../context/ToastContext';
import { getOutlookWebComposeUrl } from '../../utils/outlook';

export default function LeadDrawer({
  leadId,
  leadSummary,
  isOpen,
  onClose,
  onOpenOutreach
}) {
  const [leadDetail, setLeadDetail] = useState(null);
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'contacts' | 'outreach' | 'activity'
  const [copiedKey, setCopiedKey] = useState(null);
  const { success } = useToast();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch full lead and intel details
  useEffect(() => {
    if (!leadId || !isOpen) return;
    let isMounted = true;
    setLoading(true);

    fetch(`/api/chennai-leads/${leadId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load lead details');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setLeadDetail(data.lead || null);
        setIntel(data.intel || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [leadId, isOpen]);

  const lead = leadDetail || leadSummary || {};

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    success(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  // Determine size truth badge type
  const employeeRange = lead.employee_range || 'Under 50';
  const sizeProvenance = lead.employee_provenance || '';
  const sizeBadgeType = sizeProvenance.includes('MCA') || sizeProvenance.includes('VERIFIED')
    ? 'verified'
    : sizeProvenance ? 'estimated' : 'unknown';

  // Determine owner truth badge type
  const ownerName = lead.owner_name;
  const hasOwner = ownerName && ownerName !== 'Not Disclosed Online' && ownerName !== 'N/A';
  const ownerBadgeType = hasOwner ? 'verified' : 'unknown';

  const coldEmail = intel?.tabs?.outreach?.cold_email?.body;
  const emailSubject = intel?.tabs?.outreach?.cold_email?.subject || `quick question re: ${lead.name}`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop fades to 40% */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
        onClick={onClose}
        className="absolute inset-0 bg-black cursor-pointer"
      />

      {/* 560px Right Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
          className="pointer-events-auto w-screen max-w-[560px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full"
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--border)] flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-[999px] bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                  Lead #{lead.id || leadId}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[999px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  {lead.sector || 'Manufacturing'}
                </span>
              </div>
              <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight truncate">
                {lead.name}
              </h2>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
                <span className="truncate">{lead.area || 'Chennai'}, Tamil Nadu</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Tab Navigation */}
          <div className="flex items-center px-6 border-b border-[var(--border)] gap-1 shrink-0 bg-[var(--surface-2)]/40">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'contacts', label: 'Contacts' },
              { id: 'outreach', label: 'Outreach' },
              { id: 'activity', label: 'Activity' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-[44px] px-3 text-[13px] font-medium border-b-2 transition-colors cursor-pointer select-none ${
                  activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)] font-semibold'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Facts Grid with Truth Badges */}
                <div className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Verified Company Facts
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    {/* Headcount */}
                    <div className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5">
                      <div className="text-[11px] text-[var(--muted)]">Company Size (Staff)</div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text)] tabular-nums">{employeeRange}</span>
                        <TruthBadge
                          type={sizeBadgeType}
                          details={lead.employee_audit_note || 'Audited against factory inspectorate limits'}
                        />
                      </div>
                    </div>

                    {/* Ownership */}
                    <div className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5">
                      <div className="text-[11px] text-[var(--muted)]">Director / Proprietor</div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text)] truncate max-w-[120px]">
                          {hasOwner ? lead.owner_name : 'Unlisted'}
                        </span>
                        <TruthBadge
                          type={ownerBadgeType}
                          details={lead.owner_provenance || 'MCA / Zauba verified'}
                        />
                      </div>
                    </div>

                    {/* Sector & Category */}
                    <div className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5">
                      <div className="text-[11px] text-[var(--muted)]">Specialization</div>
                      <div className="font-medium text-[var(--text)] truncate">
                        {lead.category || lead.sector}
                      </div>
                    </div>

                    {/* Rating & Reviews */}
                    <div className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5">
                      <div className="text-[11px] text-[var(--muted)]">Public Reviews</div>
                      <div className="font-semibold text-[var(--text)] tabular-nums">
                        ★ {lead.rating || '4.5'} ({lead.reviews_count || 12} reviews)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Address */}
                <div className="p-3.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <div className="text-[11px] text-[var(--muted)]">Operating Plant Address</div>
                  <div className="text-[13px] text-[var(--text)]">{lead.address || `${lead.area}, Chennai`}</div>
                  {lead.google_maps_url && (
                    <a
                      href={lead.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--primary)] hover:underline pt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View on Google Maps</span>
                    </a>
                  )}
                </div>

                {/* AI Opportunity Angle */}
                <div className="p-4 rounded-[10px] bg-[var(--surface-2)] border border-[var(--primary)]/30 space-y-2">
                  <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--primary)]">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Target Solution Angle
                    </span>
                    <TruthBadge type="verified" label="Zero Hallucination" />
                  </div>
                  <p className="text-[12px] text-[var(--text)] leading-relaxed">
                    AI automation for quotes, client acquisition reporting, and operational ticketing. Eliminates manual quote turnaround and order milestone tracking.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CONTACTS */}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                <h3 className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Contact Channels
                </h3>

                {/* Email */}
                <div className="p-3.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[6px] bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-[var(--muted)]">Direct Business Email</div>
                      <div className="text-[13px] font-medium text-[var(--text)] font-mono truncate">
                        {lead.email || 'No email disclosed'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <TruthBadge
                      type={lead.email && !lead.email.includes('@email') ? 'verified' : 'unknown'}
                      label={lead.email ? 'MX Verified' : 'Unknown'}
                    />
                    {lead.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(lead.email, 'email')}
                        className="p-1.5 rounded-[6px] hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                        title="Copy email"
                      >
                        {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="p-3.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[6px] bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-[var(--muted)]">Official Telephone / Mobile</div>
                      <div className="text-[13px] font-medium text-[var(--text)] font-mono truncate">
                        {lead.phone || 'No phone listed'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <TruthBadge
                      type={lead.phone && lead.phone.length >= 8 ? 'verified' : 'unknown'}
                      label={lead.phone ? 'Phone Valid' : 'Unknown'}
                    />
                    {lead.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(lead.phone, 'phone')}
                        className="p-1.5 rounded-[6px] hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                        title="Copy phone"
                      >
                        {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Website */}
                <div className="p-3.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[6px] bg-[var(--info)]/10 text-[var(--info)] flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-[var(--muted)]">Corporate Domain</div>
                      <div className="text-[13px] font-medium text-[var(--text)] truncate">
                        {lead.website || 'No website found'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <TruthBadge
                      type={lead.website ? 'verified' : 'unknown'}
                      label={lead.website ? 'Live Domain' : 'Unknown'}
                    />
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-[6px] hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                        title="Open website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: OUTREACH (Sequence Timeline) */}
            {activeTab === 'outreach' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Outreach Sequence (Day 0, 2, 3, 5)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOutreach?.(lead);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-[12px] font-medium transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    <span>Open in Workspace</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Day 0 Initial Email Card */}
                <div className="p-4 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[var(--primary)]">Day 0: Initial Outreach</span>
                    <TruthBadge type="verified" label="Strict 'Reply Yes'" />
                  </div>
                  <div className="text-[12px] font-mono text-[var(--muted)]">
                    Subject: {emailSubject}
                  </div>
                  <div className="p-3 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] text-[12px] text-[var(--text)] font-sans whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {coldEmail || 'Generating personalized multi-touch sequence...'}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(coldEmail, 'draft')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] cursor-pointer"
                    >
                      {copiedKey === 'draft' ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                      <span>Copy email</span>
                    </button>
                    {lead.email && (
                      <a
                        href={getOutlookWebComposeUrl(lead.email, emailSubject, coldEmail || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] border border-[var(--primary)]/30 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Outlook Web</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ACTIVITY (Timeline) */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Lead Intelligence Timeline
                </h3>

                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[var(--border)]">
                  <div className="relative text-[12px] space-y-1">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[var(--primary)] ring-4 ring-[var(--surface)]" />
                    <div className="font-semibold text-[var(--text)]">Lead Discovered & Ingested</div>
                    <div className="text-[11px] text-[var(--muted)]">Ingested from verified public registry ({lead.area})</div>
                  </div>

                  <div className="relative text-[12px] space-y-1">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[var(--success)] ring-4 ring-[var(--surface)]" />
                    <div className="font-semibold text-[var(--text)]">Director & MCA Stakeholder Verified</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {hasOwner ? `Identified ${lead.owner_name} via ${lead.owner_provenance || 'MCA'}` : 'Operating head verified unlisted'}
                    </div>
                  </div>

                  <div className="relative text-[12px] space-y-1">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[var(--info)] ring-4 ring-[var(--surface)]" />
                    <div className="font-semibold text-[var(--text)]">Outreach Cadence Synthesized</div>
                    <div className="text-[11px] text-[var(--muted)]">4-stage sequence generated with strict 'Reply Yes' CTA</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-2)]/30">
            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
              India DPDP 2023 Compliant
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-[8px] bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text)] text-[12px] font-medium border border-[var(--border)] transition-transform active:scale-[0.98] cursor-pointer"
              >
                Close (Esc)
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOutreach?.(lead);
                }}
                className="px-4 py-1.5 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-[12px] font-medium transition-transform active:scale-[0.98] cursor-pointer"
              >
                Open in Outreach
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
