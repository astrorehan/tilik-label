'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Logo } from '@/components/brand/logo';
import { Icon } from '@/components/icons/icon';

const NAV_LINKS = [
  { href: '/contoh', label: 'Contoh hasil' },
  { href: '/produk', label: 'Produk saya' },
  { href: '/nilai-gizi', label: 'Nilai gizi' },
  { href: '/aturan', label: 'Aturan label' },
];

// Lewat dari jarak gulir ini, bilah atas berubah jadi pil putih yang melayang.
const SCROLL_THRESHOLD = 24;

// Tiap huruf diberi jaraknya dari tengah kata, jadi saat disorot huruf membesar
// mulai dari tengah lalu merambat ke kedua ujung bersamaan.
function Letters({ text }: { text: string }) {
  const middle = (text.length - 1) / 2;
  return (
    <span className="topbar-letters" aria-hidden="true">
      {[...text].map((ch, i) => (
        <span key={i} className="topbar-ch" style={{ '--d': Math.abs(i - middle) } as CSSProperties}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 64rem)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      id="site-header"
      className="topbar"
      data-scrolled={scrolled || menuOpen ? '' : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          toggleRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <div className="topbar-frame">
        <div className="topbar-shell">
          <Link href="/" className="topbar-logo" aria-label="Tilik Label, beranda" onClick={() => setMenuOpen(false)}>
            <Logo />
          </Link>

          {/* Kelompok tengah: saat satu tautan membesar, kelompoknya tetap di tengah,
              jadi tautan yang disorot diam di tempat dan tetangganya bergeser. */}
          <nav aria-label="Navigasi utama" className="topbar-links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                aria-current={pathname === link.href ? 'page' : undefined}
                className="topbar-link"
              >
                <Letters text={link.label} />
              </Link>
            ))}
          </nav>

          <div className="topbar-end">
            {pathname !== '/periksa' && (
              <Link href="/periksa" className="topbar-cta hidden xs:inline-flex" onClick={() => setMenuOpen(false)}>
                Periksa label
              </Link>
            )}
            <button
              type="button"
              ref={toggleRef}
              className="grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-paper-deep active:bg-paper-deep lg:hidden"
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={23} key={String(menuOpen)} className="mobile-nav-icon" />
            </button>
          </div>
        </div>

        <nav
          id="mobile-nav"
          aria-label="Navigasi seluler"
          inert={!menuOpen}
          data-open={menuOpen ? '' : undefined}
          className="mobile-nav space-y-1 rounded-[22px] border border-line bg-surface px-3 py-2 shadow-floating lg:hidden"
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
