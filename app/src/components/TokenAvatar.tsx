import React, { useState } from "react";
import { Coins } from "lucide-react";

export interface TokenAvatarProps {
  image?: string;
  label: string;
  size?: "sm" | "md";
  accent?: string;
  /** Round for fungible tokens, square (the default) for collectibles. */
  shape?: "round" | "square";
}

const TokenAvatar: React.FC<TokenAvatarProps> = ({
  image,
  label,
  size = "sm",
  accent = "bg-secondary",
  shape = "square",
}) => {
  const [broken, setBroken] = useState(false);
  const radius = shape === "round" ? "rounded-full" : "rounded-lg";
  const dim = size === "md" ? "h-11 w-11" : "h-8 w-8";
  const innerIcon = size === "md" ? "h-6 w-6" : "h-4 w-4";
  const fontSize = size === "md" ? "text-sm" : "text-xs";
  if (image && !broken) {
    return (
      <img
        src={image}
        alt={label}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`${dim} shrink-0 ${radius} border border-tile-line bg-background object-cover`}
      />
    );
  }
  // No image, or it failed to load: the first two letters stand in for it.
  const initials = label.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return (
    <div
      className={`${dim} ${accent} flex shrink-0 items-center justify-center ${radius} border border-tile-line`}
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
