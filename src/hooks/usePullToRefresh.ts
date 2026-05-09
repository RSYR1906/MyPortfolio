import { haptic } from "@/lib/haptics";
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 80; // px to pull before refresh triggers
const MAX_PULL = 120; // px cap for visual indicator

export function usePullToRefresh(containerRef: React.RefObject<HTMLElement | null>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      // Walk from the touch target up to our container checking any scrollable child
      let node = e.target as HTMLElement | null;
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight && node.scrollTop > 0) return;
        node = node.parentElement;
      }
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Prevent the browser's native overscroll/bounce while we handle it
      e.preventDefault();
      const next = Math.min(delta, MAX_PULL);
      // Single haptic pulse the moment the threshold is crossed
      setPullDistance((prev) => {
        if (prev < THRESHOLD && next >= THRESHOLD) haptic(12);
        return next;
      });
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;

      setPullDistance((d) => {
        if (d >= THRESHOLD) {
          setRefreshing(true);
          // Small delay so the user sees the spinner before reload
          setTimeout(() => window.location.reload(), 300);
        }
        return 0;
      });
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
}
