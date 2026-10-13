import type { Address, TransactionSigner } from "@solana/kit";

import { sendCardBatches } from "@/lib/card/send";
import { buildSolSweepIx, buildTokenTransferIxs } from "@/lib/tx/cardSweep";
import type { SweepToken } from "@/types/claim";
import type { EstateRpc } from "@/types/program";

/** Send one asset off the credential. `asset.token` comes from the card's loaded holdings. */
export async function sendFromCard(input: {
  rpc: EstateRpc;
  signer: TransactionSigner;
  destination: Address;
  asset: { kind: "sol"; lamports: bigint } | { kind: "token"; token: SweepToken; amount: bigint };
  maxMessageBytes: number;
}): Promise<void> {
  if (input.destination === input.signer.address) {
    throw new Error("Pick a wallet that isn’t this credential.");
  }
  if (input.asset.kind === "token") {
    const ixs = await buildTokenTransferIxs(
      input.signer,
      input.destination,
      input.asset.token,
      input.asset.amount,
    );
    await sendCardBatches(input.rpc, input.signer, ixs, input.maxMessageBytes);
    return;
  }
  const solIx = buildSolSweepIx(input.signer, input.destination, input.asset.lamports);
  if (solIx !== undefined) await sendCardBatches(input.rpc, input.signer, [solIx], input.maxMessageBytes);
}
