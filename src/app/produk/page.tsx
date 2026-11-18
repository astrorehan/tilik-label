import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { ProductListClient } from '@/components/produk/ProductListClient';

export const metadata: Metadata = {
  title: 'Produk saya',
  description:
    'Daftar produk dan hasil pemeriksaan label yang tersimpan di perangkat ini. Tanpa akun, tanpa server.',
};

export default function ProdukPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <main id="main-content" className="page-shell flex-1 space-y-6 py-8 sm:py-12">
        <header>
          <h1 className="type-h1">Produk saya</h1>
          <p className="mt-2 text-ink-2">Buka kembali pemeriksaan yang disimpan di perangkat ini.</p>
        </header>

        <ProductListClient />
      </main>

      <Footer />
    </div>
  );
}
