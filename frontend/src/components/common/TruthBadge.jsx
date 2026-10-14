import React, { useState } from 'react';
import { Check, AlertTriangle, ExternalLink } from 'lucide-react';

/**
 * TruthBadge Component
 * Strict compliance with design spec:
 * - Verified (green, check icon): found on company page or official registry. Shows source URL & date popover.
 * - Estimated (amber, half-circle icon): derived, not stated. Never use word 'Verified'.
 * - Unknown (grey, dashed outline): no data.
 * - Needs check (red, alert icon): invalid phone, certificate error, or failed checks.
 */
export default function TruthBadge({
  type = 'unknown',
  label,
  sourceUrl,
  sourceDate,
  details,
  size = 'md',
  className = ''
}) {
  const [showPopover, setShowPopover] = useState(false);

  // Normalize type
  const normalizedType = String(type).toLowerCase().replace(/[\s-]/g, '_');

  let config = {
    key: 'unknown',
    defaultLabel: 'Unknown',
    badgeClass: 'border-dashed border-[var(--border)] text-[var(--muted)] bg-transparent',
    icon: (
      <svg className="w-3 h-3 text-[var(--muted)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8" cy="8" r="6" strokeDasharray="3 3" />
      </svg>
    )
  };

  if (normalizedType === 'verified') {
    config = {
      key: 'verified',
      defaultLabel: 'Verified',
      badgeClass: 'border border-[var(--success)]/40 text-[var(--success)] bg-[var(--success)]/10',
      icon: <Check className="w-3 h-3 stroke-[2.5]" />
    };
  } else if (normalizedType === 'estimated') {
    config = {
      key: 'estimated',
      defaultLabel: 'Estimated',
      badgeClass: 'border border-[var(--warn)]/40 text-[var(--warn)] bg-[var(--warn)]/10',
      icon: (
        <svg className="w-3 h-3 fill-[var(--warn)]" viewBox="0 0 16 16">
          <path d="M8 2a6 6 0 0 0 0 12V2z" />
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    };
  } else if (normalizedType === 'needs_check' || normalizedType === 'needscheck' || normalizedType === 'flagged') {
    config = {
      key: 'needs_check',
      defaultLabel: 'Needs check',
      badgeClass: 'border border-[var(--danger)]/40 text-[var(--danger)] bg-[var(--danger)]/10',
      icon: <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
    };
  }

  const displayLabel = label || config.defaultLabel;
  const hasPopoverData = Boolean(sourceUrl || sourceDate || details);

  const sizeClasses = size === 'sm'
    ? 'text-[11px] px-1.5 py-0.5 gap-1'
    : 'text-[12px] px-2 py-0.5 gap-1.5';

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => hasPopoverData && setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <button
        type="button"
        onClick={() => hasPopoverData && setShowPopover((prev) => !prev)}
        className={`inline-flex items-center font-medium rounded-[999px] transition-colors select-none ${config.badgeClass} ${sizeClasses} ${className} ${
          hasPopoverData ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
        }`}
      >
        {config.icon}
        <span className="tabular-nums whitespace-nowrap">{displayLabel}</span>
      </button>

      {/* Popover on hover/click */}
      {showPopover && hasPopoverData && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-[12px] shadow-lg animate-in fade-in zoom-in-95 duration-120"
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[var(--border)]">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[var(--muted)]">
              Provenance
            </span>
            {sourceDate && (
              <span className="text-[11px] text-[var(--muted)] tabular-nums">{sourceDate}</span>
            )}
          </div>

          {details && <div className="text-[12px] mb-1.5 text-[var(--text)]">{details}</div>}

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline text-[11px] truncate max-w-full"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{sourceUrl}</span>
            </a>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--surface-2)]" />
        </div>
      )}
    </div>
  );
}
