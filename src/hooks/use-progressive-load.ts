"use client";

import { useEffect, useRef, useState } from "react";

export function useProgressiveLoad<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) {
      return;
    }

    const load = () => setShouldLoad(true);
    const onPointerMove = (event: PointerEvent) => {
      if (Math.abs(event.movementX) + Math.abs(event.movementY) < 8) {
        return;
      }

      load();
    };
        let resolvedValue0: any;
    if (ref.current && "IntersectionObserver" in window) {
      resolvedValue0 = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            load();
          }
        }, { rootMargin: "240px" });
    } else {
      resolvedValue0 = null;
    }
const observer = resolvedValue0;

    if (observer && ref.current) {
      observer.observe(ref.current);
    }

    window.addEventListener("scroll", load, { once: true, passive: true });
    window.addEventListener("wheel", load, { once: true, passive: true });
    window.addEventListener("touchstart", load, { once: true, passive: true });
    window.addEventListener("keydown", load, { once: true });
    window.addEventListener("mousedown", load, { once: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", load);
      window.removeEventListener("wheel", load);
      window.removeEventListener("touchstart", load);
      window.removeEventListener("keydown", load);
      window.removeEventListener("mousedown", load);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [shouldLoad]);

  return {
    ref,
    shouldLoad
  };
}
