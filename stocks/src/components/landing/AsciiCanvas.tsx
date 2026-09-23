import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { drawAscii, type AsciiScene } from "./ascii";

/** Frames per second. The motion is slow, and a lower rate keeps the main thread free. */
const FPS = 24;
/** A still frame for reduced motion, picked for a readable pose. */
const STILL_AT = 2.4;

/**
 * An ASCII scene on a canvas, sized to its box. It only animates while on
 * screen, draws one still frame when the visitor asks for reduced motion, and
 * takes its ink from the CSS `color` so it follows the tokens.
 */
export const AsciiCanvas: React.FC<{
  scene: AsciiScene;
  /** Glyph size in CSS pixels. */
  fontPx?: number;
  className?: string;
}> = ({ scene, fontPx = 11, className }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let color = "#000";
    let raf = 0;
    let visible = false;
    let last = 0;
    const start = performance.now();

    const draw = (t: number) => drawAscii(ctx, scene, { width, height, fontPx, color, t });
    const still = () => draw(reduce.matches ? STILL_AT : (performance.now() - start) / 1000);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = getComputedStyle(canvas).color;
      still();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / FPS) return;
      last = now;
      draw((now - start) / 1000);
    };
    const play = () => {
      cancelAnimationFrame(raf);
      if (visible && !reduce.matches) raf = requestAnimationFrame(tick);
      else still();
    };

    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      play();
    });
    seen.observe(canvas);
    reduce.addEventListener("change", play);
    // The first frames may be drawn in the fallback face; redraw once the
    // real one is in.
    void document.fonts?.load(`${fontPx}px "Geist Mono"`).then(still, () => undefined);

    return () => {
      cancelAnimationFrame(raf);
      sizes.disconnect();
      seen.disconnect();
      reduce.removeEventListener("change", play);
    };
  }, [scene, fontPx]);

  return (
    <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", className)} />
  );
};
