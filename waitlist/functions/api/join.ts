// Cloudflare Pages Function 
// Adds the email to a Resend audience (storage) and sends a confirmation (best-effort).

interface Env {
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID: string;
  RESEND_FROM: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_BASE = "https://api.resend.com";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { RESEND_API_KEY, RESEND_AUDIENCE_ID, RESEND_FROM } = context.env;
  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID || !RESEND_FROM) {
    console.error("Missing Resend env vars");
    return json({ ok: false, error: "Server is not configured." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const honeypot = String(body.company ?? "");

  // Bot filled the hidden field — pretend success, store nothing.
  if (honeypot) {
    return json({ ok: true });
  }

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  const authHeaders = {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };

  // 1) Add to the waitlist audience (storage). Idempotent: a duplicate is still success.
  try {
    const contactRes = await fetch(
      `${RESEND_BASE}/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );

    if (!contactRes.ok) {
      const detail = await contactRes.text();
      // Resend returns an error if the contact already exists — treat as success.
      const alreadyExists = /already exists|duplicate/i.test(detail);
      if (!alreadyExists) {
        console.error("Resend contact error:", contactRes.status, detail);
        return json({ ok: false, error: "Could not save your email. Try again." }, 502);
      }
    }
  } catch (err) {
    console.error("Resend contact request failed:", err);
    return json({ ok: false, error: "Could not save your email. Try again." }, 502);
  }

  // 2) Send a confirmation email (best-effort — signup already succeeded).
  try {
    const emailRes = await fetch(`${RESEND_BASE}/emails`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        from: RESEND_FROM,
        to: email,
        subject: "You're on the Heirloom waitlist 🎉",
        html: confirmationHtml(),
      }),
    });
    if (!emailRes.ok) {
      console.error("Resend email error:", emailRes.status, await emailRes.text());
    }
  } catch (err) {
    console.error("Resend email request failed:", err);
  }

  return json({ ok: true });
};

function confirmationHtml(): string {
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">You're on the list 🎉</h1>
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        Thanks for joining the Heirloom waitlist. Heirloom is heartbeat-based digital
        asset inheritance on Solana — your wallet should outlive you, even if your seed
        phrase doesn't.
      </p>
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        We'll email you the moment it's live. No spam in between.
      </p>
      <p style="font-size: 14px; color: #888; margin-top: 24px;">— The Heirloom team</p>
    </div>
  `;
}
