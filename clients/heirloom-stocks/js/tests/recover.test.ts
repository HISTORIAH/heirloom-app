import { expect, test } from "bun:test";
import { generateKeyPairSigner, unwrapOption, type Address } from "@solana/kit";
import { fetchToken as fetchLegacyToken, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  fetchMint,
  fetchToken,
  getApproveCheckedInstruction,
  getFreezeAccountInstruction,
  getPauseInstruction,
  getRevokeInstruction,
  getUpdateMultiplierScaledUiMintInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
  type ExtensionArgs,
} from "@solana-program/token-2022";

import {
  applyAllocation,
  calculateFee,
  checkIn,
  coverAsset,
  createCoveredEquity,
  createTestClient,
  currentTimestamp,
  DEFAULT_GRACE,
  DEFAULT_INTERVAL,
  enableCpiGuard,
  expectStocksError,
  expireBlockhash,
  forcePermanentDelegate,
  fundTreasury,
  generateKeyPairSignerWithSol,
  initBackupPlan,
  recover,
  uncoverAsset,
  warpSeconds,
  type LiteSvmClient,
} from "./setup";
import { fetchStockPlan, RECOVERY_FEE_BPS } from "../src/main";
import {
  HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN,
  HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED,
  HEIRLOOM_STOCKS_ERROR__DELEGATE_EVICTED,
  HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE,
  HEIRLOOM_STOCKS_ERROR__PERMANENT_DELEGATE_ADDED,
  HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED,
} from "../src/generated/errors";

/** A fully covered backup plan, one warp away from being recoverable. */
async function coveredPlan(
  client: LiteSvmClient,
  options: {
    amount?: bigint;
    allocationBps?: number;
    extensions?: ExtensionArgs[];
    withFreezeAuthority?: boolean;
    tokenProgram?: Address;
  } = {},
) {
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  await fundTreasury(client);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const freezeAuthority = options.withFreezeAuthority
    ? await generateKeyPairSignerWithSol(client)
    : undefined;

  const equity = await createCoveredEquity(client, {
    owner: owner.address,
    amount: options.amount,
    extensions: options.extensions,
    tokenProgram: options.tokenProgram,
    ...(freezeAuthority ? { freezeAuthority: freezeAuthority.address } : {}),
  });

  const { ix: coverIx, coveredAsset } = await coverAsset({
    client,
    owner,
    mint: equity.mint,
    ownerTokenAccount: equity.ownerAta,
    issuer: equity.issuer,
    allocationBps: options.allocationBps,
    tokenProgram: equity.tokenProgram,
  });
  await client.sendTransaction(coverIx);

  return { owner, destination, plan, coveredAsset, freezeAuthority, ...equity };
}

/** Warps to exactly the plan's recoverable time. */
function warpToDeadline(client: LiteSvmClient, offset = 0n) {
  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE + offset);
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

test("recovery is refused until the check-in interval plus grace has elapsed", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta } = await coveredPlan(client);

  warpToDeadline(client, -1n);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE);
});

test("recovery succeeds at the deadline and pays the destination net of the fee", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, plan, coveredAsset, amount } =
    await coveredPlan(client);

  warpToDeadline(client);

  const { ix, destinationTokenAccount, treasuryTokenAccount } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(ix);

  const gross = applyAllocation(amount, 10_000n);
  const fee = calculateFee(gross, BigInt(RECOVERY_FEE_BPS));

  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(gross - fee);
  expect((await fetchToken(client.rpc, treasuryTokenAccount)).data.amount).toBe(fee);

  // The owner's account is left open — it still belongs to them.
  const ownerAcc = await fetchToken(client.rpc, ownerAta);
  expect(ownerAcc.data.amount).toBe(0n);
  expect(ownerAcc.data.owner).toBe(owner.address);

  // Nothing left to recover, so the record and the plan are both reclaimed.
  for (const account of [coveredAsset, plan] as Address[]) {
    expect(
      (await client.rpc.getAccountInfo(account, { commitment: "confirmed" }).send()).value,
    ).toBeNull();
  }
});

