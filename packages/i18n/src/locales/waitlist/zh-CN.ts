const waitlist = {
  eyebrow: "Solana 继承协议",
  heading: {
    line1: "你的钱包",
    line2: "应该活得比你久。",
  },
  description:
    "一个基于心跳的金库，让你的资产始终属于你，然后完全按照你的意愿传承下去。",
  form: {
    label: "抢先体验",
    emailLabel: "邮箱地址",
    emailPlaceholder: "you@example.com",
    submit: "加入候补名单",
    submitting: "正在加入…",
    invalidEmail: "这看起来不是一个有效的邮箱。",
    genericError: "出了点问题。请重试。",
  },
  success: {
    title: "你已在名单上。",
    inbox: "确认邮件已发送。请查收你的收件箱。",
    devnetAction: "在 Devnet 上试用 Heirloom",
  },
  privacyNote: "没有垃圾邮件。没有噪音。上线时只发一封邮件。",
  proof: {
    header: "延续性的证明",
    version: "V1.0",
    statementLine1: "如果你停下，",
    statementLine2: "它就开始。",
    steps: {
      one: { title: "你保持活跃", body: "定期签到。" },
      two: { title: "你的资产始终属于你", body: "自托管且上链。" },
      three: { title: "接下来是你的继承人", body: "当心跳停止时。" },
    },
    footer: {
      left: "设置一次。",
      right: "让它运转。",
    },
  },
  siteFooter: {
    left: "Heirloom 协议 · 候补名单版",
    right: "自托管 · 去信任 · 人性化",
  },
} as const;

export default waitlist;