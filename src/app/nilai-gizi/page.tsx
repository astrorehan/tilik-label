import type { Metadata } from 'next';
import { NutritionGuide } from '@/components/gizi/NutritionGuide';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Tabel nilai gizi',
  description:
    'Penjelasan tiga jalan menyiapkan tabel nilai gizi untuk usaha mikro menurut Peraturan BPOM 10/2026, tanpa angka gizi.',
};

const OFFICIAL_TEXT = 'https://peraturan.go.id/files/peraturan-bpom-no-10-tahun-2026.pdf';

export default function NilaiGiziPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <main id="main-content" className="page-shell max-w-[58rem] flex-1 space-y-8 py-8 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="max-w-2xl">
            <h1 className="type-h1">Tabel nilai gizi</h1>
            <p className="mt-2 text-ink-2">
              Panduan menyiapkan tabel gizi untuk usaha mikro.
            </p>
          </div>
          <ButtonLink href={OFFICIAL_TEXT} size="md" icon="external" variant="secondary" target="_blank" rel="noopener noreferrer">
            Peraturan BPOM 10/2026 (PDF)
            <span className="sr-only"> (membuka tab baru)</span>
          </ButtonLink>
        </header>

        <NutritionGuide />
      </main>

      <Footer />
    </div>
  );
}
