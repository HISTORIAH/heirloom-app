import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Box,
  Flex,
  Heading,
  Text,
  Grid,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { ArrowLeft, CheckCircle, ExternalLink } from "lucide-react";

interface Props {
  title: string;
  icon: ReactNode;
  heroBadge: string;
  solanaTx: string;
  ethTx: string;
}

export function TxSuccessPage({ title, icon, heroBadge, solanaTx, ethTx }: Props) {
  const navigate = useNavigate();

  return (
    <Box minH="100vh" bg="background">
      {/* Header */}
      <Box borderBottomWidth="8px" borderColor="foreground" bg="background" position="sticky" top={0} zIndex={50}>
        <Flex
          maxW="4xl"
          mx="auto"
          px={6}
          align="center"
          justify="space-between"
          h="80px"
        >
          <Box
            as="button"
            onClick={() => navigate("/")}
            display="flex"
            alignItems="center"
            gap={2}
            fontSize="lg"
            fontWeight="900"
            _hover={{ textDecoration: "underline" }}
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
            Dashboard
          </Box>
          <HStack gap={2}>
            {icon}
            <Text fontSize="2xl" fontWeight="900">
              {title}
            </Text>
          </HStack>
          <Box
            display="inline-block"
            borderWidth="4px"
            borderColor="foreground"
            borderRadius="full"
            px={4}
            py={1}
            fontSize="10px"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.1em"
            bg="accent.lime"
            boxShadow="4px 4px 0px 0px #000"
          >
            Submitted
          </Box>
        </Flex>
      </Box>

      {/* Content */}
      <VStack maxW="4xl" mx="auto" px={6} py={12} gap={8} animation="slideUp 0.4s ease-out">
        {/* Hero */}
        <Box
          bg="accent.lime"
          borderWidth="6px"
          borderColor="foreground"
          borderRadius="2xl"
          p={8}
          boxShadow="16px 16px 0px 0px #000"
          textAlign="center"
          w="full"
        >
          <Box
            bg="background"
            borderWidth="4px"
            borderColor="foreground"
            borderRadius="full"
            p={6}
            w="80px"
            h="80px"
            mx="auto"
            mb={6}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
          </Box>
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
            bg="background"
            boxShadow="4px 4px 0px 0px #000"
            mb={3}
          >
            {heroBadge}
          </Box>
          <Heading as="h2" fontSize={{ base: "4xl", md: "5xl" }} fontWeight="900" textTransform="uppercase">
            Funds On The Way
          </Heading>
          <Text fontSize="sm" fontWeight="700" color="foreground" opacity={0.7} mt={2} maxW="md" mx="auto">
            The backend relayed the Solana tx and broadcast the ETH transfer.
          </Text>
        </Box>

        {/* Tx details */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} w="full">
          <TxCard label="Solana Tx" value={solanaTx || "N/A"} />
          <TxCard label="ETH Tx" value={ethTx || "Pending…"} />
        </Grid>

        {/* CTA */}
        <Flex justify="flex-end" pt={8} borderTopWidth="4px" borderColor="foreground" w="full">
          <Button variant="lime" size="xl" onClick={() => navigate("/")}>
            Go to Dashboard <ExternalLink className="h-5 w-5" />
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
}

function TxCard({ label, value }: { label: string; value: string }) {
  return (
    <Box
      bg="card"
      borderWidth="4px"
      borderColor="foreground"
      borderRadius="2xl"
      p={8}
      boxShadow="12px 12px 0px 0px #000"
    >
      <Text fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={3}>
        {label}
      </Text>
      <Box
        borderWidth="4px"
        borderColor="foreground"
        bg="secondary"
        borderRadius="lg"
        p={3}
      >
        <Text fontFamily="mono" fontSize="xs" wordBreak="break-all">
          {value}
        </Text>
      </Box>
    </Box>
  );
}
