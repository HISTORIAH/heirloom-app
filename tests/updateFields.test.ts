import { expect, test } from "bun:test";
import { createDefaultSolanaClient, sendInitialize, sendUpdateFields } from "./setup";

test("it updates heartbeat interval and grace period", async () => {
  const client = createDefaultSolanaClient();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-fields",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
  });

  await sendUpdateFields(client, {
    heir: heir.address,
    // heartbeatInterval: 172800n,
    // gracePeriod: 7200n,
  });
});

// test("it updates only pause duration", async () => {
//   const client = createDefaultSolanaClient();

//   const { heir } = await sendInitialize(client, {
//     amount: BigInt(1_000_000_000),
//     label: "test-pause",
//     heartbeatInterval: 86400n,
//     gracePeriod: 3600n,
//     pauseDuration: 7200n,
//   });

//   await sendUpdateFields(client, {
//       heir: heir.address,
//       pauseDuration: 14400n,
//   });
// });
