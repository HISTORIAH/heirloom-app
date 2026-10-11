import { getAddressDecoder } from "@solana/kit";
import NfcManager from "react-native-nfc-manager";

import { TANGEM_LIFT_POLL_MS, TANGEM_LIFT_TIMEOUT_MS, TANGEM_WALLET_AID } from "@/constants/tangem";
import { isCardApduError, parseApdu, selectApdu, SW_OK } from "./apdu";
import { cancelScan, ensureNfcStarted, withIsoDep } from "./isoDep";
import { cardProblemMessage } from "./messages";
import { PIN_TRY_LIMIT } from "./pin";
import { generatePubkey, readCardIdentity } from "./signer";
import { isUserCancel } from "@/lib/text";
import type { CardScan, IsoDepTransceive, NfcCapability, PinStatus } from "@/types/nfc";
import type { TapProgress } from "@/types/create";

const addressOf = getAddressDecoder();

export { cancelScan };

export async function readNfcCapability(): Promise<NfcCapability> {
  await ensureNfcStarted();
  if (!(await NfcManager.isSupported())) return { status: "unsupported" };
  if (!(await NfcManager.isEnabled())) return { status: "disabled" };
  return { status: "ready" };
}

export async function openNfcSettings(): Promise<void> {
  await NfcManager.goToNfcSetting();
}

function scanCatch(cause: unknown, treatNoKeyAsEmpty: boolean): CardScan {
  if (isUserCancel(cause)) return { kind: "cancelled" };
  if (treatNoKeyAsEmpty && isCardApduError(cause) && cause.kind === "no_key") {
    return { kind: "empty" };
  }
  return { kind: "failed", message: cardProblemMessage(cause, "Could not read the credential") };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function answersTangemSelect(tx: IsoDepTransceive): Promise<boolean> {
  const { sw } = parseApdu(await tx(selectApdu(TANGEM_WALLET_AID)));
  return sw === SW_OK;
}

/**
 * Keeps our reader on the card until it's lifted off. Ending the session with a Tangem card still
 * on the phone lets Android hand it to the Tangem app (or the Play Store, without the app).
 */
async function waitForLift(tx: IsoDepTransceive): Promise<void> {
  const deadline = Date.now() + TANGEM_LIFT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await answersTangemSelect(tx);
    } catch {
      return;
    }
    await wait(TANGEM_LIFT_POLL_MS);
  }
}

/**
 * Runs `run` on the card, unless the card isn't ours but a Tangem card: then it waits for the card
 * to be lifted and reports `tangem`, for the caller to read it through Tangem's SDK instead.
 */
async function orTangem(
  tx: IsoDepTransceive,
  run: () => Promise<{ value: string; pin: PinStatus }>,
): Promise<CardScan> {
  try {
    const found = await run();
    return { kind: "address", value: found.value, pin: found.pin };
  } catch (cause) {
    if (!isCardApduError(cause) || cause.kind !== "not_heirloom") throw cause;
    if (!(await answersTangemSelect(tx))) throw cause;
    await waitForLift(tx);
    return { kind: "tangem" };
  }
}

async function withCapability(
  onListening: (() => void) | undefined,
  run: () => Promise<CardScan>,
  treatNoKeyAsEmpty: boolean,
): Promise<CardScan> {
  let cap: NfcCapability;
  try {
    cap = await readNfcCapability();
  } catch {
    return { kind: "unsupported" };
  }
  if (cap.status === "unsupported") return { kind: "unsupported" };
  if (cap.status === "disabled") return { kind: "off" };
  onListening?.();
  try {
    return await run();
  } catch (cause) {
    return scanCatch(cause, treatNoKeyAsEmpty);
  }
}

/** Reads a credential's address. A Tangem card comes back as `tangem`, lifted off and ready to read. */
export async function scanCardAddress(onListening?: () => void): Promise<CardScan> {
  return withCapability(
    onListening,
    () =>
      withIsoDep((tx) =>
        orTangem(tx, async () => {
          const { pub, pin } = await readCardIdentity(tx);
          return { value: addressOf.decode(pub), pin };
        }),
      ),
    true,
  );
}

export async function setupBlankCard(
  onProgress?: (progress: TapProgress) => void,
  pin?: Uint8Array,
): Promise<CardScan> {
  const pinState: PinStatus =
    pin === undefined ? { kind: "none" } : { kind: "set", triesLeft: PIN_TRY_LIMIT };
  return withCapability(
    undefined,
    () =>
      withIsoDep((tx) =>
        orTangem(tx, async () => ({
          value: addressOf.decode(await generatePubkey(tx, onProgress, pin)),
          pin: pinState,
        })),
      ),
    false,
  );
}
