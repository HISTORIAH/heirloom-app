const waitlist = {
  eyebrow: "Solana miras protokolü",
  heading: {
    line1: "Cüzdanınız",
    line2: "sizden uzun yaşamalı.",
  },
  description:
    "Varlıklarınızı size ait tutan, sonra tam istediğiniz gibi devreden kalp atışı tabanlı bir kasa.",
  form: {
    label: "Erken erişim alın",
    emailLabel: "E-posta adresi",
    emailPlaceholder: "siz@ornek.com",
    submit: "Bekleme listesine katıl",
    submitting: "Katılıyor...",
    invalidEmail: "Bu geçerli bir e-posta gibi görünmüyor.",
    genericError: "Bir şeyler ters gitti. Tekrar deneyin.",
  },
  success: {
    title: "Listedesiniz.",
    inbox: "Onay gönderildi. Gelen kutunuzu kontrol edin.",
    devnetAction: "Heirloom'u Devnet'te deneyin",
  },
  privacyNote: "Spam yok. Gürültü yok. Başlattığımızda bir e-posta.",
  proof: {
    header: "Sürekliliğin kanıtı",
    version: "V1.0",
    statementLine1: "Siz durursanız,",
    statementLine2: "o başlar.",
    steps: {
      one: { title: "Aktif kalırsınız", body: "Düzenli olarak check-in yapın." },
      two: { title: "Varlıklarınız sizin kalır", body: "Kendi saklamalı ve zincir üstü." },
      three: { title: "Sıradakiler mirasçılarınız", body: "Kalp atışı durduğunda." },
    },
    footer: {
      left: "Bir kez kurun.",
      right: "Çalışmaya bırakın.",
    },
  },
  siteFooter: {
    left: "Heirloom protokolü · Bekleme listesi sürümü",
    right: "Kendi saklamalı · Güven gerektirmez · İnsani",
  },
} as const;

export default waitlist;