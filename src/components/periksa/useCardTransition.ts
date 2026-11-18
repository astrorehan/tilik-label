import { useLayoutEffect, useRef, useState } from 'react';
import { focusInView, holdHeightDuringNavigation, prefersReducedMotion } from '@/lib/pageFocus';

export function useCardTransition<T extends HTMLElement = HTMLDivElement>(initialIndex: number) {
  const [index, setIndex] = useState(initialIndex);
  const regionRef = useRef<T>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const direction = useRef<number | null>(null);
  const exiting = useRef<Animation | null>(null);
  const heldHeight = useRef<ReturnType<typeof holdHeightDuringNavigation>>(undefined);

  useLayoutEffect(() => () => {
    exiting.current?.cancel();
    heldHeight.current?.release();
  }, []);

  useLayoutEffect(() => {
    const from = direction.current;
    if (from === null) return;
    direction.current = null;
    exiting.current?.cancel();
    exiting.current = null;

    const card = cardRef.current;
    const heading = card?.querySelector<HTMLElement>('[data-card-focus]') ?? null;
    const smooth = focusInView(heading);
    heldHeight.current?.afterScroll(smooth);
    if (prefersReducedMotion()) return;

    const entering = card?.animate?.(
      [{ opacity: 0, translate: `${from * 14}px 0` }, { opacity: 1, translate: '0 0' }],
      { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
    return () => entering?.cancel();
  }, [index]);

  function moveTo(next: number) {
    if (next === index || direction.current !== null) return;
    direction.current = next > index ? 1 : -1;

    const swap = () => {
      heldHeight.current?.release();
      heldHeight.current = holdHeightDuringNavigation(regionRef.current);
      setIndex(next);
    };

    const card = cardRef.current;
    if (!card?.animate || prefersReducedMotion()) {
      swap();
      return;
    }
    const animation = card.animate(
      [{}, { opacity: 0, translate: `${-direction.current * 14}px 0` }],
      { duration: 110, easing: 'ease-in', fill: 'forwards' },
    );
    exiting.current = animation;
    void animation.finished.then(swap, () => {});
  }

  return { index, moveTo, regionRef, cardRef };
}
