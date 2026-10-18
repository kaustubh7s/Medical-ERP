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

  const lastScanCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const triggerScan = useCallback(
    (codeToScan: string, source: 'HARDWARE_WEDGE' | 'FAST_INPUT' | 'BLUETOOTH_PHONE', durationMs: number = 0, averageInterKey: number = 0) => {
      const trimmed = codeToScan.trim();
      if (!trimmed || trimmed.length < minBarcodeLength) return;

      const now = Date.now();
      if (trimmed === lastScanCodeRef.current && now - lastScanTimeRef.current < 1500) {
        // Suppress rapid echo/duplicate scan trigger
        resetBuffer();
        return;
      }
      lastScanCodeRef.current = trimmed;
      lastScanTimeRef.current = now;

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

        if (buffer.length >= minBarcodeLength) {
          const totalDuration = timestamps.length >= 2 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
          const averageInterKey = timestamps.length >= 2 ? totalDuration / (timestamps.length - 1) : 0;

          // Support phone Bluetooth scanners (latency up to 180ms per key) or compound strings or numeric barcodes
          const isHardwareScan = timestamps.length >= 2 && (averageInterKey <= Math.max(maxInterKeyDelayMs, 180) || totalDuration < 600);
          const isCompoundBarcode = buffer.includes('|') || buffer.includes('EXP:') || buffer.includes('MRP:');
          const isNumericBarcode = /^\d{8,14}$/.test(buffer);

          if (isHardwareScan || (!isInput && buffer.length >= 4) || isCompoundBarcode || isNumericBarcode) {
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

        // Instant auto-trigger for phone apps without an Enter/Tab suffix (40ms for compound, 70ms for numeric)
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        const currentBuf = bufferRef.current.trim();
        const isCompound = currentBuf.includes('|') && (currentBuf.includes('EXP') || currentBuf.includes('MRP') || currentBuf.split('|').length >= 3);
        const isNumeric = /^\d{8,14}$/.test(currentBuf);
        const fastDelayMs = isCompound ? 40 : isNumeric ? 70 : 140;

        clearTimerRef.current = setTimeout(() => {
          const buf = bufferRef.current.trim();
          if (buf.includes('|') && (buf.includes('EXP') || buf.includes('MRP') || buf.split('|').length >= 3)) {
            triggerScan(buf, 'BLUETOOTH_PHONE', 40, 5);
          } else if (/^\d{8,14}$/.test(buf) || (!isInput && buf.length >= 4)) {
            triggerScan(buf, 'BLUETOOTH_PHONE', 70, 7);
          } else {
            resetBuffer();
          }
        }, fastDelayMs);
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
