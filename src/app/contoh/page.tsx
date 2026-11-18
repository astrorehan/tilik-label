import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { SampleSelectorClient, type SampleSelectorEntry } from '@/components/SampleSelectorClient';
import { ButtonLink } from '@/components/ui/button';
import { evaluateLabelRules, evaluatePermitPath } from '@/domain';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

export const metadata: Metadata = { title: 'Contoh pemeriksaan' };

export default function ContohPage() {
  const entries: SampleSelectorEntry[] = SAMPLE_LABEL_CASES.map((sample) => ({
    sample,
    report: evaluateLabelRules(sample.label, sample.answers),
    permit: evaluatePermitPath(sample.label, sample.answers),
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="page-shell flex-1 space-y-6 py-8 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="type-h1">Contoh pemeriksaan</h1>
            <p className="mt-2 text-ink-2">Pilih kemasan rekaan untuk melihat hasil pemeriksaannya.</p>
          </div>
          <ButtonLink href="/juri" size="md" variant="secondary" iconAfter="arrowRight">Demo juri</ButtonLink>
        </header>
        <SampleSelectorClient entries={entries} />
      </main>
      <Footer />
    </div>
  );
}
