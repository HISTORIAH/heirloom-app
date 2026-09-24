import type { Address, Rpc, Signature, SolanaRpcApi } from "@solana/kit";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Wallet send is not our RPC. Poll until this client sees confirmed. */
export async function waitForConfirmed(
  rpc: Rpc<SolanaRpcApi>,
  signature: string,
): Promise<void> {
  const sig = signature as Signature;
  for (let i = 0; i < 30; i++) {
    const { value } = await rpc
      .getSignatureStatuses([sig], { searchTransactionHistory: true })
      .send();
    const st = value[0];
    if (st === null || st === undefined) {
      await delay(400);
      continue;
    }
    if (st.err !== null && st.err !== undefined) {
      throw new Error("Transaction failed on chain");
    }
    if (
      st.confirmationStatus === "confirmed" ||
      st.confirmationStatus === "finalized"
    ) {
      return;
    }
    await delay(400);
  }
}

/** Close/reassign wipe the PDA. Signature status can miss our RPC; the account cannot. */
export async function waitUntilAccountGone(
  rpc: Rpc<SolanaRpcApi>,
  address: Address,
): Promise<void> {
  for (let i = 0; i < 30; i++) {
    const { value } = await rpc
      .getAccountInfo(address, { encoding: "base64", commitment: "confirmed" })
      .send();
    if (value === null || value === undefined || BigInt(value.lamports) === 0n) {
      return;
    }
    await delay(400);
  }
}
