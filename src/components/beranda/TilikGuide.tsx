'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TilikMascot, type TilikMood } from '@/components/asisten/TilikMascot';
import { cn } from '@/lib/cn';
import { TILIK_FOOTER_SPOT_ID } from './TilikFooterSpot';
import { TILIK_VIDEO_SPOT_ID } from './VideoTour';

/*
 * Tilik di beranda. Selama tempatnya di samping gelembung belum terlihat, Tilik mengintip dari
 * tepi kiri layar dan ikut turun lebih lambat daripada halaman. Begitu tempatnya naik sampai
 * LAND_AT, Tilik melompat ke sana. Kalau halaman digulir balik, Tilik melompat lagi ke tepi.
 * Digulir terus sampai video naik, Tilik melompat ke tepi atas bingkai video. Setelah videonya
 * hampir lewat, Tilik melompat turun lagi ke teras footer. Arah sebaliknya juga berlaku.
 * Tanpa video, Tilik melompat langsung dari tempatnya ke footer.
 *
 * Tanpa JavaScript atau dengan gerak dikurangi, Tilik langsung duduk di tempatnya.
 */

type Phase = 'peek' | 'flying-in' | 'landed' | 'flying-out' | 'flying-down' | 'video' | 'footer' | 'flying-up';
type Box = { cx: number; cy: number; scale: number; rot: number };

/** Pecahan tinggi layar. Tengah tempat Tilik harus naik sampai LAND_AT agar Tilik melompat masuk. */
const LAND_AT = 0.68;
/** Tilik kembali mengintip bila tempatnya turun lagi sampai sini. */
const RETURN_AT = 0.9;
/** Posisi tengah Tilik yang mengintip saat halaman di puncak, lalu tepat sebelum melompat. */
const PEEK_FROM = 0.84;
const PEEK_TO = 0.44;
const PEEK_ROT = 40;
const SLOT_SIZE = 68;
const FLIGHT_MS = 820;
/** Tilik turun ke footer saat tepi atas tempatnya naik melewati ini (px, tepat di bawah navbar). */
const LEAVE_TOP = 96;
/** dan naik lagi dari footer bila tepi atas tempatnya turun lewat ini. */
const BACK_TOP = 220;
/** Tilik meninggalkan video saat tepi bawah bingkainya naik melewati pecahan tinggi layar ini, */
const VIDEO_LEAVE_AT = 0.35;
/** dan kembali ke video bila tepi bawah itu turun lagi sampai sini. */
const VIDEO_BACK_AT = 0.55;

/** Tempat hinggap dan fase Tilik saat berada di sana. */
const PERCHES = [
  { id: TILIK_VIDEO_SPOT_ID, phase: 'video' },
  { id: TILIK_FOOTER_SPOT_ID, phase: 'footer' },
] as const;

const SLOT_LINES: ReactNode[] = [
  <>
    <strong>Aku Tilik.</strong> Aku baca tulisan dari fotomu. Setelah diperiksa, aku tunjukkan bagian yang perlu
    dibenahi dan apa yang bisa langsung kubetulkan.
  </>,
  <>Kalau ada tulisan yang salah kubaca, kamu bisa betulkan dulu sebelum diperiksa.</>,
  <>Tiap temuan kusertai pasal aturannya, jadi kamu tahu alasannya.</>,
  <>Belum punya foto kemasan? Coba kemasan rekaan di halaman contoh dulu.</>,
  <>Hihi, geli. Yuk, periksa labelmu!</>,
];

const PEEK_LINES = [
  'Hai, aku Tilik! Gulir pelan-pelan, aku ikut turun.',
  'Psst… nanti kutunjukkan contoh hasilnya di bawah.',
  'Hihi, geli!',
];

function peekSizeFor(width: number) {
  if (width >= 1024) return 210;
  if (width >= 640) return 170;
  return 120;
}

