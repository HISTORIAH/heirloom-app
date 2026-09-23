/**
 * Copy for stocks.heirlm.xyz.
 *
 * Its own namespace, like the landing's: the stocks workspace is a separate
 * package and the app has no reason to carry these strings. Generic chrome —
 * connecting a wallet, the wallet dialog, the error screen, the 404 — is read
 * from the `app` namespace instead, which is already translated.
 */
const stocks = {
  nav: {
    portfolio: "Portfolio",
    browse: "Browse",
    protect: "Protect",
    dashboard: "Dashboard",
    recover: "Recover",
    inherit: "Inherit",
  },
  pages: {
    portfolio: {
      cap: "Portfolio",
      headline: "Your tokenized stocks.",
      description: "The equities held in this wallet, and whether each one is backed up.",
    },
    browse: {
      cap: "Browse",
      headline: "Stocks Heirloom can protect.",
      description:
        "Every tokenized equity from xStocks and Ondo, grouped by company, with what each issuer can still do to a position.",
    },
    protect: {
      cap: "Protect",
      headline: "Back up your stocks.",
      description:
        "Name a recovery wallet and choose which holdings it can reclaim. Your stocks stay in your wallet and stay tradeable.",
    },
    dashboard: {
      cap: "Dashboard",
      headline: "Coverage at a glance.",
      description:
        "Check in, watch every covered holding, and see what each issuer can still change.",
    },
    recover: {
      cap: "Recover",
      headline: "Recover a lost wallet.",
      description:
        "Connect the recovery wallet you named. Once the check-in window lapses, it can move the covered stocks to itself.",
    },
    inherit: {
      cap: "Inherit",
      headline: "Leave stocks to an heir.",
      description:
        "Deposit stocks into a vault that passes to your heir if you stop checking in. Vaulted stocks can't be traded until you withdraw them.",
    },
  },
  connect: {
    title: "Connect a wallet to continue",
    description: "Everything on this page is read from, and signed by, your own wallet.",
  },
  common: {
    loading: "Loading…",
    loadFailed: "Couldn't read the chain. Check your connection and try again.",
    retry: "Try again",
    max: "Max",
    days_one: "{{count}} day",
    days_other: "{{count}} days",
    backup: "Backup",
    notProtected: "Not protected",
    allocation: "Allocation",
    amount: "Amount",
    recoveryWallet: "Recovery wallet",
    guardian: "Guardian",
    checkinWallet: "Check-in wallet",
    none: "None",
    issuerTier: "Risk tier {{tier}}",
    unknownIssuer: "Unregistered issuer",
    checkIn: "Check in",
  },
  health: {
    covered: {
      label: "Covered",
      hint: "The plan can move this holding when it becomes recoverable.",
    },
    evicted: {
      label: "Coverage lost",
      hint: "Another approval replaced the plan as this account's delegate. Re-approve to restore it.",
    },
    frozen: {
      label: "Frozen",
      hint: "The issuer froze this account. Nothing can move it until they thaw it.",
    },
    paused: {
      label: "Paused",
      hint: "The issuer has paused this stock. Recovery resumes when they unpause it.",
    },
    "hook-live": {
      label: "Transfer hook",
      hint: "The issuer switched on a transfer hook, which recovery does not support yet.",
    },
    "clawback-added": {
      label: "Clawback added",
      hint: "The issuer gained power to move tokens out of any account after this was covered, so recovery will not proceed.",
    },
    closed: {
      label: "Account closed",
      hint: "The covered token account no longer exists. Remove the record to tidy up the plan.",
    },
  },
  risk: {
    legend: "What the issuer can still do",
    clawback: {
      label: "Clawback",
      hint: "A permanent delegate can move tokens out of any holder's account without their signature.",
    },
    pausable: {
      label: "Pausable",
      hint: "The issuer can halt every transfer, including a recovery.",
    },
    paused: { label: "Paused now", hint: "The issuer has halted transfers of this stock." },
    freezable: { label: "Freezable", hint: "The issuer can freeze individual accounts." },
    "hook-slot": {
      label: "Hook slot",
      hint: "A transfer hook is reserved and could be switched on later without a new mint.",
    },
  },
  blockers: {
    "issuer-unregistered": "Heirloom doesn't support this issuer on this network yet.",
    "issuer-disabled": "Heirloom has suspended new coverage for this issuer.",
    "no-mint-authority": "This mint has no issuer key, so its issuer can't be verified.",
    "frozen-by-default":
      "New accounts for this stock start frozen, so a recovery could not be received.",
    "non-transferable": "This token can't be transferred.",
    "transfer-hook": "This stock has an active transfer hook, which isn't supported yet.",
    "account-frozen": "The issuer has frozen this account.",
    "cpi-guard": "CPI Guard is on for this account. Turn it off in your wallet to cover it.",
  },
  phase: {
    active: "Active",
    grace: "Grace period",
    recoverable: "Recoverable",
  },
  clock: {
    checkInBy: "Check in by {{date}}",
    recoverableFrom: "Recoverable from {{date}}",
    recoverableSince: "Recoverable since {{date}}",
    deferred: "A guardian has deferred this plan until {{date}}.",
    lastCheckIn: "Last check-in {{date}}",
  },
  planForm: {
    backupTitle: "Name a recovery wallet",
    backupDescription:
      "A wallet you control and keep somewhere else. If you stop checking in, it can move the stocks you cover to itself. Nobody else can trigger it.",
    vaultTitle: "Name an heir",
    vaultDescription:
      "The wallet that receives the vault if you stop checking in. You can withdraw everything yourself at any time before then.",
    recoveryWallet: "Recovery wallet address",
    heir: "Heir wallet address",
    interval: "Check in every",
    intervalHint: "How long you can go without checking in before the grace period starts.",
    grace: "Grace period",
    graceHint: "Extra time after a missed check-in before the plan becomes recoverable.",
    guardian: "Guardian (optional)",
    guardianHint: "Someone who can push the deadline out once if you're alive but can't check in.",
    defer: "Guardian can defer by",
    checkinWallet: "Check-in wallet (optional)",
    checkinWalletHint: "A hot wallet that can check in for you but can do nothing else.",
    unit: "days",
    submitBackup: "Create backup plan",
    submitVault: "Create vault",
    errors: {
      address: "Enter a valid Solana address.",
      self: "This has to be a different wallet from the one connected.",
      range: "Enter a whole number of days between {{min}} and {{max}}.",
    },
  },
  settings: {
    title: "Plan settings",
    description: "Changing settings doesn't count as a check-in.",
    save: "Save changes",
    close: "Close plan",
    closeHint: "Available once nothing is covered. Returns the plan's rent to you.",
  },
  portfolio: {
    held: "Stocks held",
    backedUp: "Backed up",
    backedUpOf: "{{covered}} of {{total}}",
    needsAttention_one: "{{count}} needs attention",
    needsAttention_other: "{{count}} need attention",
    inVault: "In your vault",
    nextCheckIn: "Next check-in",
    noPlan: "No plan yet",
    holdings: "Holdings",
    vaulted: "Vaulted",
    protect: "Protect",
    emptyTitle: "No tokenized stocks here",
    emptyDescription:
      "This wallet doesn't hold any equities from a supported issuer. Heirloom recognises {{formatted}} tokenized stocks from xStocks and Ondo.",
    browseAll: "Browse all {{formatted}}",
  },
  browse: {
    networkCap: "Mainnet listings",
    networkNote:
      "These are the stocks xStocks and Ondo issue on Solana mainnet. Heirloom Stocks runs on devnet for now, where only test stocks exist, so none of these can be held or covered here yet.",
    searchLabel: "Search",
    searchPlaceholder: "Ticker, company, or mint address",
    issuerLabel: "Issuer",
    issuers: {
      all: "All",
      xstocks: "xStocks",
      ondo: "Ondo",
    },
    heldOnly: "Only stocks I hold",
    companies_one: "{{formatted}} company",
    companies_other: "{{formatted}} companies",
    tokens_one: "{{formatted}} token",
    tokens_other: "{{formatted}} tokens",
    connectHint: "Connect a wallet to see which of these you hold.",
    connect: "Connect",
    walletFailed: "Couldn't read this wallet's holdings, so they aren't marked below.",
    noMatchTitle: "No matches",
    noMatchDescription:
      "Nothing listed matches “{{query}}”. Try a ticker like AAPL, a company name, or a mint address.",
    noneHeldTitle: "None held",
    noneHeldDescription: "This wallet doesn't hold any of the listed stocks.",
    showMore_one: "Show {{count}} more",
    showMore_other: "Show {{count}} more",
    youHold: "You hold {{amount}}",
    inVault: "In your vault",
    buy: "Get on Jupiter",
    source:
      "Listings from xStocks and Ondo as of {{date}}. Issuer powers are what each issuer's mints carried when checked on mainnet; a stock you hold shows its own.",
    unavailableTitle: "The listings couldn't load",
    unavailableDescription:
      "Reload the page to try again. Your holdings and plans don't depend on them.",
  },
  protect: {
    planTitle: "Your backup plan",
    settingsLink: "Change these on the dashboard.",
    chooseTitle: "Choose what it covers",
    chooseDescription:
      "Covering a holding lets the plan move it later without your key. Nothing moves now, and you can still trade it.",
    allocationHint: "Share of the balance that moves on recovery.",
    coverNone: "Select holdings to cover",
    cover_one: "Cover {{count}} holding",
    cover_other: "Cover {{count}} holdings",
    nothingToCover: "Every stock in this wallet is already covered.",
    coveredTitle: "Covered",
    stopCovering: "Stop covering",
    missing_one:
      "{{count}} covered record couldn't be read from the network yet. It will appear on the next refresh.",
    missing_other:
      "{{count}} covered records couldn't be read from the network yet. They will appear on the next refresh.",
  },
  dashboard: {
    noPlanTitle: "Nothing to watch yet",
    noPlanDescription: "Back up the stocks in this wallet, or put some in a vault for an heir.",
    startBackup: "Back up stocks",
    startVault: "Open a vault",
    backupTitle: "Backup plan",
    vaultTitle: "Vault",
    manageVault: "Manage the vault",
    alertTitle_one: "Coverage lost on {{count}} holding",
    alertTitle_other: "Coverage lost on {{count}} holdings",
    alertDescription:
      "Approving another app on a covered account replaces Heirloom as its delegate, without any error. Re-approve to restore coverage.",
    healthTitle: "Coverage health",
    healthEmpty: "No holdings are covered yet.",
    reapprove: "Re-approve",
    removeRecord: "Remove record",
    dividendsTitle: "Upcoming corporate actions",
    dividendsDescription:
      "Dividends and splits change a display multiplier on the mint. The next change is on-chain before it takes effect.",
    dividendsEmpty: "No changes are scheduled for your stocks.",
    dividendRow: "{{change}} on {{date}}",
    currentMultiplier: "Multiplier {{value}}",
    riskTitle: "Issuer risk",
    riskNone: "No issuer controls flagged.",
  },
  recover: {
    emptyTitle: "No plans name this wallet",
    emptyDescription:
      "When someone names this wallet as their recovery wallet, heir, guardian, or check-in wallet, their plan shows up here.",
    backupOf: "Backup plan of {{owner}}",
    vaultOf: "Vault of {{owner}}",
    roles: {
      destination: "You receive these assets",
      guardian: "You are the guardian",
      checkin: "You check in for the owner",
    },
    willMove: "Moves",
    recover: "Recover",
    recoverAll: "Recover all",
    claim: "Claim",
    claimAll: "Claim all",
    defer: "Defer by {{duration}}",
    deferUnavailable: "This plan has already been deferred, or is past its deadline.",
    notYet: "Available {{date}}.",
    nothingToRecover: "None of this owner's covered stocks are recoverable right now.",
    feeNote: "A {{fee}} protocol fee comes out of each transfer.",
  },
  inherit: {
    planTitle: "Your vault",
    contentsTitle: "In the vault",
    tradeoff:
      "A vault holds your stocks in accounts only the plan controls. Unlike a backup, no later approval can displace it — but vaulted stocks can't be traded or used as collateral until you withdraw them.",
    empty: "The vault is empty. Add a stock below.",
    addTitle: "Add to the vault",
    addDescription:
      "Everything in the vault passes to your heir. Deposit only what you want them to receive.",
    chooseStock: "Stock",
    choose: "Choose a stock",
    add: "Add to vault",
    deposit: "Add more",
    withdraw: "Withdraw",
    withdrawNote: "A {{fee}} fee comes out of withdrawals.",
    nothingToAdd: "No stocks in this wallet can be vaulted.",
  },
  tx: {
    signing: "Confirm in your wallet…",
    rejected: "Request rejected in your wallet.",
    failed: "Transaction failed",
    view: "View transaction",
    done: {
      createBackup: "Backup plan created",
      createVault: "Vault created",
      cover: "Coverage added",
      uncover: "Coverage removed",
      reapprove: "Coverage restored",
      removeRecord: "Record removed",
      checkIn: "Checked in",
      settings: "Settings saved",
      closePlan: "Plan closed",
      recover: "Recovered",
      claim: "Claimed",
      defer: "Deadline deferred",
      vaultAdd: "Added to the vault",
      vaultDeposit: "Deposited",
      vaultWithdraw: "Withdrawn",
    },
  },
  errors: {
    generic: "Something went wrong. Nothing was changed.",
    unauthorized: "This wallet isn't allowed to do that for this plan.",
    notYetRecoverable: "This plan isn't recoverable yet.",
    alreadyDeferred: "A guardian has already deferred this plan.",
    deferWindowExpired: "The plan is past its deadline, so it can no longer be deferred.",
    insufficientBalance: "There's nothing to move from this account.",
    invalidAllocation: "Allocation has to be between 1% and 100%.",
    planNotEmpty: "Remove or withdraw everything before closing the plan.",
    issuerNotSupported: "Heirloom doesn't support this stock's issuer.",
    frozenByDefault: "This stock's accounts start frozen, so it can't be covered.",
    transferHook: "This stock has an active transfer hook, which isn't supported yet.",
    assetPaused: "The issuer has paused this stock. Try again once they unpause it.",
    accountFrozen: "The issuer has frozen this account.",
    nonTransferable: "This token can't be transferred.",
    cpiGuard: "Turn off CPI Guard for this account in your wallet, then try again.",
    permanentDelegateAdded:
      "The issuer added clawback power after this was covered, so it won't be moved automatically.",
    delegateEvicted: "The plan is no longer this account's delegate. Re-approve it first.",
  },
  seo: {
    defaultDescription:
      "Back up your tokenized stocks and leave them to an heir — Heirloom on Solana.",
    portfolioTitle: "Portfolio · Heirloom Stocks",
    browseTitle: "Browse · Heirloom Stocks",
    protectTitle: "Protect · Heirloom Stocks",
    dashboardTitle: "Dashboard · Heirloom Stocks",
    recoverTitle: "Recover · Heirloom Stocks",
    inheritTitle: "Inherit · Heirloom Stocks",
    notFoundTitle: "Not found · Heirloom Stocks",
  },
};

export default stocks;
