import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Check, CheckCircle2, Send, RefreshCw,
  Mail, Sparkles, Building2, MapPin, ExternalLink,
  Clock, ShieldCheck, Database, FileSpreadsheet,
  ArrowLeft, ArrowRight, Copy, Search, Filter,
  ChevronRight, Upload, Wand2, Globe,
  Sliders, RotateCcw, AlertCircle, Award
} from 'lucide-react';
import { openInOutlookWeb } from '../utils/outlook';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/common/Skeleton';

const LinkedInIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.67a1.66 1.66 0 1 0 1.66 1.66 1.66 1.66 0 0 0-1.66-1.66Z" />
  </svg>
);

export default function OutreachPage({ initialLead }) {
  const { success, error: toastError, info } = useToast();

  // -------------------------------------------------------------
  // Step 1: Who Am I (Sender Persona)
  // -------------------------------------------------------------
  const [personas, setPersonas] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(() => {
    return localStorage.getItem('clickfield_outreach_persona') || 'zoya';
  });
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  // -------------------------------------------------------------
  // Step 2: Dataset Selection
  // -------------------------------------------------------------
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(() => {
    return localStorage.getItem('clickfield_outreach_dataset') || 'digital-transformation-sheet1';
  });
  const [showDatasetPicker, setShowDatasetPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // -------------------------------------------------------------
  // Step 3: Leads & Studio State (One-by-One)
  // -------------------------------------------------------------
  const [leads, setLeads] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONTACTED' | 'SKIPPED'
  const [searchQuery, setSearchQuery] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);

  // Current Lead Draft State
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState('concise'); // 'concise' | 'technical' | 'roi'
  const [copiedField, setCopiedField] = useState(null); // 'email' | 'pitch' | null

  // -------------------------------------------------------------
  // 1. Load Personas & Datasets on Mount
  // -------------------------------------------------------------
  const fetchPersonasAndDatasets = async () => {
    try {
      const [resP, resD] = await Promise.all([
        fetch('/api/outreach-studio/personas'),
        fetch('/api/outreach-studio/datasets')
      ]);
      if (resP.ok) {
        const dataP = await resP.json();
        setPersonas(dataP.personas || []);
      }
      if (resD.ok) {
        const dataD = await resD.json();
        const ds = dataD.datasets || [];
        setDatasets(ds);
        // Ensure default dataset exists
        if (ds.length > 0 && !ds.some(d => d.id === selectedDatasetId)) {
          setSelectedDatasetId(ds[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load initial studio metadata:', err);
    }
  };

  useEffect(() => {
    fetchPersonasAndDatasets();
  }, []);

  // -------------------------------------------------------------
  // 2. Fetch Leads for Selected Dataset with Position Memory
  // -------------------------------------------------------------
  const fetchLeads = async (datasetId = selectedDatasetId, targetLeadId = null) => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/outreach-studio/datasets/${datasetId}/leads?limit=500`);
      if (!res.ok) throw new Error('Failed to load dataset leads');
      const data = await res.json();
      const loadedLeads = data.leads || [];
      setLeads(loadedLeads);

      if (loadedLeads.length > 0) {
        let targetIdx = -1;

        // Priority 1: Explicit targetLeadId passed
        if (targetLeadId != null) {
          targetIdx = loadedLeads.findIndex(l => String(l.id) === String(targetLeadId));
        }

        // Priority 2: Stored last viewed lead for this dataset
        if (targetIdx === -1) {
          const storedLeadId = localStorage.getItem(`clickfield_outreach_last_lead_${datasetId}`);
          if (storedLeadId) {
            targetIdx = loadedLeads.findIndex(l => String(l.id) === String(storedLeadId));
          }
        }

        // Priority 3: First PENDING lead (never restart at index 0 if already contacted)
        if (targetIdx === -1) {
          targetIdx = loadedLeads.findIndex(l => l.status === 'PENDING');
        }

        // Priority 4: Fallback to 0 if all leads are contacted
        if (targetIdx === -1) {
          targetIdx = 0;
        }

        setCurrentIndex(targetIdx);
        setDraftSubject(loadedLeads[targetIdx].draft_subject || '');
        setDraftBody(loadedLeads[targetIdx].draft_body || '');
        localStorage.setItem(`clickfield_outreach_last_lead_${datasetId}`, loadedLeads[targetIdx].id);
      } else {
        setCurrentIndex(0);
        setDraftSubject('');
        setDraftBody('');
      }
    } catch (err) {
      console.error(err);
      toastError('Could not load leads for this dataset.');
    } finally {
      setLoading(false);
    }
  };

  // Resolve incoming initialLead clicked from any other page (Leads, Today, Calendar)
  useEffect(() => {
    if (!initialLead) return;

    const resolveIncomingLead = async () => {
      try {
        const payload = {
          lead_id: initialLead.id,
          company_name: initialLead.company_name || initialLead.name,
          email: initialLead.recipient_email || initialLead.email,
          area: initialLead.area || initialLead.city,
          sector: initialLead.sector || initialLead.industry,
          owner_name: initialLead.owner_name || initialLead.recipient_name
        };
        const res = await fetch('/api/outreach-studio/resolve-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.dataset_id && data.lead_id) {
            setSelectedDatasetId(data.dataset_id);
            localStorage.setItem('clickfield_outreach_dataset', data.dataset_id);
            fetchLeads(data.dataset_id, data.lead_id);
            info(`Selected ${data.lead.company_name} in Outreach Studio`);
          }
        }
      } catch (err) {
        console.warn('Could not auto-resolve incoming lead:', err);
      }
    };

    resolveIncomingLead();
  }, [initialLead]);

  useEffect(() => {
    if (selectedDatasetId && !initialLead) {
      localStorage.setItem('clickfield_outreach_dataset', selectedDatasetId);
      fetchLeads(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  // Current persona object
  const currentPersona = useMemo(() => {
    return personas.find(p => p.id === selectedPersonaId) || personas[0] || {
      name: 'Zoya Patel',
      role: 'Technical Solutions & Engineering Lead',
      company: 'ClickfieldAI',
      email: 'zoya@clickfield.ai'
    };
  }, [personas, selectedPersonaId]);

  // Save persona to localStorage
  const handleSelectPersona = (pId) => {
    setSelectedPersonaId(pId);
    localStorage.setItem('clickfield_outreach_persona', pId);
    setShowPersonaPicker(false);
    success(`Active sender set to ${personas.find(p => p.id === pId)?.name || 'Persona'}`);
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (lead.company_name && lead.company_name.toLowerCase().includes(q)) ||
        (lead.recipient_name && lead.recipient_name.toLowerCase().includes(q)) ||
        (lead.recipient_email && lead.recipient_email.toLowerCase().includes(q)) ||
        (lead.company_industry && lead.company_industry.toLowerCase().includes(q)) ||
        (lead.company_country && lead.company_country.toLowerCase().includes(q))
      );
      return matchesStatus && matchesSearch;
    });
  }, [leads, statusFilter, searchQuery]);

  // Current Lead in the active filtered view
  const currentLead = filteredLeads[currentIndex] || null;

  // Sync draft fields and persist active lead position whenever currentLead changes
  useEffect(() => {
    if (currentLead) {
      setDraftSubject(currentLead.draft_subject || '');
      setDraftBody(currentLead.draft_body || '');
      if (selectedDatasetId) {
        localStorage.setItem(`clickfield_outreach_last_lead_${selectedDatasetId}`, currentLead.id);
      }
    } else {
      setDraftSubject('');
      setDraftBody('');
    }
  }, [currentIndex, currentLead?.id, selectedDatasetId]);

  // Keyboard Navigation: ArrowLeft = Prev, ArrowRight = Next
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        handleNextLead();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        handlePrevLead();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredLeads.length]);

  // Navigation handlers
  const handleNextLead = () => {
    if (currentIndex < filteredLeads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevLead = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // -------------------------------------------------------------
  // Action Handlers
  // -------------------------------------------------------------

  // 1. Save Draft edits
  const handleSaveDraft = async () => {
    if (!currentLead) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/outreach-studio/leads/${currentLead.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: draftSubject, body: draftBody })
      });
      if (!res.ok) throw new Error('Failed to save draft');
      // Update in local state
      setLeads(prev => prev.map(l => l.id === currentLead.id ? { ...l, draft_subject: draftSubject, draft_body: draftBody } : l));
      success('Outreach draft saved.');
    } catch (err) {
      console.error(err);
      toastError('Could not save draft changes.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 2. Regenerate with Ollama local LLM
  const handleRegenerateWithOllama = async (tone = selectedTone) => {
    if (!currentLead) return;
    setIsRegenerating(true);
    info(`Generating bespoke pitch with Ollama (llama3.2:3b)...`);
    try {
      const res = await fetch(`/api/outreach-studio/leads/${currentLead.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: selectedPersonaId,
          tone: tone,
          custom_notes: `Targeting ${currentLead.company_industry || 'enterprise'} market.`
        })
      });
      if (!res.ok) throw new Error('Ollama generation failed');
      const data = await res.json();
      const updated = data.data;
      if (updated && updated.subject && updated.body) {
        setDraftSubject(updated.subject);
        setDraftBody(updated.body);
        setLeads(prev => prev.map(l => l.id === currentLead.id ? { ...l, draft_subject: updated.subject, draft_body: updated.body } : l));
        success(`Generated bespoke pitch (${updated.model || 'Ollama'})!`);
      }
    } catch (err) {
      console.error(err);
      toastError('Ollama generation timed out, rule fallback applied.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // 3. Open in Outlook Web Compose
  const handleOpenOutlook = () => {
    if (!currentLead) return;
    const to = currentLead.recipient_email || '';
    if (!to) {
      toastError('No verified email found for this lead.');
      return;
    }
    openInOutlookWeb(to, draftSubject, draftBody);
    info(`Opened Outlook Web Compose tab for ${currentLead.recipient_name || currentLead.company_name}`);
  };

  // 4. Copy Email or Full Pitch
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    success(`Copied ${field === 'email' ? 'email address' : 'pitch'} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 5. Update Status (Contacted or Skipped) & Advance
  const handleUpdateStatusAndAdvance = async (newStatus) => {
    if (!currentLead) return;
    try {
      await fetch(`/api/outreach-studio/leads/${currentLead.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, contacted_by: currentPersona.name })
      });
      // Update locally
      setLeads(prev => prev.map(l => l.id === currentLead.id ? { ...l, status: newStatus } : l));
      if (newStatus === 'CONTACTED') {
        success(`Marked ${currentLead.company_name} as Contacted!`);
      } else {
        info(`Skipped ${currentLead.company_name}`);
      }
      // Auto-advance to next
      handleNextLead();
    } catch (err) {
      console.error(err);
      toastError('Failed to update lead status');
    }
  };

  // 6. Handle Custom File Upload (.xlsx / .csv)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    info(`Importing ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataset_name', file.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch('/api/outreach-studio/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      success(`Imported ${data.imported_leads} leads into new dataset: ${data.name}!`);
      // Refresh datasets and switch to new one
      await fetchPersonasAndDatasets();
      setSelectedDatasetId(data.dataset_id);
      setShowDatasetPicker(false);
    } catch (err) {
      console.error(err);
      toastError('Failed to upload file. Check format.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stats calculation
  const totalCount = leads.length;
  const contactedCount = leads.filter(l => l.status === 'CONTACTED').length;
  const skippedCount = leads.filter(l => l.status === 'SKIPPED').length;
  const pendingCount = leads.filter(l => l.status === 'PENDING').length;
  const progressPercent = totalCount > 0 ? Math.round((contactedCount / totalCount) * 100) : 0;

  // Active dataset metadata
  const currentDataset = datasets.find(d => d.id === selectedDatasetId) || {
    name: 'Digital Transformation Leads (Sheet 1)',
    category: 'Digital Transformation'
  };

  // Word count & read time
  const wordCount = draftBody.trim() ? draftBody.trim().split(/\s+/).length : 0;
  const readSeconds = Math.max(1, Math.round((wordCount / 200) * 60));

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-12">
      {/* ============================================================== */}
      {/* TOP WORKSPACE HEADER: WHO AM I + DATASET + PROGRESS BAR */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Sender Persona & Dataset Selector Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Persona Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPersonaPicker(v => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer text-left shadow-xs"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-500 font-semibold text-xs flex items-center justify-center border border-blue-500/30">
                  {currentPersona.avatar || 'ZP'}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">Who Am I</div>
                  <div className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1">
                    {currentPersona.name}
                    <ChevronRight className="w-3 h-3 text-[var(--foreground-muted)]" />
                  </div>
                </div>
              </button>

              {/* Persona Picker Dropdown */}
              <AnimatePresence>
                {showPersonaPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    className="absolute left-0 top-full mt-2 w-72 p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl z-50"
                  >
                    <div className="px-3 py-2 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                      Select Sender Persona
                    </div>
                    <div className="space-y-1">
                      {personas.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPersona(p.id)}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                            selectedPersonaId === p.id 
                              ? 'bg-blue-500/10 border border-blue-500/30 text-[var(--foreground)]' 
                              : 'hover:bg-[var(--surface-hover)] text-[var(--foreground-secondary)]'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-500 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.avatar || p.name.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[var(--foreground)]">{p.name}</div>
                            <div className="text-[11px] text-[var(--foreground-muted)] truncate">{p.role}</div>
                            <div className="text-[10px] text-blue-500/90 font-medium mt-0.5">{p.angle}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />

            {/* Dataset Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatasetPicker(v => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer text-left shadow-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">Active Dataset / Sheet</div>
                  <div className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1 max-w-[200px] truncate">
                    {currentDataset.name}
                    <ChevronRight className="w-3 h-3 text-[var(--foreground-muted)] shrink-0" />
                  </div>
                </div>
              </button>

              {/* Dataset Picker Dropdown */}
              <AnimatePresence>
                {showDatasetPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    className="absolute left-0 top-full mt-2 w-84 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl z-50"
                  >
                    <div className="flex items-center justify-between px-2 py-1 mb-2">
                      <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                        Select Dataset or Sheet
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-[11px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        {isUploading ? 'Uploading...' : 'Upload File'}
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {datasets.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDatasetId(d.id);
                            setShowDatasetPicker(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-all cursor-pointer ${
                            selectedDatasetId === d.id 
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-[var(--foreground)]' 
                              : 'hover:bg-[var(--surface-hover)] text-[var(--foreground-secondary)]'
                          }`}
                        >
                          <FileSpreadsheet className={`w-4 h-4 mt-0.5 shrink-0 ${selectedDatasetId === d.id ? 'text-emerald-500' : 'text-[var(--foreground-muted)]'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-[var(--foreground)] truncate">{d.name}</div>
                            <div className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-2 mt-0.5">
                              <span>{d.current_leads_count || d.total_leads || 0} leads</span>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{d.contacted_count || 0} contacted</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Lead Counter & Quick Navigation */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {/* Progress Meter */}
            <div className="hidden md:flex flex-col items-end">
              <div className="text-xs font-medium text-[var(--foreground-muted)]">
                Lead <span className="font-bold text-[var(--foreground)]">{filteredLeads.length > 0 ? currentIndex + 1 : 0}</span> of <span className="font-bold">{filteredLeads.length}</span>
              </div>
              <div className="w-28 h-1.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden mt-1 border border-[var(--border)]">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${filteredLeads.length > 0 ? ((currentIndex + 1) / filteredLeads.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Prev / Next Buttons */}
            <div className="flex items-center gap-1 bg-[var(--surface-subtle)] p-0.5 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={handlePrevLead}
                disabled={currentIndex <= 0}
                className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--foreground-secondary)] cursor-pointer transition-colors"
                title="Previous Lead (Left Arrow or 'k')"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextLead}
                disabled={currentIndex >= filteredLeads.length - 1}
                className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--foreground-secondary)] cursor-pointer transition-colors"
                title="Next Lead (Right Arrow or 'j')"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Full Drawer Table */}
            <button
              type="button"
              onClick={() => setShowDrawer(v => !v)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Browse</span> Sheet ({leads.length})
            </button>
          </div>
        </div>

        {/* Status Filter Tabs Strip */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]/50 text-xs">
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { id: 'ALL', label: 'All Leads', count: totalCount },
              { id: 'PENDING', label: 'Pending Review', count: pendingCount },
              { id: 'CONTACTED', label: 'Contacted', count: contactedCount },
              { id: 'SKIPPED', label: 'Skipped', count: skippedCount },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentIndex(0);
                }}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[var(--foreground-muted)] hidden lg:block">
            Use <kbd className="px-1 py-0.5 bg-[var(--surface-subtle)] rounded border border-[var(--border)] text-[10px]">←</kbd> and <kbd className="px-1 py-0.5 bg-[var(--surface-subtle)] rounded border border-[var(--border)] text-[10px]">→</kbd> to cycle one-by-one
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN STUDIO VIEW: TWIN CARDS (COMPANY INTEL + OUTREACH PITCH) */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[600px] rounded-2xl" />
            <Skeleton className="h-[600px] rounded-2xl" />
          </div>
        ) : !currentLead ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[var(--foreground)]">No Leads in this Filter</h3>
            <p className="text-sm text-[var(--foreground-muted)] mt-1 max-w-md mx-auto">
              All leads in this view have been reviewed or matched filter criteria.
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
            >
              Reset to All Leads
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* ======================================================== */}
            {/* LEFT CARD: GET TO KNOW ABOUT WHAT THAT COMPANY IS */}
            {/* ======================================================== */}
            <motion.div
              key={`intel-${currentLead.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col gap-5"
            >
              {/* Header: Company Name, Status Badge, Website */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
                      {currentLead.company_name}
                    </h2>
                    {currentLead.company_website && (
                      <a
                        href={currentLead.company_website.startsWith('http') ? currentLead.company_website : `https://${currentLead.company_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--foreground-muted)] hover:text-blue-500 transition-colors p-1"
                        title="Open Company Website"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--foreground-muted)]">
                    {currentLead.company_industry && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                        {currentLead.company_industry}
                      </span>
                    )}
                    {(currentLead.company_city || currentLead.company_country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {[currentLead.company_city, currentLead.company_country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <div className="shrink-0">
                  {currentLead.status === 'CONTACTED' ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Contacted
                    </span>
                  ) : currentLead.status === 'SKIPPED' ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      Skipped
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/30">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Decision Maker Card */}
              <div className="bg-[var(--surface-subtle)] rounded-xl p-4 border border-[var(--border)]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" /> Key Decision Maker
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-[var(--foreground)]">
                      {currentLead.recipient_name || 'Business Leader'}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)] font-medium">
                      {currentLead.recipient_title || 'Digital Transformation / Operations Lead'}
                    </div>
                  </div>

                  {/* LinkedIn link */}
                  {currentLead.recipient_linkedin && (
                    <a
                      href={currentLead.recipient_linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20 text-xs font-semibold border border-[#0077B5]/30 transition-colors"
                    >
                      <LinkedInIcon className="w-3.5 h-3.5" />
                      Profile
                    </a>
                  )}
                </div>

                {/* Verified Email Banner with 1-click copy */}
                <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-mono font-medium text-[var(--foreground)] truncate">
                      {currentLead.recipient_email || 'No email available'}
                    </span>
                  </div>
                  {currentLead.recipient_email && (
                    <button
                      type="button"
                      onClick={() => handleCopy(currentLead.recipient_email, 'email')}
                      className="px-2 py-1 text-[11px] font-semibold rounded bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--foreground-secondary)] border border-[var(--border)] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              {/* What That Company Does: AI One-Liner */}
              {currentLead.ai_one_liner && (
                <div>
                  <div className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    What This Company Does
                  </div>
                  <div className="text-sm font-medium text-[var(--foreground)] bg-blue-500/5 dark:bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 leading-relaxed">
                    "{currentLead.ai_one_liner}"
                  </div>
                </div>
              )}

              {/* Company Value Proposition */}
              {currentLead.value_proposition && (
                <div>
                  <div className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    Their Value Proposition to Clients
                  </div>
                  <div className="text-xs text-[var(--foreground-secondary)] bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border)] leading-relaxed">
                    {currentLead.value_proposition}
                  </div>
                </div>
              )}

              {/* Service & Capability Tags */}
              {currentLead.service_tags && (
                <div>
                  <div className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
                    Services & Domain Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {currentLead.service_tags.split(',').map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-[var(--surface-subtle)] text-[var(--foreground-secondary)] border border-[var(--border)]"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Why ClickfieldAI Can Partner / Value Angle */}
              <div className="mt-auto pt-3 border-t border-[var(--border)]">
                <div className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  ClickfieldAI Pitch Alignment
                </div>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  Reached out from <strong className="text-[var(--foreground)]">{currentPersona.name}</strong> ({currentPersona.role}) focusing on <span className="text-blue-500 font-medium">{currentPersona.angle}</span> tailored directly to {currentLead.company_name}'s transformational roadmaps.
                </p>
              </div>
            </motion.div>

            {/* ======================================================== */}
            {/* RIGHT CARD: WHAT CAN BE MAILED TO (BESPOKE PITCH) */}
            {/* ======================================================== */}
            <motion.div
              key={`draft-${currentLead.id}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col gap-4"
            >
              {/* Card Header & Local Ollama Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    Bespoke Email Pitch
                  </h3>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    Targeted to <span className="font-semibold text-[var(--foreground)]">{currentLead.recipient_first_name || currentLead.recipient_name}</span> at {currentLead.company_name}
                  </div>
                </div>

                {/* Tone Selector & Ollama Button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRegenerateWithOllama(selectedTone)}
                    disabled={isRegenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                    title="Regenerate bespoke pitch with Ollama local LLM"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    {isRegenerating ? 'Generating...' : 'Ollama Pitch'}
                  </button>
                </div>
              </div>

              {/* Tone Buttons */}
              <div className="flex items-center gap-1.5 bg-[var(--surface-subtle)] p-1 rounded-lg border border-[var(--border)] text-xs">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] px-2">Tone:</span>
                {[
                  { id: 'concise', label: 'Concise (Direct)' },
                  { id: 'technical', label: 'Engineering Brief' },
                  { id: 'roi', label: 'ROI & Speed' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTone(t.id);
                      handleRegenerateWithOllama(t.id);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                      selectedTone === t.id
                        ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs font-semibold'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Subject Line Input */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] focus:outline-hidden focus:border-blue-500 text-[var(--foreground)] transition-colors"
                  placeholder="Subject line..."
                />
              </div>

              {/* Email Body Textarea */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                  <span>Email Body</span>
                  <span className="font-normal normal-case text-[11px]">
                    {wordCount} words • ~{readSeconds}s read
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="w-full flex-1 p-3.5 text-sm font-sans rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] focus:outline-hidden focus:border-blue-500 text-[var(--foreground)] resize-none leading-relaxed transition-colors"
                  placeholder="Email body..."
                />
              </div>

              {/* Bottom Actions: Outlook Web Compose, Copy, Status & Advance */}
              <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                
                {/* Secondary tools: Save & Copy */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--foreground)] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${draftSubject}\n\n${draftBody}`, 'pitch')}
                    className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--foreground)] transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Copy subject and body"
                  >
                    {copiedField === 'pitch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'pitch' ? 'Copied' : 'Copy Pitch'}
                  </button>
                </div>

                {/* Primary Action Buttons: Outlook Web & Mark Contacted */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatusAndAdvance('SKIPPED')}
                    className="px-3 py-2 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-xl transition-colors cursor-pointer"
                  >
                    Skip
                  </button>

                  {/* Open in Outlook Web */}
                  <button
                    type="button"
                    onClick={handleOpenOutlook}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Open Outlook Web
                  </button>

                  {/* Mark Contacted & Next */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatusAndAdvance('CONTACTED')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Sent & Next
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* QUICK JUMP DRAWER: BROWSE ALL COMPANIES IN DATASET */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    {currentDataset.name}
                  </h3>
                  <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                    {leads.length} companies loaded • Click any row to jump
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="p-2 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Search in Drawer */}
              <div className="p-4 border-b border-[var(--border)]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by company, person, email, or country..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] focus:outline-hidden focus:border-blue-500 text-[var(--foreground)]"
                  />
                </div>
              </div>

              {/* Leads List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                {filteredLeads.map((l, idx) => {
                  const isSelected = l.id === currentLead?.id;
                  return (
                    <div
                      key={l.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowDrawer(false);
                      }}
                      className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-500/10 border-l-4 border-blue-500' 
                          : 'hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--foreground)] truncate">
                            {l.company_name}
                          </span>
                          {l.status === 'CONTACTED' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                              Sent
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--foreground-muted)] truncate mt-0.5">
                          {l.recipient_name} • {l.recipient_title || 'Lead'}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--foreground-muted)] truncate">
                          {l.recipient_email}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
