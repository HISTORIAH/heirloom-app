import { address as toAddress } from "@solana/kit";
import {
  discoverVaultTokenAccounts,
  fetchEstateByPair,
  fetchVaultClaimableLamports,
  getVaultAddress,
  type HeirloomClient,
  type VaultTokenInfo,
} from "@/lib/heirloom";
import { computeEstateState, type EstateUiState } from "@/lib/estateState";
import { unwrapOption } from "@/lib/anchor";

export interface EstateSnapshot {
  authority: string;
  heir: string;
  label: string;
  isClaimed: boolean;
  isDeferred: boolean;
  delegate: string | null;
  hbSigner: string | null;
  heartbeatInterval: number;
  gracePeriod: number;
  pauseDuration: number;
  lastHeartbeat: number;
  createdAt: number;
  pausedUntil: number;
  claimableAssets: number;
  solBalance: number;
  vaultTokens: VaultTokenInfo[];
  vaultState: EstateUiState;
  secondsUntilGrace: number;
  secondsUntilClaimable: number;
}

export interface EstateLike {
  label: string;
  isClaimed: boolean;
  isDeferred: boolean;
  delegate: unknown;
  hbSigner: unknown;
  heartbeatInterval: bigint | number;
  gracePeriod: bigint | number;
  pauseDuration: bigint | number;
  lastHeartbeat: bigint | number;
  createdAt: bigint | number;
  pausedUntil: bigint | number;
  claimableAssets: number;
}

export async function buildSnapshotFromEstate(
  client: HeirloomClient,
  authorityStr: string,
  heirStr: string,
  estateData: EstateLike,
): Promise<EstateSnapshot> {
  const authority = toAddress(authorityStr);
  const heir = toAddress(heirStr);
  const vaultPda = await getVaultAddress(authority, heir);
  const [lamports, vaultTokens] = await Promise.all([
    fetchVaultClaimableLamports(client, vaultPda),
    discoverVaultTokenAccounts(client, vaultPda),
  ]);

  const lastHeartbeat = Number(estateData.lastHeartbeat);
  const heartbeatInterval = Number(estateData.heartbeatInterval);
  const gracePeriod = Number(estateData.gracePeriod);
  const pausedUntil = Number(estateData.pausedUntil);
  const createdAt = Number(estateData.createdAt);
  const claimableAssets = estateData.claimableAssets;
  const vaultEmpty =
    claimableAssets === 0 && Number(lamports) === 0 && vaultTokens.length === 0;

  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastHeartbeat,
    heartbeatInterval,
    gracePeriod,
    pausedUntil,
    isClaimed: estateData.isClaimed,
    createdAt,
    vaultEmpty,
  });

  return {
    authority: authorityStr,
    heir: heirStr,
    label: estateData.label,
    isClaimed: estateData.isClaimed,
    isDeferred: estateData.isDeferred,
    delegate: unwrapOption<string>(estateData.delegate),
    hbSigner: unwrapOption<string>(estateData.hbSigner),
    heartbeatInterval,
    gracePeriod,
    pauseDuration: Number(estateData.pauseDuration),
    lastHeartbeat,
    createdAt,
    pausedUntil,
    claimableAssets,
    solBalance: Number(lamports),
    vaultTokens,
    vaultState: state,
    secondsUntilGrace,
    secondsUntilClaimable,
  };
}

export async function lookupEstateSnapshot(
  client: HeirloomClient,
  authorityStr: string,
  heirStr: string,
): Promise<EstateSnapshot | null> {
  try {
    const authority = toAddress(authorityStr);
    const heir = toAddress(heirStr);
    const maybe = await fetchEstateByPair(client, authority, heir);
    if (!maybe.exists) return null;
    return await buildSnapshotFromEstate(client, authorityStr, heirStr, maybe.data);
  } catch {
    return null;
  }
}