test("checking in pushes the deadline out and blocks a recovery that was about to land", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, plan } = await coveredPlan(client);

  warpToDeadline(client, -100n);

  const { ix: checkInIx } = await checkIn({ client, owner: owner.address, signer: owner });
  await client.sendTransaction(checkInIx);

  expect((await fetchStockPlan(client.rpc, plan)).data.lastCheckinTs).toBe(
    currentTimestamp(client),
  );

  // Past the original deadline, but short of the new one.
  warpSeconds(client, 200n);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE);
});

test("only the nominated destination can trigger a recovery", async () => {
  const client = await createTestClient();
  const { owner, mint, ownerAta } = await coveredPlan(client);
  const stranger = await generateKeyPairSignerWithSol(client);

  warpToDeadline(client);

  // The destination is read off the plan, so a recovery cannot be redirected.
  const { ix } = await recover({
    client,
    owner: owner.address,
    destination: stranger,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

test("a partial allocation moves only that share and leaves the rest with the owner", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, amount } = await coveredPlan(client, {
    allocationBps: 2_500,
  });

  warpToDeadline(client);

  const { ix, destinationTokenAccount } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(ix);

  const gross = applyAllocation(amount, 2_500n);
  const fee = calculateFee(gross, BigInt(RECOVERY_FEE_BPS));

  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(gross - fee);
  expect((await fetchToken(client.rpc, ownerAta)).data.amount).toBe(amount - gross);
});

// ---------------------------------------------------------------------------
// Delegate eviction — the central caveat of non-custodial backup
// ---------------------------------------------------------------------------

test("recovery fails after the owner revokes the delegate", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta } = await coveredPlan(client);

  await client.sendTransaction(
    getRevokeInstruction(
      { source: ownerAta, owner },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  warpToDeadline(client);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__DELEGATE_EVICTED);
});

test("recovery fails after another protocol replaces the delegate", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, decimals } = await coveredPlan(client);

  // SPL Token keeps exactly one delegate per account, so approving a DEX silently
  // evicts the plan with no on-chain error. That silence is why the dashboard has
  // to monitor the delegate rather than assume coverage persists.
  const dex = await generateKeyPairSigner();
  await client.sendTransaction(
    getApproveCheckedInstruction(
      { source: ownerAta, mint, delegate: dex.address, owner, amount: 1_000n, decimals },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  warpToDeadline(client);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__DELEGATE_EVICTED);
});

test("re-covering after an eviction restores recoverability", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, issuer, amount } = await coveredPlan(client);

  await client.sendTransaction(
    getRevokeInstruction(
      { source: ownerAta, owner },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  // Uncover then cover again — the remediation the dashboard drives once it sees
  // the plan is no longer the delegate.
  const { ix: uncoverIx } = await uncoverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(uncoverIx);

  const { ix: reCoverIx } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  // Byte-identical to the first cover, so it needs a fresh blockhash to be a
  // distinct transaction.
  expireBlockhash(client);
  await client.sendTransaction(reCoverIx);

  warpToDeadline(client);

  const { ix, destinationTokenAccount } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(ix);

  const gross = applyAllocation(amount, 10_000n);
  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(
    gross - calculateFee(gross, BigInt(RECOVERY_FEE_BPS)),
  );
});

// ---------------------------------------------------------------------------
// Mint and account configurations a recovery has to work through
// ---------------------------------------------------------------------------

