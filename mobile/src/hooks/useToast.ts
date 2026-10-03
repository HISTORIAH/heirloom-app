import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { TOAST_MS } from "@/constants/ui";
import { takeFlash } from "@/lib/flash";

/**
 * One toast at a time that clears itself. With `flash`, also shows a message
 * another screen left behind (see `setFlash`) when this one gains focus.
 */
export function useToast({ flash = false }: { flash?: boolean } = {}) {
  const [toast, setToast] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (toast === undefined) return;
    const id = setTimeout(() => setToast(undefined), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      if (!flash) return;
      const text = takeFlash();
      if (text !== undefined) setToast(text);
    }, [flash]),
  );

  return { toast, showToast: setToast };
}
