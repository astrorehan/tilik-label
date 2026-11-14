import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { PeriksaEntryClient } from '@/components/periksa/PeriksaEntryClient';

export const metadata: Metadata = {
  title: 'Periksa label',
};

export default async function PeriksaPage({
  searchParams,
}: {
  searchParams: Promise<{ produk?: string | string[] }>;
}) {
  const { produk } = await searchParams;
  const produkId = typeof produk === 'string' && produk.length > 0 ? produk : undefined;

  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <Navbar />

      <main
        id="main-content"
        className="mx-auto max-w-[60rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      >
        <header className="border-b border-line pb-6">
          <p className="type-eyebrow">Periksa label</p>
          <h1 className="type-h1 mt-1.5 text-ink">Cek label sebelum dicetak</h1>
          <p className="mt-2.5 max-w-2xl text-base leading-relaxed text-ink-2">
            Isi keterangan label, jawab beberapa pertanyaan tentang produkmu, lalu lihat jalur izin
            dan 20 butir aturan label BPOM beserta pasalnya. Tidak perlu akun.
          </p>
        </header>

        <PeriksaEntryClient produkId={produkId} />
      </main>

      <Footer />
    </div>
  );
}
