'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Camera,
  CameraOff,
  Zap,
  ZapOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Wifi,
  WifiOff,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  Info,
  ChevronDown,
  Layers,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

function MobileScannerContent() {
  const searchParams = useSearchParams();
  const initialSession = searchParams.get('session') || '';
  const initialToken = searchParams.get('token') || '';
  const initialPin = searchParams.get('pin') || '';

  // Pairing State
  const [sessionId, setSessionId] = useState(initialSession);
  const [pairingToken, setPairingToken] = useState(initialToken);
  const [pairingPin, setPairingPin] = useState(initialPin);
  const [isPaired, setIsPaired] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<'pos' | 'medicines' | 'other'>('pos');
  const [deviceName, setDeviceName] = useState(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      if (/iPhone/i.test(ua)) return 'iPhone';
      if (/iPad/i.test(ua)) return 'iPad';
      if (/Android/i.test(ua)) {
        const match = ua.match(/;\s([^;]+)\sBuild/);
        return match ? match[1] : 'Android Device';
      }
      return 'Mobile Device';
    }
    return 'Mobile Phone';
  });

  // Camera & Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSecureOrigin, setIsSecureOrigin] = useState(true);

  // Scan Feedback & Throttling
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<{
    success: boolean;
    message: string;
    timestamp: number;
  } | null>(null);
  const [suppressionInterval, setSuppressionInterval] = useState<number>(2.5); // seconds
  const [isPausedForCooldown, setIsPausedForCooldown] = useState(false);
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Manual Input State
  const [manualCode, setManualCode] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Fallback Camera Photo Capture State (works over HTTP when getUserMedia is restricted)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // html5-qrcode instance ref
  const html5QrCodeRef = useRef<any>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const lastScanTextRef = useRef<string>('');

  // 1. Check Security Context (HTTPS or localhost)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      const secure = isLocal || isHttps || (window as any).isSecureContext === true;
      setIsSecureOrigin(secure);
    }
  }, []);

  // 2. Audio Feedback Synthesizer (Zero external assets needed)
  const playAudioChime = (type: 'SUCCESS' | 'ERROR') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'SUCCESS') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // High chime
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // Audio context restricted until user gesture
    }
  };

  // 3. Vibration Haptic Feedback
  const triggerHaptic = (type: 'SUCCESS' | 'ERROR') => {
    if (!vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'SUCCESS') {
        navigator.vibrate([60, 40, 60]);
      } else {
        navigator.vibrate([200, 100, 200]);
      }
    }
  };

  // 4. Auto-handshake if session and token/pin exist in URL
  useEffect(() => {
    if (initialSession && (initialToken || initialPin)) {
      handlePair(initialSession, initialToken || initialPin);
    }
  }, [initialSession, initialToken, initialPin]);

  // Pair with MacBook ERP
  const handlePair = async (sId = sessionId, tokenOrPin = pairingToken || pairingPin) => {
    const cleanTokenOrPin = (tokenOrPin || '').trim();
    if (!cleanTokenOrPin) {
      setPairingError('Please enter the 6-digit PIN shown on your MacBook screen.');
      return;
    }

    setIsPairingLoading(true);
    setPairingError(null);

    try {
      const res = await fetch('/api/scanner/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sId ? sId.trim() : undefined,
          pairingToken: cleanTokenOrPin,
          deviceName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pairing rejected by MacBook ERP.');
      }

      setIsPaired(true);
      setSessionId(data.sessionId || sId.trim());
      setPairingToken(data.pairingToken || cleanTokenOrPin);
      setActiveWorkflow(data.activeWorkflow || 'pos');
      playAudioChime('SUCCESS');
      triggerHaptic('SUCCESS');
    } catch (err: any) {
      setPairingError(err.message || 'Failed to connect to MacBook ERP.');
      playAudioChime('ERROR');
      triggerHaptic('ERROR');
    } finally {
      setIsPairingLoading(false);
    }
  };

  // Disconnect from MacBook ERP
  const handleDisconnect = async () => {
    stopScanner();
    try {
      await fetch('/api/scanner/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, pairingToken }),
      });
    } catch {
      // ignore
    }
    setIsPaired(false);
  };

  // Transmit Decoded Scan to MacBook ERP
  const transmitScanToERP = async (rawCode: string, scanType = 'QR_CODE') => {
    if (!rawCode || !rawCode.trim()) return;
    const cleanCode = rawCode.trim();

    // Check duplicate suppression
    const now = Date.now();
    const elapsedSinceLastScan = now - lastScanTimestampRef.current;
    const isSameCode = cleanCode === lastScanTextRef.current;

    if (isSameCode && elapsedSinceLastScan < suppressionInterval * 1000) {
      return; // duplicate scan ignored
    }

    lastScanTimestampRef.current = now;
    lastScanTextRef.current = cleanCode;
    setLastScannedValue(cleanCode);

    // Visual pause cooldown
    setIsPausedForCooldown(true);
    let secondsLeft = Math.ceil(suppressionInterval);
    setCooldownCountdown(secondsLeft);
    const intervalTimer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(intervalTimer);
        setIsPausedForCooldown(false);
        setCooldownCountdown(0);
      } else {
        setCooldownCountdown(secondsLeft);
      }
    }, 1000);

    const nonce = Math.random().toString(36).substring(2, 9);

    try {
      const res = await fetch('/api/scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          pairingToken,
          scanValue: cleanCode,
          scanType,
          nonce,
          timestamp: now,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Server rejected scan packet.');
      }

      playAudioChime('SUCCESS');
      triggerHaptic('SUCCESS');
      setLastScanStatus({
        success: true,
        message: `Transmitted to MacBook: ${cleanCode}`,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      playAudioChime('ERROR');
      triggerHaptic('ERROR');
      setLastScanStatus({
        success: false,
        message: err.message || 'Network error sending scan to MacBook.',
        timestamp: Date.now(),
      });
    }
  };

  // Start Camera Scanning
  const startScanner = async () => {
    setCameraError(null);

    // Dynamic import of html5-qrcode
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // Create instance if not exists
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        });
      }

      // Check available cameras
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
        }
      } catch {
        // Ignored
      }

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: 'environment' }; // Rear camera by default

      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          transmitScanToERP(decodedText);
        },
        () => {
          // Frame decode pass (silent)
        }
      );

      setIsScanning(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setIsScanning(false);
      if (err.name === 'NotAllowedError' || /permission/i.test(err.message || '')) {
        setCameraError('Camera access denied. Please allow camera permissions in your mobile browser settings.');
      } else if (!isSecureOrigin) {
        setCameraError(
          'Mobile browsers restrict live camera access on unencrypted HTTP. Use our Instant Photo Capture below or access via HTTPS.'
        );
      } else {
        setCameraError(err.message || 'Could not start phone camera. Check permissions.');
      }
    }
  };

  // Stop Camera Scanning
  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setIsScanning(false);
      setIsTorchOn(false);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const nextTorch = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  // Fallback Photo / File Capture (works 100% on phones even over plain HTTP!)
  const handlePhotoFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

      setLastScanStatus({
        success: true,
        message: 'Analyzing captured photo locally in browser...',
        timestamp: Date.now(),
      });

      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      if (decodedText) {
        transmitScanToERP(decodedText);
      }
    } catch (err: any) {
      playAudioChime('ERROR');
      triggerHaptic('ERROR');
      setLastScanStatus({
        success: false,
        message: 'No QR code or barcode found in the photo. Please try holding closer in good lighting.',
        timestamp: Date.now(),
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Manual code entry submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setIsSubmittingManual(true);
    transmitScanToERP(manualCode.trim(), 'MANUAL_ENTRY');
    setManualCode('');
    setIsSubmittingManual(false);
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {});
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Mobile Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-xs shadow-inner">
            Rx
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-tight text-white flex items-center gap-1.5">
              CarePlus Wireless Scanner
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Target Mode: <strong className="text-emerald-400">{activeWorkflow.toUpperCase()}</strong>
            </p>
          </div>
        </div>

        {/* Pairing Status Pill */}
        {isPaired ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
            <button
              onClick={handleDisconnect}
              className="text-[10px] text-slate-400 hover:text-rose-400 font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
            <WifiOff className="h-3 w-3" />
            Unpaired
          </span>
        )}
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 p-4 max-w-md w-full mx-auto space-y-4">
        {/* UNPAIRED SCREEN: Connect to MacBook */}
        {!isPaired ? (
          <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="text-center space-y-1">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <Smartphone className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-white">Pair Phone with MacBook ERP</h2>
              <p className="text-xs text-slate-400">
                Scan the Pairing QR code displayed on your MacBook or enter your Session details below.
              </p>
            </div>

            {pairingError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{pairingError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePair();
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1.5 text-center">
                  Enter 6-Digit Pairing PIN
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pairingPin || pairingToken}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPairingPin(val);
                    setPairingToken(val);
                  }}
                  placeholder="e.g. 884876"
                  className="w-full px-3 py-3 rounded-xl bg-slate-800 border-2 border-emerald-500/50 text-white font-mono text-2xl font-black tracking-[0.3em] text-center focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                />
                <p className="text-[11px] text-slate-400 text-center mt-1.5">
                  Look at the 6-digit PIN displayed on your MacBook pairing window.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Phone Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPairingLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isPairingLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting to MacBook...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Connect & Start Wireless Scanner</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* PAIRED SCREEN: Scanner Viewfinder & Controls */
          <div className="space-y-4">
            {/* Viewfinder Card */}
            <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-slate-800 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
              {/* HTML5 QR Container */}
              <div id="qr-reader-container" className="w-full h-full min-h-[280px]" />

              {/* Viewfinder Target Reticle Overlay when Scanning */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
                    {/* Corner Reticle Accents */}
                    <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                    <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                    {/* Animated Laser Scanning Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent top-1/2 -translate-y-1/2 animate-bounce" />
                  </div>
                </div>
              )}

              {/* Not scanning idle placeholder */}
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90 backdrop-blur-xs">
                  <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Camera is Standby</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tap below to activate camera and scan QR codes on medicine strips.
                    </p>
                  </div>
                </div>
              )}

              {/* Cooldown / Duplicate Suppression Banner */}
              {isPausedForCooldown && (
                <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-300 backdrop-blur-md shadow-lg">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Scan Transmitted! (Wait {cooldownCountdown}s)
                  </span>
                  <button
                    onClick={() => {
                      setIsPausedForCooldown(false);
                      setCooldownCountdown(0);
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                  >
                    Scan Next Now
                  </button>
                </div>
              )}
            </div>

            {/* Camera Permission or Context Error */}
            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <span className="font-semibold">{cameraError}</span>
                </div>

                {!isSecureOrigin && (
                  <div className="text-[11px] text-slate-400 pl-6 space-y-1">
                    <p>
                      <strong>Why this happens:</strong> Mobile Safari and Chrome require <code>HTTPS</code> for live WebRTC video streams.
                    </p>
                    <p>
                      <strong>Option A:</strong> Use the <strong>"Snap QR Photo"</strong> button below — it works 100% on any mobile browser without HTTPS!
                    </p>
                    <p>
                      <strong>Option B:</strong> If using Android Chrome, open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> and add your MacBook URL.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Scanner Action Controls */}
            <div className="grid grid-cols-2 gap-2.5">
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  className="col-span-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Camera className="h-5 w-5" />
                  <span>Start Live Camera Scanner</span>
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="col-span-2 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <CameraOff className="h-4 w-4" />
                  <span>Stop Scanner</span>
                </button>
              )}

              {/* Torch Button (if supported) */}
              {torchSupported && isScanning && (
                <button
                  onClick={toggleTorch}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isTorchOn
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  {isTorchOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                  <span>{isTorchOn ? 'Torch Off' : 'Torch On'}</span>
                </button>
              )}

              {/* Quick Snap QR Photo Button (Universal HTTP / HTTPS fallback) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`${
                  torchSupported && isScanning ? 'col-span-1' : 'col-span-2'
                } py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors`}
              >
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>Snap QR Photo (Universal)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoFileCapture}
              />
            </div>

            {/* Last Scanned Result Card */}
            {lastScannedValue && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold uppercase tracking-wider">Last Decoded Value</span>
                  <span className="font-mono text-[10px]">
                    {new Date(lastScanStatus?.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-xs font-bold text-white break-all border border-slate-800">
                  {lastScannedValue}
                </div>

                {lastScanStatus && (
                  <p
                    className={`text-[11px] font-semibold flex items-center gap-1 ${
                      lastScanStatus.success ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {lastScanStatus.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{lastScanStatus.message}</span>
                  </p>
                )}
              </div>
            )}

            {/* Manual Barcode / QR Text Fallback */}
            <form onSubmit={handleManualSubmit} className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block">
                Manual Barcode / QR Entry (Fallback)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Type barcode digits or medicine QR..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || isSubmittingManual}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>

            {/* Scanner Tuning & Preferences Drawer */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Scanning Options & Haptics
              </span>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Duplicate Scan Suppression:</span>
                <span className="font-mono font-bold text-emerald-400">{suppressionInterval}s</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={suppressionInterval}
                onChange={(e) => setSuppressionInterval(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Audio Chime</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={vibrationEnabled}
                    onChange={(e) => setVibrationEnabled(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Haptic Vibrate</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MobileScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 font-mono">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading CarePlus Wireless Scanner...</span>
          </div>
        </div>
      }
    >
      <MobileScannerContent />
    </Suspense>
  );
}
