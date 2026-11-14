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
    <div className="min-h-[100dvh] bg-paper text-ink">
      <Navbar />

      <main id="main-content" className="mx-auto max-w-[84rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div className="max-w-2xl">
            <p className="type-eyebrow">Peraturan BPOM 10/2026</p>
            <h1 className="type-h1 mt-1.5 text-ink">Tabel nilai gizi</h1>
            <p className="mt-2.5 text-base leading-relaxed text-ink-2">
              Bingung dari mana angka tabel gizi didapat? Berikut tiga jalan yang disebut aturan
              untuk usaha mikro, apa syaratnya, dan apa yang bisa kamu siapkan lebih dulu.
            </p>
          </div>
          <ButtonLink href={OFFICIAL_TEXT} size="md" icon="external" variant="secondary" target="_blank" rel="noopener noreferrer">
            Baca teks resmi (PDF)
            <span className="sr-only"> (membuka tab baru)</span>
          </ButtonLink>
        </header>

        <NutritionGuide />
      </main>

      <Footer />
    </div>
  );
}
