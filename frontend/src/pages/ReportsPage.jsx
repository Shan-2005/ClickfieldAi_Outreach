import React, { useState, useEffect, useMemo } from 'react';
import {
  Download, Printer, TrendingUp, Users, Mail,
  MessageSquare, Video, Calendar, Sparkles, Search,
  Building2, Clock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ReportsPage() {
  const { success, error } = useToast();
  const [data, setData] = useState({
    totals: {
      total_leads: 0,
      total_sent: 0,
      total_replies: 0,
      total_interested: 0,
      total_meetings: 0,
      total_bounces: 0,
      week_range: 'Current Week'
    },
    by_owner: []
  });
  const [loading, setLoading] = useState(true);

  // Sent Emails Audit State
  const [dispatches, setDispatches] = useState([]);
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState('ALL');
  const [selectedMailModal, setSelectedMailModal] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const [resRep, resDisp] = await Promise.all([
          fetch('/api/reports/weekly'),
          fetch('/api/reports/sent-dispatches')
        ]);
        if (resRep.ok) {
          setData(await resRep.json());
        }
        if (resDisp.ok) {
          const dispData = await resDisp.json();
          setDispatches(dispData.dispatches || []);
        }
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      const matchStatus = dispatchStatusFilter === 'ALL' || d.status?.toUpperCase() === dispatchStatusFilter;
      const q = dispatchSearch.toLowerCase().trim();
      const matchQ = !q || (
        d.company_name?.toLowerCase().includes(q) ||
        d.sender_person?.toLowerCase().includes(q) ||
        d.recipient_name?.toLowerCase().includes(q) ||
        d.recipient_email?.toLowerCase().includes(q) ||
        d.subject?.toLowerCase().includes(q)
      );
      return matchStatus && matchQ;
    });
  }, [dispatches, dispatchSearch, dispatchStatusFilter]);

  const handleDownloadCSV = () => {
    window.location.href = '/api/reports/download-csv';
    success('Weekly report CSV download started.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 pb-12 print:p-0 print:m-0 print:space-y-4">
      {/* Top Action & Date Bar (Hidden in print or custom styled) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] print:border-none print:p-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight print:text-black">
              Weekly Executive Outreach Summary
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 print:hidden">
              {data.totals.week_range}
            </span>
          </div>
          <p className="text-[12px] text-[var(--muted)] mt-1 print:text-gray-600">
            Account-level throughput and pipeline conversion metrics by owner.
          </p>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="h-[36px] px-3.5 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border)] text-[var(--text)] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="h-[36px] px-3.5 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-[12px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 print:grid-cols-5 print:gap-2">
        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] print:border print:border-gray-300 print:bg-white flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider print:text-gray-600">Total Leads In Scope</span>
          <div className="text-[24px] font-bold text-[var(--text)] font-mono tabular-nums mt-1 print:text-black">
            {data.totals.total_leads}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 print:text-gray-500">Verified Chennai B2B</span>
        </div>

        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] print:border print:border-gray-300 print:bg-white flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider print:text-gray-600">Emails Sent</span>
          <div className="text-[24px] font-bold text-[var(--primary)] font-mono tabular-nums mt-1 print:text-blue-700">
            {data.totals.total_sent}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 print:text-gray-500">Mon-Sat window</span>
        </div>

        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] print:border print:border-gray-300 print:bg-white flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider print:text-gray-600">Inbound Replies</span>
          <div className="text-[24px] font-bold text-[var(--warn)] font-mono tabular-nums mt-1 print:text-amber-700">
            {data.totals.total_replies}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 print:text-gray-500">IMAP Tracked</span>
        </div>

        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] print:border print:border-gray-300 print:bg-white flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider print:text-gray-600">High-Intent Responses</span>
          <div className="text-[24px] font-bold text-[var(--success)] font-mono tabular-nums mt-1 print:text-emerald-700">
            {data.totals.total_interested}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 print:text-gray-500">"Interested" / "Yes"</span>
        </div>

        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] print:border print:border-gray-300 print:bg-white flex flex-col">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider print:text-gray-600">Meetings Booked</span>
          <div className="text-[24px] font-bold text-[var(--info)] font-mono tabular-nums mt-1 print:text-purple-700">
            {data.totals.total_meetings}
          </div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 print:text-gray-500">Calendar scheduled</span>
        </div>
      </div>

      {/* Owner Breakdown Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] overflow-hidden print:border print:border-gray-300 print:bg-white">
        <div className="p-4 border-b border-[var(--border)] print:border-gray-300 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[var(--text)] print:text-black">
            Team Performance Breakdown
          </h3>
          <span className="text-[11px] text-[var(--muted)] font-mono print:text-gray-500">
            Audited from Action Logs
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--surface-2)] text-[var(--muted)] text-[11px] uppercase tracking-wider border-b border-[var(--border)] print:bg-gray-100 print:text-gray-700">
              <tr>
                <th className="py-3 px-4 font-semibold">Account / Owner</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold text-right">Leads Assigned</th>
                <th className="py-3 px-4 font-semibold text-right">Outreach Sent</th>
                <th className="py-3 px-4 font-semibold text-right">Replies</th>
                <th className="py-3 px-4 font-semibold text-right">Interested</th>
                <th className="py-3 px-4 font-semibold text-right">Meetings</th>
                <th className="py-3 px-4 font-semibold text-right">Bounces</th>
                <th className="py-3 px-4 font-semibold text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)] print:divide-gray-200 print:text-black">
              {data.by_owner.map((row, idx) => {
                const convRate = row.sent > 0 ? ((row.interested + row.meetings) / row.sent * 100).toFixed(1) : '0.0';

                return (
                  <tr key={idx} className="hover:bg-[var(--surface-2)]/50 transition-colors print:hover:bg-transparent">
                    <td className="py-3.5 px-4 font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold">
                        {row.owner.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{row.owner}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted)] text-[12px] print:text-gray-600">
                      {row.role}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {row.leads}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--primary)] font-semibold print:text-blue-700">
                      {row.sent}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--warn)] print:text-amber-700">
                      {row.replies}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--success)] font-semibold print:text-emerald-700">
                      {row.interested}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--info)] font-semibold print:text-purple-700">
                      {row.meetings}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--danger)] print:text-red-700">
                      {row.bounces}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold">
                      {convRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Itemized Sent Mails & Dispatch Verification Audit Log */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden shadow-xs print:border print:border-gray-300 print:bg-white">
        <div className="p-5 border-b border-[var(--border)] print:border-gray-300 flex flex-wrap items-center justify-between gap-4 bg-[var(--surface-2)]/30">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--text)] print:text-black">
                Outreach Dispatches &amp; Sent Mail Audit Log
              </h3>
            </div>
            <p className="text-[12px] text-[var(--muted)] mt-1 print:text-gray-600">
              Complete verifiable ledger: who sent each email, target company, recipient, email text, and exact timestamps.
            </p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)]" />
              <input
                type="text"
                value={dispatchSearch}
                onChange={(e) => setDispatchSearch(e.target.value)}
                placeholder="Search sender, company, mail..."
                className="w-full h-[32px] pl-8 pr-3 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[12px] text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-0.5 text-[11px]">
              {['ALL', 'SENT', 'READY'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDispatchStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                    dispatchStatusFilter === st
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Export CSV */}
            <a
              href="/api/reports/download-sent-csv"
              className="h-[32px] px-3 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border)] text-[var(--text)] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-[12px] min-w-[950px]">
            <thead className="bg-[var(--surface-2)]/70 text-[var(--muted)] text-[11px] uppercase tracking-wider border-b border-[var(--border)] print:bg-gray-100 print:text-gray-700">
              <tr>
                <th className="py-3 px-4 font-semibold w-[160px]">Sender (Person)</th>
                <th className="py-3 px-4 font-semibold w-[200px]">Target Company</th>
                <th className="py-3 px-4 font-semibold w-[220px]">Recipient &amp; Mail</th>
                <th className="py-3 px-4 font-semibold">Email Subject &amp; Pitch</th>
                <th className="py-3 px-4 font-semibold w-[160px]">Date &amp; Timing</th>
                <th className="py-3 px-4 font-semibold text-center w-[90px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)] print:divide-gray-200 print:text-black">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--muted)] text-[12px]">
                    No dispatches matching the current search query or filter.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedMailModal(item)}
                    className="hover:bg-[var(--surface-2)]/40 transition-colors cursor-pointer group"
                  >
                    {/* Sender Person */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold shrink-0">
                          {item.sender_person?.slice(0, 2).toUpperCase() || 'SP'}
                        </div>
                        <span className="truncate">{item.sender_person || 'Zoya Patel'}</span>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4 font-medium text-[var(--text)]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                        <span className="truncate">{item.company_name}</span>
                      </div>
                    </td>

                    {/* Recipient & Mail */}
                    <td className="py-3.5 px-4">
                      <div className="truncate">
                        <div className="text-[12px] font-medium text-[var(--text)] truncate">
                          {item.recipient_name || 'Business Leader'}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--muted)] truncate">
                          {item.recipient_email || 'No email recorded'}
                        </div>
                      </div>
                    </td>

                    {/* Subject & Preview */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="truncate text-[12px] font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                        {item.subject}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] truncate mt-0.5 font-mono">
                        {item.body ? item.body.split('\n')[0] : 'Click to inspect pitch content'}
                      </div>
                    </td>

                    {/* Timing & Dates */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text)] font-mono">
                        <Calendar className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                        <span>{item.formatted_date || 'Today'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-[var(--muted)] shrink-0" />
                        <span>{item.formatted_time || '18:30 IST'}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[999px] text-[10px] font-mono font-bold uppercase tracking-wider ${
                          item.status === 'SENT' || item.status === 'CONTACTED'
                            ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30'
                            : 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Body Inspector Modal */}
      {selectedMailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-[640px] bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-[var(--text)]">
                    Verified Outreach Mail Content
                  </h4>
                  <p className="text-[11px] text-[var(--muted)]">
                    Sent by <span className="font-semibold text-[var(--text)]">{selectedMailModal.sender_person}</span> to <span className="font-semibold text-[var(--text)]">{selectedMailModal.company_name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMailModal(null)}
                className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-[8px] bg-[var(--surface-2)]/40 border border-[var(--border)] text-[12px]">
                <div>
                  <span className="text-[var(--muted)] text-[11px]">Recipient:</span>
                  <div className="font-medium text-[var(--text)]">{selectedMailModal.recipient_name} ({selectedMailModal.recipient_email})</div>
                </div>
                <div>
                  <span className="text-[var(--muted)] text-[11px]">Timing &amp; Date:</span>
                  <div className="font-mono text-[var(--text)]">{selectedMailModal.formatted_date} at {selectedMailModal.formatted_time}</div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">
                  Subject Line:
                </label>
                <div className="p-3 rounded-[8px] bg-[var(--surface-2)]/30 border border-[var(--border)] text-[13px] font-semibold text-[var(--text)]">
                  {selectedMailModal.subject}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">
                  Full Email Body:
                </label>
                <div className="p-4 rounded-[8px] bg-[var(--surface-2)]/20 border border-[var(--border)] text-[13px] text-[var(--text)] font-sans leading-relaxed whitespace-pre-line select-text">
                  {selectedMailModal.body}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-[var(--border)] flex items-center justify-end bg-[var(--surface-2)]/30">
              <button
                type="button"
                onClick={() => setSelectedMailModal(null)}
                className="px-4 py-2 rounded-[8px] bg-[var(--primary)] text-white text-[12px] font-medium hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
