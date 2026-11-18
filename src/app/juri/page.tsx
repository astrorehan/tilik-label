import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Icon } from '@/components/icons/icon';
import { Navbar } from '@/components/Navbar';
import { PeriksaEntryClient } from '@/components/periksa/PeriksaEntryClient';
import type { JudgeTemplate } from '@/components/periksa/PeriksaFlowClient';
import { ButtonLink } from '@/components/ui/button';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

export const metadata: Metadata = {
  title: 'Mode juri',
  description:
    'Alur pemeriksaan label yang sama dengan pengguna, dengan kemasan contoh yang tiap langkahnya bisa diisi sekali klik.',
};

export default function JudgePage() {
  const templates: JudgeTemplate[] = SAMPLE_LABEL_CASES.map(({ id, label, answers }) => ({ id, label, answers }));

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="page-shell flex-1 space-y-5 py-6 sm:py-10">
        <section
          aria-label="Mode juri"
          className="panel flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-brand-tint text-brand-deep">
              <Icon name="stamp" size={19} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">Mode juri · Data rekaan</p>
              <p className="mt-0.5 max-w-prose text-sm leading-snug text-ink-2">
                Alurnya sama dengan pengguna. Pilih kemasan contoh, lalu tiap langkah menawarkan isi cepat dari
                datanya. Foto label sendiri juga boleh, kolomnya diisi seperti biasa.
              </p>
            </div>
          </div>
          <ButtonLink href="/contoh" size="md" variant="ghost" iconAfter="arrowRight" className="shrink-0">
            Lihat hasil contoh langsung
          </ButtonLink>
        </section>
        <PeriksaEntryClient judgeTemplates={templates} />
      </main>
      <Footer />
    </div>
  );
}
