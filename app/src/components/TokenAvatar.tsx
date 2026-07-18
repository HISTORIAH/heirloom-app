import React, { useState } from "react";
import { Coins } from "lucide-react";

export interface TokenAvatarProps {
  image?: string;
  label: string;
  size?: "sm" | "md";
  accent?: string;
}

const TokenAvatar: React.FC<TokenAvatarProps> = ({
  image,
  label,
  size = "sm",
  accent = "bg-secondary",
}) => {
  const [broken, setBroken] = useState(false);
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
        className={`${dim} rounded-lg neo-border object-cover shrink-0 bg-background`}
      />
    );
  }
  const initial = label.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase();
  return (
    <div
      className={`${dim} ${accent} neo-border rounded-lg flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {initial ? (
        <span className={`font-bold ${fontSize}`}>{initial}</span>
      ) : (
        <Coins className={innerIcon} strokeWidth={2.5} />
      )}
    </div>
  );
};

export default TokenAvatar;
