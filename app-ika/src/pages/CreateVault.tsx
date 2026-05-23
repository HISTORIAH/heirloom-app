import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Box,
  Flex,
  Text,
  Grid,
  VStack,

  Heading,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Globe,
  Heart,
  Clock,
  User,
  Fingerprint,
  Copy,
  Shield,
  Check,
} from "lucide-react";
import { createVault } from "@/services/api/vault";
import { registerPasskey } from "@/services/passkey";
import { QRCodeSVG } from "qrcode.react";
import { formatDuration, isValidEthAddress } from "@/lib/utils";

const STEPS = ["Heartbeat", "Owner", "Heir", "Review"];
const LABEL_MAX_LEN = 32;

const HEARTBEAT_PRESETS = [
  { label: "1d", days: 1 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "365d", days: 365 },
];

const GRACE_PRESETS = [
  { label: "1d", days: 1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "90d", days: 90 },
];

type SubmitState = "idle" | "passkey" | "creating" | "complete" | "error";

interface VaultResult {
  estateId: string;
  estatePda: string;
  ethDepositAddress: string;
  dwalletSolana: string;
}

export default function CreateVault() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [label, setLabel] = useState("My ETH Vault");
  const [heartbeatDays, setHeartbeatDays] = useState(30);
  const [graceDays, setGraceDays] = useState(7);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [heirEthAddress, setHeirEthAddress] = useState("");

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<VaultResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const labelValid = label.trim().length > 0 && label.length <= LABEL_MAX_LEN;
  const ownerValid = isValidEthAddress(ownerAddress);
  const heirValid = isValidEthAddress(heirEthAddress);

  const canProceed = () => {
    if (step === 0) return heartbeatDays > 0 && graceDays > 0 && labelValid;
    if (step === 1) return ownerValid;
    if (step === 2) return heirValid;
    return true;
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitState("passkey");

    try {
      const userId = ownerAddress.toLowerCase();
      const passkeyReg = await registerPasskey(userId, label);

      setSubmitState("creating");

      const stored = JSON.parse(localStorage.getItem("heirloom_credentials") || "{}");
      stored[ownerAddress.toLowerCase()] = passkeyReg.credentialId;
      localStorage.setItem("heirloom_credentials", JSON.stringify(stored));

      const resp = await createVault({
        heir_eth_address: heirEthAddress.trim(),
        owner_address: ownerAddress,
        passkey_pubkey_hex: passkeyReg.pubkeyHex,
        network_id: 0,
        heartbeat_interval_secs: heartbeatDays * 86400,
        grace_period_secs: graceDays * 86400,
        pause_duration_secs: graceDays * 86400,
        label: label.slice(0, LABEL_MAX_LEN),
      });

      const vaults = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      vaults.push({
        estateId: resp.estate_id,
        estatePda: resp.estate_pda,
        label,
        ethDepositAddress: resp.eth_deposit_address,
        dwalletSolana: resp.dwallet_solana_address,
        heartbeatInterval: heartbeatDays * 86400,
        gracePeriod: graceDays * 86400,
        lastHeartbeat: Math.floor(Date.now() / 1000),
        isClaimed: false,
      });
      localStorage.setItem("heirloom_vaults", JSON.stringify(vaults));

      setResult({
        estateId: resp.estate_id,
        estatePda: resp.estate_pda,
        ethDepositAddress: resp.eth_deposit_address,
        dwalletSolana: resp.dwallet_solana_address,
      });
      setSubmitState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitState("error");
    }
  };

  const isWorking = submitState === "passkey" || submitState === "creating";
  const isDone = submitState === "complete" && result;

  // === Done state ===========================================================
  if (isDone && result) {
    return (
      <Box minH="100vh" bg="background">
        <Box borderBottomWidth="8px" borderColor="foreground" bg="background" position="sticky" top={0} zIndex={50}>
          <Flex maxW="4xl" mx="auto" px={6} align="center" justify="space-between" h="80px">
            <Box as="button" onClick={() => navigate("/")} display="flex" alignItems="center" gap={2} fontSize="lg" fontWeight="900" _hover={{ textDecoration: "underline" }}>
              <ArrowLeft className="h-5 w-5" strokeWidth={3} />
              Dashboard
            </Box>
            <Text fontSize="2xl" fontWeight="900">Vault Created</Text>
            <Badge bg="accent.lime" fontSize="10px">Live</Badge>
          </Flex>
        </Box>

        <VStack maxW="4xl" mx="auto" px={6} py={12} gap={8} align="stretch" animation="slideUp 0.4s ease-out">
          <Box bg="accent.lime" borderWidth="6px" borderColor="foreground" borderRadius="2xl" p={8} boxShadow="16px 16px 0px 0px #000" textAlign="center">
            <Box bg="background" borderWidth="4px" borderColor="foreground" borderRadius="full" p={6} w="80px" h="80px" mx="auto" mb={6} display="flex" alignItems="center" justifyContent="center">
              <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
            </Box>
            <Badge bg="background" mb={3}>Vault Live</Badge>
            <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" textTransform="uppercase">
              {label}
            </Heading>
            <Text fontSize="sm" fontWeight="700" color="foreground" opacity={0.7} mt={2} maxW="md" mx="auto">
              Send ETH to your deposit address to fund the vault. Check in regularly with your passkey.
            </Text>
          </Box>

          <NeoCard>
            <Flex align="center" gap={3} mb={4}>
              <Box bg="accent.orange" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                <Globe className="h-6 w-6" strokeWidth={2.5} />
              </Box>
              <Heading as="h3" fontSize="xl" fontWeight="900">ETH Deposit Address</Heading>
            </Flex>
            <VStack gap={4} mt={2} align="center">
              <Box borderWidth="4px" borderColor="foreground" borderRadius="2xl" bg="background" p={4}>
                <QRCodeSVG value={result.ethDepositAddress} size={180} level="M" />
              </Box>
              <Box borderWidth="4px" borderColor="foreground" bg="background" borderRadius="lg" p={3} w="full" textAlign="center">
                <Text fontFamily="mono" fontSize="sm" wordBreak="break-all" fontWeight="700">
                  {result.ethDepositAddress}
                </Text>
              </Box>
              <Button variant="outline" size="default" onClick={() => handleCopy(result.ethDepositAddress)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Address"}
              </Button>
            </VStack>
          </NeoCard>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
            <NeoCard bg="rgba(0,240,255,0.1)">
              <Flex align="center" gap={3} mb={3}>
                <Box bg="accent.cyan" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                  <Fingerprint className="h-6 w-6" strokeWidth={2.5} />
                </Box>
                <Heading as="h3" fontSize="lg" fontWeight="900">Estate ID</Heading>
              </Flex>
              <Text fontFamily="mono" fontSize="xs" wordBreak="break-all" color="muted-foreground">
                {result.estateId}
              </Text>
            </NeoCard>
            <NeoCard bg="rgba(139,92,246,0.1)">
              <Flex align="center" gap={3} mb={3}>
                <Box bg="accent.purple" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                  <Shield className="h-6 w-6" style={{ color: "#fff" }} strokeWidth={2.5} />
                </Box>
                <Heading as="h3" fontSize="lg" fontWeight="900">Ika dWallet</Heading>
              </Flex>
              <Text fontFamily="mono" fontSize="xs" wordBreak="break-all" color="muted-foreground">
                {result.dwalletSolana}
              </Text>
            </NeoCard>
          </Grid>

          <Flex justify="flex-end" pt={8} borderTopWidth="4px" borderColor="foreground">
            <Button variant="lime" size="xl" onClick={() => navigate("/")}>
              Go to Dashboard <ArrowRight className="h-5 w-5" />
            </Button>
          </Flex>
        </VStack>
      </Box>
    );
  }

  // === Wizard ===============================================================
  return (
    <>
      <Box minH="100vh" bg="background" aria-hidden={isWorking} pointerEvents={isWorking ? "none" : "auto"}>
        <Box borderBottomWidth="8px" borderColor="foreground" bg="background" position="sticky" top={0} zIndex={50}>
          <Flex maxW="4xl" mx="auto" px={6} align="center" justify="space-between" h="80px">
            <Box as="button" onClick={() => navigate("/")} display="flex" alignItems="center" gap={2} fontSize="lg" fontWeight="900" _hover={{ textDecoration: "underline" }}>
              <ArrowLeft className="h-5 w-5" strokeWidth={3} />
              Back
            </Box>
            <Text fontSize="2xl" fontWeight="900">Create ETH Vault</Text>
            <Text fontSize="lg" fontWeight="900">IKA</Text>
          </Flex>
        </Box>

        {/* Stepper */}
        <Box bg="secondary" borderBottomWidth="4px" borderColor="foreground">
          <Box maxW="4xl" mx="auto" px={6} py={5}>
            <Flex align="center">
              {STEPS.map((s, i) => (
                <Flex key={s} align="center" flex={1}>
                  <VStack flex={1} align="center" gap={0}>
                    <Box
                      w={{ base: "40px", md: "48px" }}
                      h={{ base: "40px", md: "48px" }}
                      borderWidth="4px"
                      borderColor="foreground"
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontWeight="900"
                      fontSize={{ base: "sm", md: "base" }}
                      transition="all 300ms"
                      bg={i < step ? "accent.lime" : i === step ? "accent.lime" : "secondary"}
                      transform={i === step ? "scale(1.1)" : "none"}
                      boxShadow={i === step ? "8px 8px 0px 0px #000" : "none"}
                    >
                      {i < step ? <CheckCircle className="h-5 w-5" strokeWidth={3} /> : i + 1}
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      textTransform="uppercase"
                      letterSpacing="0.1em"
                      textAlign="center"
                      mt={2}
                      color={i === step ? "foreground" : "muted-foreground"}
                    >
                      {s}
                    </Text>
                  </VStack>
                  {i < STEPS.length - 1 && (
                    <Box
                      h="4px"
                      flex={1}
                      borderWidth="4px"
                      borderColor="foreground"
                      borderRadius="full"
                      mt="-24px"
                      mx={1}
                      bg={i < step ? "accent.lime" : "secondary"}
                    />
                  )}
                </Flex>
              ))}
            </Flex>
          </Box>
        </Box>

        <Box maxW="4xl" mx="auto" px={6} py={12}>
          {error && (
            <NeoCard bg="rgba(255,51,51,0.1)" mb={6}>
              <Text fontWeight="700" fontSize="sm">{error}</Text>
            </NeoCard>
          )}

          <Box animation="slideUp 0.4s ease-out" key={step}>
            {/* Step 0 — Heartbeat + Label */}
            {step === 0 && (
              <VStack gap={6} align="stretch">
                <Box>
                  <Badge bg="accent.pink" mb={4}>Step 1</Badge>
                  <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" lineHeight={0.9}>
                    Set your{" "}
                    <Box as="span" bg="accent.pink" px={2} display="inline-block" transform="rotate(-1deg)">
                      heartbeat.
                    </Box>
                  </Heading>
                  <Text fontSize="lg" fontWeight="500" color="muted-foreground" mt={4} maxW="xl">
                    How often will you check in with your passkey? Miss it, grace starts.
                  </Text>
                </Box>

                <NeoCard>
                  <Flex align="center" gap={3} mb={4}>
                    <Box bg="accent.yellow" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                      <Heart className="h-6 w-6" strokeWidth={2.5} />
                    </Box>
                    <Heading as="h3" fontSize="xl" fontWeight="900">Label</Heading>
                  </Flex>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                    Vault name ({LABEL_MAX_LEN} chars max)
                  </Text>
                  <NeoInput
                    type="text"
                    value={label}
                    maxLength={LABEL_MAX_LEN}
                    onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
                    placeholder="e.g. My ETH Vault"
                    focusBg="rgba(255,204,0,0.2)"
                  />
                </NeoCard>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                  <NeoCard>
                    <Flex align="center" gap={3} mb={6}>
                      <Box bg="accent.pink" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                        <Heart className="h-6 w-6" strokeWidth={2.5} />
                      </Box>
                      <Heading as="h3" fontSize="xl" fontWeight="900">Heartbeat Interval</Heading>
                    </Flex>
                    <VStack gap={4} align="stretch">
                      <NeoRange
                        min={1}
                        max={365}
                        value={heartbeatDays}
                        onChange={(e) => setHeartbeatDays(Number(e.target.value))}
                        variant="pink"
                      />
                      <Flex justify="space-between" align="end">
                        <Text fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                          Days
                        </Text>
                        <Text fontSize="5xl" fontWeight="900" fontVariantNumeric="tabular-nums">
                          {heartbeatDays}
                        </Text>
                      </Flex>
                      <Flex gap={2}>
                        {HEARTBEAT_PRESETS.map((p) => (
                          <PresetButton
                            key={p.label}
                            active={heartbeatDays === p.days}
                            onClick={() => setHeartbeatDays(p.days)}
                            activeBg="accent.pink"
                          >
                            {p.label}
                          </PresetButton>
                        ))}
                      </Flex>
                    </VStack>
                  </NeoCard>

                  <NeoCard>
                    <Flex align="center" gap={3} mb={6}>
                      <Box bg="accent.yellow" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                        <Clock className="h-6 w-6" strokeWidth={2.5} />
                      </Box>
                      <Heading as="h3" fontSize="xl" fontWeight="900">Grace Period</Heading>
                    </Flex>
                    <VStack gap={4} align="stretch">
                      <NeoRange
                        min={1}
                        max={90}
                        value={graceDays}
                        onChange={(e) => setGraceDays(Number(e.target.value))}
                        variant="yellow"
                      />
                      <Flex justify="space-between" align="end">
                        <Text fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                          Days
                        </Text>
                        <Text fontSize="5xl" fontWeight="900" fontVariantNumeric="tabular-nums">
                          {graceDays}
                        </Text>
                      </Flex>
                      <Flex gap={2}>
                        {GRACE_PRESETS.map((p) => (
                          <PresetButton
                            key={p.label}
                            active={graceDays === p.days}
                            onClick={() => setGraceDays(p.days)}
                            activeBg="accent.yellow"
                          >
                            {p.label}
                          </PresetButton>
                        ))}
                      </Flex>
                    </VStack>
                  </NeoCard>
                </Grid>

                <NeoCard bg="rgba(204,255,0,0.3)">
                  <Flex align="center" gap={4}>
                    <Box bg="accent.lime" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3} flexShrink={0}>
                      <Clock className="h-6 w-6" strokeWidth={2.5} />
                    </Box>
                    <Text fontSize="base" fontWeight="700" lineHeight="snug">
                      Total protection window:{" "}
                      <Text as="span" fontSize="xl" fontWeight="900">
                        {formatDuration((heartbeatDays + graceDays) * 86400)}.
                      </Text>
                      {" "}If you don't check in for this long, your heir can claim.
                    </Text>
                  </Flex>
                </NeoCard>
              </VStack>
            )}

            {/* Step 1 — Owner */}
            {step === 1 && (
              <VStack gap={8} align="stretch">
                <Box>
                  <Badge bg="accent.cyan" mb={4}>Step 2</Badge>
                  <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" lineHeight={0.9}>
                    Your{" "}
                    <Box as="span" bg="accent.cyan" px={2} display="inline-block" transform="rotate(1deg)">
                      owner address.
                    </Box>
                  </Heading>
                  <Text fontSize="lg" fontWeight="500" color="muted-foreground" mt={4} maxW="xl">
                    Your Ethereum address that's used for emergency withdrawals and passkey registration.
                  </Text>
                </Box>

                <NeoCard>
                  <Flex align="center" gap={3} mb={4}>
                    <Box bg="accent.cyan" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                      <Globe className="h-6 w-6" strokeWidth={2.5} />
                    </Box>
                    <Heading as="h3" fontSize="xl" fontWeight="900">Owner ETH Address</Heading>
                  </Flex>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                    0x address you control
                  </Text>
                  <NeoInput
                    type="text"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    maxLength={64}
                    placeholder="0x..."
                    fontFamily="mono"
                    focusBg="rgba(0,240,255,0.2)"
                  />
                  <Text fontSize="xs" fontWeight="500" color="muted-foreground" mt={2}>
                    You sign with this address in MetaMask if you ever need to pull funds back out.
                  </Text>
                </NeoCard>

                <NeoCard bg="rgba(242,242,242,0.5)">
                  <Flex align="start" gap={3}>
                    <Fingerprint className="h-5 w-5" style={{ marginTop: "2px", color: "#666" }} />
                    <Box>
                      <Text fontWeight="700" fontSize="sm">Passkey required</Text>
                      <Text fontSize="xs" color="muted-foreground" mt={1}>
                        On the review step your device will ask for biometric verification to bind a
                        passkey to this vault. No Solana wallet needed.
                      </Text>
                    </Box>
                  </Flex>
                </NeoCard>
              </VStack>
            )}

            {/* Step 2 — Heir */}
            {step === 2 && (
              <VStack gap={8} align="stretch">
                <Box>
                  <Badge bg="accent.orange" mb={4}>Step 3</Badge>
                  <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" lineHeight={0.9}>
                    Name your{" "}
                    <Box as="span" bg="accent.orange" px={2} display="inline-block" transform="rotate(-1deg)">
                      heir.
                    </Box>
                  </Heading>
                  <Text fontSize="lg" fontWeight="500" color="muted-foreground" mt={4} maxW="xl">
                    The Ethereum address that receives ETH if you stop checking in.
                  </Text>
                </Box>

                <NeoCard>
                  <Flex align="center" gap={3} mb={4}>
                    <Box bg="accent.orange" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                      <User className="h-6 w-6" strokeWidth={2.5} />
                    </Box>
                    <Heading as="h3" fontSize="xl" fontWeight="900">Heir ETH Address</Heading>
                  </Flex>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                    Where ETH goes when claimed
                  </Text>
                  <NeoInput
                    type="text"
                    value={heirEthAddress}
                    onChange={(e) => setHeirEthAddress(e.target.value)}
                    maxLength={64}
                    placeholder="0x..."
                    fontFamily="mono"
                    focusBg="rgba(255,149,0,0.2)"
                  />
                  <Text fontSize="xs" fontWeight="500" color="muted-foreground" mt={2}>
                    One vault, one heir. Create more vaults to cover more beneficiaries.
                  </Text>
                </NeoCard>
              </VStack>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <VStack gap={8} align="stretch">
                <Box>
                  <Badge bg="accent.lime" mb={4}>Step 4</Badge>
                  <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" lineHeight={0.9}>
                    Review &{" "}
                    <Box as="span" bg="accent.lime" px={2} display="inline-block" transform="rotate(1deg)">
                      confirm.
                    </Box>
                  </Heading>
                </Box>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                  <NeoCard>
                    <Text fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={3}>
                      Timing
                    </Text>
                    <VStack gap={2} align="stretch">
                      <Flex justify="space-between">
                        <Text fontWeight="700">Interval</Text>
                        <Text fontWeight="900" fontSize="xl">{formatDuration(heartbeatDays * 86400)}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontWeight="700">Grace</Text>
                        <Text fontWeight="900" fontSize="xl">{formatDuration(graceDays * 86400)}</Text>
                      </Flex>
                      <Flex justify="space-between" borderTopWidth="4px" borderColor="foreground" pt={2} mt={2}>
                        <Text fontWeight="700">Total</Text>
                        <Text fontWeight="900" fontSize="xl">{formatDuration((heartbeatDays + graceDays) * 86400)}</Text>
                      </Flex>
                    </VStack>
                  </NeoCard>

                  <NeoCard>
                    <Text fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={3}>
                      Identity
                    </Text>
                    <VStack gap={3} align="stretch">
                      <Box>
                        <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                          Label
                        </Text>
                        <Text fontWeight="900" fontSize="lg">{label}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                          Network
                        </Text>
                        <Text fontWeight="900" fontSize="lg">Ethereum</Text>
                      </Box>
                    </VStack>
                  </NeoCard>
                </Grid>

                <NeoCard>
                  <Flex align="center" gap={3} mb={3}>
                    <Box bg="accent.cyan" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                      <Globe className="h-6 w-6" strokeWidth={2.5} />
                    </Box>
                    <Heading as="h3" fontSize="xl" fontWeight="900">Owner</Heading>
                  </Flex>
                  <Text fontSize="xs" fontFamily="mono" color="muted-foreground" wordBreak="break-all">
                    {ownerAddress}
                  </Text>
                </NeoCard>

                <NeoCard>
                  <Flex align="center" gap={3} mb={3}>
                    <Box bg="accent.orange" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                      <User className="h-6 w-6" strokeWidth={2.5} />
                    </Box>
                    <Heading as="h3" fontSize="xl" fontWeight="900">Heir</Heading>
                  </Flex>
                  <Text fontSize="xs" fontFamily="mono" color="muted-foreground" wordBreak="break-all">
                    {heirEthAddress}
                  </Text>
                </NeoCard>

                <NeoCard bg="rgba(139,92,246,0.1)">
                  <Flex align="start" gap={3}>
                    <Box bg="accent.purple" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3} flexShrink={0}>
                      <Fingerprint className="h-6 w-6" style={{ color: "#fff" }} strokeWidth={2.5} />
                    </Box>
                    <Box>
                      <Text fontWeight="900">Passkey will be created</Text>
                      <Text fontSize="sm" fontWeight="500" color="muted-foreground" mt={1}>
                        Your device will prompt for biometric verification. The passkey signs every
                        heartbeat.
                      </Text>
                    </Box>
                  </Flex>
                </NeoCard>
              </VStack>
            )}
          </Box>

          {/* Nav buttons */}
          <Flex justify="space-between" align="center" mt={12} pt={8} borderTopWidth="4px" borderColor="foreground">
            <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} disabled={step === 0 || isWorking}>
              <ArrowLeft className="h-5 w-5" /> Back
            </Button>
            {step < 3 ? (
              <Button variant="lime" size="lg" onClick={() => setStep(step + 1)} disabled={!canProceed() || isWorking}>
                Next <ArrowRight className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="lime"
                size="xl"
                onClick={handleSubmit}
                disabled={!labelValid || !ownerValid || !heirValid || isWorking}
                animation="glowLime 2s ease-in-out infinite"
              >
                {isWorking ? (
                  <>
                    <Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} strokeWidth={2.5} />
                    Creating…
                  </>
                ) : (
                  <>
                    <Globe className="h-5 w-5" /> Create Vault
                  </>
                )}
              </Button>
            )}
          </Flex>
        </Box>
      </Box>

      {/* Overlay */}
      {isWorking && (
        <Box
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          position="fixed"
          inset={0}
          zIndex={60}
          bg="rgba(0,0,0,0.4)"
          backdropFilter="blur(2px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={6}
        >
          <Box textAlign="center" maxW="md" w="full" animation="slideUp 0.4s ease-out" bg="card" borderWidth="4px" borderColor="foreground" borderRadius="2xl" p={8} boxShadow="12px 12px 0px 0px #000">
            {submitState === "passkey" ? (
              <>
                <Box bg="accent.cyan" borderWidth="4px" borderColor="foreground" borderRadius="full" p={6} w="80px" h="80px" mx="auto" mb={6} display="flex" alignItems="center" justifyContent="center">
                  <Fingerprint className="h-10 w-10" strokeWidth={2.5} />
                </Box>
                <Heading as="h2" fontSize="3xl" fontWeight="900" mb={3}>Register Passkey</Heading>
                <Text fontSize="lg" fontWeight="500" color="muted-foreground" mb={4}>
                  Use your device biometric or PIN to create the passkey.
                </Text>
              </>
            ) : (
              <>
                <Box bg="accent.yellow" borderWidth="4px" borderColor="foreground" borderRadius="full" p={6} w="80px" h="80px" mx="auto" mb={6} display="flex" alignItems="center" justifyContent="center">
                  <Loader2 className="h-10 w-10" style={{ animation: "spin 1s linear infinite" }} strokeWidth={2.5} />
                </Box>
                <Heading as="h2" fontSize="3xl" fontWeight="900" mb={3}>Creating Vault…</Heading>
                <Text fontSize="lg" fontWeight="500" color="muted-foreground" mb={4}>
                  Running Ika DKG and submitting on-chain. May take 30–60 seconds.
                </Text>
              </>
            )}
          </Box>
        </Box>
      )}
    </>
  );
}

