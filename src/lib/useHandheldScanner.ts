'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ScanEventDetail {
  code: string;
  durationMs: number;
  averageInterKeyMs: number;
  source: 'HARDWARE_WEDGE' | 'FAST_INPUT';
  timestamp: number;
}

export interface UseHandheldScannerOptions {
  onScan: (detail: ScanEventDetail) => void;
  enabled?: boolean;
  maxInterKeyDelayMs?: number; // Maximum ms between characters to qualify as a hardware scanner (default: 60ms)
  minBarcodeLength?: number;  // Minimum characters for a barcode (default: 3)
}

export function useHandheldScanner({
  onScan,
  enabled = true,
  maxInterKeyDelayMs = 60,
  minBarcodeLength = 3,
}: UseHandheldScannerOptions) {
  const [lastScan, setLastScan] = useState<ScanEventDetail | null>(null);
  const [totalScans, setTotalScans] = useState<number>(0);

  const bufferRef = useRef<string>('');
  const keyTimestampsRef = useRef<number[]>([]);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    keyTimestampsRef.current = [];
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier shortcuts (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      // Check if target is a search or barcode input where Enter is expected
      const isBarcodeInput =
        activeEl &&
        activeEl.tagName === 'INPUT' &&
        (activeEl.getAttribute('placeholder')?.toLowerCase().includes('barcode') ||
          activeEl.getAttribute('name')?.toLowerCase().includes('barcode') ||
          activeEl.id?.toLowerCase().includes('barcode') ||
          activeEl.getAttribute('data-barcode-input') === 'true');

      const now = performance.now();

      // Scanner terminal character detection: ENTER
      if (e.key === 'Enter') {
        const buffer = bufferRef.current.trim();
        const timestamps = keyTimestampsRef.current;

        if (buffer.length >= minBarcodeLength && timestamps.length >= 2) {
          const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
          const averageInterKey = totalDuration / (timestamps.length - 1);

          // If average time between keys is under maxInterKeyDelayMs, or total time is very fast
          const isHardwareScan = averageInterKey <= maxInterKeyDelayMs || totalDuration < 350;

          if (isHardwareScan || (!isInput && buffer.length >= 4) || buffer.includes('|')) {
            e.preventDefault();
            e.stopPropagation();

            // If an input received the rapid text or barcode payload, clean it up so raw text doesn't linger
            if (isInput && activeEl && 'value' in activeEl) {
              const inputEl = activeEl as HTMLInputElement;
              if (inputEl.value.endsWith(buffer)) {
                inputEl.value = inputEl.value.slice(0, -buffer.length);
              } else if (inputEl.value === buffer) {
                inputEl.value = '';
              }
              try {
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              } catch {}
            }

            const detail: ScanEventDetail = {
              code: buffer,
              durationMs: Math.round(totalDuration),
              averageInterKeyMs: Math.round(averageInterKey * 10) / 10,
              source: isHardwareScan ? 'HARDWARE_WEDGE' : 'FAST_INPUT',
              timestamp: Date.now(),
            };

            setLastScan(detail);
            setTotalScans((prev) => prev + 1);
            resetBuffer();

            onScanRef.current(detail);
            return;
          }
        }

        // Reset buffer on non-scanner Enter
        resetBuffer();
        return;
      }

      // Printable single characters (excluding Escape, Tab, Arrows, Shift, etc.)
      if (e.key.length === 1) {
        // Enforce max timeout between keystrokes to prevent human typing accumulation
        if (keyTimestampsRef.current.length > 0) {
          const lastTimestamp = keyTimestampsRef.current[keyTimestampsRef.current.length - 1];
          const delta = now - lastTimestamp;
          if (delta > maxInterKeyDelayMs * 3) {
            // Human delay detected: discard old accumulated characters
            bufferRef.current = '';
            keyTimestampsRef.current = [];
          }
        }

        bufferRef.current += e.key;
        keyTimestampsRef.current.push(now);

        // Auto-clear buffer if no new character arrives within 400ms
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          resetBuffer();
        }, 400);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [enabled, maxInterKeyDelayMs, minBarcodeLength, resetBuffer]);

  return {
    lastScan,
    totalScans,
    resetBuffer,
    isScannerReady: enabled,
  };
}
