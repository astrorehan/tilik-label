import Image from 'next/image';
import Link from 'next/link';
import { TilikFooterSpot } from '@/components/beranda/TilikFooterSpot';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

const APPROVAL_NOTE = 'Pengesahan label tetap mengikuti penilaian instansi berwenang.';

const REFERENCE_LINKS = [
  { href: '/aturan', label: 'Aturan dan batasan' },
  { href: '/nilai-gizi', label: 'Tabel nilai gizi' },
  { href: '/mcp', label: 'MCP untuk agen' },
];

const FOOTER_GROUPS = [
  {
    title: 'Pemeriksaan',
    links: [
      { href: '/periksa', label: 'Periksa label' },
      { href: '/contoh', label: 'Contoh hasil' },
      { href: '/juri', label: 'Demo juri' },
      { href: '/produk', label: 'Produk saya' },
    ],
  },
  { title: 'Rujukan', links: REFERENCE_LINKS },
];

export function Footer({ illustrated = false }: { illustrated?: boolean }) {
  return (
    <footer className={cn('shrink-0', illustrated ? 'footer-illustrated below-fold' : 'border-t border-line bg-surface')}>
      <div className={cn(
        'page-shell',
        illustrated
          ? 'grid gap-6 pt-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] sm:gap-10 sm:pt-9'
          : 'flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:py-6',
      )}>
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center" aria-label="Tilik Label, beranda">
            <Logo />
          </Link>
          {illustrated ? (
            <p className="max-w-[18rem] text-sm text-ink-2">
              Pemeriksa label kemasan untuk usaha pangan rumahan.
            </p>
          ) : (
            <p className="text-sm text-ink-2">{APPROVAL_NOTE}</p>
          )}
        </div>
        {illustrated ? (
          <nav aria-label="Navigasi footer" className="grid grid-cols-2 gap-x-5 sm:gap-x-8">
            {FOOTER_GROUPS.map(({ title, links }) => (
              <div key={title}>
                <h2 className="text-[0.8125rem] font-semibold tracking-[0.08em] text-ink-3 uppercase">
                  {title}
                </h2>
                <ul className="mt-1">
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      <Link href={href} className="inline-flex min-h-11 items-center text-[0.9375rem] text-ink underline-offset-4 hover:underline">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        ) : (
          <nav aria-label="Panduan dan rujukan" className="flex flex-wrap gap-x-5">
            {REFERENCE_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="action-link">{label}</Link>
            ))}
          </nav>
        )}
      </div>
      {illustrated && (
        <div className="footer-scene">
          <Image
            src="/visual/teras-label.webp"
            alt=""
            fill
            unoptimized
            fetchPriority="low"
            sizes="100vw"
            className="footer-scene-image"
          />
          <p className="footer-scene-note">{APPROVAL_NOTE}</p>
          <TilikFooterSpot />
        </div>
      )}
    </footer>
  );
}
