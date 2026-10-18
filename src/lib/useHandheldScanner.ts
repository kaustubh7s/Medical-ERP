'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ScanEventDetail {
  code: string;
  durationMs: number;
  averageInterKeyMs: number;
  source: 'HARDWARE_WEDGE' | 'FAST_INPUT' | 'BLUETOOTH_PHONE';
  timestamp: number;
}

export interface UseHandheldScannerOptions {
  onScan: (detail: ScanEventDetail) => void;
  enabled?: boolean;
  maxInterKeyDelayMs?: number; // Maximum ms between characters (default: 120ms to support phone Bluetooth latency)
  minBarcodeLength?: number;  // Minimum characters for a barcode (default: 3)
}

export function useHandheldScanner({
  onScan,
  enabled = true,
  maxInterKeyDelayMs = 120,
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

  const triggerScan = useCallback(
    (codeToScan: string, source: 'HARDWARE_WEDGE' | 'FAST_INPUT' | 'BLUETOOTH_PHONE', durationMs: number = 0, averageInterKey: number = 0) => {
      const trimmed = codeToScan.trim();
      if (!trimmed || trimmed.length < minBarcodeLength) return;

      // Clean active input so raw text doesn't linger
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && 'value' in activeEl) {
        const inputEl = activeEl as HTMLInputElement;
        if (inputEl.value.endsWith(trimmed)) {
          inputEl.value = inputEl.value.slice(0, -trimmed.length);
        } else if (inputEl.value === trimmed) {
          inputEl.value = '';
        }
        try {
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        } catch {}
      }

      const detail: ScanEventDetail = {
        code: trimmed,
        durationMs: Math.round(durationMs),
        averageInterKeyMs: Math.round(averageInterKey * 10) / 10,
        source,
        timestamp: Date.now(),
      };

      setLastScan(detail);
      setTotalScans((prev) => prev + 1);
      resetBuffer();

      onScanRef.current(detail);
    },
    [minBarcodeLength, resetBuffer]
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 1. Intercept Keyboard events (Wedge, Bluetooth phone app keystrokes)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier shortcuts (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      const now = performance.now();

      // Scanner terminal character detection: ENTER or TAB
      if (e.key === 'Enter' || e.key === 'Tab') {
        const buffer = bufferRef.current.trim();
        const timestamps = keyTimestampsRef.current;

        if (buffer.length >= minBarcodeLength && timestamps.length >= 2) {
          const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
          const averageInterKey = totalDuration / (timestamps.length - 1);

          // Support phone Bluetooth scanners (latency up to 150ms per key) or compound strings
          const isHardwareScan = averageInterKey <= maxInterKeyDelayMs || totalDuration < 500;
          const isCompoundBarcode = buffer.includes('|') || buffer.includes('EXP:') || buffer.includes('MRP:');

          if (isHardwareScan || (!isInput && buffer.length >= 4) || isCompoundBarcode) {
            e.preventDefault();
            e.stopPropagation();

            triggerScan(
              buffer,
              isCompoundBarcode ? 'BLUETOOTH_PHONE' : isHardwareScan ? 'HARDWARE_WEDGE' : 'FAST_INPUT',
              totalDuration,
              averageInterKey
            );
            return;
          }
        }

        resetBuffer();
        return;
      }

      // Printable single characters
      if (e.key.length === 1) {
        // Enforce max timeout between keystrokes to prevent accumulation of unrelated human typing
        if (keyTimestampsRef.current.length > 0) {
          const lastTimestamp = keyTimestampsRef.current[keyTimestampsRef.current.length - 1];
          const delta = now - lastTimestamp;
          // For phone Bluetooth apps, allow up to 450ms gap before breaking buffer
          if (delta > maxInterKeyDelayMs * 3.5 && !bufferRef.current.includes('|')) {
            bufferRef.current = '';
            keyTimestampsRef.current = [];
          }
        }

        bufferRef.current += e.key;
        keyTimestampsRef.current.push(now);

        // Auto-clear or auto-trigger for phone apps without an Enter/Tab suffix
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          const buf = bufferRef.current.trim();
          // If the buffer has complete compound barcode signature (like "UG-7721|EXP:2027-07-31|MRP:204.5")
          if (buf.includes('|') && (buf.includes('EXP') || buf.includes('MRP') || buf.split('|').length >= 3)) {
            triggerScan(buf, 'BLUETOOTH_PHONE', 300, 30);
          } else {
            resetBuffer();
          }
        }, 320);
      }
    };

    // 2. Intercept Paste / Broadcast events from phone companion apps
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text')?.trim();
      if (text && (text.includes('|') || /^\d{8,14}$/.test(text) || text.startsWith('010890'))) {
        e.preventDefault();
        e.stopPropagation();
        triggerScan(text, 'BLUETOOTH_PHONE', 10, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('paste', handlePaste, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('paste', handlePaste, true);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [enabled, maxInterKeyDelayMs, minBarcodeLength, resetBuffer, triggerScan]);

  return {
    lastScan,
    totalScans,
    resetBuffer,
    isScannerReady: enabled,
  };
}
