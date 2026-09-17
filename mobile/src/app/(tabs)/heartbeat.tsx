import { EstateList } from "@/components/EstateList";

export default function HeartbeatScreen() {
  return (
    <EstateList
      role="hbSigner"
      emptyTitle="Heartbeat"
      emptyBody="No estates where this wallet is hb-signer."
    />
  );
}
