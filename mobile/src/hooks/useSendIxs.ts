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
    const slot = await client.rpc.getSlot().send();
    const signer = getTransactionSigner(acc.address, slot);
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
    return base58.decode(signatureBytes);
  }

  return { account, client, sendIxs };
}
