'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { Icon } from '@/components/icons/icon';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { href: '/contoh', label: 'Contoh hasil' },
  { href: '/produk', label: 'Produk saya' },
  { href: '/aturan', label: 'Panduan' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  return (
    <header
      className="page-shell sticky top-0 z-30 pt-2 sm:pt-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <div className="glass site-nav">
        <div className="flex min-h-15 items-center justify-between gap-2 px-3 sm:min-h-16 sm:gap-4 sm:px-5">
          <Link href="/" className="inline-flex min-h-11 shrink-0 items-center" aria-label="Tilik Label, beranda" onClick={() => setMenuOpen(false)}>
            <Logo />
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className="nav-link"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {pathname !== '/periksa' && (
              <div className="hidden xs:block">
                <ButtonLink href="/periksa" size="md" onClick={() => setMenuOpen(false)}>
                  Periksa label
                </ButtonLink>
              </div>
            )}
            <button
              type="button"
              ref={toggleRef}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-paper-deep md:hidden"
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={23} />
            </button>
          </div>
        </div>

        <nav
          id="mobile-nav"
          aria-label="Navigasi seluler"
          className={cn('space-y-1 border-t border-line px-3 py-2 md:hidden', !menuOpen && 'hidden')}
        >
          {pathname !== '/periksa' && (
            <Link href="/periksa" className="nav-link flex justify-between xs:hidden" onClick={() => setMenuOpen(false)}>
              Periksa label <Icon name="scan" size={18} />
            </Link>
          )}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
              className="nav-link flex justify-between"
            >
              {link.label}
              <Icon name="chevronRight" size={18} />
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
