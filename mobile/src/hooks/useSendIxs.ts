import { waitForConfirmed } from "@/lib/confirm";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";

const base58 = getBase58Decoder();

export function useSendIxs() {
  const { account, client, connect, getTransactionSigner } = useMobileWallet();

  async function sendIxs(
    build: (signer: TransactionSigner) => Promise<Instruction[]>,
  ): Promise<string> {
    const acc = account ?? (await connect());
    // MWA send uses this as minContextSlot. getSlot() is the processed tip
    // and is often ahead of the wallet's RPC, so the send dies after approve.
    // Same slot as the blockhash, same as wallet-ui's own sendTransactions.
    const first = await client.rpc.getLatestBlockhash().send();
    const signer = getTransactionSigner(acc.address, first.context.slot);
    const ixs = await build(signer);
    if (ixs.length === 0) throw new Error("Nothing to send");
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => appendTransactionMessageInstructions(ixs, tx),
      (tx) => setTransactionMessageFeePayerSigner(signer, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );
    const signatureBytes = await signAndSendTransactionMessageWithSigners(message);
    const signature = base58.decode(signatureBytes);
    await waitForConfirmed(client.rpc, signature);
    return signature;
  }

  return { account, client, sendIxs };
}
