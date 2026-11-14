'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { Logo } from '@/components/brand/logo';
import { Icon } from '@/components/icons/icon';
import { Button, ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/contoh', label: 'Contoh juri' },
  { href: '/periksa', label: 'Periksa label' },
  { href: '/produk', label: 'Produk saya' },
  { href: '/aturan', label: 'Aturan' },
];

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

function useScrolledPast(offset: number) {
  return useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > offset,
    () => false,
  );
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const scrolled = useScrolledPast(20);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 transition-[background-color,box-shadow,border-color] duration-200',
        scrolled
          ? 'border-b border-line bg-surface/90 backdrop-blur-md'
          : 'border-b border-transparent bg-surface',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.75rem] lg:px-8">
        <Link href="/" className="-ml-1 shrink-0 p-1" aria-label="Tilik Label, beranda">
          <Logo />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-brand-tint text-brand-deep'
                    : 'text-ink-2 hover:bg-paper hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/periksa" size="md" icon="scan">
            Periksa label saya
          </ButtonLink>
        </div>

        <Button
          variant="ghost"
          size="md"
          icon={menuOpen ? 'close' : 'menu'}
          className="md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? 'Tutup' : 'Menu'}
        </Button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Navigasi seluler"
          className="border-t border-line bg-surface px-4 pb-5 pt-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex min-h-12 items-center justify-between rounded-[14px] px-3.5 text-base font-semibold',
                    active
                      ? 'bg-brand-tint text-brand-deep'
                      : 'text-ink hover:bg-paper',
                  )}
                >
                  {link.label}
                  <Icon name="chevronRight" size={20} className="text-ink-3" />
                </Link>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-line">
            <ButtonLink
              href="/periksa"
              block
              size="lg"
              icon="scan"
              onClick={() => setMenuOpen(false)}
            >
              Periksa label saya
            </ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
