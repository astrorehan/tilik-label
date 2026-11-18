import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/icon';

export interface AssistantLaunch {
  open: boolean;
  opener: HTMLButtonElement;
}

function trackMobileViewport(dialog: HTMLDialogElement) {
  const root = document.documentElement;
  const { scrollX, scrollY, visualViewport } = window;
  root.style.setProperty('--tilik-page-top', `${-scrollY}px`);
  root.classList.add('tilik-modal-open');

  const sync = () => {
    const height = visualViewport?.height ?? window.innerHeight;
    dialog.style.setProperty('--tilik-viewport-top', `${visualViewport?.offsetTop ?? 0}px`);
    dialog.style.setProperty('--tilik-viewport-left', `${visualViewport?.offsetLeft ?? 0}px`);
    dialog.style.setProperty('--tilik-viewport-width', `${visualViewport?.width ?? window.innerWidth}px`);
    dialog.style.setProperty('--tilik-viewport-height', `${height}px`);
    dialog.toggleAttribute('data-compact', height < 430);
  };

  sync();
  visualViewport?.addEventListener('resize', sync);
  visualViewport?.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
  return () => {
    visualViewport?.removeEventListener('resize', sync);
    visualViewport?.removeEventListener('scroll', sync);
    window.removeEventListener('resize', sync);
    dialog.removeAttribute('data-compact');
    root.classList.remove('tilik-modal-open');
    root.style.removeProperty('--tilik-page-top');
    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
  };
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
  const { open, opener } = launch;
  const openerRef = useRef(opener);

  useLayoutEffect(() => {
    if (open && dialogRef.current?.open && openerRef.current !== opener) {
      closeButtonRef.current?.focus({ preventScroll: true });
    }
    openerRef.current = opener;
  }, [open, opener]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    const desktop = window.matchMedia('(min-width: 64rem)');
    let releaseViewport: (() => void) | undefined;
    const syncMode = () => {
      if (dialog.open) dialog.close();
      releaseViewport?.();
      releaseViewport = desktop.matches ? undefined : trackMobileViewport(dialog);
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
      releaseViewport?.();
      if (focusWasInside) openerRef.current.focus({ preventScroll: true });
    };
  }, [open]);

  // Dialog baru dipasang setelah peluncur diklik dan tetap hidup ketika ditutup.
  return createPortal(
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={`${id}-title`}
      closedby="closerequest"
      className="assistant-drawer fixed z-50 m-0 max-h-none max-w-none flex-col overflow-hidden overscroll-none border border-line bg-surface p-0 text-ink shadow-floating open:flex print:hidden"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || !event.currentTarget.matches(':modal')) return;
        const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onClose();
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
