import Image from 'next/image';
import { Icon } from '@/components/icons/icon';
import { SAMPLE_PHOTOS, samplePhotoUrl } from '@/components/periksa/SamplePhotos';
import { ButtonLink } from '@/components/ui/button';
import { buildCorrectedLabel } from '@/domain/correctedLabel';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';
import { TilikGuide } from './TilikGuide';

export function ExampleResult() {
  const sample = SAMPLE_LABEL_CASES.find(({ id }) => id === 'sambal-bawang-rumahan');
  if (!sample) return null;
  const photo = SAMPLE_PHOTOS.find(({ caseId }) => caseId === sample.id);
  const corrected = buildCorrectedLabel(sample.label, sample.answers);

  return (
    <section aria-labelledby="contoh-beranda-judul" className="page-shell py-10 sm:py-14 lg:py-20">
      <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="min-w-0 space-y-5">
          <div>
            <h2 id="contoh-beranda-judul" className="type-h1 max-w-[19ch]">Koreksi label sebelum telanjur cetak.</h2>
            <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-ink-2 sm:text-lg">
              Penulisan kedaluwarsa, urutan bahan, atau klaim pada kemasan bisa terlewat saat mendesain stiker.
              Periksa drafnya sebelum memesan cetak.
            </p>
          </div>
          <TilikGuide className="max-w-lg" />
        </div>

        <figure className="glass-float min-w-0 space-y-4 rounded-[28px] p-4 sm:p-6">
          <figcaption className="flex items-center gap-3.5">
            {photo && (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-[14px] border border-line bg-paper-deep sm:size-20">
                <Image src={samplePhotoUrl(photo)} alt="" fill sizes="80px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-2">Contoh pemeriksaan · Kemasan rekaan</p>
              <p className="mt-1 font-label text-xl leading-tight font-semibold text-ink">{sample.label.namaProduk}</p>
            </div>
          </figcaption>

          <div className="grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.35fr)]">
            <div className="space-y-1 rounded-[18px] border border-line bg-surface/75 px-4 py-3.5">
              <p className="text-xs font-semibold text-ink-2">Di kemasan</p>
              <p className="wrap-anywhere font-semibold text-ink">{sample.label.kedaluwarsaTeks}</p>
            </div>
            <Icon name="arrowRight" size={20} className="mx-auto rotate-90 self-center text-brand sm:rotate-0" />
            <div className="space-y-1 rounded-[18px] border border-brand/25 bg-brand-tint px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-deep"><Icon name="check" size={14} /> Label perbaikan</p>
              <p className="wrap-anywhere font-semibold text-ink">{corrected.data.kedaluwarsaTeks}</p>
            </div>
          </div>

          <ButtonLink href="/contoh" size="md" variant="secondary" iconAfter="arrowRight">Lihat contoh hasil</ButtonLink>
        </figure>
      </div>
    </section>
  );
}
