import { useEffect, useRef } from "react";

// A mounted card is not evidence that its meaning was seen. Observe the actual
// meaning, and require a short uninterrupted view before recording exposure.
const MIN_VISIBLE_RATIO = 0.6;
const EXPOSURE_DELAY = 700;

// viewKey identifies the displayed page/filter result, not each render. Keeping
// the latest callback in a ref prevents an exposure write from re-arming itself.
export function useVisibleExposure(
  onExpose: ((ids: string[]) => void) | undefined,
  viewKey: string,
  enabled = true,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onExpose);
  callbackRef.current = onExpose;
  const hasCallback = !!onExpose;

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !hasCallback || !container || !window.IntersectionObserver)
      return;

    const meanings = Array.from(
      container.querySelectorAll<HTMLElement>("[data-exposure-id]"),
    );
    const visible = new Set<HTMLElement>();
    const completed = new Set<string>();
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const cancel = (meaning: HTMLElement) => {
      clearTimeout(timers.get(meaning));
      timers.delete(meaning);
    };
    const isVisible = (meaning: HTMLElement) => {
      if (document.visibilityState !== "visible" || !visible.has(meaning))
        return false;
      const rect = meaning.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      const area = rect.width * rect.height;
      if (
        !area ||
        (Math.max(0, right - left) * Math.max(0, bottom - top)) / area <
          MIN_VISIBLE_RATIO
      )
        return false;
      // Fixed navigation or a modal can cover an element that still intersects
      // the viewport. Pointer-events:none on card text may return its button.
      const covering = document.elementFromPoint(
        (left + right) / 2,
        (top + bottom) / 2,
      );
      return (
        !!covering && (meaning.contains(covering) || covering.contains(meaning))
      );
    };
    const start = (meaning: HTMLElement) => {
      const id = meaning.dataset.exposureId;
      if (
        !id ||
        completed.has(id) ||
        timers.has(meaning) ||
        !isVisible(meaning)
      )
        return;
      timers.set(
        meaning,
        setTimeout(() => {
          timers.delete(meaning);
          if (!isVisible(meaning)) return;
          completed.add(id);
          pending.add(id);
          // Coalesce meanings that become readable together into one write.
          if (flushTimer === undefined)
            flushTimer = setTimeout(() => {
              flushTimer = undefined;
              const ids = Array.from(pending);
              pending.clear();
              if (ids.length) callbackRef.current?.(ids);
            }, 0);
        }, EXPOSURE_DELAY),
      );
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const meaning = entry.target as HTMLElement;
          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= MIN_VISIBLE_RATIO
          ) {
            visible.add(meaning);
            start(meaning);
          } else {
            visible.delete(meaning);
            cancel(meaning);
          }
        }
      },
      { threshold: [0, MIN_VISIBLE_RATIO] },
    );
    const onVisibilityChange = () => {
      for (const meaning of visible) {
        cancel(meaning);
        if (document.visibilityState === "visible") start(meaning);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    meanings.forEach((meaning) => observer.observe(meaning));
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      timers.forEach((timer) => clearTimeout(timer));
      clearTimeout(flushTimer);
    };
  }, [enabled, hasCallback, viewKey]);

  return containerRef;
}
