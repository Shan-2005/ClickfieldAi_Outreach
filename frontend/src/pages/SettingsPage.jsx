import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, CheckCircle2, ShieldAlert, Clock, Flame,
  Cpu, Video, Key, Plus, Trash2, ExternalLink, Check
} from 'lucide-react';
import TruthBadge from '../components/common/TruthBadge';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Sender Profile', icon: User, desc: 'Identity and legal physical address for CAN-SPAM / DPDP' },
  { id: 'proof_points', label: 'Proof Points', icon: CheckCircle2, desc: 'Strict factual claims and verified evidence URLs' },
  { id: 'banned_phrases', label: 'Banned Phrases', icon: ShieldAlert, desc: 'Restricted high-friction expressions barred from drafts' },
  { id: 'sequence_timing', label: 'Sequence Timing', icon: Clock, desc: 'Cadence intervals for Day 0, 4, 9, 16 dispatches' },
  { id: 'daily_cap', label: 'Daily Cap & Warm-up', icon: Flame, desc: 'Delivery caps and domain warm-up ramp schedule' },
  { id: 'capabilities', label: 'Capabilities List', icon: Cpu, desc: 'Approved engineering offerings referenced by outreach' },
  { id: 'demo_video', label: 'Demo Video URL', icon: Video, desc: 'Interactive walkthrough recording attached to sequences' },
  { id: 'api_keys', label: 'API Keys', icon: Key, desc: 'Gemini, Google Maps, and enrichment service credentials' },
];

