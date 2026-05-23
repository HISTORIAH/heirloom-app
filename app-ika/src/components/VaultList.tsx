import { Box, Text, VStack } from "@chakra-ui/react";
import { CheckCircle } from "lucide-react";
import type { Vault } from "@/types";

interface Props {
  vaults: Vault[];
  selectedEstateId: string;
  onSelect: (id: string) => void;
  inputAccentClass?: string;
}

export function VaultList({ vaults, selectedEstateId, onSelect }: Props) {
  if (vaults.length > 0) {
    return (
      <VStack gap={3} align="stretch" w="full">
        {vaults.map((v) => {
          const isActive = selectedEstateId === v.estateId;
          return (
            <Box
              key={v.estateId}
              as="button"
              onClick={() => onSelect(v.estateId)}
              textAlign="left"
              w="full"
              borderWidth="4px"
              borderColor="foreground"
              borderRadius="xl"
              p={4}
              transition="all 150ms"
              bg={isActive ? "accent.lime" : "secondary"}
              boxShadow={isActive ? "4px 4px 0px 0px #000" : "none"}
              transform={isActive ? "translate(-1px, -1px)" : "none"}
              _hover={isActive ? {} : { bg: "rgba(204,255,0,0.4)" }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} flexWrap="wrap">
                <Box minW={0}>
                  <Text fontWeight="900" fontSize="lg" truncate>
                    {v.label}
                  </Text>
                  <Text fontSize="xs" fontFamily="mono" color="muted-foreground" wordBreak="break-all">
                    {v.ethDepositAddress}
                  </Text>
                </Box>
                {isActive && <CheckCircle className="h-5 w-5 shrink-0" strokeWidth={3} />}
              </Box>
            </Box>
          );
        })}
      </VStack>
    );
  }

  return (
    <Box w="full">
      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.1em" color="muted-foreground" mb={1}>
        Estate ID
      </Text>
      <input
        type="text"
        value={selectedEstateId}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          width: "100%",
          border: "4px solid #000",
          borderRadius: "0.5rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#fff",
          fontWeight: 700,
          fontSize: "0.875rem",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          boxShadow: "4px 4px 0px 0px #000",
          transition: "all 150ms",
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = "8px 8px 0px 0px #000";
          e.currentTarget.style.transform = "translate(-2px, -2px)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "4px 4px 0px 0px #000";
          e.currentTarget.style.transform = "none";
        }}
        placeholder="Paste estate ID..."
      />
    </Box>
  );
}
