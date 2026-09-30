import { useEffect, useRef } from "react";

interface UseTouchGesturesOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
}

export function useTouchGestures({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: UseTouchGesturesOptions) {
  const startPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startPos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startPos.current || e.changedTouches.length === 0) return;

      const deltaX = e.changedTouches[0].clientX - startPos.current.x;
      const deltaY = e.changedTouches[0].clientY - startPos.current.y;
      startPos.current = null;

      // Minimum swipe distance of 50px and predominantly horizontal
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, enabled]);
}
