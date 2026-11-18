import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { cn } from '@/lib/cn';

export function Disclosure({
  label,
  icon,
  children,
  className,
  ...rest
}: DetailsHTMLAttributes<HTMLDetailsElement> & { label: ReactNode; icon?: IconName }) {
  return (
    <details className={cn('panel group/disclosure', className)} {...rest}>
      <summary className="disclosure-summary font-semibold">
        <span className="flex min-w-0 items-center gap-2.5">
          {icon && <Icon name={icon} size={20} className="shrink-0 text-brand-deep" />}
          {label}
        </span>
        <Icon name="chevronDown" size={19} className="shrink-0 text-ink-3 transition-transform group-open/disclosure:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 pt-4 pb-5 sm:px-5">{children}</div>
    </details>
  );
}
