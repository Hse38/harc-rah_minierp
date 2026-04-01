"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type SwipeActionSide = "left" | "right";

export function useSwipeAction({
  thresholdPx = 80,
  disabled = false,
  onTrigger,
}: {
  thresholdPx?: number;
  disabled?: boolean;
  onTrigger: (side: SwipeActionSide) => void;
}) {
  const startX = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    startX.current = null;
    setDx(0);
    setDragging(false);
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const x = e.touches?.[0]?.clientX;
      if (typeof x !== "number") return;
      startX.current = x;
      setDragging(true);
    },
    [disabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      if (startX.current == null) return;
      const x = e.touches?.[0]?.clientX;
      if (typeof x !== "number") return;
      const next = x - startX.current;
      setDx(next);
    },
    [disabled]
  );

  const onTouchEnd = useCallback(() => {
    if (disabled) return;
    if (startX.current == null) return reset();
    const abs = Math.abs(dx);
    if (abs >= thresholdPx) {
      const side: SwipeActionSide = dx > 0 ? "right" : "left";
      onTrigger(side);
    }
    reset();
  }, [disabled, dx, onTrigger, reset, thresholdPx]);

  const style = useMemo(() => {
    if (!dragging) return { transform: "translateX(0px)" };
    const clamped = Math.max(-140, Math.min(140, dx));
    return {
      transform: `translateX(${clamped}px)`,
      transition: "transform 0.05s linear",
      touchAction: "pan-y",
    } as React.CSSProperties;
  }, [dx, dragging]);

  return {
    dx,
    dragging,
    swipeStyle: style,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    reset,
  };
}

