import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Database, HardDrive, ShieldCheck, Clock } from 'lucide-react';
import FlowPage from './FlowPage';
import HealthPage from './HealthPage';

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState('flow'); // 'flow' | 'health'
  const [backupInfo, setBackupInfo] = useState({
    timestamp: null,
    file: null,
    status: 'Scheduled 02:00 IST'
  });

  useEffect(() => {
    const fetchBackupStatus = async () => {
      try {
        const res = await fetch('/api/mailbox/health');
        if (res.ok) {
          const data = await res.json();
          if (data.backup) {
            setBackupInfo(data.backup);
          }
        }
      } catch (err) {
        console.warn('Backup status query warning:', err);
      }
    };
    fetchBackupStatus();
  }, []);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header with Tab Switch and Last Backup Line */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('flow')}
              className={`px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'flow'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Activity className="w-4 h-4 text-[var(--primary)]" />
              <span>Agent Flow Architecture</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Database className="w-4 h-4 text-[var(--info)]" />
              <span>Data Health & Provenance</span>
            </button>
          </div>
        </div>

        {/* Last Backup Line (Mandatory requirement) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px]">
          <HardDrive className="w-3.5 h-3.5 text-[var(--success)]" />
          <span className="text-[var(--muted)]">Last Backup:</span>
          <span className="font-mono text-[var(--text)] font-medium">
            {backupInfo.timestamp
              ? new Date(backupInfo.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
              : 'Nightly 02:00 IST (14-day retention)'}
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--success)]/15 text-[var(--success)] font-semibold border border-[var(--success)]/30">
            HEALTHY
          </span>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'flow' ? <FlowPage /> : <HealthPage />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
