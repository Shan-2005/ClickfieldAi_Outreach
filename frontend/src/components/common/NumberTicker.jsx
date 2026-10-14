import React, { useEffect, useState, useRef } from 'react';

/**
 * Animated number ticker that counts up over 600ms on first load only.
 */
export default function NumberTicker({ value = 0, duration = 600, className = '' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimatedRef = useRef(false);

  const numValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;

  useEffect(() => {
    if (hasAnimatedRef.current) {
      setDisplayValue(numValue);
      return;
    }

    hasAnimatedRef.current = true;
    const startTime = performance.now();
    const startValue = 0;

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (numValue - startValue) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(numValue);
      }
    };

    requestAnimationFrame(step);
  }, [numValue, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {displayValue}
    </span>
  );
}
