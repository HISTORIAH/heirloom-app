import { expect, test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import {
  fetchToken,
  getApproveCheckedInstruction,
  getCloseAccountInstruction,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getFreezeAccountInstruction,
  getTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";

import {
  ataFor,
  coverAsset,
  createCoveredEquity,
  createTestClient,
  enableCpiGuard,
  expectStocksError,
  generateKeyPairSignerWithSol,
  initBackupPlan,
  initVaultPlan,
  seedIssuer,
  uncoverAsset,
} from "./setup";
import { fetchCoveredAsset, fetchStockPlan } from "../src/generated";
import {
  HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN,
  HEIRLOOM_STOCKS_ERROR__CPI_GUARD_ENABLED,
  HEIRLOOM_STOCKS_ERROR__FROZEN_BY_DEFAULT_MINT,
  HEIRLOOM_STOCKS_ERROR__INVALID_ALLOCATION,
  HEIRLOOM_STOCKS_ERROR__ISSUER_NOT_SUPPORTED,
  HEIRLOOM_STOCKS_ERROR__NON_TRANSFERABLE_MINT,
  HEIRLOOM_STOCKS_ERROR__TRANSFER_HOOK_UNSUPPORTED,
  HEIRLOOM_STOCKS_ERROR__WRONG_PLAN_MODE,
} from "../src/generated/errors";

// ---------------------------------------------------------------------------
// The core non-custodial claim: coverage grants a delegate allowance and moves
// nothing. This is what makes Backup Mode different from an escrow vault.
// ---------------------------------------------------------------------------

test("covering an asset grants the plan a max delegate allowance without moving tokens", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer, amount } = await createCoveredEquity(client, {
    owner: owner.address,
  });

  const { ix: coverIx, coveredAsset } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  await client.sendTransaction(coverIx);

  const tokenAcc = await fetchToken(client.rpc, ownerAta);

  // Balance untouched and still owned by the owner — no escrow.
  expect(tokenAcc.data.amount).toBe(amount);
  expect(tokenAcc.data.owner).toBe(owner.address);

  // The plan PDA is the delegate, for the maximum allowance rather than the
  // current balance, so trading cannot erode it toward zero.
  expect(tokenAcc.data.delegate).toEqual({ __option: "Some", value: plan });
  expect(tokenAcc.data.delegatedAmount).toBe(2n ** 64n - 1n);

  const record = await fetchCoveredAsset(client.rpc, coveredAsset);
  expect(record.data.mint).toBe(mint);
  expect(record.data.sourceTokenAccount).toBe(ownerAta);
  expect(record.data.allocationBps).toBe(10_000);
  expect(record.data.hadPermanentDelegate).toBe(false);

  expect((await fetchStockPlan(client.rpc, plan)).data.coveredAssets).toBe(1);
});

test("the owner can still trade a covered position and the allowance survives", async () => {
  const client = await createTestClient();
  const [owner, destination, counterparty] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer, decimals } = await createCoveredEquity(client, {
    owner: owner.address,
    amount: 1_000_000_000n,
  });
  const { ix: coverIx } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  await client.sendTransaction(coverIx);

  // The owner spends part of the position themselves. Token-2022 only decrements
  // `delegated_amount` when the *delegate* moves tokens, so an owner transfer
  // must leave the allowance completely alone. If it decremented, coverage would
  // silently decay with ordinary trading.
  const counterpartyAta = await ataFor(counterparty.address, mint);
  await client.sendTransaction(
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: counterparty,
      owner: counterparty.address,
      mint,
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    }),
  );

  await client.sendTransaction(
    getTransferCheckedInstruction(
      {
        source: ownerAta,
        mint,
        destination: counterpartyAta,
        authority: owner,
        amount: 400_000_000n,
        decimals,
      },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  const tokenAcc = await fetchToken(client.rpc, ownerAta);
  expect(tokenAcc.data.amount).toBe(600_000_000n);
  expect(tokenAcc.data.delegate).toEqual({ __option: "Some", value: plan });
  expect(tokenAcc.data.delegatedAmount).toBe(2n ** 64n - 1n);
});

test("uncovering revokes the delegate and closes the record", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer } = await createCoveredEquity(client, { owner: owner.address });
  const { ix: coverIx, coveredAsset } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  await client.sendTransaction(coverIx);

  const { ix: uncoverIx } = await uncoverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(uncoverIx);

  const tokenAcc = await fetchToken(client.rpc, ownerAta);
  expect(tokenAcc.data.delegate).toEqual({ __option: "None" });
  expect(tokenAcc.data.delegatedAmount).toBe(0n);

  expect(
    (await client.rpc.getAccountInfo(coveredAsset, { commitment: "confirmed" }).send()).value,
  ).toBeNull();
  expect((await fetchStockPlan(client.rpc, plan)).data.coveredAssets).toBe(0);
});