/* Reusable components */

function NeoCard({ children, bg, mb, textAlign, maxW }: { children: React.ReactNode; bg?: string; mb?: number; textAlign?: "center" | "left"; maxW?: string }) {
  return (
    <Box
      bg={bg ?? "card"}
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="2xl"
      p={8}
      boxShadow="12px 12px 0px 0px #000"
      mb={mb}
      textAlign={textAlign}
      maxW={maxW}
    >
      {children}
    </Box>
  );
}

function Badge({ children, bg, fontSize, mb }: { children: React.ReactNode; bg?: string; fontSize?: string; mb?: number }) {
  return (
    <Box
      display="inline-block"
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="full"
      px={4}
      py={1}
      fontSize={fontSize ?? "sm"}
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

function NeoInput({ focusBg, fontFamily, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { focusBg?: string; fontFamily?: string }) {
  return (
    <Box
      as="input"
      w="full"
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="lg"
      px={4}
      py={3}
      bg="background"
      fontWeight="700"
      fontSize="base"
      boxShadow="4px 4px 0px 0px #000"
      transition="all 150ms"
      fontFamily={fontFamily}
      _focus={{
        boxShadow: "8px 8px 0px 0px #000",
        transform: "translate(-2px, -2px)",
        outline: "none",
        bg: focusBg,
      }}
      {...props}
    />
  );
}

function PresetButton({ children, active, onClick, activeBg }: { children: React.ReactNode; active: boolean; onClick: () => void; activeBg: string }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="lg"
      px={3}
      py={1}
      fontSize="sm"
      fontWeight="700"
      transition="all 150ms"
      bg={active ? activeBg : "secondary"}
      boxShadow={active ? "4px 4px 0px 0px #000" : "none"}
      _hover={active ? {} : { bg: `${activeBg}4D` }}
      _active={{ transform: "translate(2px, 2px)", boxShadow: "none" }}
      flex={1}
      minW="60px"
      textAlign="center"
    >
      {children}
    </Box>
  );
}

function NeoRange({
  variant,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { variant: "pink" | "yellow" }) {
  const color = variant === "pink" ? "#ff52d8" : "#ffcc00";
  const max = Number(props.max) || 100;
  const value = Number(props.value) || 0;
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <Box position="relative" w="full" h="24px">
      {/* Background track */}
      <Box
        position="absolute"
        top="4px"
        left="0"
        right="0"
        h="16px"
        borderWidth="4px"
        borderColor="foreground"
        bg="secondary"
        boxShadow="4px 4px 0px 0px #000"
        pointerEvents="none"
      />
      {/* Fill */}
      <Box
        position="absolute"
        top="8px"
        left="4px"
        h="8px"
        bg={color}
        pointerEvents="none"
        style={{ width: `calc(${percentage}% - 8px)` }}
      />
      {/* Actual input on top */}
      <input
        {...props}
        type="range"
        className="neo-range"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "24px",
          margin: 0,
          padding: 0,
          background: "transparent",
        }}
      />
    </Box>
  );
}
