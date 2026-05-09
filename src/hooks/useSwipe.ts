import { useEffect, useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/** Minimum horizontal pixels to count as a swipe */
const MIN_DISTANCE = 50;
/**
 * If vertical drift exceeds this fraction of horizontal distance the gesture
 * is treated as a scroll, not a swipe.
 */
const MAX_VERTICAL_RATIO = 0.5;

export function useSwipe(
  containerRef: React.RefObject<HTMLElement | null>,
  { onSwipeLeft, onSwipeRight }: SwipeHandlers,
) {
  // Keep the latest callbacks in a ref so the effect never needs to re-run
  const handlersRef = useRef({ onSwipeLeft, onSwipeRight });
  handlersRef.current = { onSwipeLeft, onSwipeRight };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < MIN_DISTANCE) return;
      if (Math.abs(dy) / Math.abs(dx) > MAX_VERTICAL_RATIO) return;
      if (dx < 0) handlersRef.current.onSwipeLeft?.();
      else handlersRef.current.onSwipeRight?.();
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef]);
}
