import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  const handleCreate = () => {
    navigate("/create-vault");
  };

  return (
    <section className="neo-section-yellow py-16 px-6 md:py-24 lg:py-32 border-y-8 border-foreground relative overflow-hidden">
      <div className="absolute top-10 left-10 text-[120px] font-black opacity-[0.06] select-none leading-none hidden lg:block">
        SOL
      </div>
      <div className="absolute bottom-10 right-10 text-[120px] font-black opacity-[0.06] select-none leading-none hidden lg:block">
        SPL
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.9] mb-8">
          Don't let your crypto{" "}
          <span className="bg-accent-red text-background px-3 inline-block rotate-[-2deg] transition-transform hover:rotate-0">
            die
          </span>{" "}
          with you.
        </h2>
        <p className="text-xl md:text-2xl font-medium mb-10 max-w-2xl mx-auto">
          Set up your inheritance vault in minutes.
          Your heirs will thank you -- even if they never have to use it.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="default" size="xl" onClick={handleCreate}>
            Create Your Vault
          </Button>
          <Button variant="outline" size="xl" onClick={() => setDemoOpen(true)}>
            View Demo
          </Button>
        </div>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent
          className="w-[calc(100vw-2rem)] max-w-4xl p-0 gap-0 border-4 border-foreground bg-background rounded-none shadow-[8px_8px_0px_0px_hsl(var(--foreground))] sm:shadow-[12px_12px_0px_0px_hsl(var(--foreground))] sm:rounded-none"
        >
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

export default CTASection;
