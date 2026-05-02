import { expect, test } from "bun:test";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { fetchEstate, fetchMaybeEstate, findEstatePda } from "@historiah/heirloom";
import { createTestContext, sendInitialize, sendUpdateFields } from "./setup";

test("it updates heartbeat interval and grace period", async () => {
  const { client } = await createTestContext();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-fields",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
  });

  await sendUpdateFields(client, {
    heir: heir.address,
    heartbeatInterval: 172800n,
    gracePeriod: 7200n,
  });
});

// TODO: fix, this isn't tested
test("it updates only pause duration", async () => {
  const { client } = await createTestContext();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-pause",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
  });

  await sendUpdateFields(client, {
    heir: heir.address,
    pauseDuration: 14400n,
  });
});

test("it updates label same length", async () => {
  const { client } = await createTestContext();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "original",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
  });

  await sendUpdateFields(client, {
    heir: heir.address,
    label: "modified",
  });
});

test("it updates label longer", async () => {
  const { client } = await createTestContext();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "short",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
  });

  await sendUpdateFields(client, {
    heir: heir.address,
    label: "a-much-longer-label",
  });
});

test("hb signer can send heartbeat", async () => {
  const { client } = await createTestContext();
  const hbSigner = await generateKeyPairSigner();

  // fund the hb signer so it can pay tx fees
  await client.rpc.requestAirdrop(hbSigner.address, lamports(1_000_000_000n)).send();

  const { authority, heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "hb-test",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
    hbSigner: hbSigner.address,
  });

  // hb signer sending a heartbeat-only update should succeed
  await sendUpdateFields(client, {
    heir: heir.address,
    signer: hbSigner,
    authority,
  });
});

test("hb signer cannot update config fields", async () => {
  const { client } = await createTestContext();
  const hbSigner = await generateKeyPairSigner();

  // fund the hb signer so it can pay tx fees
  await client.rpc.requestAirdrop(hbSigner.address, lamports(1_000_000_000n)).send();

  const { authority, heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "hb-test",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
    hbSigner: hbSigner.address,
  });

  await sendUpdateFields(client, {
    heir: heir.address,
    heartbeatInterval: 172800n,
    signer: hbSigner,
    authority,
  });

  // Transaction succeeds but config changes are ignored for hb_signer.
  // Fetch estate and verify heartbeat_interval was NOT changed.
  const [estate] = await findEstatePda({ authority, heir: heir.address });
  // const account = await fetchMaybeEstate(client.rpc, estate);
  let account = await fetchEstate(client.rpc, estate);

  expect(account?.data?.heartbeatInterval).toBe(86400n);
});
