'use client';

import { useEffect, useRef, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { TilikPerch } from './TilikPerch';

/*
 * Video demo di beranda. Selagi terlihat, video berputar tanpa suara sebagai cuplikan. Tombol
 * "Putar dari awal" atau salah satu bab di bawahnya memutar dengan suara dan kontrol bawaan.
 * Dengan gerak dikurangi, video tidak berputar sendiri. Tilik hinggap di tepi atas bingkai
 * sebelum melompat ke footer (lihat TilikGuide).
 */

export const TILIK_VIDEO_SPOT_ID = 'tilik-video-spot';

const SRC = '/video/tilik-label-demo.mp4';
const POSTER = '/video/tilik-label-demo-poster.webp';

const CHAPTERS = [
  { start: 15, title: 'Masalahnya', text: 'Kenapa label usaha rumahan sering baru ketahuan salah setelah dicetak.' },
  { start: 59, title: 'Solusinya', text: 'AI membaca foto, lalu 20 aturan label BPOM yang memutuskan.' },
  { start: 101, title: 'Cara pakainya', text: 'Dari foto kemasan sampai label perbaikan yang siap dicetak.' },
];

const PERCH_LINES = [
  'Tonton videonya, ada aku juga di dalamnya!',
  'Nyalakan suaranya biar lebih jelas.',
  'Hihi, geli!',
];

const DURATION = '4:21';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function VideoTour() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [withSound, setWithSound] = useState(false);
  const [active, setActive] = useState(-1);
  const withSoundRef = useRef(false);

  // Cuplikan tanpa suara hanya diputar selagi video terlihat.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (!entry.isIntersecting) {
          video.pause();
        } else if (!withSoundRef.current && !window.matchMedia(REDUCED_MOTION).matches) {
          video.play().catch(() => {});
        }
      },
      { threshold: 0.35 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const playWithSound = (from: number) => {
    const video = videoRef.current;
    if (!video) return;
    withSoundRef.current = true;
    setWithSound(true);
    video.loop = false;
    video.muted = false;
    video.currentTime = from;
    video.play().catch(() => {});
  };

  const onTimeUpdate = () => {
    const time = videoRef.current?.currentTime ?? 0;
    let index = -1;
    CHAPTERS.forEach((chapter, i) => {
      if (time >= chapter.start) index = i;
    });
    setActive(index);
  };

  return (
    <section aria-labelledby="video-beranda-judul" className="page-shell below-fold pt-4 pb-16 sm:pt-8 sm:pb-24">
      <h2 id="video-beranda-judul" className="type-h1 text-center">Empat menit bersama Tilik</h2>

      {/* TilikGuide membaca kotak ini sebagai induk tempat hinggap (parentElement). */}
      <div className="relative mt-20 sm:mt-14">
        <TilikPerch id={TILIK_VIDEO_SPOT_ID} lines={PERCH_LINES} className="tilik-video-spot" />
        <div className="video-tour-frame relative aspect-video overflow-hidden rounded-[22px] bg-paper-deep sm:rounded-[30px]">
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            src={SRC}
            poster={POSTER}
            preload="metadata"
            playsInline
            loop={!withSound}
            muted={!withSound}
            controls={withSound}
            onTimeUpdate={onTimeUpdate}
            aria-label="Video demo Tilik Label"
          />
          {!withSound && (
            <button
              type="button"
              className={cn(buttonClasses({ size: 'md' }), 'video-tour-sound')}
              onClick={() => playWithSound(0)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
                <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
              </svg>
              Putar dari awal
              <span className="tabular font-medium text-ink-2">{DURATION}</span>
            </button>
          )}
        </div>
      </div>

      <ol className="mt-6 grid gap-x-6 gap-y-1 sm:mt-8 sm:grid-cols-3">
        {CHAPTERS.map((chapter, i) => (
          <li key={chapter.start}>
            <button
              type="button"
              onClick={() => playWithSound(chapter.start)}
              className="video-tour-chapter group flex w-full items-start gap-3.5 rounded-[18px] p-3 text-left"
              aria-current={active === i ? 'step' : undefined}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full font-label text-sm font-bold text-ink transition-colors',
                  active === i ? 'bg-action' : 'bg-brand-soft group-hover:bg-action',
                )}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="text-[1.0625rem] font-semibold text-ink">{chapter.title}</span>
                  <span className="tabular text-sm text-ink-3">{clock(chapter.start)}</span>
                </span>
                <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink-2">{chapter.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
