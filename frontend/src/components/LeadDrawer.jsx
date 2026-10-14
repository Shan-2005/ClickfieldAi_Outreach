import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Building2, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  ShieldCheck, 
  Award, 
  FileText, 
  UserCheck,
  Edit3,
  RefreshCw,
  Save,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  Calendar,
  History,
  Sliders,
  Check,
  Zap,
  Info,
  Globe,
  Phone
} from 'lucide-react';
import { getOutlookWebComposeUrl } from '../utils/outlook';

export default function LeadDrawer({ 
  leadId, 
  onClose, 
  onStatusUpdated 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('draft'); // 'draft', 'details', 'compliance'
  const [draftSubView, setDraftSubView] = useState('pitch'); // 'pitch', 'day4', 'day9', 'facts', 'history'
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enrichingCompany, setEnrichingCompany] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Editable draft states
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const fetchLeadDetails = () => {
    if (!leadId) return;
    setLoading(true);
    fetch(`/api/opportunities/${leadId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        const draft = json?.drafts?.[0];
        if (draft) {
          const rawRecip = draft.recipient_email || '';
          setRecipientEmail(rawRecip === '[NO_VERIFIED_PUBLIC_EMAIL_FOUND]' ? '' : rawRecip);
          setSubject(draft.subject || '');
          setBodyMarkdown(draft.body_markdown || '');
        } else {
          setRecipientEmail('');
          setSubject('');
          setBodyMarkdown('');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load lead details", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  if (!leadId) return null;

  const currentDraft = data?.drafts?.[0];

  // Live word counter
  const wordCount = bodyMarkdown
    ? bodyMarkdown.split('---')[0].trim().split(/\s+/).filter(Boolean).length
    : 0;

  const handleGenerateDraft = async (modeOverride = null) => {
    setGenerating(true);
    try {
      const url = modeOverride 
        ? `/api/outreach/drafts/generate/${leadId}?mode=${modeOverride}`
        : `/api/outreach/drafts/generate/${leadId}`;
      const res = await fetch(url, { method: 'POST' });
      const resJson = await res.json();
      if (res.ok && resJson.draft) {
        setActionMessage({ type: 'success', text: 'Tailored proposal draft generated successfully.' });
        fetchLeadDetails();
      } else {
        setActionMessage({ type: 'error', text: resJson.detail || 'Failed to generate draft.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error generating proposal draft.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleEnrichCompany = async () => {
    if (!leadId) return;
    setEnrichingCompany(true);
    try {
      const res = await fetch(`/api/opportunities/${leadId}/enrich-company`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `Corporate Web Intelligence Updated: ${json.web_intel?.web_status || 'Verified'}`
        });
        fetchLeadDetails();
      } else {
        setActionMessage({ type: 'error', text: json.detail || 'Failed to enrich company details.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Error contacting enrichment agent.' });
    } finally {
      setEnrichingCompany(false);
    }
  };

  const handleTransform = async (action) => {
    if (!currentDraft) return;
    setTransforming(true);
    try {
      const res = await fetch(`/api/outreach/drafts/${currentDraft.id}/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const resJson = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Action applied: ${action}` });
        fetchLeadDetails();
      } else {
        setActionMessage({ type: 'error', text: resJson.detail || `Failed to apply ${action}` });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error transforming draft.' });
    } finally {
      setTransforming(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentDraft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/outreach/drafts/${currentDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          subject: subject,
          email_body_markdown: bodyMarkdown
        })
      });
      const resJson = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Draft edits saved and logged in revision history.' });
        setIsEditing(false);
        fetchLeadDetails();
      } else {
        setActionMessage({ type: 'error', text: resJson.detail || 'Failed to save draft.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Failed to update draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!currentDraft) {
      await handleGenerateDraft();
      return;
    }
    if (!recipientEmail || recipientEmail.trim() === '' || !recipientEmail.includes('@')) {
      setActionMessage({ type: 'error', text: 'Action required: Enter a valid verified destination email before approving.' });
      return;
    }
    setApproving(true);
    try {
      // First save recipient if updated
      await fetch(`/api/outreach/drafts/${currentDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          subject: subject,
          email_body_markdown: bodyMarkdown
        })
      });

      const res = await fetch(`/api/outreach/drafts/${currentDraft.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'Operator-Clickfield', comments: 'Reviewed technical proposal and verified grounding.' })
      });
      const resJson = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Proposal draft approved. Ready for operator dispatch.' });
        fetchLeadDetails();
        if (onStatusUpdated) onStatusUpdated();
      } else {
        setActionMessage({ type: 'error', text: resJson.detail || 'Failed to approve draft.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Failed to approve draft.' });
    } finally {
      setApproving(false);
    }
  };

  const handleSend = async () => {
    if (!currentDraft) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/outreach/drafts/${currentDraft.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'Operator-Clickfield' })
      });
      const resJson = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Proposal dispatched compliantly to ${recipientEmail}.` });
        fetchLeadDetails();
        if (onStatusUpdated) onStatusUpdated();
      } else {
        setActionMessage({ type: 'error', text: resJson.detail || 'Dispatch failed.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Failed to dispatch proposal.' });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!currentDraft) return;
    setApproving(true);
    try {
      await fetch(`/api/outreach/drafts/${currentDraft.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'Operator-Clickfield' })
      });
      setActionMessage({ type: 'info', text: 'Proposal draft rejected.' });
      fetchLeadDetails();
    } finally {
      setApproving(false);
    }
  };

  const sourceFacts = currentDraft?.source_facts || {};
  const isPrivateB2B = (currentDraft?.draft_mode || '') === 'PRIVATE_B2B';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 dark:bg-black/80 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 transition-colors">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 uppercase tracking-wider">
                {data?.primary_category?.replace(/_/g, ' ') || 'Requirement'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                STATUS: {data?.status || 'NEW'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isPrivateB2B 
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                {currentDraft?.draft_mode || (data?.buyer_type === 'Government' ? 'FORMAL_TENDER' : 'PRIVATE_B2B')}
              </span>
              {data?.is_expired && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                  EXPIRED
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white leading-snug m-0">
              {loading ? 'Loading Opportunity...' : data?.title}
            </h2>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2 mt-1.5 flex-wrap">
              <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{data?.company?.name || 'Unknown Buyer'}</span>
              <span>·</span>
              <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{data?.company?.city ? `${data.company.city}, ` : ''}{data?.company?.country || 'India'}</span>
              {data?.source_url && (
                <>
                  <span>·</span>
                  <a 
                    href={data.source_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Source Notice</span>
                  </a>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback banner */}
        {actionMessage && (
          <div className={`px-5 py-2.5 text-xs font-medium border-b flex items-center justify-between ${
            actionMessage.type === 'success' 
              ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white' 
              : actionMessage.type === 'error'
              ? 'bg-red-50 dark:bg-zinc-900 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('draft')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'draft'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-bold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Personalized Outreach Drafter</span>
            {currentDraft?.status === 'APPROVED' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'details'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-bold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Scope & Company Info</span>
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'compliance'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-bold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail & Provenance</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-zinc-800 dark:text-zinc-300 bg-white dark:bg-black">
          {loading ? (
            <div className="py-20 text-center text-zinc-500 font-medium">Loading details...</div>
          ) : activeTab === 'draft' ? (
            /* TAB 1: OUTREACH DRAFT WITH UPGRADED ZOYA ENGINE */
            <div className="space-y-4">
              
              {!currentDraft ? (
                /* No draft exists state */
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center space-y-3 shadow-xs">
                  <Mail className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Outreach Draft Created Yet</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs max-w-md mx-auto">
                    Generate an authentic, grounded proposal in Zoya style, calibrated to the exact technical deliverables and source record.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => handleGenerateDraft('PRIVATE_B2B')}
                      disabled={generating}
                      className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-black font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                      <span>Draft Private B2B (70–120w)</span>
                    </button>
                    <button
                      onClick={() => handleGenerateDraft('FORMAL_TENDER')}
                      disabled={generating}
                      className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold transition-all inline-flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Draft Formal Tender/EOI</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* UPGRADED PROPOSAL DRAFTER INTERFACE */
                <>
                  {/* Warning Badges: Ungrounded / Needs Contact */}
                  {(!recipientEmail || !currentDraft.can_send) && (
                    <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 flex items-start gap-3 text-amber-900 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="block text-amber-800 dark:text-amber-300">Needs Contact / Manual Review Required:</strong>
                        {currentDraft.ungrounded_warning || 'The public notice did not publish a direct email mailbox. Please enter a verified RFC-2142 destination mailbox (e.g. procurement@, rfp@) before approval can be granted.'}
                      </div>
                    </div>
                  )}

                  {/* Mode & Word Count Status Strip */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Tone Mode:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isPrivateB2B 
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {isPrivateB2B ? 'Mode A: Private B2B (Zoya Calm Engineering)' : 'Mode B: Formal Tender / EOI Response'}
                      </span>
                      <button
                        onClick={() => handleGenerateDraft(isPrivateB2B ? 'FORMAL_TENDER' : 'PRIVATE_B2B')}
                        disabled={generating}
                        className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer"
                      >
                        Switch to {isPrivateB2B ? 'Tender Mode' : 'B2B Mode'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-zinc-600 dark:text-zinc-400">Length:</span>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        isPrivateB2B && (wordCount < 70 || wordCount > 120)
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                      }`}>
                        {wordCount} words {isPrivateB2B ? '(Target: 70–120w)' : '(Target: 80–140w)'}
                      </span>
                    </div>
                  </div>

                  {/* Recipient & Subject Header Box */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3.5 shadow-xs">
                    {/* Recipient Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-400 flex items-center gap-1.5">
                          <span>Verified Recipient Email:</span>
                          {!recipientEmail && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold italic">(Needs contact address)</span>
                          )}
                        </label>
                      </div>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="e.g. tenders@department.gov.in, rfp@enterprise.com"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white focus:outline-none rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 transition-colors shadow-xs"
                      />
                    </div>

                    {/* Step 5: 3 Subject Options (under 8 words) */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-400 block mb-1.5">
                        Subject Line (Choose from 3 specific options under 8 words, or edit):
                      </label>
                      
                      {currentDraft.subject_options && currentDraft.subject_options.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-2">
                          {currentDraft.subject_options.map((opt, idx) => {
                            const optWords = opt.split(' ').length;
                            const isSelected = subject === opt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSubject(opt)}
                                className={`text-left px-3 py-1.5 rounded-lg border text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white font-medium'
                                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                                }`}
                              >
                                <span>{opt}</span>
                                <span className="text-[10px] opacity-75 font-mono ml-2 shrink-0">{optWords} words</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject line..."
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white focus:outline-none rounded-lg px-3 py-2 text-xs font-medium text-zinc-900 dark:text-white transition-colors shadow-xs"
                      />
                    </div>

                    {/* Quick Transformation Action Buttons (Step 7) */}
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-semibold uppercase">Quick Adjust:</span>
                        <button
                          onClick={() => handleTransform('make_shorter')}
                          disabled={transforming}
                          className="px-2 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                        >
                          Make Shorter
                        </button>
                        <button
                          onClick={() => handleTransform('make_more_formal')}
                          disabled={transforming}
                          className="px-2 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                        >
                          Make More Formal
                        </button>
                        <button
                          onClick={() => handleTransform('change_angle')}
                          disabled={transforming}
                          className="px-2 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                        >
                          Change Angle
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveDraft}
                          disabled={saving}
                          className="px-2.5 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer shadow-xs font-semibold"
                        >
                          <Save className="w-3 h-3" />
                          <span>{saving ? 'Saving...' : 'Save Edits'}</span>
                        </button>
                        <button
                          onClick={() => handleTransform('regenerate')}
                          disabled={transforming || generating}
                          className="px-2.5 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Rotate angle & regenerate"
                        >
                          <RefreshCw className={`w-3 h-3 ${transforming ? 'animate-spin' : ''}`} />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-View Tabs: Initial Pitch | Day 4 Follow-up | Day 9 Follow-up | Grounding Facts | History */}
                  <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-[11px] font-medium overflow-x-auto">
                    <button
                      onClick={() => setDraftSubView('pitch')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        draftSubView === 'pitch'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      Initial Pitch
                    </button>
                    <button
                      onClick={() => setDraftSubView('day4')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        draftSubView === 'day4'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      Day 4 Follow-up
                    </button>
                    <button
                      onClick={() => setDraftSubView('day9')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        draftSubView === 'day9'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      Day 9 Final Check-in
                    </button>
                    <button
                      onClick={() => setDraftSubView('facts')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        draftSubView === 'facts'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      Grounding Trace ({Object.keys(sourceFacts).length} facts)
                    </button>
                    <button
                      onClick={() => setDraftSubView('history')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        draftSubView === 'history'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      Edits ({currentDraft.edit_history?.length || 0})
                    </button>
                  </div>

                  {/* Sub-View 1: Main Initial Pitch */}
                  {draftSubView === 'pitch' && (
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Proposal Body (Zoya Engineering Tone · Grounded)</span>
                        </span>
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditing ? 'Done Editing' : 'Edit Text'}</span>
                        </button>
                      </div>

                      {isEditing ? (
                        <textarea
                          value={bodyMarkdown}
                          onChange={(e) => setBodyMarkdown(e.target.value)}
                          rows={13}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white focus:outline-none rounded-lg p-3 font-mono text-[11px] text-zinc-900 dark:text-zinc-200 leading-relaxed shadow-xs"
                        />
                      ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto shadow-xs">
                          {bodyMarkdown || 'No draft content available. Click Regenerate to draft.'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-View 2: Day 4 Follow-up Draft */}
                  {draftSubView === 'day4' && (
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white m-0">Day 4 Follow-up Sequence</h4>
                          <span className="text-[10px] text-zinc-500">Scheduled for 4 days after initial dispatch · New technical angle</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          Auto-stops on reply/opt-out
                        </span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap select-text max-h-[360px] overflow-y-auto shadow-xs">
                        {currentDraft.follow_up_day4 || 'No follow-up draft available.'}
                      </div>
                    </div>
                  )}

                  {/* Sub-View 3: Day 9 Follow-up Draft */}
                  {draftSubView === 'day9' && (
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white m-0">Day 9 Final Check-in</h4>
                          <span className="text-[10px] text-zinc-500">Graceful closing notice · Zero pressure · Auto-stops on reply/opt-out</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          Auto-stops on reply/opt-out
                        </span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap select-text max-h-[360px] overflow-y-auto shadow-xs">
                        {currentDraft.follow_up_day9 || 'No final check-in draft available.'}
                      </div>
                    </div>
                  )}

                  {/* Sub-View 4: Grounding Facts Side Panel (Step 7) */}
                  {draftSubView === 'facts' && (
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white m-0">Record Grounding Trace</h4>
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Zero Hallucinated Claims</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Chosen Hook Detail:</span>
                          <span className="font-semibold text-zinc-900 dark:text-white">{sourceFacts.chosen_hook || 'Title scope'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Primary Stated Tech:</span>
                          <span className="font-semibold text-zinc-900 dark:text-white">{sourceFacts.primary_tech || 'Distributed Systems'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Tender Reference No:</span>
                          <span className="font-mono text-zinc-900 dark:text-white">{sourceFacts.reference_number || 'Unstated'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Submission Deadline:</span>
                          <span className="font-semibold text-zinc-900 dark:text-white">{sourceFacts.deadline || 'Notice window'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 col-span-2">
                          <span className="text-zinc-500 text-[10px] block">Approved Clickfield Capability Matched:</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[10px] leading-relaxed block mt-0.5">
                            {sourceFacts.approved_capability || 'Enterprise software architecture'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 col-span-2">
                          <span className="text-zinc-500 text-[10px] block">Live Notice URL:</span>
                          <a 
                            href={sourceFacts.source_url || data?.source_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-zinc-900 dark:text-white hover:underline text-[10px] font-mono break-all inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>{sourceFacts.source_url || data?.source_url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-View 5: Edit History (Step 7) */}
                  {draftSubView === 'history' && (
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white m-0">Human Operator Revision Log</h4>
                        <span className="text-[10px] text-zinc-500">All modifications are preserved to inform future style guide evolution</span>
                      </div>
                      {(!currentDraft.edit_history || currentDraft.edit_history.length === 0) ? (
                        <div className="text-center py-6 text-zinc-500 text-xs">
                          No human revisions made yet. Edits made in the editor will be logged here.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[320px] overflow-y-auto">
                          {currentDraft.edit_history.map((rev, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1.5">
                              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                                <span>Revision #{idx + 1} by {rev.user_id || 'Operator'}</span>
                                <span>{new Date(rev.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="text-zinc-700 dark:text-zinc-300 font-mono text-[10px] bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {rev.after}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Human Approval Toolbar */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <UserCheck className="w-4 h-4 text-zinc-900 dark:text-white shrink-0" />
                      <span><strong>Human Gate Rule:</strong> No outreach proposal is ever dispatched automatically. Operators must inspect facts, tone, and recipient before approving.</span>
                    </div>

                    <div className="flex items-center gap-2 justify-end pt-1 flex-wrap">
                      <button
                        onClick={handleReject}
                        disabled={approving || currentDraft.status === 'REJECTED'}
                        className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 font-medium transition-colors cursor-pointer shadow-xs"
                      >
                        Reject Draft
                      </button>

                      {currentDraft.status !== 'APPROVED' && currentDraft.status !== 'SENT' && (
                        <button
                          onClick={handleApprove}
                          disabled={approving || !recipientEmail || !currentDraft.can_send}
                          title={!recipientEmail ? 'Enter destination email before approving' : 'Approve proposal draft'}
                          className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                            !recipientEmail || !currentDraft.can_send
                              ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-zinc-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-black'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{approving ? 'Approving...' : 'Approve Proposal Draft'}</span>
                        </button>
                      )}

                      {recipientEmail && (
                        <a
                          href={getOutlookWebComposeUrl(recipientEmail, currentDraft.subject || `Proposal: ${data.opportunity?.title}`, bodyMarkdown)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all flex items-center gap-1.5 shadow-sm text-xs cursor-pointer"
                          title="Open directly in Outlook Web (outlook.cloud.microsoft) in Chrome"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Outlook Web</span>
                        </a>
                      )}

                      {currentDraft.status === 'APPROVED' && (
                        <button
                          onClick={handleSend}
                          disabled={approving || !recipientEmail}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{approving ? 'Marking Sent...' : 'Mark Dispatched to Recipient'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'details' ? (
            /* TAB 2: REQUIREMENT & COMPANY INTELLIGENCE */
            <div className="space-y-4">
              {/* Verified Buyer & Company Intelligence Card */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-900 dark:text-white" />
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white m-0">Verified Buyer & Corporate Intelligence</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      Live Web Grounded
                    </span>
                  </div>
                  <button
                    onClick={handleEnrichCompany}
                    disabled={enrichingCompany}
                    className="px-2.5 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Live crawl the web to find official corporate website and public RFP contacts"
                  >
                    <RefreshCw className={`w-3 h-3 ${enrichingCompany ? 'animate-spin text-indigo-500' : ''}`} />
                    <span>{enrichingCompany ? 'Enriching...' : 'Live Enrich from Web'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Buyer Organization</div>
                    <div className="font-bold text-zinc-900 dark:text-white mt-1 text-sm">
                      {data?.company?.name || 'Unknown Buyer'}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {data?.company?.industry || 'Public & Enterprise Sector'}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Corporate Website</div>
                    {data?.company?.website ? (
                      <div className="mt-1">
                        <a
                          href={data.company.website}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 text-xs break-all"
                        >
                          <Globe className="w-3 h-3 shrink-0" />
                          <span>{data.company.website}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                          ✓ Verified Corporate Domain ({data.company.domain})
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-zinc-500 text-[11px] italic">
                        No official website registered on public search. Grounded in tender notice record.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">
                    Verified Public Procurement & RFP Channels
                  </div>
                  {data?.company?.public_contacts && data.company.public_contacts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {data.company.public_contacts.map((em, idx) => (
                        <a
                          key={idx}
                          href={getOutlookWebComposeUrl(em)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Draft email in Outlook Web (outlook.cloud.microsoft)"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white font-mono text-[11px]"
                        >
                          <Mail className="w-3 h-3 text-indigo-500" />
                          <span>{em}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-500 dark:text-zinc-400 text-[11px] italic">
                      Zero public email found on live web. Tender submissions must follow the official portal link.
                    </div>
                  )}
                </div>
              </div>

              {/* Fit Breakdown */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-zinc-900 dark:text-white" />
                    <span>ClickfieldAI Fit Evaluation</span>
                  </span>
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700">
                    {data?.fit?.total_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px] text-center mb-3">
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400">Service Match</div>
                    <div className="text-zinc-900 dark:text-white font-bold text-xs mt-1">{data?.fit?.service_score}/40</div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400">Region Fit</div>
                    <div className="text-zinc-900 dark:text-white font-bold text-xs mt-1">{data?.fit?.region_score}/25</div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400">Budget Fit</div>
                    <div className="text-zinc-900 dark:text-white font-bold text-xs mt-1">{data?.fit?.budget_score}/20</div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400">Urgency</div>
                    <div className="text-zinc-900 dark:text-white font-bold text-xs mt-1">{data?.fit?.urgency_score}/15</div>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 leading-relaxed font-mono">
                  {data?.fit?.reasoning}
                </p>
              </div>

              {/* Requirement Description */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-white mb-2">Technical Deliverables & Specifications</h3>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap select-text">
                  {data?.description}
                </p>
              </div>

              {/* Technologies */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-white mb-2">Stated Tech Stack & Frameworks</h3>
                <div className="flex flex-wrap gap-1.5">
                  {data?.tech_stack?.length > 0 ? (
                    data.tech_stack.map((t, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500 text-xs italic">No explicit tech tags specified in notice</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 3: AUDIT TRAIL & COMPLIANCE */
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Immutable DPDP / CAN-SPAM Audit Trail</span>
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs mb-3">
                  Every extraction, classification, and draft creation is timestamped and logged under India DPDP Act 2023 Section 6 and GDPR B2B legitimate interest.
                </p>
                <div className="space-y-2">
                  {data?.audit_trail?.map((log, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px]">
                      <div className="flex items-center justify-between text-zinc-500 text-[10px] mb-1">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400">Agent: {log.agent}</div>
                      <div className="text-zinc-500 text-[10px] italic mt-0.5">{log.legal_basis}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
