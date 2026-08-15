const waitlist = {
  eyebrow: "Solana 継承プロトコル",
  heading: {
    line1: "あなたのウォレットは",
    line2: "あなたより長生きすべきです。",
  },
  description:
    "ハートビートベースのボルトで資産を自分のものに保ち、意図したとおりに引き継ぎます。",
  form: {
    label: "早期アクセスを取得",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    submit: "ウェイトリストに参加",
    submitting: "参加中...",
    invalidEmail: "有効なメールアドレスではないようです。",
    genericError: "問題が発生しました。もう一度お試しください。",
  },
  success: {
    title: "リストに登録されました。",
    inbox: "確認メールを送信しました。受信トレイをご確認ください。",
    devnetAction: "Devnet で Heirloom を試す",
  },
  privacyNote: "スパムなし。ノイズなし。ローンチ時にメール一通。",
  proof: {
    header: "継続性の証明",
    version: "V1.0",
    statementLine1: "あなたが止まれば、",
    statementLine2: "それが始まります。",
    steps: {
      one: { title: "アクティブを維持", body: "定期的にチェックインしてください。" },
      two: { title: "資産はあなたのまま", body: "自己管理かつオンチェーン。" },
      three: { title: "次は相続人", body: "ハートビートが止まったとき。" },
    },
    footer: {
      left: "一度設定するだけ。",
      right: "あとは動かすだけ。",
    },
  },
  siteFooter: {
    left: "Heirloom プロトコル · ウェイトリスト版",
    right: "自己管理 · トラストレス · 人間的",
  },
} as const;

export default waitlist;