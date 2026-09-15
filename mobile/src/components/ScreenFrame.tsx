import { Text, YStack } from "tamagui";
import type { ReactNode } from "react";

const frame = {
  flex: 1,
  backgroundColor: "#FFFFFF",
  padding: 24,
  justifyContent: "center" as const,
  gap: 12,
};

interface ScreenFrameProps {
  title: string;
  children: ReactNode;
}

export function ScreenFrame({ title, children }: ScreenFrameProps) {
  return (
    <YStack style={frame}>
      <Text fontSize={28} fontWeight="700" color="#0A0A0A">
        {title}
      </Text>
      <Text color="#0A0A0A">{children}</Text>
    </YStack>
  );
}
