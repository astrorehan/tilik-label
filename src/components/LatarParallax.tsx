'use client';

import { useEffect } from 'react';

/** Bayangan daun di latar adalah lapisan paling jauh, jadi ikut tergulir paling pelan. */
const SPEED = 0.08;

export function LatarParallax() {
  useEffect(() => {
    const root = document.documentElement;
    let cancelled = false;
    let initFrame = 0;
    let frame = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const update = () => {
      frame = 0;
      root.style.setProperty('--latar-y', `${(-window.scrollY * SPEED).toFixed(1)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    initFrame = requestAnimationFrame(() => {
      initFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        root.setAttribute('data-latar', '');
        if (!reduced) {
          update();
          window.addEventListener('scroll', schedule, { passive: true });
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(initFrame);
      window.removeEventListener('scroll', schedule);
      cancelAnimationFrame(frame);
      root.style.removeProperty('--latar-y');
      root.removeAttribute('data-latar');
    };
  }, []);

  return null;
}
