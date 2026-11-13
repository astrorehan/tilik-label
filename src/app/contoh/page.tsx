import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { SampleSelectorClient } from '@/components/SampleSelectorClient';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

export default function ContohPage() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-6">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-800">
              Contoh rekaan
            </span>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Lihat cara aturan bekerja pada tiga contoh label
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Ketiga produk di bawah adalah data rekaan. Pilih salah satu untuk melihat bagaimana
              20 butir Peraturan BPOM 31/2018 memeriksa isi label tanpa perlu memotret.
            </p>
          </div>
          <Link
            href="/periksa"
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:bg-emerald-800 active:scale-[0.98]"
          >
            Coba dengan label sendiri
          </Link>
        </div>

        <SampleSelectorClient cases={SAMPLE_LABEL_CASES} />
      </main>
    </div>
  );
}
