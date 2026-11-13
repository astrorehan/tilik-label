import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { REGULATION_LAST_READ } from '@/domain';

const FOOTER_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/contoh', label: 'Contoh untuk juri' },
  { href: '/periksa', label: 'Periksa isi label' },
  { href: '/produk', label: 'Produk saya' },
];

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[84rem] flex-col gap-10 px-5 pt-14 sm:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="flex max-w-sm flex-col gap-3">
            <Logo className="self-start" />
            <p className="font-semibold text-ink">Cek dulu, baru cetak.</p>
            <p className="text-sm leading-relaxed text-ink-2">
              Pemeriksa label pangan rumahan terhadap ketentuan Peraturan BPOM sebelum stiker
              dicetak atau diajukan ke Dinas Kesehatan.
            </p>
          </div>

          <nav aria-label="Tautan kaki halaman" className="flex flex-wrap gap-x-8 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-ink-2 transition-colors hover:text-brand-deep"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-6 text-[0.875rem] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Tilik Label adalah alat pemeriksaan awal, bukan pengesahan resmi Dinas Kesehatan atau
            BPOM.
          </p>
          <p className="tabular shrink-0">Aturan terakhir dibaca: {REGULATION_LAST_READ}</p>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="footer-wordmark font-label pointer-events-none mx-auto -mb-[0.14em] mt-8 max-w-[84rem] select-none px-4 text-center text-[clamp(3.25rem,13vw,11rem)] font-bold leading-[0.85] tracking-[-0.04em]"
      >
        Tilik Label
      </p>
    </footer>
  );
}
