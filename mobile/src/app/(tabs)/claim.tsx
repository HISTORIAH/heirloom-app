import { EstateList } from "@/components/EstateList";

export default function ClaimScreen() {
  return (
    <EstateList
      role="heir"
      emptyTitle="Claim"
      emptyBody="No estates where this wallet is heir."
    />
  );
}
