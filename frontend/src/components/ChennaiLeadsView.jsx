import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Factory, HardHat, Phone, Mail, Globe, MapPin, 
  ExternalLink, Download, Search, Star, Filter, CheckCircle2, Copy, Check,
  Sparkles, Zap, ShieldCheck, ArrowRight, RefreshCw, ChevronRight, Shield, Users, UserCheck
} from 'lucide-react';
import ChennaiLeadDrawer from './ChennaiLeadDrawer';
import { getOutlookWebComposeUrl } from '../utils/outlook';

export default function ChennaiLeadsView({ onNavigateToOutreach }) {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // Filters
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false);
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const [intelOnly, setIntelOnly] = useState(false);
  const [under50Only, setUnder50Only] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (under50Only) params.append('under_50_only', 'true');
      else params.append('under_50_only', 'false');
      if (sectorFilter !== 'ALL') params.append('sector', sectorFilter);
      if (areaFilter !== 'ALL') params.append('area', areaFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (hasPhoneOnly) params.append('has_phone', 'true');
      if (hasEmailOnly) params.append('has_email', 'true');
      if (intelOnly) params.append('intel_only', 'true');
      params.append('limit', '300');

      const res = await fetch(`/api/chennai-leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.items || []);
      setStats(data.stats || {});
      setAreas(data.areas || []);
    } catch (err) {
      console.error('Failed to load Chennai leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [sectorFilter, areaFilter, searchTerm, hasPhoneOnly, hasEmailOnly, intelOnly, under50Only]);

  const handleCopyPhone = (phone, id, e) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(id);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const getSectorBadge = (sector) => {
    switch (sector) {
      case 'Manufacturing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Factory className="w-3 h-3" />
            Manufacturing
          </span>
        );
      case 'Construction':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <HardHat className="w-3 h-3" />
            Construction
          </span>
        );
      case 'Real Estate':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Building2 className="w-3 h-3" />
            Real Estate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300">
            {sector}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards — Glassmorphic Polish */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-3.5 shadow-sm backdrop-blur transition-all hover:border-emerald-500/50">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            Under 50 Staff
          </div>
          <div className="text-2xl font-black text-white mt-1">{stats.under_50_count || leads.length}</div>
          <div className="text-[10px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Verified MSMEs
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-purple-500/30 rounded-2xl p-3.5 shadow-sm backdrop-blur transition-all hover:border-purple-500/50">
          <div className="text-xs font-medium text-purple-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            MCA Directors
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1">{stats.with_owner || 91}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">Legal Filings & Web</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-sm backdrop-blur transition-all hover:border-blue-500/40">
          <div className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <Factory className="w-3.5 h-3.5 text-blue-400" />
            Manufacturing
          </div>
          <div className="text-2xl font-black text-blue-400 mt-1">{stats.manufacturing || 0}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">Guindy, Ambattur</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-sm backdrop-blur transition-all hover:border-amber-500/40">
          <div className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <HardHat className="w-3.5 h-3.5 text-amber-400" />
            Construction
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.construction || 0}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">Civil, Turnkey</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-sm backdrop-blur transition-all hover:border-emerald-500/40">
          <div className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Real Estate
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.real_estate || 0}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">OMR, Velachery</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-sm backdrop-blur transition-all hover:border-indigo-500/40">
          <div className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-indigo-400" />
            Direct Phone
          </div>
          <div className="text-2xl font-black text-indigo-400 mt-1">{stats.with_phone || 0}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {stats.total ? `${Math.round((stats.with_phone / stats.total) * 100)}% verified lines` : 'Verified lines'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-950/40 to-zinc-900/80 border border-indigo-500/30 rounded-2xl p-3.5 shadow-sm backdrop-blur transition-all hover:border-indigo-500/60">
          <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            15-Agent Swarms
          </div>
          <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1.5">
            <span>{stats.with_intel || 0}</span>
            <span className="text-[10px] font-mono font-normal text-emerald-400">({stats.approved_intel || 0} appvd)</span>
          </div>
          <div className="text-[10px] text-indigo-300 mt-0.5">AI Dossiers</div>
        </div>
      </div>

      {/* Control Bar & Filter Actions */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm backdrop-blur flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Under 50 Employees Mode Toggle */}
          <button
            onClick={() => setUnder50Only(!under50Only)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              under50Only
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60'
            }`}
            title="Toggle strictly under 50 employees"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            {under50Only ? '< 50 Employees (SMB/MSME)' : 'All Sizes (Include Enterprises)'}
          </button>

          {/* Sector Buttons */}
          {['ALL', 'Manufacturing', 'Construction', 'Real Estate'].map((sec) => (
            <button
              key={sec}
              onClick={() => setSectorFilter(sec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sectorFilter === sec
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/50'
              }`}
            >
              {sec}
            </button>
          ))}

          {/* Area Selector */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3.5 py-1.5 bg-zinc-800 border border-zinc-700/60 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="ALL">All Chennai Hubs ({areas.length})</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Toggles */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={hasPhoneOnly}
              onChange={(e) => setHasPhoneOnly(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0"
            />
            Has Phone
          </label>

          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={hasEmailOnly}
              onChange={(e) => setHasEmailOnly(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0"
            />
            Has Email
          </label>

          <label className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold cursor-pointer ml-1 select-none bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
            <input
              type="checkbox"
              checked={intelOnly}
              onChange={(e) => setIntelOnly(e.target.checked)}
              className="rounded bg-zinc-800 border-indigo-500 text-indigo-500 focus:ring-0"
            />
            15-Agent Ready Only
          </label>
        </div>

        {/* Search & Export Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search company, hub, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {onNavigateToOutreach && (
            <button
              onClick={onNavigateToOutreach}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Today's 15 Outreach</span>
            </button>
          )}

          <a
            href={`/api/chennai-leads/export-csv?under_50=${under50Only}`}
            download={under50Only ? "chennai_b2b_leads_under_50.csv" : "chennai_b2b_leads.csv"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {under50Only ? "Export <50 CSV" : "Export All CSV"}
          </a>
        </div>
      </div>

      {/* Main Leads Table with Deep-Dive Interaction */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Sector & Company</th>
                <th className="py-3.5 px-4">Headcount (&lt;50)</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Location / Hub</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4 text-center">15-Agent Intel</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-zinc-500">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading verified Chennai B2B leads...</div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-zinc-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Sector & Company Name & Owner */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div>{getSectorBadge(lead.sector)}</div>
                        <span className="font-bold text-zinc-100 text-sm group-hover:text-indigo-400 transition-colors">
                          {lead.name}
                        </span>
                        <span className="text-[11px] text-zinc-400">{lead.category}</span>
                        {lead.owner_name && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                lead.owner_name !== 'Not Disclosed Online'
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                              }`}
                              title={lead.owner_provenance}
                            >
                              <UserCheck className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[190px]">
                                {lead.owner_name !== 'Not Disclosed Online' ? lead.owner_name : 'Owner: Unlisted MSME'}
                              </span>
                            </span>
                            {lead.owner_designation && lead.owner_name !== 'Not Disclosed Online' && (
                              <span className="text-[10px] text-zinc-400 truncate max-w-[140px]" title={lead.owner_designation}>
                                • {lead.owner_designation}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Headcount (<50) Badge & Provenance */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {lead.employee_range ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 w-fit">
                            <Users className="w-3 h-3 text-emerald-400" />
                            {lead.employee_range}
                          </span>
                          <span className="text-[10px] text-zinc-400 truncate max-w-[150px]" title={lead.employee_provenance}>
                            {lead.employee_provenance}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">&lt; 50 (MSME)</span>
                      )}
                    </td>

                    {/* Phone Pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {lead.phone ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                            className="font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {lead.phone}
                          </a>
                          <button
                            onClick={(e) => handleCopyPhone(lead.phone, lead.id, e)}
                            title="Copy phone"
                            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                          >
                            {copiedPhone === lead.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">Not listed</span>
                      )}
                    </td>

                    {/* Email Pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {lead.email ? (
                        <a
                          href={getOutlookWebComposeUrl(lead.email)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Draft email in Outlook Web (outlook.cloud.microsoft in Chrome)"
                          className="text-purple-300 hover:text-purple-200 flex items-center gap-1 font-medium px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20"
                        >
                          <Mail className="w-3.5 h-3.5 text-purple-400" />
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Location & Area Hub */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-zinc-200">
                            {lead.area} {lead.pincode ? `(${lead.pincode})` : ''}
                          </div>
                          <div className="text-[11px] text-zinc-400 line-clamp-1">
                            {lead.address}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rating & Reviews */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {lead.rating ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {lead.rating}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            ({lead.reviews_count || '0'})
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">No reviews</span>
                      )}
                    </td>

                    {/* 15-Agent Intel Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {lead.intel_status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          Approved
                        </span>
                      ) : lead.has_intel ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          <Sparkles className="w-3 h-3" />
                          15 Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-500 bg-zinc-800/40">
                          Unscanned
                        </span>
                      )}
                    </td>

                    {/* Action Deep-Dive Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            title="Visit Website"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {lead.google_maps_url && (
                          <a
                            href={lead.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                            title="Open Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                        >
                          <Zap className="w-3 h-3" />
                          Deep Intel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Out Company Deep-Dive Workspace Drawer */}
      {selectedLeadId && (
        <ChennaiLeadDrawer
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdated={fetchLeads}
        />
      )}
    </div>
  );
}
