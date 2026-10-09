# Heirloom signer APDUs

Source of truth for factory USB (`gp.jar`) and `NfcJavaCardSigner`. Not GlobalPlatform. SELECT this applet first. Not default-selected.

| | Hex |
|--|-----|
| Package AID | `F045594502` |
| Applet AID | `F04559450201` |
| CLA | `00` |
| P2 | `00` |

## Commands

| INS | Name | P1 | Data | Success body |
|-----|------|----|------|----------------|
| `01` | GENERATE | `00` | empty | 32-byte RFC 8032 pubkey |
| `02` | GET_PUB | `00` | empty | 32-byte RFC 8032 pubkey |
| `03` | SIGN | `00` more / `80` last | chunk 1..200 bytes | empty until last; last returns 64-byte RFC 8032 sig |
| `04` | SET_PIN | `00` | 4–8 ASCII digits | empty |
| `05` | VERIFY | `00` | 4–8 ASCII digits | empty |
| `06` | GET_STATUS | `00` | empty | 3 bytes: `hasKey`, `hasPin`, `triesRemaining` |

GENERATE fails with `6985` if a key already exists. Lab reset is delete the applet. GET_PUB and SIGN fail with `6A88` if the slot is empty. No `genKeyPair` at install.

SIGN concatenates into a 1024-byte transient buffer (`CLEAR_ON_DESELECT`). P1 `00` appends. P1 `80` appends then signs. Overflow (`offset + Lc > 1024`) returns `6A80` and clears the buffer. Last chunk with no bytes buffered and `Lc = 0` returns `6700`. Any SIGN error clears the buffer. Success also clears it.

`MAX_SIGN` is 1024 (buffer cap). Live ACR122U prove 2026-10-05: GENERATE, GET_PUB, occupied `6985`, SIGN 32 / 64 / 200 / 512 all host-verified as RFC 8032. 512 used P1 `00` then `80` (200+200+112).

## PIN

claimOnce never calls SET_PIN. SIGN works without VERIFY.

keepAsWallet: SET_PIN once after GENERATE, then VERIFY in the same SELECT as each SIGN. OwnerPIN (`tryLimit` 3, max 8). Validated state is transient and clears on SELECT. SET_PIN before GENERATE is `6A88`. SET_PIN when a PIN already exists is `6985`. Non-digits `6A80`. Length under 4 or over 8 is `6700`. SIGN with a PIN set and not verified is `6982`. VERIFY mismatch is `63Cx` (`x` = tries left). Zero tries is `6983`. GET_PUB still works when blocked. GET_STATUS on a v1 CAP is `6D00`.

GET_STATUS body, one byte each: `hasKey` 0/1, `hasPin` 0/1, `triesRemaining` (0 when `hasPin` is 0).

## Endianness

NXP `getW` and each 32-byte half of `CryptoBaseX.sign(..., ALG_ED25519PH_SHA_512, ...)` are byte-reversed versus RFC 8032 on this SKU. The applet reverses those before it replies. Hosts verify with ordinary Ed25519 (nacl, `@noble/ed25519`, Node `crypto`). The PH constant name is wrong here: the raw message is signed as pure Ed25519.

## Status words

| SW | When |
|----|------|
| `9000` | OK |
| `63Cx` | VERIFY mismatch; `x` tries left |
| `6700` | Bad length (empty sign, chunk 0 or > 200, PIN not 4–8) |
| `6982` | SIGN while PIN is set and not verified this SELECT |
| `6983` | PIN blocked |
| `6985` | GENERATE but slot full, SET_PIN when a PIN exists, VERIFY with no PIN |
| `6A80` | Message would exceed 1024, or PIN is not digits |
| `6A86` | Bad P1/P2 |
| `6A88` | No key |
| `6D00` | Unknown INS (v1 CAP has no PIN commands) |
| `6E00` | CLA not `00` |
| `6F00` | Unexpected `CryptoException` |

## Phone mapping

```
getPublicKey    → SELECT + GET_PUB [+ GET_STATUS]
generateKeypair → SELECT + GET_PUB (6A88) + GENERATE [+ SET_PIN + VERIFY] + SIGN(test 32)
signBytes       → SELECT + [VERIFY] + chunked SIGN
importKeypair   → not in this CAP
```

`NfcJavaCardSigner` in `mobile/src/lib/nfc/signer.ts` implements those.
