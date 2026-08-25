import React, { useState } from "react";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TokenAvatarProps {
  image?: string;
  label: string;
  size?: "sm" | "md";
  /** Fill for the fallback mark, when the token has no image. */
  accent?: string;
}

const TokenAvatar: React.FC<TokenAvatarProps> = ({
  image,
  label,
  size = "sm",
  accent = "bg-tile-soft",
}) => {
  const [broken, setBroken] = useState(false);
  const dim = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const innerIcon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const fontSize = size === "md" ? "text-sm" : "text-xs";

  if (image && !broken) {
    return (
      <img
        src={image}
        alt={label}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn(dim, "shrink-0 rounded-lg border border-tile-line bg-background object-cover")}
      />
    );
  }

  const initial = label.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase();
  return (
    <div
      className={cn(dim, accent, "flex shrink-0 items-center justify-center rounded-lg border border-tile-line")}
      aria-hidden="true"
    >
      {initial ? (
        <span className={cn("font-semibold", fontSize)}>{initial}</span>
      ) : (
        <Coins className={innerIcon} strokeWidth={2} />
      )}
    </div>
  );
};

export default TokenAvatar;
