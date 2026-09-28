// is it from ika or heirloom program
export type EstateKind = "heirloom" | "ika";

// TODO(backend): Temp shape mirroring the backend `EstateResponse`, may change

/** Editable metadata; `name` is shown as the estate label in the UI. */
export type EstateMetadata = {
  name?: string;
  description?: string;
};

export type EstateResponse = {
  id: string; // uuid
  address: string;
  kind: EstateKind;
  name: string | null; // null for estates registered without a name (e.g. ika)
  description: string | null;
  createdAt: string; // ISO timestamp — temp, backend will remove this
};
