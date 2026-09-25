/**
 * Copy for stocks.heirlm.xyz.
 *
 * Its own namespace, like the landing's: the stocks workspace is a separate
 * package and the app has no reason to carry these strings. Generic chrome —
 * connecting a wallet, the wallet dialog, the error screen, the 404 — is read
 * from the `app` namespace instead, which is already translated.
 */
const stocks = {
  /*
   * The marketing page at the origin's root. It is the one page here with a
   * pitch in it, so it has a voice of its own, and every figure it quotes is
   * either read live (catalog counts, prices) or a program constant.
   */
  landing: {
    nav: {
      stocks: "Stocks",
      howItWorks: "How it works",
      issuers: "Issuer risk",
      launch: "Launch app",
    },
    hero: {
      titleA: "Tokenized stocks,",
      titleB: "backed up.",
      lede: "Heirloom gives your xStocks and Ondo equities a way back. They stay in your wallet and stay tradeable, and a recovery wallet you name can reclaim them if you ever stop checking in.",
      primary: "Launch app",
      secondary: "Browse stocks",
      note: "Plans run on Solana devnet · prices are live from mainnet",
    },
    intro: {
      title: "Keep trading.\nStay covered.",
      body: "Tokenized stocks are SPL tokens, so a lost key loses the position. Heirloom puts a plan on-chain over the stocks you hold: name where they go, check in now and then, and carry on as normal. If the check-ins stop, the plan moves them. No seed phrase, no support ticket.",
      docs: "Read the docs",
      protect: "Back up stocks",
    },
    pillars: {
      custody: {
        title: "Non-custodial,\nby design.",
        body: "In backup mode your stocks never leave your wallet. The plan is only the token account's delegate, and it can only pay the wallet you named.",
      },
      liquid: {
        title: "Still yours\nto trade.",
        body: "Covered holdings stay liquid. Sell them, lend them, post them as collateral. Coverage is a share of whatever the balance is on the day it's used.",
      },
      dividends: {
        title: "Dividends and splits,\ncarried through.",
        body: "Issuers pay dividends by moving a multiplier on the mint, not by minting more tokens. Heirloom moves raw units, so the multiplier travels with them.",
        example: "Example",
        raw: "Raw units moved",
        multiplier: "Mint multiplier",
        shown: "Wallet shows",
      },
    },
    how: {
      tag: "heirloom-stocks",
      title: "How it works",
      body: "One program, two kinds of plan. A backup plan is the delegate on token accounts you already hold; a vault plan owns the accounts you deposit into. Either way the plan is the only thing that can move the stocks, and only to the wallet written into it.",
      topLabel: "Create · Check in · Cover · Deposit · Withdraw",
      owner: { title: "Your wallet", sub: "Owns the plan" },
      checkin: { title: "Check-in wallet", sub: "Checks in, nothing else" },
      guardian: { title: "Guardian", sub: "Defers once" },
      signs: "Signs",
      checksIn: "Checks in",
      defers: "Defers",
      program: "heirloom-stocks",
      backup: {
        title: "Backup plan",
        sub: "Delegate on your accounts",
        a: "Cover",
        aSub: "1–100% of a holding",
        b: "Stays in your wallet",
        bSub: "Tradeable · lendable",
        c: "Recover",
        cSub: "{{recoveryFee}} of what moves",
      },
      vault: {
        title: "Vault plan",
        sub: "Owner of the vault accounts",
        a: "Deposit",
        aSub: "Withdraw any time · {{exitFee}}",
        b: "Held in the vault",
        bSub: "The whole balance passes",
        c: "Claim",
        cSub: "{{recoveryFee}} of what moves",
      },
      registry: {
        title: "Issuer registry",
        sub: "xStocks · Ondo · checked on every cover and recovery",
      },
      lapse: "Interval and grace period pass",
      destination: {
        title: "Recovery wallet · Heir",
        sub: "Named by you, and the only wallet the plan can pay",
      },
    },
    catalog: {
      title: "Every stock\nthey issue.",
      body: "Heirloom registers issuers, not tickers. One entry admits an issuer's whole catalogue, including listings added later.",
      count: "{{formatted}} stocks from xStocks and Ondo",
    },
    cycle: {
      title: "The check-in cycle",
      body: "Every plan runs on the same clock. You choose the interval and the grace period, anywhere up to a year.",
      setup: {
        name: "Set up",
        when: "Day 0",
        body: "Name a recovery wallet or an heir, then pick an interval and a grace period.",
      },
      active: {
        name: "Active",
        when: "Every interval",
        body: "Check in from your wallet, or a hot wallet you allow, and the clock starts over.",
      },
      grace: {
        name: "Grace period",
        when: "A check-in is missed",
        body: "Extra time before anything can move. A guardian can push the deadline out once.",
      },
      recoverable: {
        name: "Recoverable",
        when: "Grace runs out",
        body: "Your recovery wallet or heir signs, and the covered stocks move to it.",
      },
    },
    price: {
      title: "Priced live on mainnet",
      body: "Every listed stock carries its live price from Jupiter, and the ones with a market can be bought or sold without leaving Heirloom.",
      pick: "Show the price of",
      trade: "Trade",
      change: "24h",
      unavailable: "Price unavailable",
      retry: "Try again",
      link: "Browse all {{formatted}} stocks",
      linkFallback: "Browse every stock",
    },
    open: {
      title: "Inside the app",
      browse: {
        title: "Browse",
        body: "Every stock, its live price, and what its issuer can still do.",
        cta: "Browse stocks",
      },
      protect: {
        title: "Protect",
        body: "Back up what's in your wallet to a recovery wallet you control.",
        cta: "Create a backup",
      },
      inherit: {
        title: "Inherit",
        body: "Put stocks in a vault that passes to your heir.",
        cta: "Open a vault",
      },
      recover: {
        title: "Recover",
        body: "Named in someone's plan? Recover, claim, or check in from here.",
        cta: "Open recovery",
      },
    },
    cta: {
      cap: "Heirloom Stocks",
      title:
        "Your stocks moved on-chain. Give them the way back a brokerage account always had, from the wallet you already use.",
      button: "Launch app",
    },
    facts: {
      stocks: "Stocks supported",
      tradable: "With a Jupiter market",
      fee: "Fee on a recovery",
      interval: "Longest check-in interval",
    },
    issuers: {
      title: "Know what the issuer can do",
      note: "Tokenized stocks come with issuer powers. Heirloom shows every one, and refuses the mints a recovery couldn't survive.",
      more: "Issuer controls",
      filterLabel: "Filter",
      filters: {
        all: "All",
        powers: "Issuer powers",
        refused: "Refused at cover",
        account: "Your account",
      },
      previous: "Previous",
      next: "Next",
      clawback: {
        title: "Clawback",
        body: "A permanent delegate can move tokens out of any account. Heirloom records whether one existed when you covered, and stops a recovery if one appears later.",
      },
      pausable: {
        title: "Pausable",
        body: "The issuer can halt every transfer, recoveries included. A paused recovery waits, and resumes when they unpause.",
      },
      freezable: {
        title: "Freezable",
        body: "Individual accounts can be frozen. Nothing moves a frozen account until the issuer thaws it.",
      },
      hookSlot: {
        title: "Hook slot",
        body: "A transfer hook is reserved on the mint and could be switched on later. You see it before you cover.",
      },
      frozenDefault: {
        title: "Frozen by default",
        body: "New accounts for the stock start frozen, so a recovery could never be received. These mints are refused.",
      },
      liveHook: {
        title: "Live transfer hook",
        body: "A hook that is already switched on could block the transfer a recovery needs. Refused until it's supported.",
      },
      unregistered: {
        title: "Unregistered issuer",
        body: "Coverage is limited to issuers in the on-chain registry, matched by mint authority on every cover.",
      },
      eviction: {
        title: "Delegate eviction",
        body: "Approving another app on a covered account quietly replaces Heirloom. The dashboard catches it, and one approval repairs it.",
      },
      cpiGuard: {
        title: "CPI Guard",
        body: "With CPI Guard on, the plan can't be approved on that account. Turn it off in your wallet, then cover it.",
      },
    },
    closing: {
      title: "Talk to us",
      body: "Questions about a plan, an issuer, or a stock that isn't listed yet? Find us here.",
      x: "Heirloom on X",
      github: "Heirloom on GitHub",
      docs: "Heirloom docs",
    },
    footer: {
      tagline: "Backup and inheritance for tokenized stocks, on Solana.",
      rights: "© {{year}} Heirloom",
      site: "heirlm.xyz",
      docs: "Docs",
      disclaimer:
        "heirloom-stocks runs on Solana devnet with test equities. Prices and trades are on mainnet, through Jupiter. Nothing here is investment advice.",
    },
  },
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
        "Every tokenized equity from xStocks and Ondo, grouped by company, with its live price, what each issuer can still do to a position, and a way to trade it.",
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
  /* Column headers for the app's lists. */
  columns: {
    stock: "Stock",
    balance: "Balance",
    backup: "Backup",
    issuerCan: "Issuer can",
    status: "Status",
    allocation: "Allocation",
    inVault: "In vault",
    moves: "Moves",
    price: "Price",
    issuer: "Issuer",
    position: "Your position",
    change: "Next change",
    tier: "Registry",
  },
  /*
   * What a page shows in place of wallet data before one is connected: the
   * interface stays, and each list says what would fill it.
   */
  preview: {
    holdings: "The stocks in your wallet show here, with which ones are backed up.",
    featuredTitle: "Stocks you can back up",
    featuredDescription:
      "A few of the {{formatted}} tokenized stocks Heirloom recognises. Connect a wallet to see which you hold.",
    view: "View",
  },
  common: {
    loading: "Loading…",
    loadFailed: "Couldn't read the chain. Check your connection and try again.",
    retry: "Try again",
    max: "Max",
    days_one: "{{count}} day",
    days_other: "{{count}} days",
    seconds_one: "{{count}} second",
    seconds_other: "{{count}} seconds",
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
    timer: {
      active: "Left to check in",
      grace: "Left until recoverable",
      recoverable: "Recoverable for",
    },
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
    units: { days: "days", seconds: "seconds" },
    presets: {
      label: "Preset",
      standard: "Standard",
      seconds: "Seconds",
      hint: "Standard is 30 days with 7 of grace. Seconds is 30 seconds with 15 of grace, for trying the whole flow in under a minute. Test networks only.",
    },
    submitBackup: "Create backup plan",
    submitVault: "Create vault",
    backupNote: "Creating the plan moves nothing. You choose what it covers next.",
    connectNote: "You'll connect a wallet to create it. Nothing moves until you choose what it covers.",
    connectVaultNote: "You'll connect a wallet to create it. Nothing moves until you add stocks.",
    vaultNote: "Creating the vault moves nothing. You add stocks to it next.",
    groups: {
      recipient: "Recipient",
      timing: "Timing",
      timingHint: "Each can be up to 365 days.",
      helpers: "Helpers",
      helpersHint: "Optional. You can add or remove them later.",
    },
    errors: {
      address: "Enter a valid Solana address.",
      self: "This has to be a different wallet from the one connected.",
      range: "Enter a whole number of {{unit}} between {{min}} and {{max}}.",
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
    networkCap: "Live on mainnet",
    networkNote:
      "Prices, balances, and trades on this page are real, on Solana mainnet, through Jupiter. Backing stocks up and leaving them to an heir still runs on devnet with test stocks, so these can't be covered here yet.",
    searchLabel: "Search",
    searchPlaceholder: "Ticker, company, or mint address",
    issuerLabel: "Issuer",
    issuers: {
      all: "All",
      xstocks: "xStocks",
      ondo: "Ondo",
    },
    heldOnly: "Only stocks I hold",
    tradableOnly: "Only tradable on Jupiter",
    companies_one: "{{formatted}} company",
    companies_other: "{{formatted}} companies",
    tokens_one: "{{formatted}} token",
    tokens_other: "{{formatted}} tokens",
    connectHint: "Connect a wallet to see what you hold on mainnet, and to trade.",
    connect: "Connect",
    walletFailed: "Couldn't read this wallet's mainnet holdings, so they aren't marked below.",
    noMatchTitle: "No matches",
    noMatchDescription:
      "Nothing listed matches “{{query}}”. Try a ticker like AAPL, a company name, or a mint address.",
    noneHeldTitle: "None held",
    noneHeldDescription: "This wallet doesn't hold any of the listed stocks.",
    showMore_one: "Show {{count}} more",
    showMore_other: "Show {{count}} more",
    youHold: "You hold {{amount}}",
    inVault: "In your vault",
    trade: "Trade",
    underlying: "{{ticker}} {{price}}",
    noMarket: "No market yet",
    noMarketHint:
      "This token has no on-chain market yet, so Jupiter can't trade it. The price below is the listed share's.",
    heldSummary_one: "You hold {{count}} of these stocks on mainnet, worth {{value}}.",
    heldSummary_other: "You hold {{count}} of these stocks on mainnet, worth {{value}}.",
    source:
      "Listings from xStocks and Ondo as of {{date}}. Prices and balances are live from Jupiter on mainnet. Issuer powers are what each issuer's mints carried when checked on mainnet; a stock you hold on a mainnet build shows its own.",
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
    nothingHeld: "This wallet doesn't hold any stocks Heirloom supports yet.",
    browse: "Browse stocks",
    coveredTitle: "Covered",
    stopCovering: "Stop covering",
    missing_one:
      "{{count}} covered record couldn't be read from the network yet. It will appear on the next refresh.",
    missing_other:
      "{{count}} covered records couldn't be read from the network yet. They will appear on the next refresh.",
    existingPlan: "This wallet already has a backup plan, so nothing new was created. Here it is.",
  },
  dashboard: {
    noPlanTitle: "Nothing to watch yet",
    noPlanDescription: "Back up the stocks in this wallet, or put some in a vault for an heir.",
    previewDescription:
      "Back up your stocks, or put some in a vault for an heir. Connect a wallet to see the plans it already has.",
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
    connectTitle: "Were you named in a plan?",
    connectDescription:
      "Connect the wallet an owner named, as their recovery wallet, heir, guardian, or check-in wallet, and their plan shows up here with what you can do for it.",
    explain: {
      destination: {
        title: "Recovery wallet or heir",
        body: "Once the owner stops checking in and the grace period runs out, move the covered stocks to this wallet.",
      },
      guardian: {
        title: "Guardian",
        body: "If the owner is fine but can't check in, push the deadline out once.",
      },
      checkin: {
        title: "Check-in wallet",
        body: "Check in for the owner from a hot wallet that can do nothing else.",
      },
    },
  },
  inherit: {
    planTitle: "Your vault",
    contentsTitle: "In the vault",
    tradeoffTitle: "How a vault differs",
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
    existingVault: "This wallet already has a vault, so nothing new was created. Here it is.",
  },
  trade: {
    cap: "Mainnet · via Jupiter",
    title: "Trade {{symbol}}",
    sideLabel: "Buy or sell",
    buy: "Buy",
    sell: "Sell",
    payWith: "with",
    receiveIn: "for",
    spend: "{{symbol}} to spend",
    sellAmount: "{{symbol}} to sell",
    balance: "Balance {{amount}} {{symbol}}",
    insufficient: "Not enough {{symbol}} in this wallet on mainnet.",
    youReceive: "You receive",
    quoting: "Getting a quote…",
    quoteFailed: "Jupiter couldn't quote this trade.",
    value: "Worth",
    impact: "Price impact",
    fee: "Fee",
    gasless: "Jupiter pays the network fees.",
    warning:
      "A real trade on Solana mainnet, with real funds. It's separate from your Heirloom plans.",
    walletNetwork:
      "If your wallet is set to devnet, it may say it can't preview this; the trade itself runs on mainnet.",
    connect: "Connect a wallet to trade",
    cantSign: "This wallet can't sign mainnet transactions.",
    buyAction: "Buy {{symbol}}",
    sellAction: "Sell {{symbol}}",
    submitting: "Submitting to mainnet…",
    done: "Trade complete",
    failed: "Trade failed",
    openOnJupiter: "Open on Jupiter",
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
    landingTitle: "Heirloom Stocks — back up your tokenized stocks",
    landingDescription:
      "Back up your xStocks and Ondo stocks to a recovery wallet you control, or leave them to an heir. They stay in your wallet and stay tradeable. Heirloom on Solana.",
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
