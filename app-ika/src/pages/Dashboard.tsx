import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Box,
  Flex,
  Text,
  Grid,
  VStack,
  HStack,
  Heading,
} from "@chakra-ui/react";
import {
  Plus,
  Heart,
  Clock,
  AlertTriangle,
  Shield,
  Activity,
  Loader2,
  Copy,
  Check,
  Fingerprint,
  Globe,
  LogOut,
} from "lucide-react";
import { getHealth, getVaultBalance } from "@/services/api/vault";
import { getHeartbeatChallenge, postHeartbeat } from "@/services/api/heartbeat";
import { signHeartbeat } from "@/services/passkey";
import type { Vault, UiState, CountdownParts } from "@/types";
import { formatDuration, formatWei } from "@/lib/utils";

const statusConfig: Record<UiState, { bg: string; label: string; description: string }> = {
  active: {
    bg: "accent.lime",
    label: "Active",
    description: "Heartbeat timer is running. All good.",
  },
  grace: {
    bg: "accent.yellow",
    label: "Grace Period",
    description: "Heartbeat missed. Check in with your passkey before grace expires!",
  },
  claimable: {
    bg: "accent.red",
    label: "Claimable",
    description: "Grace expired. Your heir can now claim the ETH.",
  },
  distributed: {
    bg: "secondary",
    label: "Distributed",
    description: "Vault has been claimed and closed.",
  },
};

