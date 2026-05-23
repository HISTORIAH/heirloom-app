import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Gift,
  Search,
  Coins,
  User,
} from "lucide-react";
import { getClaimTx, postClaim } from "@/services/api/claim";
import type { ClaimTxInfo } from "@/types/api";
import { signMessageHash } from "@/services/ethereum";
import type { Vault } from "@/types";
import { formatWei, isValidEthAddress } from "@/lib/utils";
import { VaultList } from "@/components/VaultList";
import { TxSuccessPage } from "@/components/TxSuccessPage";

type Step = "select" | "preview" | "signing" | "submitting" | "done";

export default function Claim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState(searchParams.get("estate") || "");
  const [destinationEth, setDestinationEth] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [txInfo, setTxInfo] = useState<ClaimTxInfo | null>(null);
  const [result, setResult] = useState<{ solana_tx: string; eth_tx: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
    setVaults(vs);
    if (searchParams.get("estate")) setStep("preview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreview = async () => {
    if (!selectedEstateId) return;
    setBusy(true);
    setError(null);
    try {
      const info = await getClaimTx(selectedEstateId);
      setTxInfo(info);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignAndClaim = async () => {
    if (!txInfo || !isValidEthAddress(destinationEth)) return;
    setBusy(true);
    setError(null);
    setStep("signing");

    try {
      const sig = await signMessageHash(txInfo.message_hash_hex, destinationEth);
      setStep("submitting");

      const resp = await postClaim({
        estate_id: txInfo.estate_id,
        heir_eth_address: destinationEth,
        eth_signature: sig,
      });

      setResult({ solana_tx: resp.solana_tx, eth_tx: resp.eth_tx });
      setStep("done");

      const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      const idx = vs.findIndex((v: Vault) => v.estateId === txInfo.estate_id);
      if (idx >= 0) {
        vs[idx].isClaimed = true;
        localStorage.setItem("heirloom_vaults", JSON.stringify(vs));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("preview");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done" && result) {
    return (
      <TxSuccessPage
        title="Claim"
        icon={<Gift className="h-5 w-5" strokeWidth={3} />}
        heroBadge="Claim Submitted"
        solanaTx={result.solana_tx}
        ethTx={result.eth_tx}
      />
    );
  }

  return (
    <Box minH="100vh" bg="background">
      {/* Header */}
      <Box borderBottomWidth="8px" borderColor="foreground" bg="background" position="sticky" top={0} zIndex={50}>
        <Flex maxW="4xl" mx="auto" px={6} align="center" justify="space-between" h="80px">
          <Box as="button" onClick={() => navigate("/")} display="flex" alignItems="center" gap={2} fontSize="lg" fontWeight="900" _hover={{ textDecoration: "underline" }}>
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
            Back
          </Box>
          <HStack gap={2}>
            <Gift className="h-5 w-5" strokeWidth={3} />
            <Text fontSize="2xl" fontWeight="900">Claim</Text>
          </HStack>
          <Badge bg="accent.orange" fontSize="10px">Heir</Badge>
        </Flex>
      </Box>

      <VStack maxW="4xl" mx="auto" px={6} py={12} gap={8} align="stretch" animation="slideUp 0.4s ease-out">
        <Box>
          <Box mb={4}><Badge bg="accent.orange">Heir Portal</Badge></Box>
          <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" lineHeight={0.9}>
            Your inheritance{" "}
            <Box as="span" bg="accent.orange" px={2} display="inline-block" transform="rotate(-1deg)">
              is waiting.
            </Box>
          </Heading>
          <Text fontSize="lg" fontWeight="500" color="muted-foreground" mt={4} maxW="xl">
            Pick the vault or paste its estate ID, sign once with MetaMask, and the backend relays
            the rest.
          </Text>
        </Box>

        {error && (
          <NeoCard bg="rgba(255,51,51,0.1)">
            <Flex align="start" gap={3}>
              <AlertTriangle className="h-5 w-5" style={{ marginTop: "2px" }} strokeWidth={2.5} />
              <Box minW={0}>
                <Text fontWeight="900">Claim error</Text>
                <Text fontSize="sm" fontWeight="500" color="muted-foreground" wordBreak="break-word">
                  {error}
                </Text>
              </Box>
            </Flex>
          </NeoCard>
        )}

        {step === "select" && (
          <NeoCard>
            <VStack gap={5} align="stretch">
              <Flex align="center" gap={3}>
                <Box bg="accent.cyan" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                  <Search className="h-6 w-6" strokeWidth={2.5} />
                </Box>
                <Box>
                  <Heading as="h3" fontSize="xl" fontWeight="900">Select Vault</Heading>
                  <Text fontSize="sm" fontWeight="500" color="muted-foreground">
                    Choose a locally-known vault, or paste an estate ID directly.
                  </Text>
                </Box>
              </Flex>

              <VaultList
                vaults={vaults}
                selectedEstateId={selectedEstateId}
                onSelect={setSelectedEstateId}
                inputAccentClass="focus:bg-accent-orange/20"
              />

              <Box pt={2}>
                <Button variant="lime" size="lg" onClick={handlePreview} disabled={!selectedEstateId || busy} w="full">
                  {busy ? (
                    <><Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} /> Loading…</>
                  ) : (
                    <><Search className="h-5 w-5" /> Preview Claim</>
                  )}
                </Button>
              </Box>
            </VStack>
          </NeoCard>
        )}

        {(step === "preview" || step === "signing" || step === "submitting") && (
          <NeoCard>
            <VStack gap={5} align="stretch">
              <Flex align="center" gap={3}>
                <Box bg="accent.yellow" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                  <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />
                </Box>
                <Box>
                  <Heading as="h3" fontSize="xl" fontWeight="900">Review Transfer</Heading>
                  <Text fontSize="sm" fontWeight="500" color="muted-foreground">
                    Sign the transaction hash with your MetaMask wallet.
                  </Text>
                </Box>
              </Flex>

              {!txInfo && (
                <Button variant="lime" size="lg" disabled={busy} onClick={handlePreview}>
                  {busy ? <Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} /> : null}
                  Load Transfer Details
                </Button>
              )}

              {txInfo && (
                <>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                    <Box borderWidth="4px" borderColor="foreground" borderRadius="lg" p={4} bg="secondary">
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                        From (vault)
                      </Text>
                      <Text fontFamily="mono" fontSize="sm" fontWeight="700" wordBreak="break-all">
                        {txInfo.eth_from}
                      </Text>
                    </Box>
                    <Box borderWidth="4px" borderColor="foreground" borderRadius="lg" p={4} bg="rgba(204,255,0,0.3)">
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                        Amount
                      </Text>
                      <Flex align="center" gap={1}>
                        <Coins className="h-5 w-5" strokeWidth={2.5} />
                        <Text fontWeight="900" fontSize="xl">{formatWei(txInfo.amount_wei)}</Text>
                      </Flex>
                    </Box>
                  </Grid>

                  <Box>
                    <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                      Your Destination Address
                    </Text>
                    <Flex align="center" gap={2} mb={1}>
                      <User className="h-4 w-4" strokeWidth={2.5} />
                      <NeoInput
                        type="text"
                        value={destinationEth}
                        onChange={(e) => setDestinationEth(e.target.value)}
                        fontFamily="mono"
                        focusBg="rgba(255,149,0,0.2)"
                        placeholder="0x… where you want the ETH sent"
                      />
                    </Flex>
                    <Text fontSize="xs" fontWeight="500" color="muted-foreground">
                      Your wallet provider will ask you to sign the transaction hash. This authorizes
                      the on-chain claim instruction.
                    </Text>
                  </Box>

                  <Button
                    variant="lime"
                    size="xl"
                    w="full"
                    animation={step === "preview" ? "glowLime 2s ease-in-out infinite" : undefined}
                    disabled={busy || !isValidEthAddress(destinationEth)}
                    onClick={handleSignAndClaim}
                  >
                    {busy ? <Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} /> : null}
                    {step === "signing"
                      ? "Sign in MetaMask…"
                      : step === "submitting"
                        ? "Submitting…"
                        : "Sign & Claim"}
                  </Button>
                </>
              )}
            </VStack>
          </NeoCard>
        )}
      </VStack>
    </Box>
  );
}

function NeoCard({ children, bg }: { children: React.ReactNode; bg?: string }) {
  return (
    <Box
      bg={bg ?? "card"}
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="2xl"
      p={8}
      boxShadow="12px 12px 0px 0px #000"
    >
      {children}
    </Box>
  );
}

function Badge({ children, bg, fontSize }: { children: React.ReactNode; bg?: string; fontSize?: string }) {
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
