const waitlist = {
  eyebrow: "Solana inheritance protocol",
  heading: {
    line1: "Your wallet",
    line2: "should outlive you.",
  },
  description:
    "A heartbeat-based vault that keeps your assets yours, then passes them on exactly as you intend.",
  form: {
    label: "Get early access",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    submit: "Join waitlist",
    submitting: "Joining...",
    invalidEmail: "That doesn't look like a valid email.",
    genericError: "Something went wrong. Try again.",
  },
  success: {
    title: "You're on the list.",
    inbox: "Confirmation sent. Check your inbox.",
    devnetAction: "Try Heirloom on Devnet",
  },
  privacyNote: "No spam. No noise. One email when we launch.",
  proof: {
    header: "Proof of continuity",
    version: "V1.0",
    statementLine1: "If you stop,",
    statementLine2: "it starts.",
    steps: {
      one: { title: "You stay active", body: "Check in periodically." },
      two: { title: "Your assets stay yours", body: "Self-custodial and on-chain." },
      three: { title: "Your heirs come next", body: "When the heartbeat stops." },
    },
    footer: {
      left: "Set it once.",
      right: "Let it work.",
    },
  },
  siteFooter: {
    left: "Heirloom protocol · Waitlist edition",
    right: "Self-custodial · Trustless · Human",
  },
} as const;

export default waitlist;