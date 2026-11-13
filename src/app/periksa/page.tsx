import { ManualCheckerClient } from '@/components/ManualCheckerClient';
import { Navbar } from '@/components/Navbar';

export default function PeriksaPage() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="max-w-2xl border-b border-stone-200 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Periksa isi label
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Masukkan isi label secara langsung untuk mengecek 20 butir Peraturan BPOM 31/2018.
            Pembacaan otomatis dari foto kemasan dan penentu jalur izin akan tersambung ke formulir
            yang sama ini.
          </p>
        </div>

        <ManualCheckerClient />
      </main>
    </div>
  );
}
