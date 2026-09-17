import {
  decodeEstate,
  ESTATE_DISCRIMINATOR,
  findVaultPda,
  HEIRLOOM_PROGRAM_ADDRESS,
  type Estate,
} from "@historiah/heirloom";
import type {
  Address,
  Base58EncodedBytes,
  Base64EncodedBytes,
  Rpc,
  SolanaRpcApi,
} from "@solana/kit";

export type EstateRow = {
  address: Address;
  data: Estate;
  claimableLamports: bigint;
};

type DecodedEstate = {
  address: Address;
  data: Estate;
};

type EstateRpc = Rpc<SolanaRpcApi>;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

function decodeAccountData(data: string | readonly string[]): Uint8Array {
  const b64 = Array.isArray(data) ? data[0] : data;
  const binary = globalThis.atob(b64);
  const raw = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);
  return raw;
}

async function fetchEstatesByMemcmp(
  rpc: EstateRpc,
  extra: ReadonlyArray<{ offset: bigint; bytes: string; encoding: "base58" | "base64" }>,
): Promise<DecodedEstate[]> {
  const accounts = await rpc
    .getProgramAccounts(HEIRLOOM_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        {
          memcmp: {
            offset: 0n,
            bytes: bytesToBase64(Uint8Array.from(ESTATE_DISCRIMINATOR)) as Base64EncodedBytes,
            encoding: "base64",
          },
        },
        ...extra.map((filter) => ({
          memcmp: {
            offset: filter.offset,
            bytes: filter.bytes as Base58EncodedBytes & Base64EncodedBytes,
            encoding: filter.encoding,
          },
        })),
      ],
    })
    .send();

  const out: DecodedEstate[] = [];
  for (const item of accounts) {
    if (Number(item.account.lamports) <= 0) continue;
    const raw = decodeAccountData(item.account.data);
    try {
      const decoded = decodeEstate({
        address: item.pubkey,
        data: raw,
        executable: item.account.executable,
        lamports: item.account.lamports,
        space: BigInt(raw.length),
        programAddress: HEIRLOOM_PROGRAM_ADDRESS,
      });
      out.push({ address: item.pubkey, data: decoded.data });
    } catch {
      // Stale layout or partially-initialized account.
    }
  }
  return out;
}

const rentBySpace = new Map<string, bigint>();

async function claimableLamportsForVault(
  rpc: EstateRpc,
  vaultPda: Address,
): Promise<bigint> {
  const { value } = await rpc
    .getAccountInfo(vaultPda, { encoding: "base64", commitment: "confirmed" })
    .send();
  if (!value) return 0n;
  const spaceKey = String(value.space);
  let rentMin = rentBySpace.get(spaceKey);
  if (rentMin === undefined) {
    rentMin = BigInt(await rpc.getMinimumBalanceForRentExemption(value.space).send());
    rentBySpace.set(spaceKey, rentMin);
  }
  const balance = BigInt(value.lamports);
  return balance > rentMin ? balance - rentMin : 0n;
}

async function withClaimableLamports(
  rpc: EstateRpc,
  rows: DecodedEstate[],
): Promise<EstateRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      const [vaultPda] = await findVaultPda({
        authority: row.data.authority,
        heir: row.data.heir,
      });
      return {
        ...row,
        claimableLamports: await claimableLamportsForVault(rpc, vaultPda),
      };
    }),
  );
}

export async function fetchEstatesByAuthority(
  rpc: EstateRpc,
  authority: Address,
): Promise<EstateRow[]> {
  const rows = await fetchEstatesByMemcmp(rpc, [
    { offset: 8n, bytes: authority, encoding: "base58" },
  ]);
  return withClaimableLamports(rpc, rows);
}

export async function fetchEstatesByHeir(
  rpc: EstateRpc,
  heir: Address,
): Promise<EstateRow[]> {
  const rows = await fetchEstatesByMemcmp(rpc, [
    { offset: 40n, bytes: heir, encoding: "base58" },
  ]);
  return withClaimableLamports(rpc, rows);
}

export async function fetchEstatesByHbSigner(
  rpc: EstateRpc,
  hbSigner: Address,
): Promise<EstateRow[]> {
  const rows = await fetchEstatesByMemcmp(rpc, [
    { offset: 155n, bytes: bytesToBase64(new Uint8Array([1])), encoding: "base64" },
    { offset: 156n, bytes: hbSigner, encoding: "base58" },
  ]);
  return withClaimableLamports(rpc, rows);
}
