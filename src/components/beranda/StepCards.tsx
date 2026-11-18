'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { TilikMascot, type TilikMood } from '@/components/asisten/TilikMascot';
import { LogoMark } from '@/components/brand/logo';
import { Icon } from '@/components/icons/icon';
import { ButtonLink } from '@/components/ui/button';

// Tiga langkah periksa sebagai kartu yang dibagikan tertutup (punggung kertas kraft berlogo timbul),
// lalu terbalik satu per satu. Saat disorot, kartu terangkat sedikit miring dan adegannya berganti
// ke keadaan "sesudah": foto terbaca, salah baca dibetulkan, temuan muncul. Di layar sentuh keadaan
// itu diputar sekali setelah kartu terbuka.

type Step = {
  title: string;
  lead: string;
  meta: string;
  tint: string;
  mood: [TilikMood, TilikMood];
  mascot: string;
  Scene: (props: { hot: boolean }) => ReactNode;
};

const TITLE = 'Tiga langkah sebelum cetak';

const STEPS: Step[] = [
  {
    title: 'Foto labelnya',
    lead: 'Atau unggah desain dan teksnya',
    meta: 'Foto, desain, atau teks',
    tint: '#eef3d6',
    mood: ['idle', 'happy'],
    mascot: 'right-[4%] bottom-[3%]',
    Scene: SceneFoto,
  },
  {
    title: 'Cocokkan isinya',
    lead: 'Betulkan tulisan yang salah terbaca',
    meta: 'Isian per butir label',
    tint: '#fbf0d6',
    mood: ['thinking', 'explaining'],
    mascot: 'left-[3%] bottom-[3%]',
    Scene: SceneCocok,
  },
  {
    title: 'Tinjau hasilnya',
    lead: 'Tahu yang kurang sebelum cetak',
    meta: 'Tiap temuan ada pasalnya',
    tint: '#e2efe0',
    mood: ['alert', 'happy'],
    mascot: 'right-[3%] bottom-[3%]',
    Scene: SceneHasil,
  },
];

/** Diputar sekali saat elemen pertama kali masuk layar. */
function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

const DEAL_DELAY = (k: number) => 0.15 + k * 0.22;

function StepCard({ step, k, dealt }: { step: Step; k: number; dealt: boolean }) {
  const [hot, setHot] = useState(false);
  const [tilt, setTilt] = useState(0);
  const { Scene } = step;

  // Layar tanpa hover: tunjukkan keadaan "sesudah" sekali, tak lama setelah kartu terbuka.
  useEffect(() => {
    if (!dealt || window.matchMedia('(hover: hover)').matches) return;
    const timer = window.setTimeout(() => setHot(true), (DEAL_DELAY(k) + 1.6) * 1000);
    return () => window.clearTimeout(timer);
  }, [dealt, k]);

  return (
    <li
      className="step-card-hover min-w-0 list-none [perspective:1400px]"
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return;
        setTilt((Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2));
        setHot(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHot(false);
      }}
    >
      <div
        className={`step-card relative [transform-style:preserve-3d] ${dealt ? 'step-card-deal' : 'invisible'}`}
        style={{ animationDelay: `${DEAL_DELAY(k)}s`, '--from-tilt': `${[-9, 4, 10][k]}deg` } as CSSProperties}
      >
        <article
          className="step-face-front flex flex-col gap-3.5 rounded-[30px] bg-surface p-3 shadow-[0_24px_60px_-28px_rgb(36_41_31/0.38)]"
          style={{ animationDelay: `${DEAL_DELAY(k)}s` }}
          data-hot={hot ? '' : undefined}
        >
          <div className="relative h-[330px] overflow-hidden rounded-[22px] sm:h-[360px]" style={{ backgroundColor: step.tint }}>
            <div className="relative z-10 flex flex-col items-center px-4 pt-6 text-center">
              <h3 className="font-label text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-snug text-ink-2">{step.lead}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 top-[29%]" aria-hidden="true">
              <Scene hot={hot} />
            </div>
            <div className={`absolute z-10 ${step.mascot}`} aria-hidden="true">
              <TilikMascot mood={hot ? step.mood[1] : step.mood[0]} size={84} />
            </div>
          </div>
          <div className="flex items-center gap-3 px-1.5 pb-1">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full font-label text-lg font-bold text-brand-deep"
              style={{ backgroundColor: step.tint }}
              aria-hidden="true"
            >
              {k + 1}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-semibold text-ink">Langkah {k + 1}</span>
              <span className="text-[13px] text-ink-3">{step.meta}</span>
            </span>
          </div>
        </article>

        <div
          className="step-card-back step-face-back pointer-events-none absolute inset-0 grid place-items-center rounded-[30px] [transform:rotateY(180deg)]"
          style={{ animationDelay: `${DEAL_DELAY(k)}s` }}
          aria-hidden="true"
        >
          <div className="step-card-emboss flex flex-col items-center gap-3">
            <LogoMark className="h-auto w-28" />
            <span className="font-label text-lg font-bold tracking-[-0.03em]">Tilik Label</span>
          </div>
        </div>
      </div>
    </li>
  );
}

