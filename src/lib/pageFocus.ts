export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fokus tanpa memindahkan halaman bila tujuan sudah terlihat di bawah navbar. */
export function focusInView(target: HTMLElement | null, block: ScrollLogicalPosition = 'start'): boolean {
  if (!target) return false;
  target.focus({ preventScroll: true });

  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop ?? 0;
  const navBottom = document.getElementById('site-header')?.getBoundingClientRect().bottom ?? 0;
  const top = Math.max(viewportTop, navBottom) + 8;
  const bottom = viewportTop + (viewport?.height ?? window.innerHeight) - 12;
  const rect = target.getBoundingClientRect();
  if (rect.top >= top && rect.bottom <= bottom) return false;

  const smooth = !prefersReducedMotion();
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block, inline: 'nearest' });
  return smooth;
}

/** Tahan tinggi lama supaya peramban tidak melompat saat konten tujuan lebih pendek. */
export function holdHeightDuringNavigation(container: HTMLElement | null) {
  if (!container || window.scrollY <= 0) return;
  container.style.minHeight = `${container.offsetHeight}px`;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const release = () => {
    clearTimeout(timer);
    document.removeEventListener('scrollend', release);
    container.style.removeProperty('min-height');
  };

  return {
    release,
    afterScroll(smooth: boolean) {
      if (!smooth) {
        release();
        return;
      }
      document.addEventListener('scrollend', release, { once: true });
      timer = setTimeout(release, 850);
    },
  };
}
