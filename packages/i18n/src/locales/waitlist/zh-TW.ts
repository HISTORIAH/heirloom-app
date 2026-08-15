const waitlist = {
  eyebrow: "Solana 繼承協議",
  heading: {
    line1: "你的錢包",
    line2: "應該活得比你久。",
  },
  description:
    "一個基於心跳的金庫，讓你的資產始終屬於你，然後完全按照你的意願傳承下去。",
  form: {
    label: "搶先體驗",
    emailLabel: "電子郵件地址",
    emailPlaceholder: "you@example.com",
    submit: "加入候補名單",
    submitting: "正在加入…",
    invalidEmail: "這看起來不是一個有效的電子郵件。",
    genericError: "出了點問題。請重試。",
  },
  success: {
    title: "你已在名單上。",
    inbox: "確認郵件已發送。請查看你的收件匣。",
    devnetAction: "在 Devnet 上試用 Heirloom",
  },
  privacyNote: "沒有垃圾郵件。沒有噪音。上線時只發一封郵件。",
  proof: {
    header: "延續性的證明",
    version: "V1.0",
    statementLine1: "如果你停下，",
    statementLine2: "它就開始。",
    steps: {
      one: { title: "你保持活躍", body: "定期簽到。" },
      two: { title: "你的資產始終屬於你", body: "自託管且上鏈。" },
      three: { title: "接下來是你的繼承人", body: "當心跳停止時。" },
    },
    footer: {
      left: "設定一次。",
      right: "讓它運轉。",
    },
  },
  siteFooter: {
    left: "Heirloom 協議 · 候補名單版",
    right: "自託管 · 去信任 · 人性化",
  },
} as const;

export default waitlist;