import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // Honeypot: real users never fill this; bots often do.
  const [company, setCompany] = useState("");

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <main className="neo-section-yellow min-h-screen w-full flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg neo-card-static neo-slide-up">
        <span className="neo-badge bg-accent-lime mb-6">Coming soon</span>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
          Your wallet should outlive you.
        </h1>
        <p className="text-base sm:text-lg font-medium text-muted-foreground mb-8">
          Heirloom is heartbeat-based digital asset inheritance on Solana. Join the
          waitlist and we'll let you know the moment it's live.
        </p>

        {status === "success" ? (
          <div className="neo-border rounded-lg bg-accent-lime px-5 py-6 text-center neo-slide-up">
            <p className="text-2xl font-bold mb-1">You're on the list 🎉</p>
            <p className="font-medium">Check your inbox for a confirmation.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className={status === "error" ? "neo-shake" : ""}>
            {/* Honeypot — visually hidden, off the tab order */}
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
            <div className="flex flex-col sm:flex-row gap-3">
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
                className="neo-input flex-1"
              />
              <button type="submit" className="neo-btn shrink-0" disabled={status === "submitting"}>
                {status === "submitting" ? "Joining…" : "Join waitlist"}
              </button>
            </div>

            {status === "error" && error && (
              <p className="mt-3 font-bold text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>

      <p className="mt-8 text-sm font-medium text-foreground/70">
        No spam. One email when we launch.
      </p>
    </main>
  );
}
