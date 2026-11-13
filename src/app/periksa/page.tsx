import { Footer } from '@/components/Footer';
import { ManualCheckerClient } from '@/components/ManualCheckerClient';
import { Navbar } from '@/components/Navbar';

export default function PeriksaPage() {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <Navbar />

      <main id="main-content" className="mx-auto max-w-[84rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="max-w-2xl border-b border-line pb-6">
          <p className="type-eyebrow">Formulir pemeriksaan</p>
          <h1 className="type-h1 mt-1.5 text-ink">Periksa isi label</h1>
          <p className="mt-2.5 text-base leading-relaxed text-ink-2">
            Masukkan isi label secara langsung untuk mengecek 20 butir Peraturan BPOM 31/2018.
            Pembacaan otomatis dari foto kemasan dan penentu jalur izin akan tersambung ke formulir
            yang sama ini.
          </p>
        </header>

        <ManualCheckerClient />
      </main>

      <Footer />
    </div>
  );
}
