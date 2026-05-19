import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, ExternalLink } from "lucide-react";

interface Props {
  title: string;
  icon: ReactNode;
  heroBadge: string;
  solanaTx: string;
  ethTx: string;
}

export function TxSuccessPage({ title, icon, heroBadge, solanaTx, ethTx }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-lg font-black hover:underline group"
          >
            <ArrowLeft
              className="h-5 w-5 transition-transform group-hover:-translate-x-1"
              strokeWidth={3}
            />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-2xl font-black">{title}</span>
          </div>
          <span className="neo-badge bg-accent-lime text-[10px]">Submitted</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
        <div className="neo-section-lime neo-border-thick rounded-2xl p-8 neo-shadow-xl text-center">
          <div className="bg-background neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
          </div>
          <span className="neo-badge bg-background mb-3 inline-block">{heroBadge}</span>
          <h2 className="text-4xl md:text-5xl font-black uppercase">Funds On The Way</h2>
          <p className="text-sm font-bold text-foreground/70 mt-2 max-w-md mx-auto">
            The backend relayed the Solana tx and broadcast the ETH transfer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="neo-card-static">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Solana Tx
            </h3>
            <p className="font-mono text-xs break-all neo-border bg-secondary rounded-lg p-3">
              {solanaTx || "N/A"}
            </p>
          </div>
          <div className="neo-card-static">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              ETH Tx
            </h3>
            <p className="font-mono text-xs break-all neo-border bg-secondary rounded-lg p-3">
              {ethTx || "Pending…"}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-8 border-t-4 border-foreground">
          <Button variant="lime" size="xl" onClick={() => navigate("/")}>
            Go to Dashboard <ExternalLink className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
