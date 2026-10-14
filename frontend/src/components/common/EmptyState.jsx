import React from 'react';
import { motion } from 'motion/react';
import { Inbox } from 'lucide-react';

/**
 * Empty state: strictly one line of text + one action.
 */
export default function EmptyState({
  text = 'No items found matching the current criteria.',
  actionLabel = 'Reset filters',
  onAction,
  icon: Icon = Inbox,
  className = ''
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`flex flex-col items-center justify-center p-8 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] text-center ${className}`}
    >
      <div className="w-10 h-10 rounded-[8px] bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] mb-3 border border-[var(--border)]">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[13px] text-[var(--muted)] mb-4 select-none">{text}</p>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] text-[12px] font-medium border border-[var(--border)] transition-transform active:scale-[0.98] cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
