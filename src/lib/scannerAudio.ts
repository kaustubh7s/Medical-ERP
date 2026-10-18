/**
 * Web Audio API Beep Synthesizer for Handheld Barcode Scanners
 * Generates crisp, authentic commercial POS scanner chimes without external audio assets.
 */

export function playScanSound(type: 'success' | 'duplicate' | 'error' = 'success', enabled: boolean = true) {
  if (!enabled || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // High-pitched, crisp supermarket/pharmacy single barcode scan beep (A6 to E7)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now); // A6
      osc.frequency.exponentialRampToValueAtTime(2637, now + 0.07); // E7
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'duplicate') {
      // Soft double chime for quantity increment
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1318, now); // E6
      osc.frequency.setValueAtTime(1760, now + 0.04); // A6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
    } else {
      // Low descending buzz alert for unknown barcode / out-of-stock
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.16);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    // Auto close context after playback
    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch {}
    }, 300);
  } catch {
    // Graceful fallback if browser policies block audio context
  }
}
