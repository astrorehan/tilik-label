import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { PeriksaFlowClient } from '@/components/periksa/PeriksaFlowClient';

export const metadata: Metadata = {
  title: 'Periksa label',
};

export default function PeriksaPage() {
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

        <PeriksaFlowClient />
      </main>

      <Footer />
    </div>
  );
}
