import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

function liftIntoScroll(
  frame: View | undefined,
  scroll: ScrollView | undefined,
  node: View | undefined,
  scrollY: number,
): void {
  if (frame === undefined || scroll === undefined || node === undefined) return;
  node.measureInWindow((_fx: number, fy: number, _fw: number, fh: number) => {
    frame.measureInWindow((_sx: number, sy: number, _sw: number, sh: number) => {
      const overflow = fy + fh + 56 - (sy + sh);
      if (overflow <= 0) return;
      scroll.scrollTo({ y: Math.max(0, scrollY + overflow), animated: true });
    });
  });
}

/** Android does not scroll a focused input in a ScrollView above the keyboard. */
export function useLiftIntoScroll() {
  const frameRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const focused = useRef<View | undefined>(undefined);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [kbPad, setKbPad] = useState(0);

  function onLift(node: View) {
    focused.current = node;
    liftIntoScroll(
      frameRef.current ?? undefined,
      scrollRef.current ?? undefined,
      node,
      scrollY.current,
    );
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardOpen(true);
      setKbPad(e.endCoordinates.height);
      setTimeout(() => {
        liftIntoScroll(
          frameRef.current ?? undefined,
          scrollRef.current ?? undefined,
          focused.current,
          scrollY.current,
        );
      }, 60);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOpen(false);
      setKbPad(0);
      focused.current = undefined;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { frameRef, scrollRef, keyboardOpen, kbPad, onLift, onScroll };
}
