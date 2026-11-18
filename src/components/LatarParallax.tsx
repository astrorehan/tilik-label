'use client';

import { useEffect } from 'react';

/** Bayangan daun di latar adalah lapisan paling jauh, jadi ikut tergulir paling pelan. */
const SPEED = 0.08;

export function LatarParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    let frame = 0;

    const update = () => {
      frame = 0;
      root.style.setProperty('--latar-y', `${(-window.scrollY * SPEED).toFixed(1)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      cancelAnimationFrame(frame);
      root.style.removeProperty('--latar-y');
    };
  }, []);

  return null;
}
