import { expect, test } from "bun:test";
import {
  createTestClient,
  generateKeyPairSignerWithSol,
  genInitSolEstateIx,
  genUpdateFieldsIx,
} from "./setup";
import { fetchEstate } from "../src/generated";

test("it updates checkin interval and grace period", async () => {
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
    checkInIntervalSecs: 86_400n,
    gracePeriodSecs: 3_600n,
    delegatePauseDurationSecs: 7_200n,
  });
  await client.sendTransaction(initIx);

  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    checkInIntervalSecs: 172_800n,
    gracePeriodSecs: 7_200n,
  });
  await client.sendTransaction(updateFieldsIx);

  const account = await fetchEstate(client.rpc, estate);
  expect(account.data.checkInIntervalSecs).toBe(172_800n);
  expect(account.data.gracePeriodSecs).toBe(7_200n);
});

test("it updates only delegate pause duration", async () => {
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
    checkInIntervalSecs: 86_400n,
    gracePeriodSecs: 3_600n,
    delegatePauseDurationSecs: 7_200n,
  });
  await client.sendTransaction(initIx);

  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    delegatePauseDurationSecs: 14_400n,
  });
  await client.sendTransaction(updateFieldsIx);

  const account = await fetchEstate(client.rpc, estate);
  expect(account.data.delegatePauseDurationSecs).toBe(14_400n);
  // Untouched fields must survive a partial update.
  expect(account.data.checkInIntervalSecs).toBe(86_400n);
  expect(account.data.gracePeriodSecs).toBe(3_600n);
});

test("checkin signer can send heartbeat", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const checkInSigner = await generateKeyPairSignerWithSol(client);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    checkInIntervalSecs: 86_400n,
    gracePeriodSecs: 3_600n,
    delegatePauseDurationSecs: 7_200n,
    checkInSigner: checkInSigner.address,
  });
  await client.sendTransaction(initIx);

  const before = await fetchEstate(client.rpc, estate);

  // checkin signer sending a heartbeat-only update should succeed
  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    signer: checkInSigner,
  });
  await client.sendTransaction(updateFieldsIx);

  const after = await fetchEstate(client.rpc, estate);
  expect(after.data.lastCheckInTs >= before.data.lastCheckInTs).toBe(true);
  // checkin_signer must only be able to bump the heartbeat, not config fields.
  expect(after.data.checkInIntervalSecs).toBe(86_400n);
  expect(after.data.gracePeriodSecs).toBe(3_600n);
});

test("checkin signer cannot update config fields", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const checkInSigner = await generateKeyPairSignerWithSol(client);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    checkInIntervalSecs: 86_400n,
    gracePeriodSecs: 3_600n,
    delegatePauseDurationSecs: 7_200n,
    checkInSigner: checkInSigner.address,
  });
  await client.sendTransaction(initIx);

  const { ix: updateFieldsIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    checkInIntervalSecs: 172_800n,
    signer: checkInSigner,
  });
  await client.sendTransaction(updateFieldsIx);

  // Transaction succeeds but config changes are ignored for checkin_signer.
  const account = await fetchEstate(client.rpc, estate);
  expect(account.data.checkInIntervalSecs).toBe(86_400n);
});
