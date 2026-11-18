import { cn } from '@/lib/cn';

export type TilikMood = 'idle' | 'thinking' | 'explaining' | 'alert' | 'happy';

export function TilikMascot({
  mood = 'idle',
  size = 72,
  animated = true,
  className,
}: {
  mood?: TilikMood;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={cn('tilik-mascot shrink-0', className)}
      data-mood={mood}
      data-animated={animated ? '' : undefined}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <ellipse className="tilik-mascot__shadow" cx="46" cy="86" rx="29" ry="4.5" fill="var(--color-brand-deep)" opacity=".2" />
      <g className="tilik-mascot__body" stroke="var(--color-ink)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 65v10q0 5-5 5h-4m29-15v10q0 5 5 5h4" strokeWidth="3.5" />
        <g className="tilik-mascot__wave" strokeWidth="3.2">
          <path d="M18 48q-9 0-11-9m0 0-2-3m2 3 2-4" />
        </g>
        <path d="M59 56q9 4 15-4" strokeWidth="3.5" />

        <path
          d="M25 16h24c4 0 7.4 1.4 10.2 4.2l13.6 13.6a9.8 9.8 0 0 1 0 13.8L59.2 61.2A14.4 14.4 0 0 1 49 65.5H25A11.5 11.5 0 0 1 13.5 54V27.5A11.5 11.5 0 0 1 25 16Z"
          fill="var(--color-action)"
          strokeWidth="2.8"
        />
        <path d="M21 27q0-4 5-4h14" stroke="var(--color-surface)" strokeWidth="2.7" />
        <circle cx="63.5" cy="34" r="3.7" fill="var(--color-brand)" stroke="none" />
        <circle cx="63.5" cy="33.4" r="1.5" fill="var(--color-brand-tint)" stroke="none" />
        <path d="M23 59h9" stroke="var(--color-brand)" strokeWidth="2.2" />

        <g className="tilik-mascot__eyes">
          {mood === 'happy' ? (
            <path d="M27 37q3-5 6 0m11 0q3-5 6 0" strokeWidth="2.8" />
          ) : (
            <g fill="var(--color-ink)" stroke="none">
              <ellipse cx="30" cy="37" rx="2.5" ry="3.65" />
              <ellipse cx="47" cy="37" rx="2.5" ry="3.65" />
            </g>
          )}
        </g>
        {mood === 'thinking' && <path d="M44 30l6-1.5" strokeWidth="1.9" />}
        {mood === 'alert' && <path d="m27 30 5-2m13 0 5 2" strokeWidth="1.9" />}
        <path d="M23 44h3m25 0h3" stroke="var(--color-gold)" strokeWidth="2.7" />
        {mood === 'alert' ? (
          <ellipse cx="38.5" cy="46.5" rx="2.5" ry="3.4" strokeWidth="2" />
        ) : mood === 'thinking' ? (
          <path d="M36 47h5" strokeWidth="2.2" />
        ) : (
          <path d="M34 45q4.5 5 9 0" strokeWidth="2.2" />
        )}

        <g className="tilik-mascot__lens">
          <path d="m79 57 9 13" strokeWidth="7.7" />
          <path d="m79 57 9 13" stroke="var(--color-gold)" strokeWidth="3.7" />
          <circle cx="73.5" cy="48.5" r="12.5" fill="var(--color-brand-tint)" strokeWidth="2.9" />
          <path d="M67 45q2-3 6-3" stroke="var(--color-surface)" strokeWidth="2.6" />
          <path d="m69.5 50 2.8 2.8 5.5-6" stroke="var(--color-brand)" strokeWidth="2.5" />
          <path d="M80 23v8m-4-4h8m4 9h4m-2-2v4" stroke="var(--color-gold)" strokeWidth="2.2" />
        </g>
      </g>
    </svg>
  );
}
