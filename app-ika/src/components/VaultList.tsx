import { CheckCircle } from "lucide-react";
import type { Vault } from "@/types";

interface Props {
  vaults: Vault[];
  selectedEstateId: string;
  onSelect: (id: string) => void;
  inputAccentClass?: string;
}

export function VaultList({ vaults, selectedEstateId, onSelect, inputAccentClass = "focus:bg-accent-lime/20" }: Props) {
  if (vaults.length > 0) {
    return (
      <div className="space-y-3">
        {vaults.map((v) => {
          const isActive = selectedEstateId === v.estateId;
          return (
            <button
              key={v.estateId}
              onClick={() => onSelect(v.estateId)}
              className={`w-full text-left neo-border rounded-xl p-4 transition-all duration-150 ${
                isActive
                  ? "bg-accent-lime neo-shadow-sm translate-x-[-1px] translate-y-[-1px]"
                  : "bg-secondary hover:bg-accent-lime/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-black text-lg truncate">{v.label}</p>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {v.ethDepositAddress}
                  </p>
                </div>
                {isActive && <CheckCircle className="h-5 w-5 shrink-0" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
        Estate ID
      </label>
      <input
        type="text"
        value={selectedEstateId}
        onChange={(e) => onSelect(e.target.value)}
        className={`neo-input font-mono text-sm ${inputAccentClass}`}
        placeholder="Paste estate ID..."
      />
    </div>
  );
}
