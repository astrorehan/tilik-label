import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { SampleSelectorClient } from '@/components/SampleSelectorClient';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

export const metadata: Metadata = { title: 'Contoh pemeriksaan' };

export default function ContohPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="page-shell flex-1 space-y-6 py-8 sm:py-12">
        <header>
          <h1 className="type-h1">Contoh pemeriksaan</h1>
          <p className="mt-2 text-ink-2">Pilih kemasan rekaan untuk melihat hasil pemeriksaannya.</p>
        </header>
        <SampleSelectorClient cases={SAMPLE_LABEL_CASES} />
      </main>
      <Footer />
    </div>
  );
}
