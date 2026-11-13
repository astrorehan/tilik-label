import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'quiet'
  | 'ghost'
  | 'danger'
  | 'accent'
  | 'inverted';

export type ButtonSize = 'md' | 'lg' | 'xl';

interface ButtonLookProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  iconAfter?: IconName;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white [--icon-signal:var(--color-gold)] hover:bg-brand-deep disabled:bg-paper-deep disabled:text-ink-3 disabled:shadow-none disabled:[--icon-signal:currentColor] disabled:border disabled:border-line',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-paper disabled:border-line disabled:text-ink-3 disabled:bg-paper',
  quiet:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-paper disabled:text-ink-3 disabled:border-line',
  ghost: 'bg-transparent text-ink hover:bg-paper-deep disabled:text-ink-3',
  accent:
    'bg-ink text-white [--icon-signal:var(--color-gold)] hover:bg-[#163761] disabled:bg-paper-deep disabled:text-ink-3',
  inverted:
    'bg-white text-ink hover:bg-brand-tint [--icon-signal:var(--color-brand)]',
  danger:
    'bg-danger text-white hover:bg-[#7f1c05] disabled:bg-paper-deep disabled:text-ink-3',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 text-sm gap-2 rounded-full',
  lg: 'min-h-13 px-6 text-[1.0625rem] gap-2.5 rounded-full',
  xl: 'min-h-15 px-7 text-lg gap-3 rounded-full',
};

const ICON_SIZE: Record<ButtonSize, number> = { md: 18, lg: 18, xl: 18 };

export function buttonClasses({
  variant = 'primary',
  size = 'lg',
  block = false,
}: ButtonLookProps = {}) {
  return cn(
    'inline-flex select-none items-center justify-center text-center font-semibold leading-tight',
    'transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out',
    'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    block && 'w-full',
  );
}

function ButtonContent({
  icon,
  iconAfter,
  size = 'lg',
  children,
}: ButtonLookProps & { children: ReactNode }) {
  return (
    <>
      {icon && <Icon name={icon} size={ICON_SIZE[size]} className="shrink-0" />}
      <span>{children}</span>
      {iconAfter && <Icon name={iconAfter} size={ICON_SIZE[size]} className="shrink-0" />}
    </>
  );
}

type ButtonProps = ButtonLookProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean };

export function Button({
  variant,
  size,
  block,
  icon,
  iconAfter,
  busy,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-busy={busy || undefined}
      className={cn(
        buttonClasses({ variant, size, block }),
        busy && 'cursor-progress',
        className,
      )}
      {...rest}
    >
      <ButtonContent icon={busy ? 'sync' : icon} iconAfter={iconAfter} size={size}>
        {children}
      </ButtonContent>
    </button>
  );
}

type ButtonLinkProps = ButtonLookProps & ComponentProps<typeof Link>;

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  iconAfter,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses({ variant, size, block }), className)} {...rest}>
      <ButtonContent icon={icon} iconAfter={iconAfter} size={size}>
        {children}
      </ButtonContent>
    </Link>
  );
}
