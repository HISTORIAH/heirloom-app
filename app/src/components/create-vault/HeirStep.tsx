import { LABEL_MAX_LEN } from "@/lib/constants";
import { Users } from "lucide-react";

interface Props {
  heirAddress: string;
  setHeirAddress: (s: string) => void;
  label: string;
  setLabel: (s: string) => void;
  delegate: string;
  setDelegate: (s: string) => void;
  hbSigner: string;
  setHbSigner: (s: string) => void;
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
}) => (
  <div className="neo-card-static p-8" style={{ boxShadow: "12px 12px 0 0 hsl(var(--accent-pink))" }}>
    {/* Step header inside the card */}
    <div className="flex items-center gap-3 mb-5">
      <div
        className="bg-accent-pink neo-border rounded-xl p-3"
        style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
      >
        <Users className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-accent-pink">
          Step 1
        </span>
        <h3 className="text-xl font-semibold font-body">Who inherits?</h3>
      </div>
    </div>

    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
          Label (e.g. &quot;son&quot;, &quot;spouse&quot;)
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
          maxLength={LABEL_MAX_LEN}
          className="neo-input font-semibold"
          placeholder="e.g. spouse"
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
          className="neo-input font-mono text-sm"
          placeholder="Enter Solana wallet address..."
        />
      </div>

      {/* Optional section */}
      <div className="pt-3 border-t-2 border-foreground/10">
        <p className="text-sm font-medium text-muted-foreground mb-2">Optional</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
              Guardian (can pause once)
            </label>
            <input
              type="text"
              value={delegate}
              onChange={(e) => setDelegate(e.target.value)}
              maxLength={128}
              className="neo-input font-mono text-sm"
              placeholder="Solana address (optional)"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
              Heartbeat Signer (hot wallet)
            </label>
            <input
              type="text"
              value={hbSigner}
              onChange={(e) => setHbSigner(e.target.value)}
              maxLength={128}
              className="neo-input font-mono text-sm"
              placeholder="Solana address (optional)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default HeirStep;
