import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/55">
      <div className="page-shell flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 sm:py-6">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center" aria-label="Tilik Label, beranda">
            <Logo />
          </Link>
          <p className="text-sm text-ink-2">Pengesahan label tetap mengikuti penilaian instansi berwenang.</p>
        </div>
        <nav aria-label="Panduan dan rujukan" className="flex flex-wrap gap-x-5">
          <Link href="/aturan" className="action-link">Aturan dan batasan</Link>
          <Link href="/nilai-gizi" className="action-link">Tabel nilai gizi</Link>
        </nav>
      </div>
    </footer>
  );
}