export function StepCards() {
  const [headRef, headSeen] = useInView<HTMLDivElement>(0.4);
  const [cardsRef, dealt] = useInView<HTMLOListElement>(0.2);
  const words = TITLE.split(' ');

  return (
    <section aria-labelledby="cara-periksa" className="page-shell flex flex-col gap-10 pt-8 pb-16 sm:gap-12 sm:pt-14 sm:pb-24">
      <div ref={headRef} className="flex flex-col items-center gap-3 text-center">
        <h2 className="type-h1 max-w-[46rem]">
          <span id="cara-periksa" className="sr-only">{TITLE}</span>
          <span aria-hidden="true">
            {words.map((word, i) => (
              <Fragment key={i}>
                <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <span className={`inline-block ${headSeen ? 'step-word-up' : 'translate-y-full'}`} style={{ animationDelay: `${i * 70}ms` }}>
                    {word}
                  </span>
                </span>
                {i < words.length - 1 && ' '}
              </Fragment>
            ))}
          </span>
        </h2>
        <p
          className={`max-w-[34rem] text-lg leading-relaxed text-ink-2 ${headSeen ? 'step-fade-in' : 'opacity-0'}`}
          style={{ animationDelay: `${words.length * 70 + 200}ms` }}
        >
          Tanpa akun dan tanpa pasang aplikasi. Cukup HP dan kemasan yang mau dicek.
        </p>
      </div>

      <ol ref={cardsRef} className="mx-auto grid w-full max-w-[25rem] gap-6 lg:max-w-none lg:grid-cols-3">
        {STEPS.map((step, k) => (
          <StepCard key={step.title} step={step} k={k} dealt={dealt} />
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <ButtonLink href="/periksa" icon="scan" size="lg">
          Periksa label
        </ButtonLink>
        <Link href="/contoh" className="action-link">
          Coba contoh dulu <Icon name="arrowRight" size={17} />
        </Link>
      </div>
    </section>
  );
}

/* ---------- Adegan ---------- */

const INK = 'var(--color-ink)';
const SURFACE = 'var(--color-surface)';
const LINE = 'var(--color-line)';
const MUTED = 'var(--color-ink-3)';
const TEXT: CSSProperties = { fontFamily: 'var(--font-sans), system-ui, sans-serif' };

/** Langkah 1: HP membidik stiker kemasan; saat disorot, kilat jepret dan tanda "Terbaca". */
function SceneFoto({ hot }: { hot: boolean }) {
  return (
    <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMax meet" className="step-scene h-full w-full" data-hot={hot ? '' : undefined}>
      <g transform="rotate(-6 150 190)">
        {/* badan HP */}
        <rect x="86" y="14" width="136" height="250" rx="24" fill={INK} />
        <rect x="93" y="21" width="122" height="236" rx="18" fill="#9fae84" />
        {/* kemasan di layar */}
        <path d="M106 52h96l8 190H98z" fill="#c9a36b" />
        <path d="M106 52h96l1.4 26h-98.8z" fill="#b58c55" />
        <rect x="116" y="96" width="76" height="80" rx="6" fill={SURFACE} />
        <rect x="124" y="105" width="44" height="6" rx="3" fill={INK} />
        {[118, 128, 138, 148].map((y, i) => (
          <rect key={y} x="124" y={y} width={[58, 50, 60, 36][i]} height="4" rx="2" fill={LINE} />
        ))}
        <rect x="124" y="160" width="30" height="8" rx="2" fill="var(--color-brand-soft)" />
        {/* bingkai bidik */}
        <g stroke="var(--color-action)" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M108 100v-12h12M200 100v-12h-12M108 172v12h12M200 172v12h-12" />
        </g>
        {/* garis pindai */}
        <rect className="step-scan" x="110" y="92" width="88" height="3" rx="1.5" fill="var(--color-action)" />
        {/* tombol jepret */}
        <circle cx="154" cy="226" r="14" fill="none" stroke={SURFACE} strokeWidth="3" />
        <circle cx="154" cy="226" r="9.5" fill={SURFACE} className="step-shutter" />
        {/* kilat */}
        <rect className="step-flash" x="93" y="21" width="122" height="236" rx="18" fill="#fff" />
      </g>
      {/* tanda terbaca */}
      <g className="step-pop" style={{ transformOrigin: '212px 74px' }}>
        <rect x="170" y="60" width="96" height="30" rx="15" fill={SURFACE} stroke={LINE} />
        <circle cx="187" cy="75" r="8" fill="var(--color-success)" />
        <path d="m183.5 75 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="201" y="79.5" fontSize="12.5" fontWeight="700" fill={INK} style={TEXT}>Terbaca</text>
      </g>
    </svg>
  );
}

/** Langkah 2: isian hasil baca; "25O g" yang salah terbaca berganti jadi "250 g". */
function SceneCocok({ hot }: { hot: boolean }) {
  const rows = [
    { label: 'Nama produk', value: 'Sambal Bawang' },
    { label: 'Berat bersih', value: null },
    { label: 'Kedaluwarsa', value: '12 Mei 2027' },
  ];
  return (
    <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMax meet" className="step-scene h-full w-full" data-hot={hot ? '' : undefined}>
      <g transform="rotate(3 190 160)">
        <rect x="92" y="12" width="206" height="250" rx="18" fill={SURFACE} stroke={LINE} />
        {rows.map((row, i) => {
          const y = 34 + i * 62;
          return (
            <g key={row.label}>
              <text x="110" y={y + 4} fontSize="11" fontWeight="600" fill={MUTED} style={TEXT}>{row.label}</text>
              <rect
                x="108"
                y={y + 12}
                width="174"
                height="34"
                rx="10"
                fill={row.value ? '#fbfbf6' : undefined}
                stroke={row.value ? LINE : undefined}
                className={row.value ? undefined : 'step-field'}
              />
              {row.value ? (
                <text x="120" y={y + 34} fontSize="13.5" fontWeight="600" fill={INK} style={TEXT}>{row.value}</text>
              ) : (
                <>
                  <g className="step-before">
                    <text x="120" y={y + 34} fontSize="13.5" fontWeight="600" fill={INK} style={TEXT}>
                      25<tspan fill="var(--color-gold-deep)" textDecoration="underline">O</tspan> g
                    </text>
                    <text x="270" y={y + 34} fontSize="11" fontWeight="700" fill="var(--color-gold-deep)" textAnchor="end" style={TEXT}>Cek lagi</text>
                  </g>
                  <g className="step-after">
                    <text x="120" y={y + 34} fontSize="13.5" fontWeight="600" fill={INK} style={TEXT}>250 g</text>
                    <circle cx="262" cy={y + 29} r="8" fill="var(--color-success)" />
                    <path d={`m258.5 ${y + 29} 2.5 2.5 4.5-5`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Langkah 3: daftar periksa; saat disorot tanda status muncul satu per satu beserta pasalnya. */
function SceneHasil({ hot }: { hot: boolean }) {
  const rows = [
    { text: 'Nama jenis pangan', ok: true, pasal: null },
    { text: 'Berat bersih', ok: true, pasal: null },
    { text: 'Kalimat alergen', ok: false, pasal: 'Pasal 49' },
    { text: 'Urutan bahan', ok: false, pasal: null },
  ];
  return (
    <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMax meet" className="step-scene h-full w-full" data-hot={hot ? '' : undefined}>
      <g transform="rotate(-3 150 160)">
        <rect x="24" y="12" width="210" height="250" rx="18" fill={SURFACE} stroke={LINE} />
        <text x="42" y="40" fontSize="13" fontWeight="700" fill={INK} style={TEXT}>Hasil periksa</text>
        <rect x="42" y="50" width="104" height="20" rx="10" fill="var(--color-danger-tint)" />
        <text x="52" y="64" fontSize="10.5" fontWeight="700" fill="var(--color-danger-ink)" style={TEXT}>2 perlu dibetulkan</text>
        {rows.map((row, i) => {
          const y = 92 + i * 36;
          return (
            <g key={row.text}>
              {i > 0 && <path d={`M42 ${y - 18}h174`} stroke={LINE} />}
              <g className="step-badge" style={{ transformOrigin: `52px ${y}px`, animationDelay: `${i * 90}ms` }}>
                <circle cx="52" cy={y} r="9" fill={row.ok ? 'var(--color-success)' : 'var(--color-danger)'} />
                {row.ok ? (
                  <path d={`m48 ${y} 3 3 5-6`} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d={`M52 ${y - 4.5}v5m0 3.5v.2`} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                )}
              </g>
              <text x="70" y={y + 4.5} fontSize="12" fontWeight="600" fill={INK} style={TEXT}>{row.text}</text>
              {row.pasal && (
                <g className="step-pop" style={{ transformOrigin: `196px ${y}px` }}>
                  <rect x="166" y={y - 12} width="60" height="24" rx="12" fill={INK} />
                  <text x="196" y={y + 4} fontSize="10.5" fontWeight="700" fill={SURFACE} textAnchor="middle" style={TEXT}>{row.pasal}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
