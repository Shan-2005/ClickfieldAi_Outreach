import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Error state: strictly message + Retry.
 */
export default function ErrorState({
  message = 'An unexpected error occurred while loading data.',
  onRetry,
  className = ''
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`flex flex-col items-center justify-center p-8 rounded-[12px] bg-[var(--surface)] border border-[var(--danger)]/30 text-center ${className}`}
    >
      <div className="w-10 h-10 rounded-[8px] bg-[var(--danger)]/10 flex items-center justify-center text-[var(--danger)] mb-3 border border-[var(--danger)]/20">
        <AlertCircle className="w-5 h-5" />
      </div>
      <p className="text-[13px] text-[var(--text)] mb-4 select-none max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25 text-[var(--danger)] text-[12px] font-medium border border-[var(--danger)]/30 transition-transform active:scale-[0.98] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </motion.div>
  );
}
