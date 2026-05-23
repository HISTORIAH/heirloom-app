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
  Shield,
  AlertTriangle,
  Globe,
  Coins,
  Search,
  User,
} from "lucide-react";
import { getWithdrawTx, postWithdraw } from "@/services/api/withdraw";
import type { WithdrawTxInfo } from "@/types/api";
import { signMessageHash } from "@/services/ethereum";
import type { Vault } from "@/types";
import { formatWei, isValidEthAddress } from "@/lib/utils";
import { VaultList } from "@/components/VaultList";
import { TxSuccessPage } from "@/components/TxSuccessPage";

type Step = "select" | "preview" | "signing" | "submitting" | "done";

export default function Withdraw() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState(searchParams.get("estate") || "");
  const [destinationEth, setDestinationEth] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [txInfo, setTxInfo] = useState<WithdrawTxInfo | null>(null);
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
    if (!selectedEstateId || !isValidEthAddress(destinationEth)) return;
    setBusy(true);
    setError(null);
    try {
      const info = await getWithdrawTx(selectedEstateId, destinationEth);
      setTxInfo(info);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignAndWithdraw = async () => {
    if (!txInfo || !isValidEthAddress(ownerAddress)) return;
    setBusy(true);
    setError(null);
    setStep("signing");

    try {
      const sig = await signMessageHash(txInfo.message_hash_hex, ownerAddress);
      setStep("submitting");

      const resp = await postWithdraw({
        estate_id: txInfo.estate_id,
        destination_eth: destinationEth,
        owner_address: ownerAddress,
        owner_signature: sig,
      });

      setResult({ solana_tx: resp.solana_tx, eth_tx: resp.eth_tx });

      const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      const idx = vs.findIndex((v: { estateId: string }) => v.estateId === txInfo.estate_id);
      if (idx >= 0) {
        vs[idx].isClaimed = true;
        localStorage.setItem("heirloom_vaults", JSON.stringify(vs));
      }

      setStep("done");
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
        title="Withdraw"
        icon={<Shield className="h-5 w-5" strokeWidth={3} />}
        heroBadge="Withdrawal Submitted"
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
            <Shield className="h-5 w-5" strokeWidth={3} />
            <Text fontSize="2xl" fontWeight="900">Withdraw</Text>
          </HStack>
          <Badge bg="accent.yellow" fontSize="10px">Owner</Badge>
        </Flex>
      </Box>

      <VStack maxW="4xl" mx="auto" px={6} py={12} gap={8} align="stretch" animation="slideUp 0.4s ease-out">
        <Box>
          <Box mb={4}><Badge bg="accent.yellow">Owner Exit</Badge></Box>
          <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" lineHeight={0.9}>
            Pull funds{" "}
            <Box as="span" bg="accent.yellow" px={2} display="inline-block" transform="rotate(-1deg)">
              back out.
            </Box>
          </Heading>
          <Text fontSize="lg" fontWeight="500" color="muted-foreground" mt={4} maxW="xl">
            Emergency exit as the vault owner. Paste your owner address and destination, then sign
            once with MetaMask.
          </Text>
        </Box>

        {error && (
          <NeoCard bg="rgba(255,51,51,0.1)">
            <Flex align="start" gap={3}>
              <AlertTriangle className="h-5 w-5" style={{ marginTop: "2px" }} strokeWidth={2.5} />
              <Box minW={0}>
                <Text fontWeight="900">Withdraw error</Text>
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
                    Pick a vault and enter the destination + owner addresses.
                  </Text>
                </Box>
              </Flex>

              <VaultList
                vaults={vaults}
                selectedEstateId={selectedEstateId}
                onSelect={setSelectedEstateId}
                inputAccentClass="focus:bg-accent-yellow/20"
              />

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <Box>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                    Destination Address
                  </Text>
                  <NeoInput
                    type="text"
                    value={destinationEth}
                    onChange={(e) => setDestinationEth(e.target.value)}
                    fontFamily="mono"
                    focusBg="rgba(255,204,0,0.2)"
                    placeholder="0x… where to send ETH"
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                    Owner Address
                  </Text>
                  <NeoInput
                    type="text"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    fontFamily="mono"
                    focusBg="rgba(0,240,255,0.2)"
                    placeholder="0x… your signing address"
                  />
                </Box>
              </Grid>

              <Button
                variant="lime"
                size="lg"
                onClick={handlePreview}
                disabled={
                  !selectedEstateId ||
                  !isValidEthAddress(destinationEth) ||
                  !isValidEthAddress(ownerAddress) ||
                  busy
                }
                w="full"
              >
                {busy ? (
                  <><Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} /> Loading…</>
                ) : (
                  <><Search className="h-5 w-5" /> Preview Withdrawal</>
                )}
              </Button>
            </VStack>
          </NeoCard>
        )}

        {(step === "preview" || step === "signing" || step === "submitting") && (
          <NeoCard>
            <VStack gap={5} align="stretch">
              <Flex align="center" gap={3}>
                <Box bg="accent.pink" borderWidth="4px" borderColor="foreground" borderRadius="xl" p={3}>
                  <Shield className="h-6 w-6" strokeWidth={2.5} />
                </Box>
                <Box>
                  <Heading as="h3" fontSize="xl" fontWeight="900">Review Withdrawal</Heading>
                  <Text fontSize="sm" fontWeight="500" color="muted-foreground">
                    Sign the transaction hash with your owner wallet.
                  </Text>
                </Box>
              </Flex>

              {!txInfo && (
                <>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                    <Box>
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                        Destination Address
                      </Text>
                      <NeoInput
                        type="text"
                        value={destinationEth}
                        onChange={(e) => setDestinationEth(e.target.value)}
                        fontFamily="mono"
                        focusBg="rgba(255,204,0,0.2)"
                        placeholder="0x…"
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
                        Owner Address
                      </Text>
                      <NeoInput
                        type="text"
                        value={ownerAddress}
                        onChange={(e) => setOwnerAddress(e.target.value)}
                        fontFamily="mono"
                        focusBg="rgba(0,240,255,0.2)"
                        placeholder="0x…"
                      />
                    </Box>
                  </Grid>
                  <Button
                    variant="lime"
                    size="lg"
                    disabled={busy || !isValidEthAddress(destinationEth) || !isValidEthAddress(ownerAddress)}
                    onClick={handlePreview}
                    w="full"
                  >
                    {busy ? <Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} /> : null}
                    Load Transfer Details
                  </Button>
                </>
              )}

              {txInfo && (
                <>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                    <Box borderWidth="4px" borderColor="foreground" borderRadius="lg" p={4} bg="secondary">
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                        From (vault)
                      </Text>
                      <Flex align="center" gap={1}>
                        <Globe className="h-4 w-4" strokeWidth={2.5} />
                        <Text fontFamily="mono" fontSize="sm" fontWeight="700" wordBreak="break-all">
                          {txInfo.eth_from}
                        </Text>
                      </Flex>
                    </Box>
                    <Box borderWidth="4px" borderColor="foreground" borderRadius="lg" p={4} bg="secondary">
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                        To (destination)
                      </Text>
                      <Flex align="center" gap={1}>
                        <User className="h-4 w-4" strokeWidth={2.5} />
                        <Text fontFamily="mono" fontSize="sm" fontWeight="700" wordBreak="break-all">
                          {txInfo.eth_to}
                        </Text>
                      </Flex>
                    </Box>
                    <Box borderWidth="4px" borderColor="foreground" borderRadius="lg" p={4} bg="rgba(204,255,0,0.3)" gridColumn={{ md: "span 2" }}>
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground">
                        Amount
                      </Text>
                      <Flex align="center" gap={1}>
                        <Coins className="h-5 w-5" strokeWidth={2.5} />
                        <Text fontWeight="900" fontSize="2xl">{formatWei(txInfo.amount_wei)}</Text>
                      </Flex>
                    </Box>
                  </Grid>

                  <Text fontSize="xs" fontWeight="500" color="muted-foreground">
                    MetaMask will ask you to sign the transaction hash with{" "}
                    <Text as="span" fontFamily="mono" fontWeight="700">
                      {ownerAddress.slice(0, 10)}…
                    </Text>. This authorizes the on-chain withdraw instruction.
                  </Text>

                  <Button
                    variant="lime"
                    size="xl"
                    w="full"
                    animation={step === "preview" ? "glowLime 2s ease-in-out infinite" : undefined}
                    disabled={busy}
                    onClick={handleSignAndWithdraw}
                  >
                    {busy ? <Loader2 className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} /> : null}
                    {step === "signing"
                      ? "Sign in MetaMask…"
                      : step === "submitting"
                        ? "Submitting…"
                        : "Sign & Withdraw"}
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
