# Heirloom Design System & UX Specification

> **Version:** 1.0 — Refined Brutalist with Semantic Color-Coding
> **Date:** 2026-07-17

---

## Table of Contents

1. [The Color System](#1-the-color-system)
2. [Naming Conventions](#2-naming-conventions)
3. [Hero Section](#3-hero-section)
4. [Create Vault Flow](#4-create-vault-flow)
5. [Dashboard — Assets & Tokens](#5-dashboard--assets--tokens)
6. [Dashboard — Yield Strategies](#6-dashboard--yield-strategies)
7. [Dashboard — Actions](#7-dashboard--actions)
8. [Claim / Heir Flow](#8-claim--heir-flow)
9. [Heartbeat / Signer Flow](#9-heartbeat--signer-flow)
10. [Guardian / Defer Flow](#10-guardian--defer-flow)
11. [Component Specifications](#11-component-specifications)

---

## 1. The Color System

### Philosophy

Each color maps to a **protocol role or state**. This is not decoration — it's a **visual language** that teaches users the lifecycle. The colors are neon/high-contrast because brutalism demands it, but their placement is disciplined.

### Color Map

| Color | Hex | Role | Used For | Never Used For |
|-------|-----|------|----------|----------------|
| **Pink** | `#FF4FD8` | **Create, Protect, Heir** | Create vault CTA, heir cards, "who inherits" step, reassign heir | Status banners, error states, warnings |
| **Lime** | `#a3e635` | **Active, Alive, Primary** | Active status banner, check-in button, primary success, step completion | Inactive states, errors, claimable urgency |
| **Cyan** | `#22d3ee` | **Time, Grace, Countdown** | Heartbeat interval settings, grace period, countdown digits, timer edits | Primary CTAs, heir-related UI |
| **Yellow** | `#facc15` | **Heirs, Claims, Inheritance** | Claim portal, heir badge, inheritance received, "your inheritance" messaging | Active status, error states |
| **Orange** | `#fb923c` | **Claimable, Urgent, Attention** | Claimable status banner, deposit tokens tab, urgent actions | Success states, active states |
| **Purple** | `#c084fc` | **Guardian, Delegate, Authority** | Guardian setup, guardian portal, delegate actions, pause functionality | Heir-related UI, primary CTAs |
| **Red** | `#f87171` | **Error, Emergency, Destroy** | Emergency withdraw, flatline/distributed, destructive actions, errors | Any positive state |

### Color Application Rules

#### Rule 1: One highlight per headline
The hero gets **one** colored highlight, not two. The headline should punch once.

**Before (wrong):**
```
Protect your [PINK]assets.[/PINK] Pass it on [ORANGE]trustlessly.[/ORANGE]
```

**After (right):**
```
Protect your [PINK]assets.[/PINK] Pass it on trustlessly.
```

#### Rule 2: Cards carry color, sections don't
Section backgrounds are white or light gray. The colored cards sit on them. This gives the eye room to rest.

**Before (wrong):**
```
[LIME BACKGROUND SECTION]
  [white card]
  [white card]
```

**After (right):**
```
[WHITE BACKGROUND SECTION]
  [LIME card with lime shadow]
  [PINK card with pink shadow]
```

#### Rule 3: Status colors are functional, not decorative
The dashboard status banner changes color based on vault state. This is **information**, not branding.

| State | Banner Color | Button |
|-------|-------------|--------|
| Active | Lime | "Check In" (lime) |
| Grace | Yellow | "Check In — Urgent" (yellow, shake animation) |
| Claimable | Orange | "Claim" (for heirs) or "Expired" (for owner) |
| Distributed | Red/Gray | None — vault closed |

#### Rule 4: Shadows match card color
Each colored card casts a shadow in its own color. This reinforces the color-language.

```css
.neo-card-pink { box-shadow: 12px 12px 0 0 #FF4FD8; }
.neo-card-lime { box-shadow: 12px 12px 0 0 #a3e635; }
.neo-card-cyan { box-shadow: 12px 12px 0 0 #22d3ee; }
```

---

## 2. Naming Conventions

### The "Edit Settings" Problem

**Current:** "Edit Settings" with a gear icon. Too generic. Doesn't communicate what can be changed.

**What it actually does:** Updates heartbeat interval, grace period, pause duration, and estate label.

**Rejected names:**
- "Change Timer" — misses that label can also be changed
- "Update Settings" — still generic
- "Modify Estate" — too technical

**Chosen name:** **"Update Estate"**

**Why:** It's accurate (updates the estate config), it's two words, it's action-oriented. The icon becomes a pencil/edit icon, not a gear.

**Card copy:**
```
[Edit icon] Update Estate
Adjust your check-in schedule, grace period, or estate label.
```

---

### Other Action Names

| Current | Proposed | Why |
|---------|----------|-----|
| "Edit Settings" | **"Update Estate"** | Accurate, action-oriented |
| "Reassign Heir" | **"Change Heir"** | Simpler, same meaning |
| "Register New Asset" | **"Add Asset"** | Shorter, no jargon |
| "Emergency Withdraw" | **"Close Vault & Withdraw"** | Clearer consequence |
| "Top Up" | **"Add More"** | Friendlier, less financial-jargon |
| "Enable Yield" | **"Earn Yield"** | Benefit-focused |
| "Recall" | **"Return to Vault"** | Clearer what happens |

---

## 3. Hero Section

### Button Sizing Issue

**Current:** The two buttons are different sizes.

```tsx
<Button variant="lime" size="xl">        // xl = bigger padding
  {isConnected ? "Create Vault" : "Launch Tour"}
</Button>
<Button variant="outline" size="xl">      // xl but outline has less visual weight
  <Play className="h-5 w-5" /> View Demo
</Button>
```

**Problem:** "View Demo" has an icon + text, making it feel smaller than the primary CTA even though both are `size="xl"`. The visual weight is unbalanced.

**Fix:** Make them the same height, same padding. The primary CTA (pink/lime) stays bold. The secondary CTA (outline) gets equal height but lighter visual weight through the outline style.

```tsx
// Both buttons: same height (52px), same horizontal padding (32px)
// Primary: filled + shadow
// Secondary: outline + no shadow
```

### Hero CTA Strategy

| User State | Primary CTA | Secondary CTA |
|-----------|-------------|---------------|
| Not connected | **"Create Vault"** (opens wallet dialog) | "View Demo" |
| Connected, no vault | **"Create Vault"** | "View Demo" |
| Connected, has vault | **"Go to Dashboard"** | "Create Another Vault" |

**No "Launch Tour"** — it's confusing. The tour can auto-trigger for first-time visitors (one time, dismissible).

---

## 4. Create Vault Flow

### Reordered Steps

| Step | Name | Color | What You Do |
|------|------|-------|-------------|
| 1 | **Who Inherits?** | Pink | Set heir address, label, guardian, heartbeat signer |
| 2 | **What to Protect?** | Orange | Deposit SOL and/or SPL tokens |
| 3 | **Check-in Schedule** | Cyan | Set heartbeat interval, grace period, pause duration |
| 4 | **Review** | Lime | Confirm everything, submit |

### Step 2: Deposit — Tabs for SOL / Tokens

**Tab: Deposit SOL**
```
┌─────────────────────────────────────────┐
│  [Deposit SOL]  [Deposit Tokens]        │
├─────────────────────────────────────────┤
│                                         │
│         0.00  SOL                       │
│         ───────────                     │
│                                         │
│  [Skip] [25%] [50%] [75%] [Max]        │
│                                         │
│  Wallet balance: 4.23 SOL               │
│                                         │
└─────────────────────────────────────────┘
```

**Tab: Deposit Tokens**
```
┌─────────────────────────────────────────┐
│  [Deposit SOL]  [Deposit Tokens]        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🔍 Search tokens...            │    │
│  ├─────────────────────────────────┤    │
│  │  [USDC icon] USDC      1,500   │    │
│  │  USD Coin          [Select ▼]   │    │
│  │                                  │    │
│  │  [BONK icon] BONK    250,000   │    │
│  │  Bonk              [Select ▼]   │    │
│  │                                  │    │
│  │  [RAY icon] RAY          45    │    │
│  │  Raydium           [Select ▼]   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Selected:                              │
│  • USDC: 500.00        [✕]            │
│  • BONK: 100,000       [✕]            │
│                                         │
└─────────────────────────────────────────┘
```

### Handling 1,000+ Tokens

**Problem:** Some users have thousands of tokens (airdrops, dust, NFTs). Showing all is impossible.

**Solution:**

1. **Default view:** Show only tokens with `uiAmount > 0` and sorted by balance (highest first). Cap at 50.
2. **Search:** Real-time filter by name, symbol, or mint address.
3. **Sort toggle:** Balance (default) | Name | Recently active
4. **"Show all" button:** Expands to full list with virtual scrolling (react-window).
5. **Dust filter:** Toggle to hide tokens worth < $0.01.

```
┌─────────────────────────────────────────┐
│  🔍 Search tokens...                    │
│  [Sort: Balance ▼] [Hide dust: ✓]       │
├─────────────────────────────────────────┤
│  Showing 50 of 1,247 tokens             │
│  ┌─────────────────────────────────┐    │
│  │  [USDC] USDC        1,500.00   │    │
│  │  [BONK] BONK      250,000.00   │    │
│  │  ...                            │    │
│  └─────────────────────────────────┘    │
│         [Show All 1,247]                │
└─────────────────────────────────────────┘
```

---

## 5. Dashboard — Assets & Tokens

### Asset Section Layout

```
┌─────────────────────────────────────────┐
│  Assets                        [2]     │
├─────────────────────────────────────────┤
│  [SOL]  [Tokens]                        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [SOL icon]                     │    │
│  │  SOL                            │    │
│  │                                 │    │
│  │         1.500000                │    │
│  │                                 │    │
│  │  [Add More]  [Earn Yield]       │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### Token Card (Vertical, Brutalist)

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │  [USDC icon]  USDC              │    │
│  │  USD Coin                       │    │
│  │                                 │    │
│  │         1,500.50                │    │
│  │                                 │    │
│  │  [Add More]  [Earn Yield]       │    │
│  │  [Return to Vault]              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [BONK icon]  BONK             │    │
│  │  Bonk                         │    │
│  │                                 │    │
│  │       250,000.00              │    │
│  │                                 │    │
│  │  [Add More]  [Earn Yield]       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Token card states:**

| State | Visual |
|-------|--------|
| In vault | White card, black border, standard shadow |
| Yield active (Lulo) | Cyan top border, "Yield: 6.2% APY" badge |
| Staking active | Lime top border, "Staking: 5.8% APY" badge |
| Yield + staking | Split top border (cyan + lime), both badges |

---

## 6. Dashboard — Yield Strategies

### Lulo (Token Yield)

**What it does:** Lends tokens to earn yield. Protected or unprotected.

**Card when yield is active:**
```
┌─────────────────────────────────────────┐
│  [USDC icon]  USDC              [cyan] │
│  USD Coin                               │
│                                         │
│         1,500.50                        │
│  ┌─────────────────────────────┐      │
│  │  🟢 Yield Active: 6.2% APY  │      │
│  │  Protected • $1,500.50      │      │
│  │  [Return to Vault]          │      │
│  └─────────────────────────────┘      │
│                                         │
│  [Add More]                             │
└─────────────────────────────────────────┘
```

**Enable yield flow:**
```
User clicks "Earn Yield" on token card
    ↓
Dialog: "Earn Yield on USDC?"
    • Protected (6.2% APY, lower risk)
    • Unprotected (8.5% APY, higher risk)
    [Cancel] [Confirm]
    ↓
Progress overlay: "Withdrawing from vault..." → "Depositing to Lulo..." → "Done"
    ↓
Card updates with cyan border + yield badge
```

### Solana Staking

**What it does:** Stakes SOL with a validator.

**Card when staking is active:**
```
┌─────────────────────────────────────────┐
│  [SOL icon]  SOL                [lime]   │
│                                         │
│         1.500000                        │
│  ┌─────────────────────────────┐      │
│  │  🟢 Staking: 5.8% APY       │      │
│  │  Validator: Jito            │      │
│  │  [Return to Vault]          │      │
│  └─────────────────────────────┘      │
│                                         │
│  [Add More]                             │
└─────────────────────────────────────────┘
```

**Enable staking flow:**
```
User clicks "Earn Yield" on SOL card
    ↓
Dialog: "Stake SOL?"
    • Select validator (Jito, Marinade, etc.)
    • Show APY for each
    [Cancel] [Confirm]
    ↓
Progress overlay: "Withdrawing from vault..." → "Delegating to validator..." → "Done"
    ↓
Card updates with lime border + staking badge
```

### Strategy States

| State | Badge Color | Action Available |
|-------|-------------|-------------------|
| Idle (no strategy) | None | "Earn Yield" |
| Lulo active | Cyan | "Return to Vault" |
| Staking active | Lime | "Return to Vault" |
| Withdrawing | Yellow (pulse) | None (in progress) |
| Returning | Yellow (pulse) | None (in progress) |

---

## 7. Dashboard — Actions

### Current Actions Grid

```
[Reassign Heir] [Edit Settings] [Add Asset] [Emergency Withdraw]
```

**Problems:**
- "Edit Settings" is generic (fixed: "Update Estate")
- All 4 buttons have equal visual weight, but "Emergency Withdraw" is destructive
- No grouping — heir-related, asset-related, and destructive actions are mixed

### Proposed Actions Layout

```
┌─────────────────────────────────────────┐
│  Manage Estate                          │
├─────────────────────────────────────────┤
│                                         │
│  Heir & Timing                          │
│  ┌─────────────┐ ┌─────────────┐       │
│  │ Change Heir │ │ Update Estate│       │
│  └─────────────┘ └─────────────┘       │
│                                         │
│  Assets                                 │
│  ┌─────────────┐ ┌─────────────┐       │
│  │ Add Asset   │ │ Top Up SOL  │       │
│  └─────────────┘ └─────────────┘       │
│                                         │
│  Danger Zone                            │
│  ┌─────────────────────────────────┐   │
│  │ ⚠️ Close Vault & Withdraw       │   │
│  │ Reclaim all assets and cancel   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Grouping:**
- **Heir & Timing:** Change Heir, Update Estate
- **Assets:** Add Asset, Top Up (contextual — shows the asset you last interacted with)
- **Danger Zone:** Emergency Withdraw (red, full-width, separated)

---

## 8. Claim / Heir Flow

### Core Principle: Silent Inheritance

The heir **does not know** about the vault until the owner is gone. This is the product's core value.

**How the heir finds out:**
1. Owner's will/trust mentions the on-chain vault
2. Dead man's switch email (separate service)
3. Family member informs them
4. They hear about Heirloom and check

**Heir's first interaction:**
```
┌─────────────────────────────────────────┐
│  Claim Inheritance                      │
│                                         │
│  Connect your wallet to see if any      │
│  estates name you as heir.              │
│                                         │
│         [Connect Wallet]                │
│                                         │
│  ─────────── or ───────────            │
│                                         │
│  Have an estate address?                │
│  [Look up manually]                     │
│                                         │
└─────────────────────────────────────────┘
```

**After connect (estates found):**
```
┌─────────────────────────────────────────┐
│  Found 1 estate                         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  From: 7xKX...3mP2              │    │
│  │  Label: "son"                  │    │
│  │  Status: Claimable             │    │
│  │                                 │    │
│  │  Assets:                        │    │
│  │  • 1.5 SOL                      │    │
│  │  • 1,500.50 USDC                │    │
│  │                                 │    │
│  │     [Claim Inheritance]         │    │
│  │     (0.75% protocol fee)        │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**No shareable link. No owner notification. No heir alert.**

---

## 9. Heartbeat / Signer Flow

### Who is the heartbeat signer?

A **hot wallet** that can check in on behalf of the owner. It cannot:
- Change heirs
- Withdraw assets
- Modify settings

It can only:
- Send heartbeat (reset timer)

### Signer's experience

```
┌─────────────────────────────────────────┐
│  Heartbeat Signer                       │
│                                         │
│  Connect your wallet to see estates     │
│  where you are the authorized signer.   │
│                                         │
│         [Connect Wallet]                │
│                                         │
└─────────────────────────────────────────┘
```

**After connect:**
```
┌─────────────────────────────────────────┐
│  Found 1 estate you can sign for        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Owner: 7xKX...3mP2             │    │
│  │  Label: "son"                    │    │
│  │  Status: Active                  │    │
│  │  Next check-in: 14 days         │    │
│  │                                 │    │
│  │     [Check In]                  │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**No manual address entry. Wallet is the lookup key.**

---

## 10. Guardian / Defer Flow

### Who is the guardian?

A **trusted address** that can pause the claim window **once**. It cannot:
- Withdraw assets
- Change heirs
- Claim inheritance

It can only:
- Extend the deadline by the pause duration (one time)

### Guardian's experience

```
┌─────────────────────────────────────────┐
│  Guardian Portal                        │
│                                         │
│  Connect your wallet to see estates     │
│  where you are the assigned guardian.   │
│                                         │
│         [Connect Wallet]                │
│                                         │
└─────────────────────────────────────────┘
```

**After connect (estate in grace):**
```
┌─────────────────────────────────────────┐
│  ⚠️ Estate in Grace Period              │
│                                         │
│  Owner: 7xKX...3mP2                     │
│  Label: "son"                           │
│  Time remaining: 12 days               │
│                                         │
│  You can extend the deadline by 30 days │
│  (one time only).                       │
│                                         │
│  [Extend Deadline]                      │
│                                         │
└─────────────────────────────────────────┘
```

**After connect (estate active):**
```
┌─────────────────────────────────────────┐
│  Estate is Active                       │
│                                         │
│  Owner: 7xKX...3mP2                     │
│  Label: "son"                           │
│  Status: All good                       │
│                                         │
│  No action needed. Guardian pause is    │
│  available if the estate enters grace.  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 11. Component Specifications

### Button Hierarchy

| Type | Style | Use For |
|------|-------|---------|
| **Primary** | Filled color (pink/lime) + black border + shadow | Main action on screen |
| **Secondary** | Outline + black border | Alternative action |
| **Tertiary** | Text only + underline | Subtle action (learn more) |
| **Destructive** | Red fill + black border | Emergency withdraw, cancel |

### Button Sizing Rule

**All buttons on the same row must have the same height.**

```
┌─────────────────────────────────────────┐
│                                         │
│  [    Create Vault    ]  [View Demo]    │  ← Same height
│                                         │
│  [Create Vault]  [    View Demo    ]    │  ← WRONG: different sizes
│                                         │
└─────────────────────────────────────────┘
```

**Implementation:**
```tsx
// Both buttons: h-14 (56px), px-8
<Button className="h-14 px-8">Create Vault</Button>
<Button className="h-14 px-8" variant="outline">View Demo</Button>
```

### Card Shadow System

| Card Type | Shadow | Hover Shadow |
|-----------|--------|--------------|
| Default (white) | `12px 12px 0 0 #0a0a0a` | `16px 16px 0 0 #0a0a0a` |
| Pink | `12px 12px 0 0 #FF4FD8` | `16px 16px 0 0 #FF4FD8` |
| Lime | `12px 12px 0 0 #a3e635` | `16px 16px 0 0 #a3e635` |
| Cyan | `12px 12px 0 0 #22d3ee` | `16px 16px 0 0 #22d3ee` |
| Yellow | `12px 12px 0 0 #facc15` | `16px 16px 0 0 #facc15` |
| Orange | `12px 12px 0 0 #fb923c` | `16px 16px 0 0 #fb923c` |
| Purple | `12px 12px 0 0 #c084fc` | `16px 16px 0 0 #c084fc` |
| Red | `12px 12px 0 0 #f87171` | `16px 16px 0 0 #f87171` |

### Typography Scale

| Element | Font | Size | Weight | Transform |
|---------|------|------|--------|-----------|
| H1 (hero) | Space Grotesk | 5xl-7xl | 900 | uppercase |
| H2 (section) | Space Grotesk | 4xl-6xl | 900 | uppercase |
| H3 (card title) | Space Grotesk | xl-2xl | 900 | none |
| Body | Inter | lg | 500 | none |
| Label | Inter | xs | 700 | uppercase, tracking-widest |
| Button | Inter | sm-base | 800 | uppercase |
| Mono (addresses) | Mono | xs-sm | 400 | none |
| Countdown | Space Grotesk | 4xl-6xl | 900 | tabular-nums |

---

## Appendix: Current vs. Proposed Quick Reference

| Area | Current | Proposed |
|------|---------|----------|
| **Hero buttons** | Different visual weights | Same height, balanced weight |
| **Hero CTA** | "Launch Tour" / "Create Vault" | Always "Create Vault" (or "Go to Dashboard") |
| **Create step 1** | Heartbeat | **Heir** (emotional anchor first) |
| **Create step 2** | Heir | **Deposit** (tangible value) |
| **Create step 3** | Deposit | **Heartbeat** (technical, now makes sense) |
| **Deposit UI** | Everything visible | **Tabs**: SOL / Tokens |
| **Token list** | All visible, no cap | **Search + sort + dust filter + virtual scroll** |
| **Dashboard heir** | Always visible | **Collapsible accordion** |
| **Dashboard guardian** | Always visible | **Collapsible accordion** |
| **Dashboard actions** | 4 equal buttons | **Grouped**: Heir/Timing, Assets, Danger Zone |
| **"Edit Settings"** | Generic, gear icon | **"Update Estate"**, pencil icon |
| **"Top Up"** | Financial jargon | **"Add More"** |
| **"Enable Yield"** | Technical | **"Earn Yield"** (benefit-focused) |
| **Claim flow** | Manual address lookup | **Auto-scan on wallet connect** |
| **Heartbeat flow** | Manual address lookup | **Auto-scan on wallet connect** |
| **Guardian flow** | Manual address lookup | **Auto-scan on wallet connect** |
| **Share with heir** | Shareable link idea | **No link.** Silent by design. |
