'use client';

import { useEffect, useRef, useState } from 'react';

/** Tinggi minimum jempol agar tetap mudah diraih pada halaman yang sangat panjang. */
const MIN_THUMB = 40;
/** Lama jempol tetap tampil setelah halaman berhenti bergulir. */
const IDLE_MS = 1200;
/** Jarak dari tepi kanan yang memunculkan jempol saat penunjuk mendekat. */
const EDGE_PX = 28;

const FINE_POINTER = '(pointer: fine)';

/**
 * Bilah gulir mengambang untuk perangkat bertetikus. Bilah gulir bawaan halaman
 * disembunyikan lewat CSS supaya tidak memakan lebar halaman; jempol ini melayang di
 * atas konten, muncul saat halaman digulir atau penunjuk mendekati tepi kanan, dan
 * bisa diseret. Di layar sentuh bilah bawaan yang memang sudah melayang tetap dipakai.
 */
export function ScrollThumb() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER);
    const sync = () => setEnabled(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!enabled || !track || !thumb) return;

    const root = document.documentElement;
    let frame = 0;
    let idleTimer = 0;
    let drag: { pointerId: number; startY: number; startScroll: number } | null = null;

    const measure = () => {
      const view = root.clientHeight;
      const maxScroll = root.scrollHeight - view;
      const trackHeight = track.clientHeight;
      const size = Math.min(
        trackHeight,
        Math.max(MIN_THUMB, Math.round((trackHeight * view) / Math.max(1, maxScroll + view))),
      );
      return { maxScroll, maxOffset: trackHeight - size, size };
    };

    const paint = () => {
      frame = 0;
      const { maxScroll, maxOffset, size } = measure();
      const scrollable = maxScroll > 1;
      track.toggleAttribute('data-scrollable', scrollable);
      if (!scrollable) return;
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      thumb.style.height = `${size}px`;
      thumb.style.transform = `translateY(${progress * maxOffset}px)`;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const show = () => {
      track.setAttribute('data-active', '');
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (!drag) track.removeAttribute('data-active');
      }, IDLE_MS);
    };

    const onScroll = () => {
      schedule();
      show();
    };

    const onPointerNearEdge = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.clientX >= root.clientWidth - EDGE_PX) show();
    };

    const onThumbDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      drag = { pointerId: event.pointerId, startY: event.clientY, startScroll: window.scrollY };
      thumb.setPointerCapture(event.pointerId);
      track.setAttribute('data-dragging', '');
      show();
    };

    const onThumbMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const { maxScroll, maxOffset } = measure();
      if (maxOffset <= 0) return;
      const top = drag.startScroll + ((event.clientY - drag.startY) / maxOffset) * maxScroll;
      window.scrollTo({ top, behavior: 'instant' });
    };

    const onThumbUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      if (thumb.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);
      track.removeAttribute('data-dragging');
      show();
    };

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('pointermove', onPointerNearEdge, { passive: true });
    thumb.addEventListener('pointerdown', onThumbDown);
    thumb.addEventListener('pointermove', onThumbMove);
    thumb.addEventListener('pointerup', onThumbUp);
    thumb.addEventListener('pointercancel', onThumbUp);
    paint();

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idleTimer);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pointermove', onPointerNearEdge);
      thumb.removeEventListener('pointerdown', onThumbDown);
      thumb.removeEventListener('pointermove', onThumbMove);
      thumb.removeEventListener('pointerup', onThumbUp);
      thumb.removeEventListener('pointercancel', onThumbUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={trackRef} aria-hidden className="scroll-thumb-track print:hidden">
      <div ref={thumbRef} className="scroll-thumb" />
    </div>
  );
}
