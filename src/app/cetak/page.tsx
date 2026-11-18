import type { Metadata } from 'next';
import { CetakClient } from '@/components/cetak/CetakClient';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Label perbaikan dan ringkasan',
  description:
    'Label teks siap cetak dan satu lembar ringkasan temuan, bisa disimpan sebagai PDF lewat cetak peramban.',
};

export default async function CetakPage({
  searchParams,
}: {
  searchParams: Promise<{ produk?: string | string[] }>;
}) {
  const { produk } = await searchParams;
  const produkId = typeof produk === 'string' && produk.length > 0 ? produk : undefined;

  return (
    <div className="cetak-root flex min-h-dvh flex-col">
      <Navbar />

      <main
        id="main-content"
        className="page-shell max-w-[60rem] flex-1 space-y-8 py-8 sm:py-12"
      >
        <CetakClient produkId={produkId} />
      </main>

      <Footer />
    </div>
  );
}
