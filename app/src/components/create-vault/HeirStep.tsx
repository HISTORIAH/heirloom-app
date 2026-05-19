import { LABEL_MAX_LEN } from "@/lib/constants";
import { Heart, Shield, User } from "lucide-react";

interface Props {
  heirAddress: string;
  setHeirAddress: (s: string) => void;
  label: string;
  setLabel: (s: string) => void;
  delegate: string;
  setDelegate: (s: string) => void;
  hbSigner: string;
  setHbSigner: (s: string) => void;
  isPauseDisable: boolean;
}

const HeirStep: React.FC<Props> = ({
  heirAddress,
  setHeirAddress,
  label,
  setLabel,
  delegate,
  setDelegate,
  hbSigner,
  setHbSigner,
  isPauseDisable,
}) => (
  <div className="space-y-8">
    <div>
      <span className="neo-badge bg-accent-cyan mb-4 inline-block">Step 2</span>
      <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
        Name your <span className="bg-accent-cyan px-2 inline-block rotate-[1deg]">heir.</span>
      </h2>
      <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
        One estate, one heir. Create more estates later to cover more people.
      </p>
    </div>

    <div className="neo-card-static">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-accent-cyan neo-border rounded-xl p-3">
          <User className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black">Heir</h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
            Label ({LABEL_MAX_LEN} chars max)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
            maxLength={LABEL_MAX_LEN}
            className="neo-input focus:bg-accent-cyan/20"
            placeholder="e.g. son"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
            Heir Solana Address
          </label>
          <input
            type="text"
            value={heirAddress}
            onChange={(e) => setHeirAddress(e.target.value)}
            maxLength={128}
            className="neo-input font-mono text-sm focus:bg-accent-cyan/20"
            placeholder="Enter Solana wallet address..."
          />
        </div>
      </div>
    </div>

    {!isPauseDisable && (
      <div className="neo-card-static">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-accent-purple neo-border rounded-xl p-3">
            <Shield className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-black">Guardian (Optional)</h3>
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-3">
          A trusted address that can pause the claim window once.
        </p>
        <input
          type="text"
          value={delegate}
          onChange={(e) => setDelegate(e.target.value)}
          maxLength={128}
          className="neo-input font-mono text-sm focus:bg-accent-purple/20"
          placeholder="Solana address (leave empty for no guardian)"
        />
      </div>
    )}

    <div className="neo-card-static">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-accent-pink neo-border rounded-xl p-3">
          <Heart className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black">Heartbeat Signer (Optional)</h3>
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-3">
        A hot wallet that can refresh the heartbeat for you. It cannot
        change settings, revoke, or reassign — only ping.
      </p>
      <input
        type="text"
        value={hbSigner}
        onChange={(e) => setHbSigner(e.target.value)}
        maxLength={128}
        className="neo-input font-mono text-sm focus:bg-accent-pink/20"
        placeholder="Solana address (leave empty to keep heartbeats authority-only)"
      />
    </div>
  </div>
);

export default HeirStep;