test("uncovering still succeeds after the owner has already re-approved someone else", async () => {
  const client = await createTestClient();
  const [owner, destination, dex] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer, decimals } = await createCoveredEquity(client, {
    owner: owner.address,
  });
  const { ix: coverIx, coveredAsset } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  await client.sendTransaction(coverIx);

  // SPL Token stores exactly one delegate, so approving a DEX evicts the plan.
  await client.sendTransaction(
    getApproveCheckedInstruction(
      {
        source: ownerAta,
        mint,
        delegate: dex.address,
        owner,
        amount: 5_000n,
        decimals,
      },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );
  expect((await fetchToken(client.rpc, ownerAta)).data.delegate).toEqual({
    __option: "Some",
    value: dex.address,
  });

  // Cleaning up the plan must not be blocked by that, and must not revoke the
  // unrelated third-party approval the owner deliberately made.
  const { ix: uncoverIx } = await uncoverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(uncoverIx);

  expect((await fetchToken(client.rpc, ownerAta)).data.delegate).toEqual({
    __option: "Some",
    value: dex.address,
  });
  expect(
    (await client.rpc.getAccountInfo(coveredAsset, { commitment: "confirmed" }).send()).value,
  ).toBeNull();
});

test("uncovering still succeeds after the owner sold out and closed the account", async () => {
  const client = await createTestClient();
  const [owner, destination, buyer] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer, amount, decimals } = await createCoveredEquity(client, {
    owner: owner.address,
  });
  const { ix: coverIx, coveredAsset } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  await client.sendTransaction(coverIx);

  // Sell the whole position, then close the emptied account the way wallets
  // offer to, to reclaim its rent.
  const buyerAta = await ataFor(buyer.address, mint);
  await client.sendTransaction([
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: buyer,
      owner: buyer.address,
      mint,
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    }),
    getTransferCheckedInstruction(
      { source: ownerAta, mint, destination: buyerAta, authority: owner, amount, decimals },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
    getCloseAccountInstruction(
      { account: ownerAta, destination: owner.address, owner },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  ]);
  expect(
    (await client.rpc.getAccountInfo(ownerAta, { commitment: "confirmed" }).send()).value,
  ).toBeNull();

  // The record would otherwise be stuck for good, and with it the plan: it
  // cannot close while any record remains.
  const { ix: uncoverIx } = await uncoverAsset({ client, owner, mint, ownerTokenAccount: null });
  await client.sendTransaction(uncoverIx);

  expect(
    (await client.rpc.getAccountInfo(coveredAsset, { commitment: "confirmed" }).send()).value,
  ).toBeNull();
  expect((await fetchStockPlan(client.rpc, plan)).data.coveredAssets).toBe(0);
});

// ---------------------------------------------------------------------------
// Curation
// ---------------------------------------------------------------------------

test("covering is rejected when the mint's authority is not a curated issuer", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  // Registry entry exists, but for a different authority than the one that
  // actually minted the asset.
  const impostor = await generateKeyPairSignerWithSol(client);
  const unrelatedIssuer = await seedIssuer(client, impostor.address);
  const { mint, ownerAta } = await createCoveredEquity(client, { owner: owner.address });

  const { ix } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer: unrelatedIssuer,
  });

  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__ISSUER_NOT_SUPPORTED);
});

test("covering is rejected once an issuer is disabled", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer } = await createCoveredEquity(client, {
    owner: owner.address,
    issuerEnabled: false,
  });

  const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });

  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__ISSUER_NOT_SUPPORTED);
});

test("a vault-mode plan cannot be used for backup coverage", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx, plan: vaultPlan } = await initVaultPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer } = await createCoveredEquity(client, { owner: owner.address });

  const { ix } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
    plan: vaultPlan,
  });

  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__WRONG_PLAN_MODE);
});

test("allocation must be within 1..=10000 bps", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer } = await createCoveredEquity(client, { owner: owner.address });

  for (const allocationBps of [0, 10_001]) {
    const { ix } = await coverAsset({
      client,
      owner,
      mint,
      ownerTokenAccount: ownerAta,
      issuer,
      allocationBps,
    });
    await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__INVALID_ALLOCATION);
  }
});

// ---------------------------------------------------------------------------
// Equity-specific mint configurations
// ---------------------------------------------------------------------------

