// Address utilities
export {
  shortAddress,
  lastFour,
  parseAddress,
  parseOptionalAddress,
  isAddress,
} from "./solana/address";

// Amount utilities
export {
  uiAmountToRaw,
  solToLamports,
  rawToUiText,
  lamportsToSolText,
  unitsLabel,
  usdLabel,
  solLabel,
  solFixed,
} from "./solana/amount";

// Confirmation utilities
export { waitForConfirmed, waitUntilAccountGone } from "./solana/confirm";

// Explorer utilities
export { explorerTxUrl, openExplorerAddress, openExplorerTx } from "./solana/explorer";

// Option utilities
export { unwrapOption } from "./solana/option";

// Parsed utilities
export { asRecord, parsedInfo, parsedTokenAccount, toBigInt } from "./solana/parsed";

// Mint utilities
export { fetchMintMeta, assertWalletCanDeposit } from "./solana/mint";

// Estate fetch
export {
  fetchEstateByPair,
  fetchEstateByAddress,
  fetchEstatesByAuthority,
  fetchEstatesByHeir,
  fetchEstatesByDelegate,
} from "./estate/fetch";

// Estate guardian
export { gateKind, presentGuardian } from "./estate/guardian";

// Estate guards
export {
  isPausedNow,
  assertNotPaused,
  assertEstateFree,
  assertMintUnregistered,
} from "./estate/guards";

// Estate span
export { stateSlab, estateSpan } from "./estate/span";

// Estate countdown
export {
  countdownFromSeconds,
  countdownNoun,
  ownerCountdownCaption,
  signerCountdownCaption,
} from "./estate/countdown";

// Estate state
export { computeEstateState, isVaultEmpty, nowSecs } from "./estate/state";

// Estate summary
export { daysToNext, bySoonest, estateName, assetsLine, heirLine } from "./estate/summary";
export { fetchCardHoldings } from "./estate/cardHoldings";

// Estate timing
export {
  dateLong,
  dateShort,
  daysRangeError,
  daysToSecs,
  daysFromSeconds,
  displayTiming,
  changedTimingField,
} from "./estate/timing";

// Estate tokens
export {
  registeredTokenCount,
  assertAllTokensListed,
  estateDelegate,
  discoverVaultRegisteredTokens,
  discoverVaultClaimTokens,
} from "./estate/tokens";

// TX - Heir
export { buildClaimIxs } from "./tx/heir";

// TX - Manage
export { buildRevokeAllIxs, buildReassignIxs, buildRegisterTokenIx } from "./tx/manage";

// TX - Owner
export { buildCreateEstateIxs, buildTopUpSolIx, buildTopUpTokenIx } from "./tx/owner";

// TX - Update field
export { buildUpdateFieldIx, buildCheckInIx } from "./tx/updateField";

// TX - Card float
export { floatDestinations } from "./tx/cardFloat";

// TX - Card claim (IsoDep fee payer; keep leaves funds on the chip)
export { packInstructionsForCard, sendCardIxs, sendCardBatches } from "./tx/cardSend";
export {
  spareLamports,
  discoverCardTokens,
  cardHasSweepable,
  buildTokenTransferIxs,
  buildTokenSweepIxs,
  buildSolSweepIx,
  sendFromCard,
} from "./tx/cardSweep";
export { resolveCardClaimPlan, runCardClaim } from "./tx/cardClaim";

// NFC
export { scanProblemMessage, setupProblemMessage, cardProblemMessage } from "./nfc/messages";
export {
  readNfcCapability,
  openNfcSettings,
  scanCardAddress,
  setupBlankCard,
  cancelScan,
} from "./nfc/reader";
export {
  ISODEP_CLAIM_TIMEOUT_MS,
  ISODEP_TIMEOUT_MS,
  NFC_APDU_TRIES,
  NFC_COUPLE_TRIES,
  NFC_PRESENCE_CHECK_SEC,
  NFC_UI_SETTLE_MS,
} from "./nfc/isoDep";
export { createNfcJavaCardSigner, withCardSigningSession } from "./nfc/signer";
export { digitsToPinBytes, PIN_MAX_LEN, PIN_MIN_LEN, PIN_TRY_LIMIT } from "./nfc/pin";
export { createCardTransactionSigner } from "./nfc/kitSigner";
export { addressInTag, summarizeTag } from "./nfc/tag";

// Flash
export { setFlash, takeFlash } from "./flash";

// Text
export { plural, errorMessage, isUserCancel } from "./text";
