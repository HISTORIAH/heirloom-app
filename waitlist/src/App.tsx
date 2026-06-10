import { useEffect, useRef, useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [showDevnetModal, setShowDevnetModal] = useState(false);
  const devnetLinkRef = useRef<HTMLAnchorElement>(null);
  const devnetDialogRef = useRef<HTMLElement>(null);
  // Honeypot: real users never fill this; bots often do.
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (!showDevnetModal) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    devnetLinkRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowDevnetModal(false);
      if (event.key !== "Tab") return;

      const focusable = devnetDialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [showDevnetModal]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError("That doesn't look like a valid email.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, company }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong. Try again.");
      }

      setStatus("success");
      setShowDevnetModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <main className="waitlist-page">
        <div className="registration-mark registration-mark-top" aria-hidden="true">
          +
        </div>
        <div className="registration-mark registration-mark-bottom" aria-hidden="true">
          +
        </div>

        <header className="site-header">
          <a className="brand-lockup" href="/" aria-label="Heirloom home">
            <span className="brand-icon" aria-hidden="true">
              H
            </span>
            <span>heirloom</span>
          </a>
          <div className="status-pill">
            <span className="status-dot" />
            Private beta · 2026
          </div>
        </header>

        <section className="hero-layout">
          <div className="hero-copy neo-slide-up">
            <p className="eyebrow">Solana inheritance protocol</p>
            <h1 className="poster-heading">
              Your wallet
              <br />
              should <span className="word-block word-block-lime">outlive</span> you.
            </h1>
            <p className="hero-description">
              A heartbeat-based vault that keeps your assets yours, then passes them on exactly as
              you intend.
            </p>

            <div className="form-shell">
              <div className="form-label">
                <span>Get early access</span>
                <span className="form-index">No. 001</span>
              </div>

              {status === "success" ? (
                <div className="success-panel neo-slide-up" role="status">
                  <span className="success-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <p className="success-title">You're on the list.</p>
                    <p>Check your inbox for a confirmation.</p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className={status === "error" ? "neo-shake" : ""}
                >
                  {/* Honeypot: visually hidden and removed from the tab order. */}
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="absolute left-[-9999px] h-0 w-0 opacity-0"
                  />

                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <div className="signup-row">
                    <span className="email-prefix" aria-hidden="true">
                      →
                    </span>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      disabled={status === "submitting"}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      className="poster-input"
                    />
                    <button
                      type="submit"
                      className="poster-button"
                      disabled={status === "submitting"}
                    >
                      {status === "submitting" ? "Joining..." : "Join waitlist"}
                    </button>
                  </div>

                  {status === "error" && error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                </form>
              )}
            </div>

            <p className="privacy-note">No spam. No noise. One email when we launch.</p>
          </div>

          <aside className="proof-card neo-slide-up" aria-label="How Heirloom works">
            <div className="proof-card-header">
              <span>Proof of continuity</span>
              <span className="proof-version">V1.0</span>
            </div>

            <div className="proof-statement">
              <span className="quote-mark" aria-hidden="true">
                “
              </span>
              <p>
                If you <span className="word-block word-block-pink">stop,</span>
                <br />
                it <span className="cyan-text">starts.</span>
              </p>
            </div>

            <ol className="proof-steps">
              <li>
                <span className="step-number">01</span>
                <div>
                  <strong>You stay active</strong>
                  <span>Check in on your schedule.</span>
                </div>
              </li>
              <li>
                <span className="step-number">02</span>
                <div>
                  <strong>Your assets stay yours</strong>
                  <span>Self-custodial. Trustless. On-chain.</span>
                </div>
              </li>
              <li className="step-highlight">
                <span className="step-number">03</span>
                <div>
                  <strong>Your heirs come next</strong>
                  <span>Only when the heartbeat stops.</span>
                </div>
              </li>
            </ol>

            <div className="proof-footer">
              <span>Set it once.</span>
              <span className="boxed-note">Let it work.</span>
            </div>
          </aside>
        </section>

        <footer className="site-footer">
          <span>Heirloom protocol · Waitlist edition</span>
          <span>Self-custodial · Trustless · Human</span>
        </footer>
      </main>

      {showDevnetModal && (
        <div
          className="devnet-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowDevnetModal(false);
          }}
        >
          <section
            ref={devnetDialogRef}
            className="devnet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="devnet-modal-title"
            aria-describedby="devnet-modal-description"
          >
            <div className="devnet-modal-header">
              <span>Early access unlocked</span>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDevnetModal(false)}
                aria-label="Close Devnet invitation"
              >
                ×
              </button>
            </div>

            <div className="devnet-modal-body">
              <span className="modal-stamp">Devnet · Live</span>
              <p className="modal-kicker">While you wait...</p>
              <h2 id="devnet-modal-title">
                Take Heirloom for a <span className="word-block word-block-lime">test drive.</span>
              </h2>
              <p id="devnet-modal-description">
                Create a vault, explore the heartbeat flow, and see how the handoff works using
                Devnet assets.
              </p>

              <div className="modal-actions">
                <a ref={devnetLinkRef} className="modal-primary-action" href="https://heirlm.xyz">
                  Try Heirloom on Devnet
                  <span aria-hidden="true">↗</span>
                </a>
                <button
                  type="button"
                  className="modal-secondary-action"
                  onClick={() => setShowDevnetModal(false)}
                >
                  Maybe later
                </button>
              </div>
            </div>

            <div className="devnet-modal-footer">
              <span>No real funds required.</span>
              <span>heirlm.xyz · Devnet</span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
