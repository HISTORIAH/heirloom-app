const waitlist = {
  eyebrow: "Protocolo de herencia en Solana",
  heading: {
    line1: "Tu wallet",
    line2: "debería sobrevivirte.",
  },
  description:
    "Una bóveda basada en latidos que mantiene tus activos tuyos y luego los transfiere exactamente como pretendes.",
  form: {
    label: "Obtén acceso anticipado",
    emailLabel: "Correo electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    submit: "Unirme a la lista",
    submitting: "Uniéndote...",
    invalidEmail: "Ese correo no parece válido.",
    genericError: "Algo salió mal. Inténtalo de nuevo.",
  },
  success: {
    title: "Estás en la lista.",
    inbox: "Confirmación enviada. Revisa tu bandeja de entrada.",
    devnetAction: "Prueba Heirloom en Devnet",
  },
  privacyNote: "Sin spam. Sin ruido. Un correo cuando lancemos.",
  proof: {
    header: "Prueba de continuidad",
    version: "V1.0",
    statementLine1: "Si te detienes,",
    statementLine2: "esto comienza.",
    steps: {
      one: { title: "Te mantienes activo", body: "Regístrate periódicamente." },
      two: { title: "Tus activos siguen siendo tuyos", body: "Autocustodia y en cadena." },
      three: { title: "Tus herederos son los siguientes", body: "Cuando el latido se detiene." },
    },
    footer: {
      left: "Configúralo una vez.",
      right: "Déjalo funcionar.",
    },
  },
  siteFooter: {
    left: "Protocolo Heirloom · Edición lista de espera",
    right: "Autocustodia · Sin confianza · Humano",
  },
} as const;

export default waitlist;