test("a mint-level permanent delegate is allowed but recorded", async () => {
  const client = await createTestClient();
  const [owner, destination, issuerDelegate] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  // The largest tokenized-equity issuer ships this, so refusing it would rule out
  // most of the market. It is recorded instead, so a *later* addition is
  // detectable at payout time.
  const { mint, ownerAta, issuer } = await createCoveredEquity(client, {
    owner: owner.address,
    extensions: [{ __kind: "PermanentDelegate", delegate: issuerDelegate.address }],
  });

  const { ix, coveredAsset } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  await client.sendTransaction(ix);

  expect((await fetchCoveredAsset(client.rpc, coveredAsset)).data.hadPermanentDelegate).toBe(true);
});

test("an allocated but unwired transfer hook is allowed", async () => {
  const client = await createTestClient();
  const [owner, destination, hookAuthority] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  // Real issuers reserve the hook slot with `program_id` unset, keeping the option
  // to point it somewhere later. Coverage has to tolerate the reserved slot.
  const { mint, ownerAta, issuer } = await createCoveredEquity(client, {
    owner: owner.address,
    extensions: [
      {
        __kind: "TransferHook",
        authority: hookAuthority.address,
        programId: "11111111111111111111111111111111" as never,
      },
    ],
  });

  const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });
  await client.sendTransaction(ix);
});

test("a live transfer hook is refused", async () => {
  const client = await createTestClient();
  const [owner, destination, hookAuthority, hookProgram] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  // Resolving a hook's ExtraAccountMetaList has to happen in the transaction
  // builder and cannot be routed through anchor_spl's transfer_checked, which
  // forwards remaining_accounts as multisig signers. So this fails closed rather
  // than covering an asset it could never actually move.
  const { mint, ownerAta, issuer } = await createCoveredEquity(client, {
    owner: owner.address,
    extensions: [
      {
        __kind: "TransferHook",
        authority: hookAuthority.address,
        programId: hookProgram.address,
      },
    ],
  });

  const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });

  await expectStocksError(
    client.sendTransaction(ix),
    HEIRLOOM_STOCKS_ERROR__TRANSFER_HOOK_UNSUPPORTED,
  );
});

test("a frozen-by-default mint is refused", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  // These thaw only for holders the issuer allowlisted, so a recovery destination
  // can never be relied upon to receive. The owner here *is* allowlisted — their
  // account is thawed — which is what isolates the mint-level refusal from the
  // account-level frozen check.
  const freezeAuthority = await generateKeyPairSignerWithSol(client);
  const { mint, ownerAta, issuer } = await createCoveredEquity(client, {
    owner: owner.address,
    extensions: [{ __kind: "DefaultAccountState", state: 2 }],
    freezeAuthority: freezeAuthority.address,
    thawWith: freezeAuthority,
  });

  const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });

  await expectStocksError(
    client.sendTransaction(ix),
    HEIRLOOM_STOCKS_ERROR__FROZEN_BY_DEFAULT_MINT,
  );
});

test("a non-transferable mint is refused", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer } = await createCoveredEquity(client, {
    owner: owner.address,
    extensions: [{ __kind: "NonTransferable" }],
  });

  const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });

  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__NON_TRANSFERABLE_MINT);
});

test("a frozen token account cannot be covered", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const freezeAuthority = await generateKeyPairSignerWithSol(client);
  const { mint, ownerAta, issuer } = await createCoveredEquity(client, {
    owner: owner.address,
    freezeAuthority: freezeAuthority.address,
  });

  await client.sendTransaction(
    getFreezeAccountInstruction(
      { account: ownerAta, mint, owner: freezeAuthority },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });

  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN);
});

// ---------------------------------------------------------------------------
// Owner-side account settings
// ---------------------------------------------------------------------------

test("an account with CPI Guard on cannot be covered", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer } = await createCoveredEquity(client, { owner: owner.address });
  await enableCpiGuard(client, owner, ownerAta);

  // Token-2022 blocks an approval issued through CPI while the guard is on. The
  // program says so up front instead of surfacing the token program's failure.
  const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__CPI_GUARD_ENABLED);
});

test("uncovering still works after the owner turns CPI Guard on", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { mint, ownerAta, issuer } = await createCoveredEquity(client, { owner: owner.address });
  const { ix: coverIx } = await coverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    issuer,
  });
  await client.sendTransaction(coverIx);

  await enableCpiGuard(client, owner, ownerAta);

  // A stuck record would also block closing the plan, so the owner's way out
  // must survive a guard that was switched on after coverage began.
  const { ix: uncoverIx } = await uncoverAsset({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
  });
  await client.sendTransaction(uncoverIx);

  expect((await fetchToken(client.rpc, ownerAta)).data.delegate).toEqual({ __option: "None" });
  expect((await fetchStockPlan(client.rpc, plan)).data.coveredAssets).toBe(0);
});
