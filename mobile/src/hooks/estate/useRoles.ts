import { useEstates } from "@/hooks/estate/useEstates";

/** Every estate this wallet holds a non-owner role on. */
export function useRoles() {
  const heir = useEstates("heir");
  const signer = useEstates("checkInSigner");
  const guardian = useEstates("delegate");

  async function reload() {
    await Promise.all([heir.reload(), signer.reload(), guardian.reload()]);
  }

  return {
    heir: heir.rows,
    signer: signer.rows,
    guardian: guardian.rows,
    count: heir.rows.length + signer.rows.length + guardian.rows.length,
    loading: heir.loading || signer.loading || guardian.loading,
    reload,
  };
}