test("a dividend paid through the UI multiplier does not change what a recovery moves", async () => {
  const client = await createTestClient();
  const multiplierAuthority = await generateKeyPairSigner();

  // Tokenized equities pay dividends and apply splits by moving a display
  // multiplier. Raw balances never change, so both the allocation and the fee
  // have to be computed on raw units or the payout would drift with every
  // corporate action.
  const { owner, destination, mint, ownerAta, amount } = await coveredPlan(client, {
    allocationBps: 5_000,
    extensions: [
      {
        __kind: "ScaledUiAmountConfig",
        authority: multiplierAuthority.address,
        multiplier: 1,
        newMultiplierEffectiveTimestamp: 0n,
        newMultiplier: 1,
      },
    ],
  });

  await client.sendTransaction(
    getUpdateMultiplierScaledUiMintInstruction(
      {
        mint,
        authority: multiplierAuthority,
        multiplier: 1.5,
        effectiveTimestamp: currentTimestamp(client),
      },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  const scaledConfig = unwrapOption((await fetchMint(client.rpc, mint)).data.extensions)?.find(
    (extension) => extension.__kind === "ScaledUiAmountConfig",
  );
  expect(scaledConfig).toMatchObject({ newMultiplier: 1.5 });
  expect((await fetchToken(client.rpc, ownerAta)).data.amount).toBe(amount);

  warpToDeadline(client);

  const { ix, destinationTokenAccount } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(ix);

  const gross = applyAllocation(amount, 5_000n);
  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(
    gross - calculateFee(gross, BigInt(RECOVERY_FEE_BPS)),
  );
  expect((await fetchToken(client.rpc, ownerAta)).data.amount).toBe(amount - gross);
});

test("recovery still works after the owner turns CPI Guard on", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, amount } = await coveredPlan(client);

  // The guard blocks CPI transfers the account *owner* authorises. A recovery is
  // authorised by the plan as delegate, so a wallet's safety toggle flipped after
  // coverage began must not silently disable it.
  await enableCpiGuard(client, owner, ownerAta);

  warpToDeadline(client);

  const { ix, destinationTokenAccount } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(ix);

  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(
    amount - calculateFee(amount, BigInt(RECOVERY_FEE_BPS)),
  );
});

test("a classic SPL Token position can be covered and recovered", async () => {
  const client = await createTestClient();

  // The major equity issuers use Token-2022, but the program also accepts the
  // original token program, where none of the extension reads apply.
  const { owner, destination, mint, ownerAta, amount, plan } = await coveredPlan(client, {
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const covered = await fetchLegacyToken(client.rpc, ownerAta);
  expect(covered.data.delegate).toEqual({ __option: "Some", value: plan });

  warpToDeadline(client);

  const { ix, destinationTokenAccount, treasuryTokenAccount } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(ix);

  const fee = calculateFee(amount, BigInt(RECOVERY_FEE_BPS));
  expect((await fetchLegacyToken(client.rpc, destinationTokenAccount)).data.amount).toBe(
    amount - fee,
  );
  expect((await fetchLegacyToken(client.rpc, treasuryTokenAccount)).data.amount).toBe(fee);
});

// ---------------------------------------------------------------------------
// Issuer actions taken after coverage began
// ---------------------------------------------------------------------------

test("recovery fails while the issuer has the mint paused", async () => {
  const client = await createTestClient();
  const pauseAuthority = await generateKeyPairSigner();

  const { owner, destination, mint, ownerAta } = await coveredPlan(client, {
    extensions: [{ __kind: "PausableConfig", authority: pauseAuthority.address, paused: false }],
  });

  await client.sendTransaction(
    getPauseInstruction(
      { mint, authority: pauseAuthority },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  warpToDeadline(client);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED);
});

test("recovery fails once the issuer freezes the owner's account", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, freezeAuthority } = await coveredPlan(client, {
    withFreezeAuthority: true,
  });

  await client.sendTransaction(
    getFreezeAccountInstruction(
      { account: ownerAta, mint, owner: freezeAuthority! },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  warpToDeadline(client);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN);
});

test("recovery fails if a permanent delegate appeared after coverage began", async () => {
  const client = await createTestClient();
  const clawbackAuthority = await generateKeyPairSigner();

  // Coverage records `had_permanent_delegate: false` because the mint has no such
  // extension, then one appears. Gaining clawback power mid-plan changes the
  // custody assumptions the owner agreed to, so the payout stops rather than
  // proceeding. The pausable config is only there to put the mint in the TLV
  // layout that `forcePermanentDelegate` appends to.
  const { owner, destination, mint, ownerAta } = await coveredPlan(client, {
    extensions: [{ __kind: "PausableConfig", authority: clawbackAuthority.address, paused: false }],
  });

  await forcePermanentDelegate(client, mint, clawbackAuthority.address);

  warpToDeadline(client);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await expectStocksError(
    client.sendTransaction(ix),
    HEIRLOOM_STOCKS_ERROR__PERMANENT_DELEGATE_ADDED,
  );
});
