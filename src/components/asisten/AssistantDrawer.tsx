import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/icon';
import { cn } from '@/lib/cn';

export interface AssistantLaunch {
  open: boolean;
  opener: HTMLButtonElement;
}

export function AssistantDrawer({
  id,
  launch,
  onClose,
  children,
}: {
  id: string;
  launch: AssistantLaunch;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const { open, opener } = launch;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    const desktop = window.matchMedia('(min-width: 64rem)');
    const syncMode = () => {
      if (dialog.open) dialog.close();
      if (desktop.matches) dialog.show();
      else dialog.showModal();
      closeButtonRef.current?.focus({ preventScroll: true });
    };

    syncMode();
    desktop.addEventListener('change', syncMode);
    return () => {
      desktop.removeEventListener('change', syncMode);
      const focusWasInside = dialog.contains(document.activeElement);
      dialog.close();
      if (focusWasInside) openerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = opener;
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [open, opener]);

  // Dialog baru dipasang setelah peluncur diklik dan tetap hidup ketika ditutup.
  return createPortal(
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={`${id}-title`}
      closedby="closerequest"
      className={cn(
        'fixed inset-x-0 top-auto bottom-0 z-50 m-0 h-[min(88dvh,46rem)] max-h-none w-full max-w-none rounded-t-[26px]',
        'flex-col overflow-hidden overscroll-contain border border-line bg-surface p-0 text-ink shadow-floating',
        'backdrop:bg-ink/40 open:flex lg:inset-y-4 lg:right-4 lg:left-auto lg:h-auto lg:w-[min(31rem,43vw)] lg:rounded-[26px] print:hidden',
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && event.currentTarget.matches(':modal')) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.currentTarget.matches(':modal')) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="Tutup panel Tilik"
        className="absolute top-3 right-3 grid size-11 place-items-center rounded-full border border-line bg-surface text-brand-deep hover:border-brand hover:bg-paper"
        onClick={onClose}
      >
        <Icon name="close" size={23} />
      </button>
      {children}
    </dialog>,
    document.body,
  );
}
