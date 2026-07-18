# Heirloom UX Audit — Preserving Neo-Brutalism, Fixing Flow

## Current User Flow Map

```
LANDING (/) → NavBar: Dashboard | Claim | Heartbeat | Connect
    │
    ├── "Launch Tour" → AppTour (6 steps, auto-navigates pages)
    │   └── Ends at /create-vault with "Connect Wallet" prompt
    │
    ├── "View Demo" → YouTube embed modal
    │
    └── "Create Vault" (if connected) → /create-vault
            │
            ├── Step 1: Heartbeat (interval, grace, pause)
            ├── Step 2: Heir (address, label, guardian, hb signer)
            ├── Step 3: Deposit (SOL + SPL tokens)
            └── Step 4: Review → Submit → /dashboard
                    │
                    └── DASHBOARD (/dashboard)
                            ├── Estate Card(s)
                            │   ├── Status banner (active/grace/claimable/distributed)
                            │   ├── Countdown timer
                            │   ├── SOL balance + Top Up
                            │   ├── Token balances + Top Up
                            │   ├── Heir info
                            │   ├── Guardian info (if set)
                            │   ├── Heartbeat signer info (if set)
                            │   ├── Reassign Heir
                            │   ├── Edit Settings
                            │   ├── Add Asset
                            │   └── Emergency Withdraw
                            └── "New Estate" button → /create-vault

LANDING NAV → Claim (/claim) → Heir Portal
    ├── Auto-scan for inheritances
    ├── Manual lookup by owner address
    └── Claim button (if claimable)

LANDING NAV → Heartbeat (/heartbeat) → Signer Portal
    ├── Lookup by authority + heir
    └── Send heartbeat (if authorized signer)

LANDING NAV → Defer (/defer) → Guardian Portal
    ├── Lookup by authority + heir
    └── Defer claim window (if authorized guardian)
```

---

## The 4 Criticisms Re-Framed (What Actually Needs Changing)

### 1. "Pick a single primary color"

**Current:** Every section has its own neon color — pink hero, lime how-it-works, cyan why-solana, orange lifecycle, yellow CTA, purple FAQ. Plus the dashboard status banner changes color based on state. It's a rainbow.

**Problem:** No brand identity. Users can't associate a color with Heirloom. The rainbow feels like a template, not a product.

