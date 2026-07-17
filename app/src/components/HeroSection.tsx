import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Heart, Play, Activity } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useTour } from "@/contexts/TourContext";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import HeartbeatLine from "@/components/HeartbeatLine";

type Phase = "active" | "grace" | "claimable";

const ACTIVE_SECONDS = 30;
const GRACE_SECONDS = 12;

const PHASE_META: Record<
  Phase,
  { label: string; dot: string; line: string; accent: string }
> = {
  active: {
    label: "Active",
    dot: "bg-accent-lime",
    line: "hsl(var(--accent-lime))",
    accent: "text-accent-lime",
  },
  grace: {
    label: "Grace Period",
    dot: "bg-accent-yellow",
    line: "hsl(var(--accent-yellow))",
    accent: "text-accent-yellow",
  },
  claimable: {
    label: "Claimable",
    dot: "bg-accent-red",
    line: "hsl(var(--accent-red))",
    accent: "text-accent-red",
  },
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

// A miniature, interactive demo of the vault's heartbeat mechanic.
// Let the timer run out to watch a vault flatline -> become claimable,
// or hit "Send Heartbeat" to reset it. This *is* the product.
const LiveVaultMonitor = ({ onBeat }: { onBeat: () => void }) => {
  const [phase, setPhase] = useState<Phase>("active");
  const [secs, setSecs] = useState(ACTIVE_SECONDS);
  const [popKey, setPopKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSecs((prev) => {
        if (prev > 1) return prev - 1;
        // hit zero — advance phase
        setPhase((ph) => {
          if (ph === "active") return "grace";
          if (ph === "grace") return "claimable";
          return ph;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // When a phase begins, seed its countdown.
  useEffect(() => {
    if (phase === "grace") setSecs(GRACE_SECONDS);
    if (phase === "claimable") {
      setSecs(0);
      const t = setTimeout(() => {
        setPhase("active");
        setSecs(ACTIVE_SECONDS);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const sendHeartbeat = () => {
    setPhase("active");
    setSecs(ACTIVE_SECONDS);
    setPopKey((k) => k + 1);
    onBeat();
  };

  const meta = PHASE_META[phase];
  const isDead = phase === "claimable";

  return (
    <div className="neo-card-static w-full max-w-md rounded-2xl border-foreground/15 bg-[hsl(0_0%_8%)] p-0 text-background shadow-none">
      {/* Monitor header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
          <Activity className="h-4 w-4" />
          Vault Monitor
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${meta.dot} pulse-ring`}
            />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          </span>
          <span className={`text-xs font-black uppercase tracking-widest ${meta.accent}`}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* ECG trace — the same continuous line passes through this window:
          fades in as it enters on the left, out as it exits on the right. */}
      <div className="relative h-28 overflow-hidden bg-[hsl(0_0%_5%)]">
        <HeartbeatLine
          color={meta.line}
          glow={!isDead}
          flat={isDead}
          speed={phase === "grace" ? 5 : 8}
          strokeWidth={2}
          className="absolute inset-0"
        />
        {/* entry / exit fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[hsl(0_0%_5%)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[hsl(0_0%_5%)] to-transparent" />
        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-accent-red px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-background">
              Flatline
            </span>
          </div>
        )}
      </div>

      {/* Readout */}
      <div className="space-y-5 px-6 py-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              {isDead ? "Heirs may now claim" : "Next heartbeat due in"}
            </p>
            <p className="mt-1 font-display text-4xl font-black tabular-nums tracking-tight">
              {isDead ? "00:00" : fmt(secs)}
            </p>
          </div>
          <Heart
            key={popKey}
            className={`heart-pop h-9 w-9 ${meta.accent}`}
            fill="currentColor"
            strokeWidth={0}
          />
        </div>

        <Button
          variant={isDead ? "outline" : "lime"}
          size="lg"
          className="w-full"
          style={isDead ? undefined : { backgroundColor: "#FFD600" }}
          onClick={sendHeartbeat}
        >
          <Heart className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          {isDead ? "Revive Demo" : "Send Heartbeat"}
        </Button>
      </div>
    </div>
  );
};

const HeroSection = () => {
  const { isConnected } = useWallet();
  const { start: startTour } = useTour();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const [demoOpen, setDemoOpen] = useState(false);

  const handleLaunch = () => {
    track("launch_app_clicked", { connected: isConnected });
    if (isConnected) {
      navigate("/create-vault");
    } else {
      track("tour_started", { source: "hero" });
      startTour();
    }
  };

  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      {/* Ambient layers — tuned for white: dark hairline grid + faint black
          ECG, both masked so they fade toward the center behind the text. */}
      <div className="grid-fade-light pointer-events-none absolute inset-0 [-webkit-mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <HeartbeatLine
        color="hsl(var(--foreground))"
        speed={9}
        strokeWidth={1.5}
        className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 opacity-[0.06] [-webkit-mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)] [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]"
      />

      <div className="relative mx-auto flex max-w-7xl items-center px-6 py-20 md:py-24 lg:min-h-[60vh] lg:py-24">
        <div className="grid w-full grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div className="neo-slide-up">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Solana Inheritance Protocol
            </span>

            <h1 className="mt-7 font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl lg:text-[5.25rem]">
              Protect your{" "}
              <span className="px-3 text-foreground" style={{ backgroundColor: "#FF4FD8" }}>
                assets.
              </span>{" "}
              Pass it on trustlessly.
            </h1>

            <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed text-muted-foreground md:text-xl">
              Lock assets into a heartbeat vault on Solana. Check in periodically — or
              your heirs inherit automatically. No lawyers. No custodians. No seed
              phrase sharing.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Button
                variant="lime"
                size="xl"
                style={{ backgroundColor: "#FFD600" }}
                onClick={handleLaunch}
              >
                {isConnected ? "Create Vault" : "Launch Tour"}
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="bg-transparent text-foreground !border-2 !border-foreground/25 !shadow-none hover:!shadow-none hover:!translate-x-0 hover:!translate-y-0 hover:bg-foreground/5 hover:!border-foreground/60 active:!translate-x-0 active:!translate-y-0"
                onClick={() => {
                  track("demo_opened", { source: "hero" });
                  setDemoOpen(true);
                }}
              >
                <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                View Demo
              </Button>
            </div>

          </div>

          <div
            className="neo-slide-up flex justify-center lg:justify-end"
            style={{ animationDelay: "0.15s" }}
          >
            <LiveVaultMonitor onBeat={() => track("hero_heartbeat_demo")} />
          </div>
        </div>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl p-0 gap-0 border-4 border-foreground bg-background rounded-none shadow-[8px_8px_0px_0px_hsl(var(--foreground))] sm:shadow-[12px_12px_0px_0px_hsl(var(--foreground))] sm:rounded-none">
          <div className="flex items-center justify-between border-b-4 border-foreground bg-accent-yellow px-4 py-3 sm:px-6 sm:py-4">
            <DialogTitle className="text-lg sm:text-2xl font-black uppercase tracking-tight">
              Heirloom Demo
            </DialogTitle>
            <DialogDescription className="sr-only">
              Embedded YouTube video showing how Heirloom works.
            </DialogDescription>
          </div>
          <div className="relative w-full bg-foreground" style={{ aspectRatio: "16 / 9" }}>
            {demoOpen && (
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/zqF4Pnm1G2w?si=NkN81t8zX3ZG1fNT&autoplay=1&rel=0"
                title="Heirloom demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
