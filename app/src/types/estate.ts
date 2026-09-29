// is it from ika or heirloom program
export type EstateKind = "heirloom" | "ika";

export type EstateResponse = {
  id: string; // uuid
  address: string;
  kind: EstateKind;
  name: string | null; // null for estates registered without a name (e.g. ika)
  description: string | null;
  createdAt: string; // ISO timestamp — temp, backend will remove this
};

/** Request body for POST /v1/estates (register after on-chain creation). */
export type RegisterEstateRequest = {
  estateAddress: string;
  txSignature: string;
  description?: string;
};

/** Request body for PATCH /v1/estates/:estateAddress (rename / edit description). */
export type UpdateEstateRequest = {
  name?: string;
  description?: string;
};
