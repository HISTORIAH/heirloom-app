import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { drawDither, type DitherShape } from "./dither";

/**
 * A still, dithered field of light, redrawn only when its box changes size.
 * Its dots take the CSS `color`, so a class sets the tint.
 */
export const DitherField: React.FC<{ shape: DitherShape; className?: string }> = ({
  shape,
  className,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawDither(ctx, shape, rect.width, rect.height, getComputedStyle(canvas).color);
    };
    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    return () => sizes.disconnect();
  }, [shape]);

  return (
    <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", className)} />
  );
};
