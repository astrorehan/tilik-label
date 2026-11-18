import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { cn } from '@/lib/cn';

type CardTone = 'surface' | 'paper' | 'deep' | 'ink';

const CARD_TONES: Record<CardTone, string> = {
  surface: 'bg-surface border border-line',
  paper: 'bg-paper border border-transparent',
  deep: 'bg-brand-tint border border-transparent',
  ink: 'bg-ink text-white border border-ink [--icon-signal:var(--color-gold)]',
};

export function Card({
  tone = 'surface',
  emphasis = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[24px]',
        CARD_TONES[tone],
        emphasis && 'border-2 border-brand',
        className,
      )}
      {...rest}
    />
  );
}

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const NOTICE_TONES: Record<NoticeTone, { box: string; title: string; icon: IconName }> = {
  info: { box: 'bg-info-tint border-info/70', title: 'text-info-ink', icon: 'info' },
  warning: { box: 'bg-warning-tint border-[#efc65c]', title: 'text-warning-ink', icon: 'warning' },
  danger: { box: 'bg-danger-tint border-danger/30', title: 'text-danger-ink', icon: 'warning' },
  success: { box: 'bg-success-tint border-success/25', title: 'text-success-ink', icon: 'check' },
  neutral: { box: 'bg-paper border-line', title: 'text-ink', icon: 'info' },
};

export function Notice({
  tone = 'info',
  title,
  icon,
  action,
  className,
  children,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const look = NOTICE_TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn('flex flex-wrap items-start gap-3 rounded-[18px] border p-4 text-ink sm:flex-nowrap', look.box, className)}
    >
      <Icon name={icon ?? look.icon} size={22} className={cn('mt-0.5 shrink-0', look.title)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className={cn('font-semibold leading-snug', look.title)}>{title}</p>}
        {children && <div className="text-sm leading-snug text-ink-2">{children}</div>}
      </div>
      {action && <div className="w-full shrink-0 self-center pl-[34px] sm:w-auto sm:pl-0">{action}</div>}
    </div>
  );
}

export type PillTone = 'neutral' | 'ink' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

const PILL_TONES: Record<PillTone, string> = {
  neutral: 'bg-surface text-ink-2 border-line',
  ink: 'bg-ink text-white border-ink',
  success: 'bg-success-tint text-success-ink border-success/25',
  warning: 'bg-warning-tint text-warning-ink border-warning',
  danger: 'bg-danger-tint text-danger-ink border-danger/30',
  info: 'bg-brand-tint text-brand-deep border-brand-soft',
  gold: 'bg-gold-tint text-gold-deep border-gold/60',
};

export function Pill({
  tone = 'neutral',
  icon,
  dot = false,
  className,
  children,
}: {
  tone?: PillTone;
  icon?: IconName;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-semibold leading-none whitespace-nowrap',
        PILL_TONES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-2 rounded-full bg-current" />}
      {icon && <Icon name={icon} size={15} />}
      {children}
    </span>
  );
}
