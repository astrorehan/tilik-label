import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { ProductListClient } from '@/components/produk/ProductListClient';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Produk saya',
  description:
    'Daftar produk dan hasil pemeriksaan label yang tersimpan di perangkat ini. Tanpa akun, tanpa server.',
};

export default function ProdukPage() {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <Navbar />

      <main id="main-content" className="mx-auto max-w-[84rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div className="max-w-2xl">
            <p className="type-eyebrow">Tersimpan di perangkat ini</p>
            <h1 className="type-h1 mt-1.5 text-ink">Produk saya</h1>
            <p className="mt-2.5 text-base leading-relaxed text-ink-2">
              Buka lagi produk yang pernah diperiksa. Status tiap label dihitung ulang setiap kali
              halaman ini dibuka, jadi selalu sesuai aturan terbaru.
            </p>
          </div>
          <ButtonLink href="/periksa" size="md" icon="scan">
            Periksa label baru
          </ButtonLink>
        </header>

        <ProductListClient />
      </main>

      <Footer />
    </div>
  );
}