const DEFAULT_SETTINGS = {
  profile: {
    senderFirstName: 'Zoya',
    senderFullName: 'Zoya Patel',
    senderRole: 'Technical Solutions & Engineering Lead',
    companyName: 'ClickfieldAI',
    registeredAddress: 'Clickfield Technologies Pvt. Ltd., Level 4, Prestige Tech Park, Marathahalli-Sarjapur Ring Rd, Bengaluru, KA 560103, India',
    replyToEmail: 'zoya@clickfield.ai',
    complianceEmail: 'compliance@clickfield.ai',
    websiteUrl: 'https://clickfield.ai'
  },
  proofPoints: [
    {
      id: 'pp-1',
      claim: 'Processed 12M events/day with 99.98% telemetry uptime across manufacturing plants',
      evidenceUrl: 'https://clickfield.ai/case-studies/industrial-telemetry-9998',
      sectors: 'Manufacturing, Automotive',
      active: true,
      truthStatus: 'verified'
    },
    {
      id: 'pp-2',
      claim: 'Reduced civil subcontractor bill reconciliation cycle from 14 days to 4 hours',
      evidenceUrl: 'https://clickfield.ai/case-studies/civil-mep-reconciliation',
      sectors: 'Construction, Infrastructure',
      active: true,
      truthStatus: 'verified'
    },
    {
      id: 'pp-3',
      claim: '3.4x faster lead-to-site-visit triage speed via WhatsApp automated routing',
      evidenceUrl: 'https://clickfield.ai/case-studies/real-estate-crm-routing',
      sectors: 'Real estate, Commercial',
      active: true,
      truthStatus: 'verified'
    },
    {
      id: 'pp-4',
      claim: 'Zero data leakage across ISO 27001 audited air-gapped on-premise deployments',
      evidenceUrl: 'https://clickfield.ai/compliance/iso-27001-audit',
      sectors: 'Enterprise, Defense',
      active: false,
      truthStatus: 'verified'
    }
  ],
  bannedPhrases: [
    'consistently hits',
    'costly roadblock',
    'same bottleneck',
    'schema drag',
    'schema drift',
    'data drag',
    'friction point',
    'Should I send over a quick overview, or would you like more details first?'
  ],
  sequenceTiming: {
    day0DelayHours: 0,
    day4DelayDays: 4,
    day9DelayDays: 9,
    day16DelayDays: 16,
    sendWindowStart: '09:00',
    sendWindowEnd: '17:30',
    timezone: 'Asia/Kolkata (IST)',
    skipWeekends: true
  },
  dailyCap: {
    maxDailyDispatches: 15,
    currentWarmupPhase: 'Phase 2 (15/day)',
    warmupWeeklyRamp: 5,
    maxPendingApprovals: 50,
    enforceWarmupCap: true
  },
  capabilities: [
    { code: 'GENAI', title: 'Generative AI & LLMs', text: 'custom LLM extraction pipelines, local embeddings, and bounded validation loops' },
    { code: 'AUTOMATION_RPA', title: 'Agentic Automation', text: 'agentic document processing, headless automation, and verified workflow orchestrators' },
    { code: 'DATA_ENGINEERING', title: 'Data Pipelines', text: 'real-time telemetry streaming, high-throughput event queues, and deterministic ETL pipelines' },
    { code: 'ERP_INTEGRATION', title: 'ERP & Legacy Connectors', text: 'idempotent API gateways and bidirectional synchronization between legacy ERP backends and modern web platforms' },
    { code: 'EMBEDDED_IOT', title: 'IoT & Telemetry', text: 'edge telemetry ingestion, automated anomaly detection, and municipal-grade LoRaWAN/MQTT middleware' },
    { code: 'WEB_MOBILE', title: 'Web & Mobile Platforms', text: 'high-performance reactive web platforms, resilient offline-first mobile apps, and distributed microservices' }
  ],
  demoVideo: {
    url: 'https://clickfield.ai/demo-overview',
    title: 'Clickfield AI Chennai Industrial Automation Overview (3 min)',
    includeInDay9: true,
    includeInDay16: true
  },
  apiKeys: {
    geminiApiKey: '••••••••••••••••••••••••••••••••••••••••',
    googleMapsApiKey: '••••••••••••••••••••••••••••••••••••••••',
    anthropicApiKey: ''
  }
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('clickfield_radar_settings');
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      // fallback to default
    }
    return DEFAULT_SETTINGS;
  });

  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [newBannedPhrase, setNewBannedPhrase] = useState('');
  const [newProofPoint, setNewProofPoint] = useState({ claim: '', evidenceUrl: '', sectors: '' });
  const [showAddProofModal, setShowAddProofModal] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Autosave trigger whenever settings change
  const triggerAutosave = (updated) => {
    setSettings(updated);
    setSaveStatus('saving');
    try {
      localStorage.setItem('clickfield_radar_settings', JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 400);
  };

  const updateProfile = (field, value) => {
    const updated = {
      ...settings,
      profile: { ...settings.profile, [field]: value }
    };
    triggerAutosave(updated);
  };

  const updateTiming = (field, value) => {
    const updated = {
      ...settings,
      sequenceTiming: { ...settings.sequenceTiming, [field]: value }
    };
    triggerAutosave(updated);
  };

  const updateDailyCap = (field, value) => {
    const updated = {
      ...settings,
      dailyCap: { ...settings.dailyCap, [field]: value }
    };
    triggerAutosave(updated);
  };

  const updateDemoVideo = (field, value) => {
    const updated = {
      ...settings,
      demoVideo: { ...settings.demoVideo, [field]: value }
    };
    triggerAutosave(updated);
  };

  const updateApiKeys = (field, value) => {
    const updated = {
      ...settings,
      apiKeys: { ...settings.apiKeys, [field]: value }
    };
    triggerAutosave(updated);
  };

  const toggleProofPoint = (id) => {
    const updatedPoints = settings.proofPoints.map((pp) =>
      pp.id === id ? { ...pp, active: !pp.active } : pp
    );
    triggerAutosave({ ...settings, proofPoints: updatedPoints });
  };

  const removeProofPoint = (id) => {
    const updatedPoints = settings.proofPoints.filter((pp) => pp.id !== id);
    triggerAutosave({ ...settings, proofPoints: updatedPoints });
  };

  const handleAddProofPoint = (e) => {
    e.preventDefault();
    if (!newProofPoint.claim.trim() || !newProofPoint.evidenceUrl.trim()) return;
    const newEntry = {
      id: `pp-${Date.now()}`,
      claim: newProofPoint.claim.trim(),
      evidenceUrl: newProofPoint.evidenceUrl.trim(),
      sectors: newProofPoint.sectors.trim() || 'General',
      active: true,
      truthStatus: 'verified'
    };
    triggerAutosave({
      ...settings,
      proofPoints: [...settings.proofPoints, newEntry]
    });
    setNewProofPoint({ claim: '', evidenceUrl: '', sectors: '' });
    setShowAddProofModal(false);
  };

  const handleAddBannedPhrase = (e) => {
    e.preventDefault();
    const phrase = newBannedPhrase.trim().toLowerCase();
    if (!phrase || settings.bannedPhrases.includes(phrase)) return;
    triggerAutosave({
      ...settings,
      bannedPhrases: [...settings.bannedPhrases, phrase]
    });
    setNewBannedPhrase('');
  };

  const handleRemoveBannedPhrase = (phrase) => {
    triggerAutosave({
      ...settings,
      bannedPhrases: settings.bannedPhrases.filter((p) => p !== phrase)
    });
  };

  const updateCapability = (index, field, value) => {
    const updatedCaps = [...settings.capabilities];
    updatedCaps[index] = { ...updatedCaps[index], [field]: value };
    triggerAutosave({ ...settings, capabilities: updatedCaps });
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Autosave Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text)] tracking-tight">
            Settings & Governance
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Configure sender identity, strictly verified proof points, sequence cadences, and compliance rules.
          </p>
        </div>

        {/* Autosave Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[999px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] tabular-nums">
            {saveStatus === 'saving' && (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-3.5 h-3.5 border-2 border-[var(--primary)] border-t-transparent rounded-full"
                />
                <span className="text-[var(--muted)]">Saving changes...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[var(--success)] font-medium"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Saved</span>
              </motion.div>
            )}
            {saveStatus === 'idle' && (
              <span className="text-[var(--muted)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                Autosave active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Tabs 260px, Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Tabs */}
        <div className="lg:col-span-4 xl:col-span-3 bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-2 space-y-1">
          {SETTINGS_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`relative w-full text-left px-3.5 py-3 rounded-[8px] flex items-start gap-3 transition-colors cursor-pointer select-none group ${
                  isActive
                    ? 'bg-[var(--surface-2)] text-[var(--text)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSettingsIndicator"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--primary)]"
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] group-hover:text-[var(--text)]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium leading-tight truncate">
                    {sec.label}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] leading-normal mt-0.5 line-clamp-1">
                    {sec.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Section Content Panel */}
        <div className="lg:col-span-8 xl:col-span-9 bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-6">
          <AnimatePresence mode="wait">
            {/* 1. SENDER PROFILE */}
            {activeSection === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">Sender Profile</h2>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    Identity, role, and physical postal address required for statutory compliance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Sender First Name
                    </label>
                    <input
                      type="text"
                      value={settings.profile.senderFirstName}
                      onChange={(e) => updateProfile('senderFirstName', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Sender Full Name
                    </label>
                    <input
                      type="text"
                      value={settings.profile.senderFullName}
                      onChange={(e) => updateProfile('senderFullName', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Sender Role / Designation
                    </label>
                    <input
                      type="text"
                      value={settings.profile.senderRole}
                      onChange={(e) => updateProfile('senderRole', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Company Legal Name
                    </label>
                    <input
                      type="text"
                      value={settings.profile.companyName}
                      onChange={(e) => updateProfile('companyName', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Reply-to Email
                    </label>
                    <input
                      type="email"
                      value={settings.profile.replyToEmail}
                      onChange={(e) => updateProfile('replyToEmail', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Official Website URL
                    </label>
                    <input
                      type="url"
                      value={settings.profile.websiteUrl}
                      onChange={(e) => updateProfile('websiteUrl', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Registered Postal Address (Mandatory CAN-SPAM Footer)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.profile.registeredAddress}
                      onChange={(e) => updateProfile('registeredAddress', e.target.value)}
                      className="w-full p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. PROOF POINTS */}
            {activeSection === 'proof_points' && (
              <motion.div
                key="proof_points"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-[16px] font-semibold text-[var(--text)]">
                      Proof Points
                    </h2>
                    <p className="text-[13px] text-[var(--muted)] mt-0.5">
                      The single source of truth for claims. The drafter agent is strictly barred from citing unverified numbers or case studies outside this table.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddProofModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--primary)] text-white text-[13px] font-medium hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Proof Point</span>
                  </button>
                </div>

                {/* Proof Points Table */}
                <div className="border border-[var(--border)] rounded-[8px] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[12px] font-semibold text-[var(--muted)]">
                        <th className="py-2.5 px-4 w-[45%]">Claim</th>
                        <th className="py-2.5 px-3 w-[25%]">Evidence URL</th>
                        <th className="py-2.5 px-3 w-[15%]">Sectors</th>
                        <th className="py-2.5 px-3 text-center w-[8%]">Active</th>
                        <th className="py-2.5 px-3 text-right w-[7%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[13px]">
                      {settings.proofPoints.map((pp) => (
                        <tr key={pp.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-[var(--text)]">{pp.claim}</div>
                            <div className="mt-1">
                              <TruthBadge
                                status={pp.truthStatus}
                                sourceUrl={pp.evidenceUrl}
                                sourceDate="2026-03"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <a
                              href={pp.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline text-[12px] truncate max-w-[180px] font-mono"
                            >
                              <span className="truncate">{pp.evidenceUrl.replace('https://', '')}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </td>
                          <td className="py-3 px-3 text-[12px] text-[var(--muted)]">
                            {pp.sectors}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleProofPoint(pp.id)}
                              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer inline-flex items-center ${
                                pp.active ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  pp.active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeProofPoint(pp.id)}
                              className="p-1 rounded-[6px] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                              title="Delete proof point"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Modal for adding proof point */}
                {showAddProofModal && (
                  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.98, opacity: 0 }}
                      className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-6 max-w-lg w-full space-y-4"
                    >
                      <h3 className="text-[16px] font-semibold text-[var(--text)]">Add Verified Proof Point</h3>
                      <form onSubmit={handleAddProofPoint} className="space-y-4">
                        <div>
                          <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                            Exact Factual Claim
                          </label>
                          <textarea
                            rows={3}
                            required
                            placeholder="e.g. Achieved 99.4% OCR accuracy across 180,000 scanned Tamil Nadu civil invoices"
                            value={newProofPoint.claim}
                            onChange={(e) => setNewProofPoint({ ...newProofPoint, claim: e.target.value })}
                            className="w-full p-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                            Evidence Source URL
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://clickfield.ai/case-studies/..."
                            value={newProofPoint.evidenceUrl}
                            onChange={(e) => setNewProofPoint({ ...newProofPoint, evidenceUrl: e.target.value })}
                            className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                            Applicable Sectors (comma-separated)
                          </label>
                          <input
                            type="text"
                            placeholder="Manufacturing, Construction"
                            value={newProofPoint.sectors}
                            onChange={(e) => setNewProofPoint({ ...newProofPoint, sectors: e.target.value })}
                            className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddProofModal(false)}
                            className="px-3 py-1.5 rounded-[8px] text-[13px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-[8px] bg-[var(--primary)] text-white text-[13px] font-medium hover:brightness-110 cursor-pointer"
                          >
                            Save Proof Point
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. BANNED PHRASES */}
            {activeSection === 'banned_phrases' && (
              <motion.div
                key="banned_phrases"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">Banned Phrases List</h2>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    Phrases that cause outreach to feel canned, patronizing, or spammy. Any draft containing these strings will fail compliance checks.
                  </p>
                </div>

                <form onSubmit={handleAddBannedPhrase} className="flex gap-2">
                  <input
                    type="text"
                    value={newBannedPhrase}
                    onChange={(e) => setNewBannedPhrase(e.target.value)}
                    placeholder="Add restricted word or phrase (e.g. 'quick synergy')..."
                    className="flex-1 h-[38px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[8px] bg-[var(--primary)] text-white text-[13px] font-medium hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Phrase</span>
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {settings.bannedPhrases.map((phrase) => (
                    <div
                      key={phrase}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[999px] bg-[var(--surface-2)] border border-[var(--danger)]/30 text-[var(--danger)] text-[12px] font-medium"
                    >
                      <span>"{phrase}"</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBannedPhrase(phrase)}
                        className="hover:text-[var(--text)] p-0.5 cursor-pointer"
                        title="Remove phrase"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. SEQUENCE TIMING */}
            {activeSection === 'sequence_timing' && (
              <motion.div
                key="sequence_timing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">Sequence Timing</h2>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    Multi-touch sequence delay intervals and respectful dispatch hours.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Touch 1 (Initial)</div>
                    <div className="text-[16px] font-semibold text-[var(--text)] mt-1">Day 0</div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">Immediate upon approval</div>
                  </div>

                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Touch 2 (Value Bump)</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[16px] font-semibold text-[var(--text)]">Day</span>
                      <input
                        type="number"
                        min="1"
                        max="7"
                        value={settings.sequenceTiming.day4DelayDays}
                        onChange={(e) => updateTiming('day4DelayDays', parseInt(e.target.value) || 4)}
                        className="w-16 h-7 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[13px] text-[var(--text)] tabular-nums"
                      />
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">Technical angle bump</div>
                  </div>

                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Touch 3 (Proof Asset)</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[16px] font-semibold text-[var(--text)]">Day</span>
                      <input
                        type="number"
                        min="5"
                        max="14"
                        value={settings.sequenceTiming.day9DelayDays}
                        onChange={(e) => updateTiming('day9DelayDays', parseInt(e.target.value) || 9)}
                        className="w-16 h-7 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[13px] text-[var(--text)] tabular-nums"
                      />
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">Walkthrough video attachment</div>
                  </div>

                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Touch 4 (Clean Break)</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[16px] font-semibold text-[var(--text)]">Day</span>
                      <input
                        type="number"
                        min="12"
                        max="30"
                        value={settings.sequenceTiming.day16DelayDays}
                        onChange={(e) => updateTiming('day16DelayDays', parseInt(e.target.value) || 16)}
                        className="w-16 h-7 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[13px] text-[var(--text)] tabular-nums"
                      />
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">Permission to close loop</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Send Window Start (IST)
                    </label>
                    <input
                      type="time"
                      value={settings.sequenceTiming.sendWindowStart}
                      onChange={(e) => updateTiming('sendWindowStart', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Send Window End (IST)
                    </label>
                    <input
                      type="time"
                      value={settings.sequenceTiming.sendWindowEnd}
                      onChange={(e) => updateTiming('sendWindowEnd', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] font-mono"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. DAILY CAP & WARM-UP */}
            {activeSection === 'daily_cap' && (
              <motion.div
                key="daily_cap"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">Daily Cap & Warm-up Schedule</h2>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    Maintain strict domain deliverability and IP health by capping maximum outbound volume.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Active Warm-up Phase</div>
                    <div className="text-[16px] font-semibold text-[var(--primary)] mt-1">
                      {settings.dailyCap.currentWarmupPhase}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">Safe ramp for clickfield.ai</div>
                  </div>

                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Max Dispatches Today</div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={settings.dailyCap.maxDailyDispatches}
                        onChange={(e) => updateDailyCap('maxDailyDispatches', parseInt(e.target.value) || 15)}
                        className="w-20 h-7 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[14px] font-semibold text-[var(--text)] tabular-nums"
                      />
                      <span className="text-[12px] text-[var(--muted)]">emails / day</span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">Currently 6 approved & queued</div>
                  </div>

                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Weekly Increment Ramp</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[14px] font-semibold text-[var(--text)]">+</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={settings.dailyCap.warmupWeeklyRamp}
                        onChange={(e) => updateDailyCap('warmupWeeklyRamp', parseInt(e.target.value) || 5)}
                        className="w-16 h-7 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[14px] font-semibold text-[var(--text)] tabular-nums"
                      />
                      <span className="text-[12px] text-[var(--muted)]">leads / wk</span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">If bounce rate &lt; 1%</div>
                  </div>
                </div>

                <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-[var(--text)]">Hard Stop on Daily Cap</div>
                    <div className="text-[12px] text-[var(--muted)] mt-0.5">
                      Automatically disable the Approve button when 15 dispatches are reached today.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateDailyCap('enforceWarmupCap', !settings.dailyCap.enforceWarmupCap)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer inline-flex items-center ${
                      settings.dailyCap.enforceWarmupCap ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.dailyCap.enforceWarmupCap ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 6. CAPABILITIES LIST */}
            {activeSection === 'capabilities' && (
              <motion.div
                key="capabilities"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">Approved Capabilities</h2>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    The outreach model must ground Paragraph 3 exclusively in these capabilities.
                  </p>
                </div>

                <div className="space-y-3">
                  {settings.capabilities.map((cap, idx) => (
                    <div
                      key={cap.code}
                      className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] text-[var(--primary)]">
                          {cap.code}
                        </span>
                        <input
                          type="text"
                          value={cap.title}
                          onChange={(e) => updateCapability(idx, 'title', e.target.value)}
                          className="text-[13px] font-semibold text-[var(--text)] bg-transparent border-b border-transparent focus:border-[var(--primary)] focus:outline-none px-1"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={cap.text}
                        onChange={(e) => updateCapability(idx, 'text', e.target.value)}
                        className="w-full p-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[13px] text-[var(--muted)] focus:text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 7. DEMO VIDEO URL */}
            {activeSection === 'demo_video' && (
              <motion.div
                key="demo_video"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">Demo Video URL</h2>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    A personalized or general 2-3 minute platform walkthrough link cited in Touch 3 follow-ups.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Video Landing Page / Hosted URL
                    </label>
                    <input
                      type="url"
                      value={settings.demoVideo.url}
                      onChange={(e) => updateDemoVideo('url', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Video Callout Title
                    </label>
                    <input
                      type="text"
                      value={settings.demoVideo.title}
                      onChange={(e) => updateDemoVideo('title', e.target.value)}
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--text)]">Include in Day 9 Follow-up</div>
                      <div className="text-[12px] text-[var(--muted)] mt-0.5">
                        Automatically embeds the video link if the prospect opened Day 0.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateDemoVideo('includeInDay9', !settings.demoVideo.includeInDay9)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer inline-flex items-center ${
                        settings.demoVideo.includeInDay9 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          settings.demoVideo.includeInDay9 ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 8. API KEYS */}
            {activeSection === 'api_keys' && (
              <motion.div
                key="api_keys"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">API Credentials</h2>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    Credentials for discovery, address verification, and offline model execution.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-medium text-[var(--muted)]">
                        Google Gemini API Key
                      </label>
                      <TruthBadge status="verified" sourceUrl="https://ai.google.dev" sourceDate="2026-10" />
                    </div>
                    <input
                      type="password"
                      value={settings.apiKeys.geminiApiKey}
                      onChange={(e) => updateApiKeys('geminiApiKey', e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-medium text-[var(--muted)]">
                        Google Maps Platform API Key (Chennai Radar)
                      </label>
                      <TruthBadge status="verified" sourceUrl="https://console.cloud.google.com" sourceDate="2026-10" />
                    </div>
                    <input
                      type="password"
                      value={settings.apiKeys.googleMapsApiKey}
                      onChange={(e) => updateApiKeys('googleMapsApiKey', e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                      Anthropic API Key (Optional Fallback)
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.anthropicApiKey}
                      onChange={(e) => updateApiKeys('anthropicApiKey', e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full h-[36px] px-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--text)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
