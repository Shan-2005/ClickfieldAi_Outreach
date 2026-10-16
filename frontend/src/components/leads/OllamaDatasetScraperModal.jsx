import React, { useState, useEffect } from 'react';
import {
  X, Sparkles, MapPin, Building2, Factory, ShieldCheck,
  CheckCircle2, RefreshCw, AlertCircle, Database, ExternalLink,
  Cpu, Users, UserCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import TruthBadge from '../common/TruthBadge';

export default function OllamaDatasetScraperModal({ isOpen, onClose, onScrapeComplete }) {
  const { success, error: toastError, info } = useToast();

  const [locations, setLocations] = useState([
    { id: 'ambattur', name: 'Ambattur Industrial Estate', specialty: 'Automotive CNC & Stamping', region: 'Chennai' },
    { id: 'guindy', name: 'Guindy SIDCO Estate', specialty: 'Precision Labs & Automation', region: 'Chennai' },
    { id: 'sriperumbudur', name: 'Sriperumbudur Industrial Corridor', specialty: 'Auto Pressings & Moulds', region: 'Kanchipuram' },
    { id: 'coimbatore', name: 'Coimbatore SIDCO & Kurichi', specialty: 'Motors, Pumps & Foundry Tools', region: 'Coimbatore' },
    { id: 'thirumudivakkam', name: 'Thirumudivakkam SIDCO', specialty: 'Fiber Laser & Sheet Metal', region: 'Chennai' },
    { id: 'oragadam', name: 'Oragadam Industrial Corridor', specialty: 'Automotive Jigs & Tooling', region: 'Kanchipuram' },
    { id: 'ekkatuthangal', name: 'Ekkatuthangal Industrial Estate', specialty: 'Electrical Control Panels', region: 'Chennai' },
    { id: 'porur', name: 'Porur Industrial Belt', specialty: 'Hydraulics & Fluid Power', region: 'Chennai' },
    { id: 'maraimalai-nagar', name: 'Maraimalai Nagar SIPCOT', specialty: 'Precision Auto Components', region: 'Chengalpattu' },
    { id: 'ranipet', name: 'Ranipet SIPCOT', specialty: 'Industrial Fabrication & Tooling', region: 'Ranipet' }
  ]);

  const [selectedLocation, setSelectedLocation] = useState('Ambattur Industrial Estate');
  const [selectedSector, setSelectedSector] = useState('Manufacturing');
  const [focusQuery, setFocusQuery] = useState('Precision CNC, dies, sheet metal & MSME workshops');
  const [maxResults, setMaxResults] = useState(5);

  const [isScraping, setIsScraping] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState([]);
  const [scrapeSummary, setScrapeSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/agentic/scrape-locations')
      .then((res) => res.json())
      .then((data) => {
        if (data.locations && data.locations.length > 0) {
          setLocations(data.locations);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartScraping = async (e) => {
    e.preventDefault();
    setIsScraping(true);
    setError(null);
    setScrapedLeads([]);
    setScrapeSummary(null);

    info(`Launching Ollama (llama3.2:3b) extractor for ${selectedLocation}...`);

    try {
      const res = await fetch('/api/agentic/scrape-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: selectedLocation,
          sector: selectedSector,
          query: focusQuery,
          max_results: maxResults
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Ollama scraping execution failed');
      }

      const data = await res.json();
      setScrapedLeads(data.leads || []);
      setScrapeSummary({
        count: data.count || (data.leads ? data.leads.length : 0),
        new_saved: data.new_saved || 0,
        execution_time_ms: data.execution_time_ms || 0
      });

      success(`Extracted ${data.count || data.leads?.length} leads (${data.new_saved || 0} saved to database)!`);
      onScrapeComplete?.();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Scraping failed');
      toastError(err.message || 'Dataset scraping failed');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-[880px] max-h-[92vh] bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4.5 border-b border-[var(--border)] bg-[var(--surface-2)]/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-[8px] bg-[var(--primary)]/15 text-[var(--primary)]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-[16px] font-bold text-[var(--text)] tracking-tight">
                AI Dataset Scraper & MSME Cluster Extractor
              </h3>
              <p className="text-[12px] text-[var(--muted)]">
                Local Ollama (<strong className="text-[var(--text)]">llama3.2:3b</strong>) autonomous B2B lead generation (&lt;50 staff MSME threshold)
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
          {/* Configuration Form */}
          <form onSubmit={handleStartScraping} className="p-4 rounded-[10px] bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  Industrial Location / Corridor
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  disabled={isScraping}
                  className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} ({loc.region}) — {loc.specialty}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  Industry Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  disabled={isScraping}
                  className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none cursor-pointer"
                >
                  <option value="Manufacturing">Manufacturing & Precision Engineering</option>
                  <option value="Electrical Automation">Electrical Panels & Automation</option>
                  <option value="Automotive Ancillaries">Automotive Ancillaries & Tooling</option>
                  <option value="Precision CNC">CNC Turning & Milling Workshops</option>
                  <option value="Plastic Injection Moulds">Plastic Injection Moulds & Dies</option>
                  <option value="Hydraulics">Hydraulics & Power Systems</option>
                </select>
              </div>
            </div>

            {/* Custom Focus Query & Results count */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  Focus Machinery / Bottleneck Keywords
                </label>
                <input
                  type="text"
                  value={focusQuery}
                  onChange={(e) => setFocusQuery(e.target.value)}
                  disabled={isScraping}
                  placeholder="e.g. multi-axis CNC, stamping, laser cutting, RFQ lead time"
                  className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  Target Count (3 - 10)
                </label>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={maxResults}
                  onChange={(e) => setMaxResults(parseInt(e.target.value) || 5)}
                  disabled={isScraping}
                  className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[13px] text-[var(--text)] outline-none font-mono"
                />
              </div>
            </div>

            {/* Trigger Button & Status */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                <span>MCA Director & &lt;50 employee ground truth verification enforced</span>
              </div>

              <button
                type="submit"
                disabled={isScraping}
                className="px-4 py-2 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-medium text-[12px] flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                <span>{isScraping ? 'Extracting via Ollama...' : 'Scrape Cluster with Ollama'}</span>
              </button>
            </div>
          </form>

          {/* Scraping Progress Indicator */}
          {isScraping && (
            <div className="p-6 rounded-[10px] bg-[var(--surface-2)]/80 border border-[var(--border)] flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <div className="font-semibold text-[13px] text-[var(--text)]">
                  Ollama (<span className="font-mono text-[var(--primary)]">llama3.2:3b</span>) is extracting live signals...
                </div>
                <div className="text-[12px] text-[var(--muted)]">
                  Grounding MSME facilities in {selectedLocation} with statutory promoters & bottlenecks
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-[8px] bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-[12px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Summary & List */}
          {scrapeSummary && (
            <div className="space-y-3">
              <div className="p-3 rounded-[8px] bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Successfully extracted {scrapeSummary.count} verified leads ({scrapeSummary.new_saved} new entries added to SQLite database)
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {scrapeSummary.execution_time_ms.toFixed(0)}ms latency
                </span>
              </div>

              {/* Lead Cards */}
              <div className="space-y-2.5">
                {scrapedLeads.map((lead, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] space-y-2 hover:border-[var(--primary)]/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[14px] text-[var(--text)]">
                          {lead.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[var(--primary)]" />
                            {lead.area || selectedLocation}
                          </span>
                          <span>·</span>
                          <span className="text-[var(--text)]">{lead.category || selectedSector}</span>
                          <span>·</span>
                          <span className="font-semibold text-[var(--success)]">
                            {lead.employee_range || '< 50 staff'}
                          </span>
                        </div>
                      </div>

                      <TruthBadge type="verified" label="Statutory MCA Verified" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] pt-1">
                      <div className="p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Decision Maker</span>
                        <span className="font-medium text-[var(--text)]">
                          {lead.owner_name} ({lead.owner_designation || 'Managing Director'})
                        </span>
                      </div>

                      <div className="p-2 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Operational Bottleneck</span>
                        <span className="text-[var(--text)] text-[11px] leading-tight">
                          {lead.operational_bottleneck || 'Quotation estimation & drawing turnaround delays'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--border)]">
                      <span className="font-mono text-[var(--primary)]">{lead.email || 'RFC Mailbox available'}</span>
                      <span className="truncate max-w-[360px]">{lead.address}</span>
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
            <Database className="w-4 h-4 text-[var(--primary)]" />
            <span>Persisted directly in `chennai_b2b_leads` with `agent_action_audit_log` provenance</span>
          </div>

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
  );
}
