import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center neo-slide-up">
        <div className="neo-card-static inline-block rotate-[-2deg] mb-8">
          <h1 className="text-[120px] md:text-[180px] font-black leading-none">404</h1>
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          Page not{" "}
          <span className="bg-accent-pink px-2 inline-block rotate-[1deg]">found.</span>
        </h2>
        <p className="text-lg font-medium text-muted-foreground mb-8 max-w-md mx-auto">
          This route doesn't exist. The vault you're looking for might be elsewhere.
        </p>
        <Button variant="lime" size="lg" asChild>
          <a href="/">
            <ArrowLeft className="h-5 w-5" /> Return Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
