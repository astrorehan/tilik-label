import { Icon } from '@/components/icons/icon';

/** Gambar sederhana kemasan pouch, sisi depan (merek) atau belakang (keterangan label). */
function PouchSketch({ side }: { side: 'depan' | 'belakang' }) {
  const back = side === 'belakang';
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-24 w-auto"
      aria-hidden
      focusable="false"
    >
      <path
        d="M30 14h60a6 6 0 0 1 6 6v80c0 6-5 10-11 10H35c-6 0-11-4-11-10V20a6 6 0 0 1 6-6z"
        fill="var(--color-paper-deep)"
        stroke="var(--color-line-strong)"
        strokeWidth="1.5"
      />
      <path
        d="M24 26h72"
        stroke="var(--color-line-strong)"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      {back ? (
        <>
          <rect
            x="34"
            y="36"
            width="52"
            height="60"
            rx="3"
            fill="var(--color-surface)"
          />
          {[44, 51, 58, 65, 72, 79, 86].map((y, i) => (
            <rect
              key={y}
              x="39"
              y={y}
              width={i % 3 === 2 ? 28 : 42}
              height="3"
              rx="1.5"
              fill="var(--color-ink-3)"
            />
          ))}
          {/* Sudut bingkai kamera. */}
          <path
            d="M26 40v-10h10M94 40v-10H84M26 92v10h10M94 92v10H84"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="60" cy="56" r="14" fill="var(--color-brand-soft)" />
          <rect
            x="38"
            y="78"
            width="44"
            height="7"
            rx="3.5"
            fill="var(--color-ink-3)"
          />
          <rect
            x="46"
            y="90"
            width="28"
            height="4"
            rx="2"
            fill="var(--color-line-strong)"
          />
        </>
      )}
    </svg>
  );
}

const TIPS = [
  'Seluruh tulisan label masuk bingkai, sampai ke tepinya.',
  'Cahaya terang dan rata. Bila kemasannya plastik mengilap, miringkan sedikit supaya pantulan lampu tidak menutupi tulisan.',
  'Bila keterangan tersebar di beberapa sisi, foto sisi yang tulisannya paling banyak. Sisanya bisa kamu isi sendiri di langkah berikutnya.',
];

/** Panduan singkat bagian kemasan yang perlu difoto. */
export function PhotoGuide() {
  return (
    <section
      aria-labelledby="panduan-foto-judul"
      className="panel space-y-4 p-4 sm:p-5"
    >
      <h2 id="panduan-foto-judul" className="text-base font-semibold text-ink">
        Bagian kemasan mana yang difoto?
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <figure className="flex flex-col items-center gap-2 rounded-[16px] border border-line bg-paper p-3 text-center">
          <PouchSketch side="depan" />
          <figcaption className="text-sm leading-snug text-ink-2">
            <span className="block font-semibold text-ink-2">
              Bukan sisi depan
            </span>
            Biasanya hanya berisi nama dan merek.
          </figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-2 rounded-[16px] border-2 border-brand bg-brand-tint/50 p-3 text-center">
          <PouchSketch side="belakang" />
          <figcaption className="text-sm leading-snug text-ink-2">
            <span className="block font-semibold text-brand-deep">
              Foto sisi ini
            </span>
            Tempat komposisi, berat bersih, produsen, P-IRT, dan tanggal.
          </figcaption>
        </figure>
      </div>

      <ul className="space-y-2">
        {TIPS.map((tip) => (
          <li
            key={tip}
            className="flex gap-2.5 text-sm leading-snug text-ink-2"
          >
            <Icon
              name="check"
              size={18}
              className="mt-0.5 shrink-0 text-brand"
            />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
