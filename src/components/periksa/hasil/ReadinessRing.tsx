import type { CSSProperties } from 'react';

export interface RingSegment {
  key: string;
  value: number;
  color: string;
  label: string;
}

const SIZE = 184;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 5;

/**
 * Cincin bersegmen: tiap warna mewakili satu kelompok temuan. Busur tumbuh
 * berurutan saat pertama tampil.
 */
export function ReadinessRing({
  segments,
  total,
  value,
  caption,
}: {
  segments: RingSegment[];
  total: number;
  value: number;
  caption: string;
}) {
  const visible = segments.filter((segment) => segment.value > 0);
  const lengths = visible.map((segment) => (segment.value / total) * CIRCUMFERENCE);
  const offsets = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, value) => sum + value, 0));
  const description = segments.map((segment) => `${segment.value} ${segment.label.toLowerCase()}`).join(', ');

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${value} dari ${total} aturan terpenuhi: ${description}.`}
        className="-rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgb(36 41 31 / 0.08)"
          strokeWidth={STROKE}
        />
        {visible.map((segment, index) => {
          const length = lengths[index] ?? 0;
          const drawn = Math.max(0, length - (visible.length > 1 ? GAP : 0));
          const style = {
            '--c': `${CIRCUMFERENCE}px`,
            strokeDasharray: `${drawn} ${CIRCUMFERENCE}`,
            strokeDashoffset: -(offsets[index] ?? 0),
            animationDelay: `${180 + index * 220}ms`,
          } as CSSProperties;
          return (
            <circle
              key={segment.key}
              className="ring-seg"
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeLinecap={drawn > STROKE ? 'round' : 'butt'}
              style={style}
            />
          );
        })}
      </svg>
      <div aria-hidden className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-label text-[2.75rem] leading-none font-bold tracking-tight text-ink">
            {value}
            <span className="text-xl font-semibold text-ink-3">/{total}</span>
          </p>
          <p className="mx-auto mt-1.5 max-w-[7.5rem] text-xs leading-tight font-semibold text-ink-2">{caption}</p>
        </div>
      </div>
    </div>
  );
}
