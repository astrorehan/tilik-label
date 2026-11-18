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
  searchParams: Promise<{ produk?: string | string[]; step?: string | string[] }>;
}) {
  const { produk, step } = await searchParams;
  const produkId = typeof produk === 'string' && produk.length > 0 ? produk : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <main
        id="main-content"
        className="page-shell max-w-[58rem] flex-1 py-6 sm:py-10"
      >
        <PeriksaEntryClient produkId={produkId} initialStep={step === 'isi' ? 'isi' : 'hasil'} />
      </main>

      <Footer />
    </div>
  );
}
