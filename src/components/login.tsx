"use client";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Gem, LoaderCircle, LockKeyhole } from "lucide-react";
export function Login() {
  const [show, setShow] = useState(false),
    [passcode, setPasscode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark">
          <Gem size={34} />
        </div>
        <p className="eyebrow">Narciso Geronimo</p>
        <h1>Jewelry Inventory</h1>
        <p>
          Precision, provenance, and every precious detail—all in one secure
          place.
        </p>
        <div className="gold-line" />
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="lock">
            <LockKeyhole size={22} />
          </div>
          <p className="eyebrow">Secure Access</p>
          <h2>Welcome back</h2>
          <p>Enter the store passcode to continue.</p>
          <label htmlFor="passcode">Enter Passcode</label>
          <div className="password-wrap">
            <input
              id="passcode"
              autoFocus
              autoComplete="current-password"
              type={show ? "text" : "password"}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••"
            />
            <button
              type="button"
              aria-label={show ? "Hide passcode" : "Show passcode"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="primary wide" disabled={busy}>
            {busy ? <LoaderCircle className="spin" /> : <LockKeyhole />}
            {busy ? "Verifying…" : "Enter Inventory"}
          </button>
          <small>Protected with encrypted, time-limited access</small>
        </form>
      </section>
    </main>
  );
}
