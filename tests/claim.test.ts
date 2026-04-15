import { expect, test } from "bun:test";
import {
  createDefaultSolanaClient,
  sendInitialize,
  sendClaim,
  createAndMintTokens,
  loadDefaultKeypair,
} from "./setup";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

test("it claims a native SOL vault", async () => {
  const client = createDefaultSolanaClient();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-claim-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  await sendClaim(client, { heir });
});

test("it claims a token vault", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();

  const { mint } = await createAndMintTokens();

  const { heir } = await sendInitialize(client, {
    amount: 1_000_000n,
    label: "test-claim-token",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  // TODO: pass heirTokenAccount once ATA derivation is wired in sendClaim
  await sendClaim(client, {
    heir,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
});
