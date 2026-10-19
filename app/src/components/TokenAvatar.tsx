import React, { useState } from "react";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TokenAvatarProps {
  image?: string;
  label: string;
  /** "fill" takes the parent's width as a square, for collectible cards. */
  size?: "sm" | "md" | "fill";
  accent?: string;
  /** Round for fungible tokens, square (the default) for collectibles. */
  shape?: "round" | "square";
  className?: string;
}

const TokenAvatar: React.FC<TokenAvatarProps> = ({
  image,
  label,
  size = "sm",
  accent = "bg-secondary",
  shape = "square",
  className,
}) => {
  const [broken, setBroken] = useState(false);
  const radius = shape === "round" ? "rounded-full" : "rounded-lg";
  const dim = { sm: "h-8 w-8", md: "h-11 w-11", fill: "aspect-square w-full" }[size];
  const innerIcon = { sm: "h-4 w-4", md: "h-6 w-6", fill: "h-8 w-8" }[size];
  const fontSize = { sm: "text-xs", md: "text-sm", fill: "text-2xl" }[size];
  if (image && !broken) {
    return (
      <img
        src={image}
        alt={label}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn(
          dim,
          "shrink-0 border border-tile-line bg-background object-cover",
          radius,
          className,
        )}
      />
    );
  }
  // No image, or it failed to load: the first two letters stand in for it.
  const initials = label
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        dim,
        accent,
        "flex shrink-0 items-center justify-center border border-tile-line",
        radius,
        className,
      )}
      aria-hidden="true"
    >
      {initials ? (
        <span className={`font-bold ${fontSize}`}>{initials}</span>
      ) : (
        <Coins className={innerIcon} strokeWidth={2.5} />
      )}
    </div>
  );
};

export default TokenAvatar;
