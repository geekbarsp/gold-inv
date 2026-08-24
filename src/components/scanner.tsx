"use client";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Keyboard, RotateCcw, SwitchCamera, X, Zap } from "lucide-react";

function confirmationBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    /* Audio feedback is optional when autoplay is blocked. */
  }
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function Scanner({
  onScan,
  onClose,
}: {
  onScan: (value: string) => void;
  onClose: () => void;
}) {
  const rawId = useId();
  const id = `scanner-${rawId.replaceAll(":", "")}`;
  const scanner = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [torch, setTorch] = useState(false);
  const [cameras, setCameras] = useState<import("html5-qrcode").CameraDevice[]>(
    [],
  );
  const [cameraIndex, setCameraIndex] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setError("");
        const mod = await import("html5-qrcode");
        const available = await mod.Html5Qrcode.getCameras();
        if (!live) return;
        setCameras(available);
        const formats = [
          mod.Html5QrcodeSupportedFormats.CODE_128,
          mod.Html5QrcodeSupportedFormats.CODE_39,
          mod.Html5QrcodeSupportedFormats.EAN_13,
          mod.Html5QrcodeSupportedFormats.EAN_8,
          mod.Html5QrcodeSupportedFormats.UPC_A,
          mod.Html5QrcodeSupportedFormats.UPC_E,
        ];
        const instance = new mod.Html5Qrcode(id, {
          formatsToSupport: formats,
          verbose: false,
        });
        scanner.current = instance;
        const camera = available[cameraIndex]?.id || {
          facingMode: "environment",
        };
        await instance.start(
          camera,
          { fps: 12, qrbox: { width: 280, height: 150 }, aspectRatio: 1.5 },
          async (value) => {
            if (!live) return;
            live = false;
            navigator.vibrate?.(100);
            confirmationBeep();
            try {
              await instance.stop();
            } catch {}
            onScan(value.trim().toUpperCase());
          },
          () => {},
        );
      } catch (caught) {
        if (live)
          setError(
            caught instanceof Error
              ? caught.message
              : "Camera could not start.",
          );
      }
    })();
    return () => {
      live = false;
      const current = scanner.current;
      if (current?.isScanning)
        current
          .stop()
          .catch(() => {})
          .finally(() => current.clear());
    };
  }, [cameraIndex, id, onScan, restartKey]);
  async function toggleTorch() {
    try {
      await scanner.current?.applyVideoConstraints({
        advanced: [{ torch: !torch } as MediaTrackConstraintSet],
      });
      setTorch(!torch);
    } catch {
      setError("Torch is not supported by this camera.");
    }
  }
  function submitManual(event: FormEvent) {
    event.preventDefault();
    const value = manualCode.trim().toUpperCase();
    if (value) onScan(value);
  }
  return (
    <div className="modal-backdrop">
      <section className="scanner-modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <p className="eyebrow">Camera Scanner</p>
            <h2>Scan barcode</h2>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close scanner"
          >
            <X />
          </button>
        </header>
        <div className="scanner-stage">
          <div id={id} />
          <div className="scan-guide">
            <span />
            <p>Align barcode inside the frame</p>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        {manual && (
          <form className="manual-scan" onSubmit={submitManual}>
            <label>
              Manual barcode entry
              <input
                autoFocus
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Enter B0001"
              />
            </label>
            <button className="primary">Find Item</button>
          </form>
        )}
        <div className="scanner-actions">
          <button className="secondary" onClick={toggleTorch}>
            <Zap /> {torch ? "Torch off" : "Torch"}
          </button>
          {cameras.length > 1 && (
            <button
              className="secondary"
              onClick={() => setCameraIndex((cameraIndex + 1) % cameras.length)}
            >
              <SwitchCamera /> Switch Camera
            </button>
          )}
          <button
            className="secondary"
            onClick={() => setRestartKey((value) => value + 1)}
          >
            <RotateCcw /> Restart
          </button>
          <button className="primary" onClick={() => setManual(!manual)}>
            <Keyboard /> Manual Entry
          </button>
        </div>
      </section>
    </div>
  );
}
