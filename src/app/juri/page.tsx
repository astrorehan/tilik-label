import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { JudgeDemo, type JudgeIntroSample } from '@/components/juri/JudgeDemo';
import { Navbar } from '@/components/Navbar';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

export const metadata: Metadata = {
  title: 'Demo juri',
  description: 'Coba pemeriksaan label dan pratinjau cetak dengan data kemasan rekaan yang sudah siap.',
};

export default function JudgePage() {
  const introSamples: JudgeIntroSample[] = SAMPLE_LABEL_CASES.map((sample) => ({
    id: sample.id,
    kategori: sample.kategori,
    namaProduk: sample.label.namaProduk,
    komposisi: sample.label.daftarBahanTeks.replace(/^Komposisi:\s*/i, ''),
    kedaluwarsa: sample.label.kedaluwarsaTeks,
  }));

  return (
    <div className="cetak-root flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="page-shell flex-1 py-6 sm:py-10">
        <JudgeDemo introSamples={introSamples} />
      </main>
      <Footer />
    </div>
  );
}