**Fix (preserving brutalism):** Pick ONE accent color (suggest **lime `#a3e635`** — it's the most distinctive and already used for "active/success" states). Use it for:
- Primary CTAs
- Active/success states
- Highlights and badges
- The tour buttons

Keep the **status colors** (yellow for grace, red for claimable) — those are functional, not decorative. But remove the decorative section backgrounds (pink hero, cyan why-solana, etc.). Replace with white/off-white sections + black borders + the single lime accent.

**What stays brutalist:** Thick black borders, offset shadows, rotated text boxes, uppercase tracking. Just unify the color palette.

---

### 2. "Lead with the benefits"

**Current hero:**
- Subtitle: "Solana Inheritance Protocol" (tech jargon)
- H1: "Protect your assets. Pass it on trustlessly." (features, not outcomes)
- Body: "Lock assets into a heartbeat vault on Solana. Check in periodically..." (mechanism, not benefit)
- CTA: "Launch Tour" (confusing — what am I touring?)

**Problem:** A first-time visitor doesn't know what a "heartbeat vault" is or why they need one. The hero assumes they already care about crypto inheritance.

**Fix (preserving brutalist copy style):**
- H1: "YOUR CRYPTO DOESN'T HAVE TO DIE WITH YOU" (emotional, uppercase, brutalist)
- Subtitle: "Lock assets in a vault. Check in periodically. If you stop, your heirs inherit automatically. No lawyers. No trust. No seed phrase sharing."
- Lead with 3 benefit pills (self-custody, no lawyers, zero trust) — styled as brutalist badges with the single lime accent
- CTA: "CREATE YOUR VAULT" (single action, no "Launch Tour" confusion)

**What stays brutalist:** All-caps headlines, rotated inline spans, thick borders, punchy copy.

---

### 3. "Animation isn't understandable (are we in the medical sector)"

**Current:** The ECG heartbeat line scrolling across the hero and the vault monitor. "Vault Monitor" header. "Flatline" label. Pulse rings. It's a hospital monitor.

**Problem:** The medical metaphor is confusing. Users think "is this a health app?" The ECG animation is visually noisy and doesn't clearly communicate "countdown timer."

**Fix (preserving brutalist animation style):**
- Replace the ECG line with a **simple progress bar** or **countdown digits** — still animated, still bold, but immediately understandable
- Rename "Vault Monitor" to "Vault Status" or "Your Timer"
- Rename "Send Heartbeat" to "Check In" or "Reset Timer"
- Keep the pulse animation for the active dot, but make it a simple lime glow, not a medical pulse
- Keep the flatline concept but call it "Expired" or "Claimable" — not "Flatline"

**What stays brutalist:** Bold animations, chunky UI, status indicators. Just remove the medical metaphor.

---

### 4. "Pick a single CTA shared across the page"

**Current CTAs:**
- Hero: "Launch Tour" (primary) + "View Demo" (secondary)
- Nav: "Connect Wallet" (when disconnected)
- How It Works: no CTA
- CTA section: "Create Your Vault" (primary) + "Read the docs" (secondary)
- Dashboard empty state: "Create Vault" + "Claim Inheritance"

**Problem:** The user is asked to do different things in different places. "Launch Tour" vs "Create Your Vault" vs "Connect Wallet" — which is the main action?

**Fix:**
- **Everywhere, the primary CTA is "CREATE YOUR VAULT"**
- If not connected, clicking it opens the wallet connect dialog (not a separate "Connect Wallet" flow)
- "Launch Tour" becomes a subtle text link or is removed entirely (the tour can auto-trigger for first-time visitors)
- "View Demo" stays as a secondary link but styled less prominently
- Dashboard empty state: "Create Your Vault" only (remove "Claim Inheritance" — heirs don't land on the dashboard)

**What stays brutalist:** Big chunky buttons, lime primary, black borders.

---

## Additional UX Issues Found in the Flow

### A. Create Vault Flow — Step Order Confusion

**Current order:** Heartbeat → Heir → Deposit → Review

**Problem:** Asking users to set technical parameters (heartbeat interval, grace period) BEFORE they even know who the heir is or what they're depositing feels backwards. It's like setting a timer before you know what you're cooking.

**Suggested reorder:** Heir → Deposit → Heartbeat → Review

**Why:**
1. **Heir first:** "Who am I protecting this for?" — emotional anchor, gets buy-in
2. **Deposit second:** "What am I putting in?" — tangible, see the value
3. **Heartbeat third:** "How often do I need to check in?" — now the timer makes sense because you know what's at stake
4. **Review:** Confirm everything

**What stays brutalist:** The stepper UI, the chunky cards, the rotated headers. Just reorder the steps.

---

### B. Create Vault — Deposit Step Overwhelming

**Current:** SOL input + token search + expandable token panel + selected deposits list + percentage buttons. All visible at once.

**Problem:** Information overload. The user sees 5 different UI patterns for depositing.

**Suggested fix:**
- Collapse the token panel by default (already done, good)
- Show "Selected Deposits" ONLY after something is selected (already done, good)
- Move the SOL section and token section into **tabs**: "Deposit SOL" | "Deposit Tokens"
- Or better: a single "Add Assets" button that opens a modal/panel for selecting assets

**What stays brutalist:** Chunky inputs, thick borders, percentage buttons. Just simplify the layout.

---

### C. Dashboard — Too Much Information at Once

**Current:** One giant card with: status banner, countdown, SOL balance, tokens, heir, guardian, heartbeat signer, then 4 action sections (reassign, edit, add asset, emergency withdraw).

**Problem:** Everything is visible at once. The user has to parse 10+ pieces of information before they understand their vault's state.

**Suggested fix:**
- **Status banner** stays prominent (it's the most important)
- **Countdown** stays prominent (second most important)
- **Assets** collapse into tabs: "SOL" | "Tokens" — show only one at a time
- **Heir/Guardian/Signer** info collapses into an "Details" accordion
- **Actions** (reassign, edit, add, withdraw) move to a sticky bottom bar or a "Manage" dropdown

**What stays brutalist:** The status banner colors, the countdown digits, the chunky cards. Just organize the information hierarchy better.

---

### D. Tour — Too Long, Too Passive

**Current:** 6 steps across 5 pages. The user watches, doesn't do.

**Problem:** Tours that just point at things are forgettable. Users learn by doing.

**Suggested fix:**
- **Shorten to 3 steps:**
  1. "Welcome — create a vault in 4 steps" (landing)
  2. "Set your heir and deposit assets" (create vault, step 1-2)
  3. "Check in to keep your vault active" (dashboard)
- **Make it interactive:** The tour should prompt the user to actually click "Next" on the stepper, type an address, etc. — not just watch.
- **Remove the "Finish → Connect Wallet" flow** — it's pushy. Let the user explore.

**What stays brutalist:** The neo-brutalist tooltip styling (already done well in AppTour.tsx).

---

### E. Claim/Heartbeat/Defer Pages — Lookup Friction

**Current:** All three require manually entering authority + heir addresses to look up an estate.

**Problem:** Typing 44-character addresses is error-prone and frustrating. If I'm an heir, I probably don't know the owner's address by heart.

**Suggested fix:**
- **Claim:** If the user is connected, auto-scan for estates where their wallet is the heir (already done, good). But if none found, suggest: "Ask the vault owner to share their address with you" instead of just a blank input.
- **Heartbeat/Defer:** These are advanced features. Consider hiding them from the main nav and linking from the dashboard instead: "Assign a heartbeat signer" → opens signer setup. "Assign a guardian" → opens guardian setup. This way the owner sets these up, not the signer/guardian trying to find the estate.

**What stays brutalist:** The lookup form styling, the chunky inputs. Just reduce the need for manual lookup.

---

## Summary of Changes (Preserving Brutalism)

| Area | Current | Proposed |
|------|---------|----------|
| **Colors** | Rainbow sections | Lime accent + functional status colors only |
| **Hero** | Tech jargon, "Launch Tour" | Benefit-first, "CREATE YOUR VAULT" |
| **Animation** | ECG medical monitor | Progress bar/countdown, "Check In" |
| **CTA** | 3+ different actions | Single "CREATE YOUR VAULT" everywhere |
| **Create order** | Heartbeat → Heir → Deposit | Heir → Deposit → Heartbeat → Review |
| **Deposit UI** | Everything visible | Tabs or "Add Assets" modal |
| **Dashboard** | Everything visible | Status + countdown prominent, rest collapsible |
| **Tour** | 6 steps, passive | 3 steps, interactive |
| **Lookup** | Manual address entry | Auto-scan + contextual links from dashboard |

**What NEVER changes:**
- Thick black borders (`border-4 border-foreground`)
- Offset shadows (`shadow-[8px_8px_0px_0px_hsl(var(--foreground))]`)
- Rotated text boxes (`rotate-[-1deg]`)
- Uppercase tracking-wide labels
- Chunky buttons with active states
- Space Grotesk + Inter font pairing
- The overall "heavy, tactile, confident" aesthetic
