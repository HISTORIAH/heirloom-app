import { useState, type FormEvent } from "react";
import { LanguageSwitcher, useTranslation } from "@heirloom/i18n";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const { t } = useTranslation("waitlist");
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
      setError(t("form.invalidEmail"));
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
        throw new Error(data?.error || t("form.genericError"));
      }

      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.genericError"));
      setStatus("error");
    }
  }

  return (
    <main className="waitlist-page">
      <div className="registration-mark registration-mark-top" aria-hidden="true">
        +
      </div>
      <div className="registration-mark registration-mark-bottom" aria-hidden="true">
        +
      </div>

      <header className="site-header">
        <a className="brand-lockup" href="/">
          <img src="/heirloom-wordmark.svg" alt="Heirloom" width={391} height={120} />
        </a>
        <LanguageSwitcher
          className="status-pill"
          menuClassName="absolute right-0 top-full mt-2 w-40 border-4 border-foreground rounded-xl bg-background p-2 grid grid-cols-3 gap-1 shadow-[6px_6px_0px_0px_hsl(var(--foreground))] z-50"
          itemClassName="flex items-center justify-center rounded-lg px-2 py-1.5 text-xs font-bold uppercase hover:bg-secondary transition-colors"
          activeItemClassName="bg-accent-yellow"
          chevronClassName="h-3.5 w-3.5"
        />
      </header>

      <section className="hero-layout">
        <div className="hero-copy neo-slide-up">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="poster-heading">
            {t("heading.line1")}
            <br />
            <span className="word-block word-block-lime">{t("heading.line2")}</span>
          </h1>
          <p className="hero-description">{t("description")}</p>

          <div className="form-shell">
            <div className="form-label">
              <span>{t("form.label")}</span>
            </div>

            {status === "success" ? (
              <div className="success-panel neo-slide-up" role="status">
                <div className="success-message">
                  <span className="success-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <p className="success-title">{t("success.title")}</p>
                    <p className="success-inbox">{t("success.inbox")}</p>
                  </div>
                </div>
                <a className="success-devnet-action" href="https://heirlm.xyz">
                  {t("success.devnetAction")}
                  <span aria-hidden="true">↗</span>
                </a>
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
                  {t("form.emailLabel")}
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
                    placeholder={t("form.emailPlaceholder")}
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
                    {status === "submitting" ? t("form.submitting") : t("form.submit")}
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

          <p className="privacy-note">{t("privacyNote")}</p>
        </div>

        <aside className="proof-card neo-slide-up" aria-label="How Heirloom works">
          <div className="proof-card-header">
            <span>{t("proof.header")}</span>
            <span className="proof-version">{t("proof.version")}</span>
          </div>

          <div className="proof-statement">
            <span className="quote-mark" aria-hidden="true">
              “
            </span>
            <p>
              {t("proof.statementLine1")}
              <br />
              <span className="cyan-text">{t("proof.statementLine2")}</span>
            </p>
          </div>

          <ol className="proof-steps">
            <li>
              <span className="step-number">01</span>
              <div>
                <strong>{t("proof.steps.one.title")}</strong>
                <span>{t("proof.steps.one.body")}</span>
              </div>
            </li>
            <li>
              <span className="step-number">02</span>
              <div>
                <strong>{t("proof.steps.two.title")}</strong>
                <span>{t("proof.steps.two.body")}</span>
              </div>
            </li>
            <li className="step-highlight">
              <span className="step-number">03</span>
              <div>
                <strong>{t("proof.steps.three.title")}</strong>
                <span>{t("proof.steps.three.body")}</span>
              </div>
            </li>
          </ol>

          <div className="proof-footer">
            <span>{t("proof.footer.left")}</span>
            <span className="boxed-note">{t("proof.footer.right")}</span>
          </div>
        </aside>
      </section>

      <footer className="site-footer">
        <span>{t("siteFooter.left")}</span>
        <span>{t("siteFooter.right")}</span>
      </footer>
    </main>
  );
}