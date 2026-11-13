import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { SampleSelectorClient } from '@/components/SampleSelectorClient';
import { ButtonLink } from '@/components/ui/button';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

export default function ContohPage() {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <Navbar />

      <main id="main-content" className="mx-auto max-w-[84rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div className="max-w-2xl">
            <p className="type-eyebrow">Contoh rekaan untuk juri</p>
            <h1 className="type-h1 mt-1.5 text-ink">
              Lihat cara aturan bekerja pada tiga contoh label
            </h1>
            <p className="mt-2.5 text-base leading-relaxed text-ink-2">
              Ketiga produk di bawah adalah data rekaan. Pilih salah satu untuk melihat bagaimana
              20 butir Peraturan BPOM 31/2018 memeriksa isi label tanpa perlu memotret.
            </p>
          </div>
          <ButtonLink href="/periksa" size="md" icon="scan">
            Coba dengan label sendiri
          </ButtonLink>
        </header>

        <SampleSelectorClient cases={SAMPLE_LABEL_CASES} />
      </main>

      <Footer />
    </div>
  );
}
