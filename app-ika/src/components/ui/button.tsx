import { Button as ChakraButton } from "@chakra-ui/react";
import type { ButtonProps as ChakraButtonProps } from "@chakra-ui/react";
import { forwardRef } from "react";

export type ButtonVariant =
  | "default"
  | "lime"
  | "pink"
  | "cyan"
  | "orange"
  | "purple"
  | "yellow"
  | "outline"
  | "destructive"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "xl" | "icon";

interface ButtonProps extends Omit<ChakraButtonProps, "size" | "variant" | "colorScheme"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantMap: Record<ButtonVariant, { bg: string; color: string; borderColor?: string }> = {
  default: { bg: "#000", color: "#fff" },
  lime: { bg: "accent.lime", color: "#000" },
  pink: { bg: "accent.pink", color: "#000" },
  cyan: { bg: "accent.cyan", color: "#000" },
  orange: { bg: "accent.orange", color: "#000" },
  purple: { bg: "accent.purple", color: "#fff" },
  yellow: { bg: "accent.yellow", color: "#000" },
  outline: { bg: "#fff", color: "#000", borderColor: "#000" },
  destructive: { bg: "accent.red", color: "#fff" },
  ghost: { bg: "transparent", color: "#000", borderColor: "transparent" },
  link: { bg: "transparent", color: "#000", borderColor: "transparent" },
};

const sizeMap: Record<ButtonSize, { h: string; px: string; py: string; fontSize: string }> = {
  default: { h: "48px", px: "24px", py: "12px", fontSize: "0.875rem" },
  sm: { h: "40px", px: "16px", py: "8px", fontSize: "0.75rem" },
  lg: { h: "56px", px: "40px", py: "16px", fontSize: "1rem" },
  xl: { h: "64px", px: "48px", py: "20px", fontSize: "1.125rem" },
  icon: { h: "48px", px: "0", py: "0", fontSize: "0.875rem" },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", children, ...props }, ref) => {
    const v = variantMap[variant];
    const s = sizeMap[size];

    return (
      <ChakraButton
        ref={ref}
        bg={v.bg}
        color={v.color}
        borderWidth="4px"
        borderStyle="solid"
        borderColor={v.borderColor ?? "#000"}
        borderRadius="0.5rem"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="0.05em"
        h={s.h}
        px={s.px}
        py={s.py}
        fontSize={s.fontSize}
        boxShadow="8px 8px 0px 0px #000"
        transition="all 150ms ease-out"
        _hover={{
          transform: "translate(-2px, -2px)",
          boxShadow: "12px 12px 0px 0px #000",
        }}
        _active={{
          transform: "translate(4px, 4px)",
          boxShadow: "none",
        }}
        _disabled={{
          opacity: 0.5,
          cursor: "not-allowed",
          transform: "none",
          boxShadow: "8px 8px 0px 0px #000",
        }}
        _focusVisible={{
          outline: "4px solid #000",
          outlineOffset: "2px",
        }}
        {...props}
      >
        {children}
      </ChakraButton>
    );
  }
);
Button.displayName = "Button";
