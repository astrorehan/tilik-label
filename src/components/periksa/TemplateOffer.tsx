import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Tawaran isi cepat di mode juri. Muncul di formulir yang sama dengan pengguna
 * biasa, hanya saat foto berasal dari kemasan contoh yang datanya sudah disiapkan.
 */
export function TemplateOffer({
  title,
  children,
  actionLabel,
  onUse,
  done = false,
}: {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onUse?: () => void;
  /** Data contoh sudah terpakai; tawaran berubah jadi keterangan. */
  done?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Data contoh juri"
      className="panel flex flex-wrap items-center gap-x-3.5 gap-y-3 p-4 sm:flex-nowrap sm:p-5"
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-[13px]',
          done ? 'bg-success-tint text-success-ink' : 'bg-brand-tint text-brand-deep',
        )}
      >
        <Icon name={done ? 'check' : 'document'} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {title}
          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[0.6875rem] leading-none font-bold tracking-wide text-brand-deep uppercase">
            Juri
          </span>
        </p>
        <p className="mt-0.5 text-sm leading-snug text-ink-2">{children}</p>
      </div>
      {actionLabel && onUse && (
        <Button size="md" variant={done ? 'secondary' : 'primary'} className="w-full shrink-0 sm:w-auto" onClick={onUse}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
