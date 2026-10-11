import type { HandoverSecret } from "@/types/create";

/** Asset-picker id for native SOL; token rows use their mint. */
export const SOL_ASSET_ID = "sol";

/** The note the owner can send the heir after handover, by what they hand over separately. */
export const HANDOVER_NOTE: Record<HandoverSecret, string> = {
  none: "I’ve set up an Heirloom credential for you. If something happens to me, tap it on your phone.",
  pin: "I’ve set up an Heirloom credential for you. I’ll give you the PIN separately. If something happens to me, tap it on your phone.",
  accessCode:
    "I’ve set up your Tangem card as an Heirloom credential. I’ll give you its access code separately. If something happens to me, tap it on your phone.",
};
