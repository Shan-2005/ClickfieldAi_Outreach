import React, { useState, useEffect } from 'react';
import {
  Download, Printer, TrendingUp, Users, Mail,
  MessageSquare, Video, Calendar, Sparkles
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

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/reports/weekly');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to load weekly report', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

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
    </div>
  );
}
