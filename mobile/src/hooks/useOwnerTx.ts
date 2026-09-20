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

import {
  assertEstateFree,
  buildCreateEstateIxs,
  buildHeartbeatIx,
  buildTopUpSolIx,
  findVaultPda,
  type CreateEstateInput,
} from "@/lib/ownerWrites";

const base58 = getBase58Decoder();

export function useOwnerTx() {
  const { account, client, connect, getTransactionSigner } = useMobileWallet();

  async function run(
    build: (signer: TransactionSigner) => Promise<Instruction[]>,
  ): Promise<string> {
    const acc = account ?? (await connect());
    const slot = await client.rpc.getSlot().send();
    const signer = getTransactionSigner(acc.address, slot);
    const ixs = await build(signer);
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

  async function checkIn(heir: CreateEstateInput["heir"]): Promise<string> {
    return run(async (signer) => [await buildHeartbeatIx(signer, heir)]);
  }

  async function topUpSol(
    heir: CreateEstateInput["heir"],
    lamports: bigint,
  ): Promise<string> {
    if (lamports <= 0n) throw new Error("Enter a SOL amount");
    return run(async (signer) => {
      const [vault] = await findVaultPda({ authority: signer.address, heir });
      return [buildTopUpSolIx(signer, vault, lamports)];
    });
  }

  async function createEstate(input: CreateEstateInput): Promise<string> {
    return run(async (signer) => {
      await assertEstateFree(client.rpc, signer.address, input.heir);
      return buildCreateEstateIxs(signer, input);
    });
  }

  return { account, checkIn, topUpSol, createEstate };
}
