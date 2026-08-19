import { expect, test } from "bun:test";
import {
  createTestClient,
  generateKeyPairSignerWithSol,
  genInitSolEstateIx,
  genUpdateFieldsIx,
} from "./setup";
import { fetchEstate } from "../src/generated";

test("it updates heartbeat interval and grace period", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
  });
  await client.sendTransaction(initIx);

  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    heartbeatInterval: 172_800n,
    gracePeriod: 7_200n,
  });
  await client.sendTransaction(updateFieldsIx);

  const account = await fetchEstate(client.rpc, estate);
  expect(account.data.heartbeatInterval).toBe(172_800n);
  expect(account.data.gracePeriod).toBe(7_200n);
});

test("it updates only pause duration", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
  });
  await client.sendTransaction(initIx);

  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    pauseDuration: 14_400n,
  });
  await client.sendTransaction(updateFieldsIx);

  const account = await fetchEstate(client.rpc, estate);
  expect(account.data.pauseDuration).toBe(14_400n);
  // Untouched fields must survive a partial update.
  expect(account.data.heartbeatInterval).toBe(86_400n);
  expect(account.data.gracePeriod).toBe(3_600n);
});

test("it updates the label", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
  });
  await client.sendTransaction(initIx);

  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    label: "a-much-longer-label",
  });
  await client.sendTransaction(updateFieldsIx);

  const account = await fetchEstate(client.rpc, estate);
  expect(account.data.label).toBe("a-much-longer-label");
});

test("hb signer can send heartbeat", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const hbSigner = await generateKeyPairSignerWithSol(client);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
    hbSigner: hbSigner.address,
  });
  await client.sendTransaction(initIx);

  const before = await fetchEstate(client.rpc, estate);

  // hb signer sending a heartbeat-only update should succeed
  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    signer: hbSigner,
  });
  await client.sendTransaction(updateFieldsIx);

  const after = await fetchEstate(client.rpc, estate);
  expect(after.data.lastHeartbeat >= before.data.lastHeartbeat).toBe(true);
  // hb_signer must only be able to bump the heartbeat, not config fields.
  expect(after.data.heartbeatInterval).toBe(86_400n);
  expect(after.data.gracePeriod).toBe(3_600n);
});

test("hb signer cannot update config fields", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const hbSigner = await generateKeyPairSignerWithSol(client);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
    hbSigner: hbSigner.address,
  });
  await client.sendTransaction(initIx);

  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    heartbeatInterval: 172_800n,
    signer: hbSigner,
  });
  await client.sendTransaction(updateFieldsIx);

  // Transaction succeeds but config changes are ignored for hb_signer.
  const account = await fetchEstate(client.rpc, estate);
  expect(account.data.heartbeatInterval).toBe(86_400n);
});
