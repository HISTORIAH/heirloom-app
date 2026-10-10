import { describe, expect, test } from "bun:test";
import {
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SolanaError,
} from "@solana/kit";

import { classifyTxError, txFailureMessage } from "./txErrors";

function withLogs(logs: string[]): Error {
  return Object.assign(new Error("Simulation failed"), { context: { logs } });
}

describe("classifyTxError", () => {
  test("an MWA decline is a rejection", () => {
    const declined = Object.assign(new Error("Not signed"), { code: -3 });
    expect(classifyTxError(declined).kind).toBe("rejected");
  });

  test("finds a kit code anywhere down the cause chain", () => {
    const inner = new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE);
    const outer = new Error("Send failed", { cause: inner });
    expect(classifyTxError(outer).kind).toBe("insufficientSol");
  });

  test("an expired blockhash is expired", () => {
    const error = new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
      currentBlockHeight: 2n,
      lastValidBlockHeight: 1n,
    });
    expect(classifyTxError(error).kind).toBe("expired");
  });

  test("pulls Anchor's message out of the logs", () => {
    const error = withLogs([
      "Program log: Instruction: Initialize",
      "Program log: AnchorError occurred. Error Code: ZeroDepositAmount. Error Number: 6010. Error Message: Zero deposit amount.",
    ]);
    expect(classifyTxError(error)).toEqual({ kind: "program", detail: "Zero deposit amount" });
  });

  test("the wallet never opening isn't read as an expired transaction", () => {
    const timeout = Object.assign(new Error("Session timed out"), { code: "ERROR_SESSION_TIMEOUT" });
    expect(classifyTxError(timeout).kind).toBe("unknown");
  });
});

describe("txFailureMessage", () => {
  test("falls back for an error with no message", () => {
    expect(txFailureMessage(new Error(""), "Could not create the estate.")).toBe(
      "Could not create the estate.",
    );
  });
});
