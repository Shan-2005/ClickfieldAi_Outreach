import React, { useState } from 'react';
import {
  X, Sparkles, MapPin, Building2, Phone, Mail, Globe,
  CheckCircle2, AlertCircle, Database, ExternalLink,
  ShieldCheck, Star, Search, Layers, ArrowRight
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function OllamaDatasetScraperModal({ isOpen, onClose, onScrapeComplete }) {
  const { success, error: toastError, info } = useToast();

  // Intake State
  const [location, setLocation] = useState('Dubai, UAE');
  const [sector, setSector] = useState('Manufacturing');
  const [customSector, setCustomSector] = useState('');
  const [targetCount, setTargetCount] = useState(5);
  const [focusQuery, setFocusQuery] = useState('');

  // Execution State
  const [isScraping, setIsScraping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const popularLocations = [
    'Dubai, UAE',
    'London, UK',
    'Ambattur, Chennai',
    'Singapore',
    'Bengaluru, India',
    'Frankfurt, Germany',
    'San Francisco, USA'
  ];

  const handleStartCollection = async (e) => {
    e.preventDefault();
    if (!location.trim()) {
      setError('Please provide a location (city, region, or country).');
      return;
    }

    setIsScraping(true);
    setError(null);
    setScrapedData(null);

    const effectiveSector = sector === 'Custom' ? customSector.trim() || 'B2B' : sector;
    info(`Searching Google Maps & live web sources for ${effectiveSector} in ${location}...`);

    try {
      const res = await fetch('/api/agentic/scrape-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          sector: effectiveSector,
          query: focusQuery.trim() || undefined,
          max_results: parseInt(targetCount, 10) || 5
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Lead collection failed.');
      }

      const data = await res.json();
      if (!data.leads || data.leads.length === 0) {
        throw new Error(`No live operational companies found in ${location} for ${effectiveSector}. Try broadening the query.`);
      }

      setScrapedData(data);
      setDatasetName(`${effectiveSector} in ${location.split(',')[0].trim()} - ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`);
      success(`Collected ${data.found_count} authentic companies from Google Maps!`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Collection failed');
      toastError(err.message || 'Collection failed');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSaveDataset = async () => {
    if (!datasetName.trim()) {
      setError('Please provide a name for this dataset.');
      return;
    }
    if (!scrapedData || !scrapedData.leads || scrapedData.leads.length === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/agentic/save-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_name: datasetName.trim(),
          location: location.trim(),
          leads: scrapedData.leads
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save dataset.');
      }

      const savedResult = await res.json();
      success(`Dataset "${datasetName}" saved with ${savedResult.total_saved} leads!`);
      onScrapeComplete?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save dataset');
      toastError(err.message || 'Failed to save dataset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-[920px] max-h-[92vh] bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4.5 border-b border-[var(--border)] bg-[var(--surface-2)]/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-[8px] bg-[var(--primary)]/15 text-[var(--primary)]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-[16px] font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
                ClickfieldAI Authentic Lead Finder
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30">
                  Zero Fabrication
                </span>
              </h3>
              <p className="text-[12px] text-[var(--muted)]">
                Live Google Maps & Web extraction for any location worldwide. Ground-truth only.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[13px]">
          {/* STEP 1: Intake Configuration */}
          {!scrapedData && (
            <form onSubmit={handleStartCollection} className="p-4.5 rounded-[12px] bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[var(--primary)]" />
                  Step 1: Intake Location & Parameters
                </span>
                <span className="text-[11px] text-[var(--muted)]">Any place in the world is valid</span>
              </div>

              {/* Location Input & Chips */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  Location (City, Region, or Country)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[var(--muted)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isScraping}
                    placeholder="e.g. Dubai, London, Ambattur Chennai, Berlin, San Francisco"
                    className="w-full pl-9 pr-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Presets:</span>
                  {popularLocations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className={`text-[11px] px-2 py-0.5 rounded-[6px] border transition-colors cursor-pointer ${
                        location === loc
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                          : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)]'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry & Number of Companies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                    Target Industry
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    disabled={isScraping}
                    className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none cursor-pointer"
                  >
                    <option value="Manufacturing">Manufacturing & Engineering</option>
                    <option value="Pharmacy">Pharmacy & Healthcare Supplies</option>
                    <option value="Real Estate">Real Estate & Commercial Property</option>
                    <option value="Construction">Construction, Contracting & Building</option>
                    <option value="Custom">Custom / Other Sector...</option>
                  </select>

                  {sector === 'Custom' && (
                    <input
                      type="text"
                      value={customSector}
                      onChange={(e) => setCustomSector(e.target.value)}
                      placeholder="Enter custom industry (e.g. Logistics, Aerospace)"
                      className="w-full mt-2 px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                    Number of Companies to Find
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={targetCount}
                    onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    disabled={isScraping}
                    className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none font-mono"
                  />
                  <span className="text-[10px] text-[var(--muted)]">Strictly collected without fake padding</span>
                </div>
              </div>

              {/* Optional Keywords */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  Optional Sub-category / Focus Keywords
                </label>
                <input
                  type="text"
                  value={focusQuery}
                  onChange={(e) => setFocusQuery(e.target.value)}
                  disabled={isScraping}
                  placeholder="e.g. industrial equipment, precision machining, commercial development"
                  className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Submit Trigger */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                  <span>Enforcing strict tool verification (Google Maps + Live Web Crawl)</span>
                </div>

                <button
                  type="submit"
                  disabled={isScraping}
                  className="px-5 py-2 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-semibold text-[13px] flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Search className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                  <span>{isScraping ? 'Searching Live Google Maps...' : 'Find Real Companies'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Scraping Progress Indicator */}
          {isScraping && (
            <div className="p-8 rounded-[12px] bg-[var(--surface-2)]/80 border border-[var(--border)] flex flex-col items-center justify-center space-y-3">
              <div className="w-9 h-9 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <div className="font-semibold text-[14px] text-[var(--text)]">
                  Extracting live businesses in <span className="text-[var(--primary)]">{location}</span>...
                </div>
                <div className="text-[12px] text-[var(--muted)]">
                  Connecting to Google Maps & live web indices. Verifying real telephone numbers, addresses, and official websites.
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-[8px] bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-[12px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 3 & 4: Preview Leads & Name Dataset */}
          {scrapedData && !isScraping && (
            <div className="space-y-4">
              {/* Report Summary Card */}
              <div className="p-4 rounded-[12px] bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--success)] font-bold text-[14px]">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Real Companies Extracted ({scrapedData.found_count} of {scrapedData.requested_count} requested)</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                    100% Unfaked Ground Truth
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-[12px]">
                  <div className="p-2.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-center">
                    <span className="text-[11px] text-[var(--muted)] uppercase block font-semibold">Websites Found</span>
                    <span className="text-[16px] font-bold text-[var(--primary)] font-mono">
                      {scrapedData.stats?.has_website || 0} / {scrapedData.found_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-center">
                    <span className="text-[11px] text-[var(--muted)] uppercase block font-semibold">Phones Verified</span>
                    <span className="text-[16px] font-bold text-[var(--success)] font-mono">
                      {scrapedData.stats?.has_phone || 0} / {scrapedData.found_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-center">
                    <span className="text-[11px] text-[var(--muted)] uppercase block font-semibold">Emails Found</span>
                    <span className="text-[16px] font-bold text-[var(--text)] font-mono">
                      {scrapedData.stats?.has_email || 0} / {scrapedData.found_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP 4: Name the Dataset */}
              <div className="p-4 rounded-[12px] bg-[var(--primary)]/5 border border-[var(--primary)]/30 space-y-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[var(--primary)]" />
                    Step 4: What would you like to name this dataset?
                  </label>
                  <p className="text-[11px] text-[var(--muted)]">
                    Enter a descriptive name to save these {scrapedData.found_count} verified leads to your database.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="e.g. Dubai Manufacturing Leaders"
                    className="flex-1 px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none focus:border-[var(--primary)] font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDataset}
                    disabled={isSaving || !datasetName.trim()}
                    className="px-5 py-2 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-semibold text-[13px] flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                  >
                    <Database className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Dataset to Radar'}</span>
                  </button>
                </div>
              </div>

              {/* List of Collected Companies */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] uppercase px-1">
                  <span>Collected Company Records</span>
                  <span>Source: Google Maps & Web Index</span>
                </div>

                {scrapedData.leads.map((lead, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] space-y-2 hover:border-[var(--primary)]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2">
                          {lead.name}
                          {lead.rating && (
                            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-[4px]">
                              <Star className="w-3 h-3 fill-amber-500" />
                              {lead.rating} {lead.reviews_count ? `(${lead.reviews_count})` : ''}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] flex-wrap pt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[var(--primary)]" />
                            {lead.address || lead.area || location}
                          </span>
                          <span>·</span>
                          <span className="text-[var(--text)]">{lead.category || sector}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {lead.google_maps_url && (
                          <a
                            href={lead.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] px-2 py-1 rounded-[6px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--primary)] font-medium flex items-center gap-1 border border-[var(--border)]"
                          >
                            <span>Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Verbatim Contacts */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                        <span className={lead.phone ? 'text-[var(--text)] font-mono font-medium' : 'text-[var(--muted)] italic'}>
                          {lead.phone || 'Phone not listed'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                        <span className={lead.email ? 'text-[var(--primary)] font-mono font-medium' : 'text-[var(--muted)] italic'}>
                          {lead.email || 'Email not listed'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <Globe className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--primary)] hover:underline truncate"
                          >
                            {lead.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-[var(--muted)] italic">Website not listed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
            <span>Guaranteed 100% zero synthetic data. Missing fields kept null.</span>
          </div>

          <div className="flex items-center gap-2">
            {scrapedData && (
              <button
                type="button"
                onClick={() => {
                  setScrapedData(null);
                  setError(null);
                }}
                className="px-3.5 py-1.5 rounded-[8px] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] text-[12px] font-medium transition-colors cursor-pointer"
              >
                Search Another Location
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-[8px] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] text-[12px] font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