function computeTick(vault: Vault): { state: UiState; label: string; countdown: CountdownParts } {
  if (vault.isClaimed) {
    return {
      state: "distributed",
      label: "Vault Distributed",
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    };
  }
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = vault.lastHeartbeat + vault.heartbeatInterval;
  const claimableDeadline = graceDeadline + vault.gracePeriod;

  let remaining: number;
  let state: UiState;
  let label: string;

  if (now >= claimableDeadline) {
    remaining = 0;
    state = "claimable";
    label = "Vault Is Claimable";
  } else if (now >= graceDeadline) {
    remaining = claimableDeadline - now;
    state = "grace";
    label = "Time Until Claimable";
  } else {
    remaining = graceDeadline - now;
    state = "active";
    label = "Next Heartbeat Due In";
  }

  remaining = Math.max(0, remaining);
  return {
    state,
    label,
    countdown: {
      days: Math.floor(remaining / 86400),
      hours: Math.floor((remaining % 86400) / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    },
  };
}

const VaultCard = ({
  vault,
  onHeartbeat,
  heartbeating,
  balanceWei,
}: {
  vault: Vault;
  onHeartbeat: (v: Vault) => Promise<void>;
  heartbeating: boolean;
  balanceWei?: string;
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const initial = useMemo(() => computeTick(vault), [vault]);
  const [countdown, setCountdown] = useState<CountdownParts>(initial.countdown);
  const [computedState, setComputedState] = useState<UiState>(initial.state);
  const [countdownLabel, setCountdownLabel] = useState(initial.label);

  useEffect(() => {
    const tick = () => {
      const r = computeTick(vault);
      setCountdown(r.countdown);
      setComputedState(r.state);
      setCountdownLabel(r.label);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [vault]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(vault.ethDepositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const config = statusConfig[computedState];
  const totalWindow = vault.heartbeatInterval + vault.gracePeriod;

  return (
    <VStack gap={8} align="stretch" w="full">
      {/* Status banner */}
      <Box
        bg={config.bg}
        borderWidth="6px"
        borderColor="foreground"
        borderRadius="2xl"
        p={8}
        boxShadow="16px 16px 0px 0px #000"
      >
        <Flex direction={{ base: "column", md: "row" }} align={{ base: "start", md: "center" }} justify="space-between" gap={6}>
          <Box minW={0}>
            <Badge bg="background" mb={3}>
              Vault Status
            </Badge>
            <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" textTransform="uppercase">
              {config.label}
            </Heading>
            <Text fontSize="sm" fontWeight="700" color="foreground" opacity={0.6} mt={1}>
              {config.description}
            </Text>
            <Box
              as="button"
              onClick={handleCopy}
              fontSize="xs"
              fontWeight="700"
              color="foreground"
              opacity={0.5}
              mt={2}
              fontFamily="mono"
              display="flex"
              alignItems="center"
              gap={1}
              wordBreak="break-all"
              _hover={{ opacity: 0.8, cursor: "pointer" }}
              transition="color 150ms"
            >
              <Text as="span" wordBreak="break-all">
                {vault.ethDepositAddress}
              </Text>
              {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
            </Box>
          </Box>
          {computedState !== "distributed" && (
            <Button
              variant="default"
              size="xl"
              onClick={() => onHeartbeat(vault)}
              disabled={heartbeating}
              flexShrink={0}
              animation={computedState === "grace" ? "shake 0.4s ease-out" : undefined}
            >
              {heartbeating ? (
                <>
                  <Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} /> Signing...
                </>
              ) : (
                <>
                  <Fingerprint className="h-5 w-5" /> Check In
                </>
              )}
            </Button>
          )}
        </Flex>
      </Box>

      {/* Countdown */}
      <NeoCard>
        <Flex align="center" justify="space-between" mb={6}>
          <Text fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
            {countdownLabel}
          </Text>
          <Clock className="h-5 w-5" style={{ color: "#666" }} strokeWidth={2.5} />
        </Flex>
        <Grid templateColumns="repeat(4, 1fr)" gap={{ base: 3, md: 4 }}>
          {[
            { label: "Days", value: countdown.days },
            { label: "Hours", value: countdown.hours },
            { label: "Min", value: countdown.minutes },
            { label: "Sec", value: countdown.seconds },
          ].map((unit) => (
            <Box key={unit.label} textAlign="center">
              <Box borderWidth="4px" borderColor="foreground" borderRadius="xl" bg="secondary" p={{ base: 4, md: 6 }}>
                <Text fontSize={{ base: "4xl", md: "6xl" }} fontWeight="900" fontVariantNumeric="tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </Text>
              </Box>
              <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mt={2}>
                {unit.label}
              </Text>
            </Box>
          ))}
        </Grid>
        <Flex align="center" justify="space-between" mt={4} pt={4} borderTopWidth="4px" borderColor="foreground" flexWrap="wrap" gap={2}>
          <Text fontSize="sm" fontWeight="700" color="muted-foreground">
            Last heartbeat:{" "}
            {vault.lastHeartbeat > 0
              ? new Date(vault.lastHeartbeat * 1000).toLocaleString()
              : "N/A"}
          </Text>
          {computedState === "grace" && (
            <Box
              display="inline-block"
              borderWidth="4px"
              borderColor="foreground"
              borderRadius="full"
              px={4}
              py={1}
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.1em"
              bg="accent.yellow"
              boxShadow="4px 4px 0px 0px #000"
              animation="pulseSlow 3s ease-in-out infinite"
            >
              Urgent
            </Box>
          )}
        </Flex>
      </NeoCard>

      {/* Stats grid */}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={6}>
        <StatCard
          icon={<Globe className="h-6 w-6" strokeWidth={2.5} />}
          iconBg="accent.orange"
          title="ETH Balance"
          value={balanceWei != null ? formatWei(balanceWei) : "—"}
          subtitle="ETH locked in vault"
        />
        <StatCard
          icon={<Heart className="h-6 w-6" strokeWidth={2.5} />}
          iconBg="accent.cyan"
          title="Label"
          value={vault.label}
          subtitle={vault.estatePda ? `${vault.estatePda.slice(0, 8)}...${vault.estatePda.slice(-6)}` : undefined}
        />
        <StatCard
          icon={<Clock className="h-6 w-6" strokeWidth={2.5} />}
          iconBg="accent.pink"
          title="Parameters"
        >
          <VStack gap={2} align="stretch">
            <Flex justify="space-between">
              <Text fontSize="sm" fontWeight="700">Interval</Text>
              <Text fontWeight="900">{formatDuration(vault.heartbeatInterval)}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="sm" fontWeight="700">Grace</Text>
              <Text fontWeight="900">{formatDuration(vault.gracePeriod)}</Text>
            </Flex>
            <Flex justify="space-between" borderTopWidth="4px" borderColor="foreground" pt={2} mt={2}>
              <Text fontSize="sm" fontWeight="700">Total</Text>
              <Text fontWeight="900">{formatDuration(totalWindow)}</Text>
            </Flex>
          </VStack>
        </StatCard>
      </Grid>

      {/* dWallet info */}
      {vault.dwalletSolana && (
        <NeoCard bg="rgba(139,92,246,0.1)">
          <Flex align="center" gap={3}>
            <Box bg="accent.purple" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
              <Shield className="h-6 w-6" style={{ color: "#fff" }} strokeWidth={2.5} />
            </Box>
            <Box minW={0}>
              <Text fontWeight="900">Ika dWallet</Text>
              <Text fontSize="sm" fontFamily="mono" color="muted-foreground" wordBreak="break-all">
                {vault.dwalletSolana}
              </Text>
              <Text fontSize="xs" fontWeight="500" color="muted-foreground" mt={1}>
                MPC-controlled key — only signs when your passkey approves.
              </Text>
            </Box>
          </Flex>
        </NeoCard>
      )}

      {/* Estate ID */}
      <NeoCard bg="rgba(0,240,255,0.1)">
        <Flex align="center" gap={3}>
          <Box bg="accent.cyan" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
            <Fingerprint className="h-6 w-6" strokeWidth={2.5} />
          </Box>
          <Box minW={0}>
            <Text fontWeight="900">Estate ID</Text>
            <Text fontSize="sm" fontFamily="mono" color="muted-foreground" wordBreak="break-all">
              {vault.estateId}
            </Text>
          </Box>
        </Flex>
      </NeoCard>

      {/* Withdraw action */}
      {(computedState === "active" || computedState === "grace") && (
        <NeoCard>
          <Flex direction={{ base: "column", sm: "row" }} align={{ base: "start", sm: "center" }} justify="space-between" gap={4}>
            <Flex align="start" gap={3}>
              <Box bg="accent.yellow" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3} flexShrink={0}>
                <Shield className="h-6 w-6" strokeWidth={2.5} />
              </Box>
              <Box>
                <Text fontWeight="900" fontSize="lg">Owner Withdraw</Text>
                <Text fontSize="sm" fontWeight="500" color="muted-foreground">
                  Emergency exit, sign with your ETH wallet to pull funds back out.
                </Text>
              </Box>
            </Flex>
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate(`/withdraw?estate=${vault.estateId}`)}
            >
              <Shield className="h-4 w-4" /> Withdraw
            </Button>
          </Flex>
        </NeoCard>
      )}

      {/* Claim CTA */}
      {computedState === "claimable" && !vault.isClaimed && (
        <NeoCard borderColor="accent.red" bg="rgba(255,51,51,0.1)">
          <Flex direction={{ base: "column", sm: "row" }} align={{ base: "start", sm: "center" }} justify="space-between" gap={4}>
            <Flex align="start" gap={3}>
              <Box bg="rgba(255,51,51,0.2)" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3} flexShrink={0}>
                <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />
              </Box>
              <Box>
                <Text fontWeight="900" fontSize="lg">Heir Claim Available</Text>
                <Text fontSize="sm" fontWeight="500" color="muted-foreground">
                  Grace expired — the heir can now claim the ETH.
                </Text>
              </Box>
            </Flex>
            <Button
              variant="destructive"
              size="default"
              onClick={() => navigate(`/claim?estate=${vault.estateId}`)}
            >
              <AlertTriangle className="h-4 w-4" /> Claim
            </Button>
          </Flex>
        </NeoCard>
      )}
    </VStack>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [ikaHealthy, setIkaHealthy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [heartbeating, setHeartbeating] = useState<string | null>(null);
  const [heartbeatError, setHeartbeatError] = useState<string | null>(null);
  const [lastHeartbeatOk, setLastHeartbeatOk] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    getHealth()
      .then((h) => {
        setBackendHealthy(h.backend === "ok");
        setIkaHealthy(h.ika_grpc === "ok");
      })
      .catch(() => {
        setBackendHealthy(false);
        setIkaHealthy(false);
      })
      .finally(() => setChecking(false));

    const vs: Vault[] = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
    setVaults(vs);

    vs.forEach((v) => {
      getVaultBalance(v.estateId)
        .then((b) => setBalances((prev) => ({ ...prev, [v.estateId]: b.balance_wei })))
        .catch(() => {/* ignore */});
    });
  }, []);

  const handleHeartbeat = async (vault: Vault) => {
    setHeartbeating(vault.estateId);
    setHeartbeatError(null);
    setLastHeartbeatOk(null);

    try {
      const { challenge_b64 } = await getHeartbeatChallenge(vault.estateId);
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
      setLastHeartbeatOk(vault.estateId);
      setTimeout(() => setLastHeartbeatOk(null), 4000);
    } catch (err) {
      setHeartbeatError(err instanceof Error ? err.message : String(err));
    } finally {
      setHeartbeating(null);
    }
  };

  const handleClear = () => {
    if (!confirm("Forget all locally-stored vaults? (On-chain vaults are not affected.)")) return;
    localStorage.removeItem("heirloom_vaults");
    setVaults([]);
  };

  return (
    <Box minH="100vh" bg="background">
      {/* Header */}
      <Box borderBottomWidth="8px" borderColor="foreground" bg="background" position="sticky" top={0} zIndex={50}>
        <Flex maxW="6xl" mx="auto" px={6} align="center" justify="space-between" h="80px">
          <HStack gap={2} fontSize="lg" fontWeight="900">
            <Heart className="h-5 w-5" strokeWidth={3} />
            <Text>Heirloom • IKA</Text>
          </HStack>
          <Text fontSize="2xl" fontWeight="900" display={{ base: "none", md: "inline" }}>
            Vault Dashboard
          </Text>
          <HStack gap={3}>
            {checking ? (
              <Text fontSize="xs" fontWeight="700" color="muted-foreground" textTransform="uppercase" letterSpacing="0.1em">
                Checking…
              </Text>
            ) : (
              <>
                {!backendHealthy && (
                  <HStack gap={2} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em">
                    <Box w="2.5" h="2.5" borderRadius="full" bg="accent.red" />
                    <Text>Backend Off</Text>
                  </HStack>
                )}
                {backendHealthy && ikaHealthy && (
                  <HStack gap={2} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em">
                    <Box w="2.5" h="2.5" borderRadius="full" bg="accent.lime" />
                    <Text>Live</Text>
                  </HStack>
                )}
                {backendHealthy && !ikaHealthy && (
                  <HStack gap={2} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em">
                    <Box w="2.5" h="2.5" borderRadius="full" bg="accent.yellow" />
                    <Text>IKA Off</Text>
                  </HStack>
                )}
              </>
            )}
            {vaults.length > 0 && (
              <Box
                as="button"
                onClick={handleClear}
                display="flex"
                alignItems="center"
                gap={2}
                fontSize="sm"
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing="0.1em"
                _hover={{ textDecoration: "underline" }}
                title="Forget local vaults"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
                <Text display={{ base: "none", sm: "inline" }}>Forget</Text>
              </Box>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Main */}
      <VStack maxW="6xl" mx="auto" px={6} py={12} gap={10} align="stretch" animation="slideUp 0.4s ease-out">
        <Flex align="start" justify="space-between" gap={4} flexWrap="wrap">
          <Box minW={0}>
            <Badge bg="accent.lime" mb={2}>
              Your ETH Vaults
            </Badge>
            <Heading as="h2" fontSize="4xl" fontWeight="900">
              {vaults.length} vault{vaults.length !== 1 ? "s" : ""}
            </Heading>
            <Text fontSize="sm" fontWeight="500" color="muted-foreground" mt={1}>
              Passkey-secured, MPC-backed Ethereum estates.
            </Text>
          </Box>
          <Button variant="lime" size="lg" onClick={() => navigate("/create")}>
            <Plus className="h-5 w-5" /> New Vault
          </Button>
        </Flex>

        {heartbeatError && (
          <NeoCard bg="rgba(255,51,51,0.1)">
            <Flex align="start" gap={3}>
              <AlertTriangle className="h-5 w-5" style={{ marginTop: "2px" }} strokeWidth={2.5} />
              <Box minW={0}>
                <Text fontWeight="900">Heartbeat failed</Text>
                <Text fontSize="sm" fontWeight="500" color="muted-foreground" wordBreak="break-word">
                  {heartbeatError}
                </Text>
              </Box>
            </Flex>
          </NeoCard>
        )}

        {lastHeartbeatOk && (
          <NeoCard bg="rgba(204,255,0,0.2)">
            <Flex align="center" gap={3}>
              <Activity className="h-5 w-5" strokeWidth={2.5} />
              <Text fontWeight="700">Heartbeat confirmed on-chain.</Text>
            </Flex>
          </NeoCard>
        )}

        {vaults.length === 0 && (
          <NeoCard textAlign="center">
            <Box
              bg="accent.yellow"
              borderWidth="4px"
              borderColor="foreground"
              borderRadius="full"
              p={4}
              w="80px"
              h="80px"
              mx="auto"
              mb={6}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Heart className="h-10 w-10" strokeWidth={2.5} />
            </Box>
            <Heading as="h2" fontSize="2xl" fontWeight="900" mb={3}>
              No Vaults Yet
            </Heading>
            <Text color="muted-foreground" fontWeight="500" mb={6}>
              Create your first ETH vault. No Solana wallet needed — only a passkey.
            </Text>
            <Button variant="lime" onClick={() => navigate("/create")}>
              <Plus className="h-5 w-5" /> Create Vault
            </Button>
            <Box borderTopWidth="4px" borderColor="foreground" pt={6} mt={6}>
              <Text fontSize="sm" fontWeight="700" color="muted-foreground" mb={3}>
                Were you named as an heir?
              </Text>
              <Button variant="orange" onClick={() => navigate("/claim")}>
                Claim Inheritance
              </Button>
            </Box>
          </NeoCard>
        )}

        {vaults.map((v) => (
          <VaultCard
            key={v.estateId}
            vault={v}
            onHeartbeat={handleHeartbeat}
            heartbeating={heartbeating === v.estateId}
            balanceWei={balances[v.estateId]}
          />
        ))}
      </VStack>
    </Box>
  );
}

/* Reusable layout components */

function NeoCard({ children, bg, borderColor, textAlign }: { children: React.ReactNode; bg?: string; borderColor?: string; textAlign?: "center" | "left" }) {
  return (
    <Box
      bg={bg ?? "card"}
      borderWidth="4px"
      borderColor={borderColor ?? "foreground"}
      borderRadius="2xl"
      p={8}
      boxShadow="12px 12px 0px 0px #000"
      textAlign={textAlign}
    >
      {children}
    </Box>
  );
}

function Badge({ children, bg, mb }: { children: React.ReactNode; bg?: string; mb?: number }) {
  return (
    <Box
      display="inline-block"
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="full"
      px={4}
      py={1}
      fontSize="sm"
      fontWeight="700"
      textTransform="uppercase"
      letterSpacing="0.1em"
      bg={bg ?? "background"}
      boxShadow="4px 4px 0px 0px #000"
      mb={mb}
    >
      {children}
    </Box>
  );
}

function StatCard({
  icon,
  iconBg,
  title,
  value,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <Box
      bg="card"
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="2xl"
      p={8}
      boxShadow="12px 12px 0px 0px #000"
      _hover={{ transform: "translateY(-2px)" }}
      transition="transform 150ms"
    >
      <Flex align="center" gap={3} mb={4}>
        <Box
          bg={iconBg}
          borderWidth="4px"
          borderColor="foreground"
          borderRadius="xl"
          p={3}
          _hover={{ transform: "rotate(-4deg)" }}
          transition="transform 150ms"
        >
          {icon}
        </Box>
        <Text fontWeight="900">{title}</Text>
      </Flex>
      {value && (
        <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="900" fontVariantNumeric="tabular-nums">
          {value}
        </Text>
      )}
      {subtitle && (
        <Text fontSize="sm" fontWeight="700" color="muted-foreground">
          {subtitle}
        </Text>
      )}
      {children}
    </Box>
  );
}
