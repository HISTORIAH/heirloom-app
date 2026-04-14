import {
  appendTransactionMessageInstruction,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Address,
  type MaybeAccount,
  type TransactionSigner,
} from "@solana/kit";
import {
  fetchMaybeEstate,
  findEstatePda,
  findVaultPda,
  getClaimInstructionAsync,
  getDelegateDeferInstructionAsync,
  getInitializeInstructionAsync,
  getRevokeInstructionAsync,
  getUpdateInstructionAsync,
  type Estate,
} from "@historiah/heirloom";
import type { AppRpc, AppRpcSubscriptions } from "@/contexts/WalletContext";

export type Client = {
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
};

export type EstateAccount = MaybeAccount<Estate>;

const base58 = getBase58Decoder();

async function sendTx(
  client: Client,
  feePayer: TransactionSigner,
  ix: Parameters<typeof appendTransactionMessageInstruction>[0],
): Promise<string> {
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(ix, tx),
  );

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message);
  return base58.decode(signatureBytes);
}

export async function getEstateAddress(
  authority: Address,
  heir: Address,
): Promise<Address> {
  const [pda] = await findEstatePda({ authority, heir });
  return pda;
}

export async function getVaultAddress(
  authority: Address,
  heir: Address,
): Promise<Address> {
  const [pda] = await findVaultPda({ authority, heir });
  return pda;
}

export async function fetchEstateByPair(
  rpc: AppRpc,
  authority: Address,
  heir: Address,
): Promise<EstateAccount> {
  const pda = await getEstateAddress(authority, heir);
  return fetchMaybeEstate(rpc, pda);
}

export interface InitializeArgs {
  authority: TransactionSigner;
  heir: Address;
  amount: bigint;
  label: string;
  heartbeatInterval: bigint;
  gracePeriod: bigint;
  pauseDuration: bigint;
  delegate?: Address;
  mint?: Address;
  tokenProgram?: Address;
  authorityTokenAccount?: Address;
  vaultTokenAccount?: Address;
}

export async function sendInitialize(
  client: Client,
  args: InitializeArgs,
): Promise<string> {
  const ix = await getInitializeInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    delegate: args.delegate,
    authorityTokenAccount: args.authorityTokenAccount,
    vaultTokenAccount: args.vaultTokenAccount,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    heartbeatInterval: args.heartbeatInterval,
    gracePeriod: args.gracePeriod,
    pauseDuration: args.pauseDuration,
    amount: args.amount,
    label: args.label,
  });
  return sendTx(client, args.authority, ix);
}

export interface UpdateArgs {
  authority: TransactionSigner;
  heir: Address;
}

export async function sendUpdate(
  client: Client,
  args: UpdateArgs,
): Promise<string> {
  const ix = await getUpdateInstructionAsync({
    authority: args.authority,
    heir: args.heir,
  });
  return sendTx(client, args.authority, ix);
}

export interface RevokeArgs {
  authority: TransactionSigner;
  heir: Address;
  mint?: Address;
  tokenProgram?: Address;
  authorityTokenAccount?: Address;
  vaultTokenAccount?: Address;
}

export async function sendRevoke(
  client: Client,
  args: RevokeArgs,
): Promise<string> {
  const ix = await getRevokeInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    authorityTokenAccount: args.authorityTokenAccount,
    vaultTokenAccount: args.vaultTokenAccount,
  });
  return sendTx(client, args.authority, ix);
}

export interface ClaimArgs {
  heir: TransactionSigner;
  authority: Address;
  mint?: Address;
  tokenProgram?: Address;
  vaultTokenAccount?: Address;
  heirTokenAccount?: Address;
  guardian?: Address;
}

export async function sendClaim(
  client: Client,
  args: ClaimArgs,
): Promise<string> {
  const ix = await getClaimInstructionAsync({
    heir: args.heir,
    authority: args.authority,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    vaultTokenAccount: args.vaultTokenAccount,
    heirTokenAccount: args.heirTokenAccount,
    guardian: args.guardian,
  });
  return sendTx(client, args.heir, ix);
}

export interface DelegateDeferArgs {
  delegate: TransactionSigner;
  authority: Address;
  heir: Address;
}

export async function sendDelegateDefer(
  client: Client,
  args: DelegateDeferArgs,
): Promise<string> {
  const ix = await getDelegateDeferInstructionAsync({
    delegate: args.delegate,
    authority: args.authority,
    heir: args.heir,
  });
  return sendTx(client, args.delegate, ix);
}
