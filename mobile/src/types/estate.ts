export type EstateKind = "heirloom" | "ika";

export type EstateResponse = {
  id: string;
  address: string;
  kind: EstateKind;
  name: string | null;
  description: string | null;
  createdAt: string;
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
