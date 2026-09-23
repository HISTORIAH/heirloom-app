/**
 * Where the browser suite runs: a fresh local validator (the default), or the
 * devnet deployment with `E2E_CLUSTER=devnet`.
 *
 * On devnet the program and the test equities already exist, and are found on
 * chain (see `devnet/devnet.ts`). Wallets are funded from the Solana CLI
 * keypair instead of airdropped, and whatever SOL they have left is swept back
 * afterwards.
 */
import {
  lamports,
  type Address,
  type GetAccountInfoApi,
  type Instruction,
  type KeyPairSigner,
  type Rpc,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

import {
  createDevnetClient,
  findTestEquities,
  fundWithSol,
  loadIssuerKeys,
  pickEquity,
  scheduleTestDividend,
  solanaCliConfig,
} from "../devnet/devnet";
import {
  createEquities,
  createLocalClient,
  generateIssuers,
  issuerGenesis,
  mintTo,
  SEEDED_EQUITIES,
  startValidator,
  type EquityKey,
  type LocalEquity,
} from "../localnet/localnet";

export interface E2ECluster {
  name: "localnet" | "devnet";
  rpcUrl: string;
  wsUrl: string;
  rpc: Rpc<GetAccountInfoApi>;
  send(instructions: Instruction | Instruction[]): Promise<unknown>;
  /** SOL a new test wallet starts with. */
  walletSol: number;
  fund(address: Address, sol: number): Promise<void>;
  mint(owner: Address, which: EquityKey, raw: bigint): Promise<void>;
  xstock: LocalEquity;
  ondo: LocalEquity;
  stop(wallets: KeyPairSigner[]): Promise<void>;
}

async function localnet(): Promise<E2ECluster> {
  const issuers = await generateIssuers();
  const validator = await startValidator({ accounts: await issuerGenesis(issuers) });
  const client = await createLocalClient(validator);
  const equities = await createEquities(client, issuers);
  const issuerOf = { xstock: issuers.xstocks, ondo: issuers.ondo };

  return {
    name: "localnet",
    rpcUrl: validator.rpcUrl,
    wsUrl: validator.wsUrl,
    rpc: client.rpc,
    send: (instructions) => client.sendTransaction(instructions),
    walletSol: 20,
    fund: async (address, sol) => {
      await client.airdrop(address, lamports(BigInt(Math.round(sol * 1_000_000_000))));
    },
    mint: async (owner, which, raw) => {
      await mintTo(client, issuerOf[which], equities[which], owner, raw);
    },
    ...equities,
    stop: () => validator.stop(),
  };
}

async function devnet(): Promise<E2ECluster> {
  const config = await solanaCliConfig();
  const client = await createDevnetClient(config);
  const issuers = await loadIssuerKeys();
  const onChain = await findTestEquities(client, issuers);
  const seeded = (key: EquityKey) => {
    const equity = pickEquity(onChain, SEEDED_EQUITIES[key].symbol);
    if (!equity) {
      throw new Error(`No ${SEEDED_EQUITIES[key].symbol} on devnet. Run \`bun run devnet:seed\`.`);
    }
    return equity;
  };
  const equities = { xstock: seeded("xstock"), ondo: seeded("ondo") };

  // A dividend from an earlier run may have taken effect since, so schedule a
  // fresh one for the dashboard's calendar to show.
  await scheduleTestDividend(client, issuers, equities.xstock, 0.0035, 5);

  return {
    name: "devnet",
    rpcUrl: config.rpcUrl,
    wsUrl: config.wsUrl,
    rpc: client.rpc,
    send: (instructions) => client.sendTransaction(instructions),
    walletSol: 0.1,
    fund: async (address, sol) => {
      await fundWithSol(client, address, sol);
    },
    mint: async (owner, which, raw) => {
      await mintTo(client, issuers[equities[which].issuer], equities[which], owner, raw);
    },
    ...equities,
    async stop(wallets) {
      for (const wallet of wallets) {
        const { value } = await client.rpc.getBalance(wallet.address).send();
        if (value === 0n) continue;
        await client.sendTransaction(
          getTransferSolInstruction({
            source: wallet,
            destination: client.payer.address,
            amount: value,
          }),
        );
      }
    },
  };
}

export function startCluster(): Promise<E2ECluster> {
  return process.env.E2E_CLUSTER === "devnet" ? devnet() : localnet();
}