/** Bagian kotak gambar yang tersembunyi di balik tepi layar (kaki dan badan bawah tersembunyi, kepala yang miring menyembul). Di HP lebih banyak agar tidak menutupi teks. */
function peekHideFor(size: number) {
  if (size >= 210) return 0.46;
  if (size >= 170) return 0.48;
  return 0.5;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function TilikGuide({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLButtonElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>('landed');

  // Tilik yang mengintip baru dipasang di peramban, dan tidak dipasang bila gerak dikurangi.
  const enabled = useSyncExternalStore(
    subscribeMotion,
    () => !window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  const peekSize = useSyncExternalStore(
    subscribeResize,
    () => peekSizeFor(window.innerWidth),
    () => 210,
  );
  const [peekMood, setPeekMood] = useState<TilikMood>('idle');
  const [saying, setSaying] = useState(false);
  const [sayIndex, setSayIndex] = useState(-1);
  const [line, setLine] = useState(0);
  const [hop, setHop] = useState(0);
  const [slotMood, setSlotMood] = useState<TilikMood>('explaining');

  const sayTimer = useRef<number | undefined>(undefined);
  const moodTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    const slot = slotRef.current;
    const flyer = peekRef.current;
    if (!root || !slot || !flyer) return;

    let size = peekSizeFor(window.innerWidth);
    let hide = peekHideFor(size);
    let frame = 0;
    let flight = 0;
    let enterTimer: number | undefined;

    const setPhase = (next: Phase) => {
      phaseRef.current = next;
      root.dataset.phase = next;
      flyer.dataset.phase = next;
      for (const perch of PERCHES) {
        document.getElementById(perch.id)?.toggleAttribute('data-here', next === perch.phase);
      }
    };

    const atBottom = (margin: number) =>
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - margin;

    const enter = () => {
      flyer.dataset.enter = '';
      window.clearTimeout(enterTimer);
      enterTimer = window.setTimeout(() => delete flyer.dataset.enter, 1300);
    };

    /** Posisi Tilik yang mengintip: turun bersama halaman, tetapi jauh lebih lambat. */
    const peekBox = (): Box => {
      const vh = window.innerHeight;
      const rect = slot.getBoundingClientRect();
      const slotY = rect.top + window.scrollY + rect.height / 2;
      const progress = clamp(window.scrollY / Math.max(1, slotY - vh * LAND_AT), 0, 1);
      return {
        cx: size * (0.5 - hide),
        cy: vh * (PEEK_FROM + (PEEK_TO - PEEK_FROM) * progress),
        scale: 1,
        rot: PEEK_ROT,
      };
    };

    const slotBox = (): Box => {
      const rect = slot.getBoundingClientRect();
      return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        scale: SLOT_SIZE / size,
        rot: 0,
      };
    };

    const perchBox = (id: string): Box | null => {
      const spot = document.getElementById(id);
      if (!spot) return null;
      const rect = spot.getBoundingClientRect();
      return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        scale: rect.width / size,
        rot: 0,
      };
    };
    const footerBox = () => perchBox(TILIK_FOOTER_SPOT_ID);
    const videoBox = () => perchBox(TILIK_VIDEO_SPOT_ID);

    /** Kedudukan video terhadap layar, atau null bila beranda tidak memuat video. */
    const videoState = () => {
      const spot = document.getElementById(TILIK_VIDEO_SPOT_ID);
      const frameBox = spot?.parentElement?.getBoundingClientRect();
      if (!spot || !frameBox) return null;
      const vh = window.innerHeight;
      const rect = spot.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      return {
        /** Tempat hinggap sudah naik cukup tinggi untuk dilompati. */
        reached: center < vh * LAND_AT,
        /** Tempat hinggap turun lagi ke dasar layar: kembali ke samping gelembung. */
        gone: center >= vh * RETURN_AT,
        /** Video hampir lewat: saatnya ke footer. */
        past: frameBox.bottom < vh * VIDEO_LEAVE_AT || atBottom(4),
        /** Video terlihat lagi saat digulir balik dari footer. */
        back: frameBox.bottom > vh * VIDEO_BACK_AT && !atBottom(120),
      };
    };

    /** Tempat Tilik seharusnya duduk bila tidak sempat melompat (halaman dibuka atau digulir jauh sekaligus). */
    const restingPhase = (): Phase => {
      const hasFooter = Boolean(footerBox());
      const video = videoState();
      if (video) {
        if (hasFooter && video.past) return 'footer';
        return video.reached ? 'video' : 'landed';
      }
      const rect = slot.getBoundingClientRect();
      return hasFooter && (rect.top < LEAVE_TOP || atBottom(4)) ? 'footer' : 'landed';
    };

    // Saat mengintip, kemiringan dipegang lapisan dalam (lewat CSS) agar gelembung ucapan tetap tegak.
    const place = (box: Box, withTilt: boolean) => {
      const tilt = withTilt ? ` rotate(${box.rot}deg) scale(${box.scale})` : '';
      flyer.style.transform = `translate3d(${box.cx - size / 2}px, ${box.cy - size / 2}px, 0)${tilt}`;
    };

    /** Lompatan bersalto. Kedua ujungnya dibaca ulang tiap bingkai, jadi tetap tepat walau halaman digulir. */
    const fly = (
      flying: Phase,
      from: () => Box,
      to: () => Box,
      end: Phase,
      spin: number,
      afterLanding?: () => void,
    ) => {
      setPhase(flying);
      window.clearTimeout(sayTimer.current);
      setSaying(false);
      setPeekMood('happy');
      const start = performance.now();

      const step = (now: number) => {
        const t = clamp((now - start) / FLIGHT_MS, 0, 1);
        const a = from();
        const b = to();
        const u = easeInOutSine(t);
        const arc = 70 + Math.abs(b.cx - a.cx) * 0.25;
        place(
          {
            cx: a.cx + (b.cx - a.cx) * u,
            cy: a.cy + (b.cy - a.cy) * u - arc * Math.sin(Math.PI * u),
            scale: a.scale + (b.scale - a.scale) * u,
            rot: a.rot + (b.rot - a.rot) * u + spin * easeInOutCubic(t),
          },
          true,
        );

        if (t < 1) {
          flight = requestAnimationFrame(step);
          return;
        }
        flight = 0;
        setPeekMood('idle');
        setPhase(end);
        afterLanding?.();
        // Halaman mungkin sudah digulir lebih jauh selama Tilik melayang.
        schedule();
      };
      flight = requestAnimationFrame(step);
    };

    const backToPeek = () => place(peekBox(), false);

    const update = () => {
      frame = 0;
      const phase = phaseRef.current;
      if (phase.startsWith('flying')) return;
      const vh = window.innerHeight;
      const rect = slot.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const footer = footerBox();

      // Halaman digulir jauh ke atas: Tilik langsung kembali mengintip tanpa melompat.
      if (phase !== 'peek' && rect.top > vh && center >= vh * RETURN_AT) {
        setPhase('peek');
        backToPeek();
        enter();
        return;
      }

      if (phase === 'peek') {
        if (center > vh * LAND_AT) {
          place(peekBox(), false);
        } else if (rect.bottom < 0) {
          setPhase(restingPhase());
        } else {
          fly('flying-in', peekBox, slotBox, 'landed', 360);
        }
        return;
      }

      const video = videoState();
      const toFooter = () => footerBox() ?? slotBox();
      const toVideo = () => videoBox() ?? slotBox();

      if (phase === 'landed') {
        if (center >= vh * RETURN_AT) {
          fly('flying-out', slotBox, peekBox, 'peek', -360, backToPeek);
        } else if (video) {
          if (video.reached && video.past && footer) fly('flying-down', slotBox, toFooter, 'footer', 360);
          else if (video.reached) fly('flying-down', slotBox, toVideo, 'video', 360);
        } else if (footer && (rect.top < LEAVE_TOP || atBottom(4))) {
          if (rect.bottom < 0) setPhase('footer');
          else fly('flying-down', slotBox, toFooter, 'footer', 360);
        }
      } else if (phase === 'video') {
        if (!video || video.gone) fly('flying-up', toVideo, slotBox, 'landed', -360);
        else if (footer && video.past) fly('flying-down', toVideo, toFooter, 'footer', 360);
      } else if (phase === 'footer') {
        if (video) {
          if (video.back && video.gone) fly('flying-up', toFooter, slotBox, 'landed', -360);
          else if (video.back) fly('flying-up', toFooter, toVideo, 'video', -360);
        } else if (rect.top > BACK_TOP && !atBottom(120)) {
          fly('flying-up', toFooter, slotBox, 'landed', -360);
        }
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onResize = () => {
      size = peekSizeFor(window.innerWidth);
      hide = peekHideFor(size);
      if (phaseRef.current === 'peek') place(peekBox(), false);
      schedule();
    };

    const firstRect = slot.getBoundingClientRect();
    if (firstRect.top + firstRect.height / 2 <= window.innerHeight * LAND_AT) {
      setPhase(restingPhase());
    } else {
      setPhase('peek');
      place(peekBox(), false);
      enter();
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(flight);
      window.clearTimeout(enterTimer);
      delete root.dataset.phase;
      for (const perch of PERCHES) document.getElementById(perch.id)?.removeAttribute('data-here');
      phaseRef.current = 'landed';
    };
  }, [enabled]);

  useEffect(
    () => () => {
      window.clearTimeout(sayTimer.current);
      window.clearTimeout(moodTimer.current);
    },
    [],
  );

  const greet = () => {
    if (phaseRef.current !== 'peek') return;
    setSayIndex((index) => (index + 1) % PEEK_LINES.length);
    setSaying(true);
    setPeekMood('happy');
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => {
      setSaying(false);
      setPeekMood('idle');
    }, 3400);
  };

  const poke = () => {
    setLine((index) => (index + 1) % SLOT_LINES.length);
    setHop((count) => count + 1);
    setSlotMood('happy');
    window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setSlotMood('explaining'), 1600);
  };

  return (
    <div ref={rootRef} className={cn('tilik-guide flex items-end gap-2.5', className)}>
      <button
        ref={slotRef}
        type="button"
        className="tilik-guide__slot"
        aria-label="Minta Tilik bercerita lagi"
        onClick={poke}
      >
        <span key={hop} className={cn('block', hop > 0 && 'tilik-guide__hop')}>
          <TilikMascot mood={slotMood} size={SLOT_SIZE} />
        </span>
      </button>
      <div
        aria-live="polite"
        className="tilik-guide__bubble glass-float bubble grid min-w-0 flex-1 px-4 py-3 text-[0.9375rem] leading-snug text-ink"
      >
        {/* Semua pesan menumpuk di sel yang sama; yang tak aktif disembunyikan tapi tetap memakan
            tempat, jadi tinggi gelembung selalu setinggi pesan terpanjang dan tidak menggeser isi lain. */}
        {SLOT_LINES.map((message, index) => (
          <p
            key={index === line ? `aktif-${line}` : index}
            className={cn('col-start-1 row-start-1', index === line ? 'animate-fade' : 'invisible')}
            aria-hidden={index === line ? undefined : true}
          >
            {message}
          </p>
        ))}
      </div>

      {enabled &&
        createPortal(
          <div
            ref={peekRef}
            className="tilik-peek"
            data-saying={saying ? '' : undefined}
            style={
              {
                '--peek-size': `${peekSize}px`,
                '--peek-hide': peekHideFor(peekSize),
                '--peek-rot': `${PEEK_ROT}deg`,
              } as CSSProperties
            }
          >
            <div className="tilik-peek__pop">
              <button type="button" className="tilik-peek__btn" aria-label="Sapa Tilik" onClick={greet}>
                <span className="tilik-peek__lean">
                  <TilikMascot mood={peekMood} size={peekSize} />
                </span>
              </button>
              <p role="status" className="tilik-peek__say glass-float bubble">
                {sayIndex >= 0 ? PEEK_LINES[sayIndex] : ''}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
