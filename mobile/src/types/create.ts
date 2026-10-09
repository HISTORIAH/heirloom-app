/** Who inherits: an Heirloom credential, someone else's wallet, or my own backup. */
export type HeirKind = "credential" | "wallet" | "mine";

/** How the heir uses their credential. */
export type CredentialMode = "claimOnce" | "keepAsWallet";

export type CreatePhase =
  | "heir"
  | "scanAddress"
  | "credMode"
  | "credPin"
  | "credTap"
  | "credReady"
  | "assets"
  | "timing"
  | "review"
  | "creating"
  | "handover";

export type AssetKind = "sol" | "token" | "nft";

/** One row in the asset picker. */
export type AssetOption = {
  id: string;
  kind: AssetKind;
  symbol: string;
  name: string;
  /** Wallet balance in UI units. */
  balance: string;
  /** Raw balance for sorting when no USD price. */
  balanceRaw: number;
  /** Null when we have no price. */
  usd: number | null;
  /** Below the dust line: hidden while "Hide dust" is on. */
  dust: boolean;
  /** Metaplex Core assets can't go into an estate yet. */
  unsupported?: boolean;
  /** Token icon URL from DAS metadata. */
  image?: string;
};

export type AssetTab = "all" | "tokens" | "nfts";

export type AssetSort = "value" | "name";

/** Progress of tapping a blank credential during setup. */
export type TapProgress = "searching" | "found" | "done" | "failed";

/** One editable line on the review step. */
export type ReviewLine = { label: string; value: string; onEdit: () => void };

/** One prepaid or network fee on the review step. */
export type FeeLine = { label: string; value: string };
