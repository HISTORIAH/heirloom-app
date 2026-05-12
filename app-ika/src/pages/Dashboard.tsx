import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@historiah/ui";
import { Plus, Heart, Clock, AlertTriangle, Shield, Activity, Loader2 } from "lucide-react";
import { getHealth, getHeartbeatChallenge, postHeartbeat } from "@/services/api";
import { signHeartbeat } from "@/services/passkey";

interface Vault {
  estateId: string;
  label: string;
  ethDepositAddress: string;
  balanceEth?: string;
  heartbeatInterval: number;
  gracePeriod: number;
  lastHeartbeat: number;
  isClaimed: boolean;
}

function formatDuration(seconds: number): string {
  const d = Math.round(seconds / 86400);
  return `${d}d`;
}

function getStatus(vault: Vault) {
  const now = Math.floor(Date.now() / 1000);
  const claimableAt = vault.lastHeartbeat + vault.heartbeatInterval + vault.gracePeriod;
  if (vault.isClaimed) return { label: "Claimed", bg: "bg-secondary", text: "text-muted-foreground" };
  if (now >= claimableAt) return { label: "Claimable", bg: "bg-accent-red", text: "text-foreground" };
  if (now >= vault.lastHeartbeat + vault.heartbeatInterval) return { label: "Grace", bg: "bg-accent-yellow", text: "text-foreground" };
  return { label: "Active", bg: "bg-accent-lime", text: "text-foreground" };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [ikaHealthy, setIkaHealthy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [heartbeating, setHeartbeating] = useState<string | null>(null);
  const [heartbeatError, setHeartbeatError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then((h) => {
        setBackendHealthy(h.backend === "ok");
        setIkaHealthy(h.ika_grpc === "ok");
      })
      .catch(() => { setBackendHealthy(false); setIkaHealthy(false); })
      .finally(() => setChecking(false));

    const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
    setVaults(vs);
  }, []);

  const handleHeartbeat = async (vault: Vault) => {
    setHeartbeating(vault.estateId);
    setHeartbeatError(null);

    try {
      const { challenge_b64 } = await getHeartbeatChallenge(vault.estateId);
      // Empty credentialId lets the browser prompt the user to pick from available passkeys
      const assertion = await signHeartbeat(challenge_b64, "");

      await postHeartbeat({
        estate_id: vault.estateId,
        signature_b64: assertion.signatureB64,
        authenticator_data_b64: assertion.authenticatorDataB64,
        client_data_json: assertion.clientDataJson,
      });

      const vs: Vault[] = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      const idx = vs.findIndex((v) => v.estateId === vault.estateId);
      if (idx >= 0) {
        vs[idx].lastHeartbeat = Math.floor(Date.now() / 1000);
        localStorage.setItem("heirloom_vaults", JSON.stringify(vs));
        setVaults([...vs]);
      }
    } catch (err) {
      setHeartbeatError(err instanceof Error ? err.message : String(err));
    } finally {
      setHeartbeating(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-foreground sticky top-0 bg-background z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
          <span className="text-xl font-black">Heirloom</span>
          <div className="flex items-center gap-3">
            {checking ? (
              <span className="text-xs font-bold text-muted-foreground">Checking…</span>
            ) : (
              <>
                {!backendHealthy && <span className="neo-badge bg-accent-red text-[10px]">Backend Off</span>}
                {backendHealthy && ikaHealthy && <span className="neo-badge bg-accent-lime text-[10px]">Live</span>}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {heartbeatError && (
          <div className="neo-border bg-accent-red/20 rounded-xl p-4 mb-4">
            <p className="font-bold text-sm">Heartbeat failed: {heartbeatError}</p>
          </div>
        )}

        {vaults.length === 0 && (
          <div className="text-center py-16 neo-border rounded-2xl bg-card neo-shadow-lg">
            <Heart className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-black mb-2">No Vaults Yet</h2>
            <p className="text-muted-foreground mb-6">Create your first ETH vault. No Solana wallet needed.</p>
            <Button variant="lime" size="lg" onClick={() => navigate("/create")}>
              <Plus className="h-4 w-4 mr-2" /> Create Vault
            </Button>
          </div>
        )}

        {vaults.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">Your Vaults</h2>
              <Button variant="lime" size="sm" onClick={() => navigate("/create")}>
                <Plus className="h-4 w-4 mr-1" /> New Vault
              </Button>
            </div>

            <div className="space-y-4">
              {vaults.map((vault) => {
                const status = getStatus(vault);
                const isOpen = expanded === vault.estateId;
                const isBeating = heartbeating === vault.estateId;
                return (
                  <div key={vault.estateId} className="neo-border rounded-2xl bg-card overflow-hidden neo-shadow-lg">
                    <div
                      className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : vault.estateId)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-lg">{vault.label}</span>
                        <span className={`px-2 py-0.5 text-xs font-bold neo-border rounded ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {formatDuration(vault.heartbeatInterval)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(vault.gracePeriod)}
                        </span>
                        <span className="font-mono text-xs">{vault.balanceEth || "0.00"} ETH</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t-4 border-foreground px-4 py-3 flex gap-3 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBeating}
                          onClick={() => handleHeartbeat(vault)}
                        >
                          {isBeating
                            ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            : <Activity className="h-4 w-4 mr-1" />}
                          {isBeating ? "Checking In…" : "Check In"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/withdraw?estate=${vault.estateId}`)}>
                          <Shield className="h-4 w-4 mr-1" /> Withdraw
                        </Button>
                        {status.label === "Claimable" && (
                          <Button variant="lime" size="sm" onClick={() => navigate(`/claim?estate=${vault.estateId}`)}>
                            <AlertTriangle className="h-4 w-4 mr-1" /> Claim
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
