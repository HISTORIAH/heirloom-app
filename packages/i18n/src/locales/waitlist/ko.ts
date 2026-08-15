const waitlist = {
  eyebrow: "솔라나 상속 프로토콜",
  heading: {
    line1: "당신의 지갑은",
    line2: "당신보다 오래 살아야 합니다.",
  },
  description:
    "하트비트 기반 볼트로 자산을 계속 내 것으로 유지하다가, 정확히 의도한 대로 물려줍니다.",
  form: {
    label: "얼리 액세스 받기",
    emailLabel: "이메일 주소",
    emailPlaceholder: "you@example.com",
    submit: "대기자 명단에 참여",
    submitting: "참여 중...",
    invalidEmail: "유효한 이메일이 아닌 것 같습니다.",
    genericError: "문제가 발생했습니다. 다시 시도하세요.",
  },
  success: {
    title: "명단에 등록되었습니다.",
    inbox: "확인 메일을 보냈습니다. 받은 편지함을 확인하세요.",
    devnetAction: "Devnet에서 Heirloom 사용해 보기",
  },
  privacyNote: "스팸 없음. 소음 없음. 출시 시 이메일 한 통.",
  proof: {
    header: "연속성의 증명",
    version: "V1.0",
    statementLine1: "당신이 멈추면,",
    statementLine2: "그것이 시작됩니다.",
    steps: {
      one: { title: "계속 활동 유지", body: "주기적으로 체크인하세요." },
      two: { title: "자산은 계속 내 것", body: "자기 수탁 및 온체인." },
      three: { title: "다음은 상속인", body: "하트비트가 멈출 때." },
    },
    footer: {
      left: "한 번 설정하세요.",
      right: "작동하게 두세요.",
    },
  },
  siteFooter: {
    left: "Heirloom 프로토콜 · 대기자 명단 에디션",
    right: "자기 수탁 · 무신뢰 · 인간적",
  },
} as const;

export default waitlist;