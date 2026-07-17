import { useEffect, useState } from "react";

const cache = new Map<string, string>();

/**
 * Samples the average color of an image (e.g. a token logo) so UI accents
 * (shadows, borders) can match the icon instead of using a fixed palette color.
 * Falls back to `fallback` while loading, on load failure, or if the image
 * is CORS-tainted and can't be read back from canvas.
 */
export function useDominantColor(imageUrl: string | undefined, fallback: string): string {
  const [color, setColor] = useState(() => (imageUrl && cache.get(imageUrl)) || fallback);

  useEffect(() => {
    if (!imageUrl) {
      setColor(fallback);
      return;
    }
    const cached = cache.get(imageUrl);
    if (cached) {
      setColor(cached);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 8;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0) return;
        const sampled = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
        cache.set(imageUrl, sampled);
        if (!cancelled) setColor(sampled);
      } catch {
        // CORS-tainted canvas — keep the fallback color.
      }
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl, fallback]);

  return color;
}
