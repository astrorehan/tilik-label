import { cn } from '@/lib/cn';

type LogoTone = 'ink' | 'paper';

const TONE_CLASS: Record<LogoTone, string> = {
  ink: 'text-ink',
  paper: 'text-paper',
};

export function LogoMark({
  tone = 'ink',
  className,
  title,
}: {
  tone?: LogoTone;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      className={cn(TONE_CLASS[tone], className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        fill="currentColor"
        d="M5 9.5A4.5 4.5 0 0 1 9.5 5h12.2a4.5 4.5 0 0 1 3.18 1.32l6.8 6.8a4.5 4.5 0 0 1 0 6.36l-6.8 6.8A4.5 4.5 0 0 1 21.7 31H9.5A4.5 4.5 0 0 1 5 26.5V9.5Z"
      />
      <circle cx="23.5" cy="18" r="3.4" fill="var(--color-gold)" />
      <path
        d="M10.5 14h6.5M10.5 18h5M10.5 22h7.5"
        stroke="var(--color-surface)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  tone = 'ink',
  className,
}: {
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', TONE_CLASS[tone], className)}>
      <LogoMark tone={tone} className="h-7 w-7 shrink-0" />
      <span className="font-label text-[1.25rem] font-bold leading-none tracking-[-0.03em]">
        Tilik Label
      </span>
    </span>
  );
}
