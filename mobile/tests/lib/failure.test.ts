import { describe, expect, test } from "bun:test";
import { SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, SolanaError } from "@solana/kit";

import { CardApduError } from "@/lib/nfc/apdu";
import { describeFailure, SubmittedTxError } from "@/lib/failure";

/** A native module rejection: an Error with a code and Java text. */
function nativeError(message: string, code = "EUNSPECIFIED"): Error {
  return Object.assign(new Error(message), { code });
}

const WEBSOCKET =
  "com.solana.mobilewalletadapter.clientlib.scenario.LocalAssociationScenario$ConnectionFailedException: Unable to connect to websocket server";

describe("describeFailure", () => {
  test("a closed wallet prompt is a cancel toast", () => {
    const view = describeFailure(
      nativeError("java.util.concurrent.CancellationException"),
      "Check-in",
    );
    expect(view.presentation).toBe("toast");
    expect(view.title).toBe("Check-in cancelled. Nothing was signed.");
  });

  test("an MWA decline is a cancel toast", () => {
    const declined = Object.assign(new Error("Not signed"), { code: -3 });
    expect(describeFailure(declined, "Claim").kind).toBe("cancelled");
  });

  test("an unreachable wallet gets its own sheet, with the raw text only in details", () => {
    const view = describeFailure(nativeError(WEBSOCKET), "Check-in");
    expect(view.kind).toBe("walletUnreachable");
    expect(view.title).toBe("Couldn’t reach your wallet");
    expect(view.body).toContain("Your check-in wasn’t sent.");
    expect(view.body).not.toContain("Exception");
    expect(view.details).toContain("ConnectionFailedException");
  });

  test("no wallet app installed", () => {
    expect(
      describeFailure(nativeError("No wallet", "ERROR_WALLET_NOT_FOUND"), "Connect").kind,
    ).toBe("noWallet");
  });

  test("an RPC transport failure is a network sheet", () => {
    const rpc = new SolanaError(SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, {
      headers: new Headers(),
      message: "Bad Gateway",
      statusCode: 502,
    });
    expect(describeFailure(rpc, "Check-in").title).toBe("Couldn’t reach Solana");
  });

  test("a failure after sending doesn't claim it wasn't sent", () => {
    const view = describeFailure(
      new SubmittedTxError("sig", new TypeError("Network request failed")),
      "Check-in",
    );
    expect(view.body).toContain("It may still go through");
    expect(view.body).not.toContain("wasn’t sent");
  });

  test("our own sentences are shown as they are", () => {
    const view = describeFailure(new Error("Pick a wallet that isn’t this credential."), "Claim");
    expect(view.kind).toBe("known");
    expect(view.body).toBe("Pick a wallet that isn’t this credential.");
  });

  test("card problems use the card wording", () => {
    const view = describeFailure(new CardApduError("pin_blocked", 0x6983), "Send");
    expect(view.kind).toBe("card");
    expect(view.body).toBe("This credential is locked. It can’t sign.");
  });

  test("anything else is generic, never the raw text", () => {
    const view = describeFailure(nativeError("kotlin.IllegalStateException: boom"), "Rename");
    expect(view.kind).toBe("unknown");
    expect(view.title).toBe("Something went wrong");
    expect(view.body).not.toContain("boom");
    expect(view.details).toContain("boom");
  });

  test("connecting a wallet doesn't talk about sending a connect", () => {
    expect(describeFailure(nativeError(WEBSOCKET), "Connect").body).toContain("Nothing was sent.");
  });
});
