'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import type { PeriksaFlowInitial } from '@/components/periksa/PeriksaFlowClient';
import { SAMPLE_PHOTOS, samplePhotoDisplayUrl, type SamplePhoto } from '@/components/periksa/SamplePhotos';
import { Button } from '@/components/ui/button';
import type { AdditionalAnswers, LabelData } from '@/domain';
import type { SampleLabelCase } from '@/domain/sampleLabels';
import { cn } from '@/lib/cn';
import type { SavedProduct } from '@/lib/produkSaya';
import styles from './JudgeDemo.module.css';

export interface JudgeIntroSample {
  id: string;
  kategori: string;
  namaProduk: string;
  komposisi: string;
  kedaluwarsa: string;
}

const PeriksaFlowClient = dynamic(() =>
  import('@/components/periksa/PeriksaFlowClient').then((mod) => mod.PeriksaFlowClient),
);
const CetakIsi = dynamic(() => import('@/components/cetak/CetakIsi').then((mod) => mod.CetakIsi));

type DemoView =
  | { kind: 'intro' }
  | { kind: 'periksa'; initial: PeriksaFlowInitial }
  | { kind: 'cetak'; product: SavedProduct };

function LabelScan({ sample, photo }: { sample: JudgeIntroSample; photo?: SamplePhoto }) {
  const rows = [
    ['Nama produk', sample.namaProduk],
    ['Komposisi', sample.komposisi],
    ['Kedaluwarsa', sample.kedaluwarsa],
  ];
  return (
    <div className={styles.scan}>
      <figure className={styles.photo}>
        {photo && (
          <Image
            src={samplePhotoDisplayUrl(photo, 'card')}
            alt={`Kemasan rekaan ${photo.nama}`}
            fill
            preload
            unoptimized
            fetchPriority="high"
            sizes="(min-width: 1024px) 220px, 34vw"
            className="object-cover"
          />
        )}
        <div className={styles.scanBox} aria-hidden="true"><span className={styles.beam} /></div>
      </figure>
      <div className="relative flex min-w-0 flex-col justify-center gap-2.5 sm:gap-3">
        <dl className={styles.rows}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.row}>
              <dt className="text-xs font-semibold text-brand-deep">{label}</dt>
              <dd className="mt-0.5 line-clamp-2 text-sm leading-snug wrap-anywhere font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.stamp}><Icon name="check" size={16} strokeWidth={2.5} /> Data demo siap</p>
      </div>
    </div>
  );
}

export function JudgeDemo({ introSamples }: { introSamples: JudgeIntroSample[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<DemoView>({ kind: 'intro' });
  const sessionRef = useRef<HTMLDivElement>(null);
  const hasNavigated = useRef(false);
  const heldHeight = useRef<{ release: () => void; afterScroll: (smooth: boolean) => void }>(undefined);
  const sample = introSamples[selectedIndex]!;
  const photo = SAMPLE_PHOTOS.find((item) => item.caseId === sample.id);

  useLayoutEffect(() => () => heldHeight.current?.release(), []);

  useLayoutEffect(() => {
    if (!hasNavigated.current) return;
    const selector = view.kind === 'periksa' && view.initial.step === 'isi' ? '#isian-produk-judul' : 'h1';
    const target = sessionRef.current?.querySelector<HTMLElement>(selector) ?? null;
    void import('@/lib/pageFocus').then(({ focusInView }) => {
      const smooth = focusInView(target);
      heldHeight.current?.afterScroll(smooth);
    });
  }, [view]);

  const navigate = async (next: DemoView) => {
    hasNavigated.current = true;
    heldHeight.current?.release();
    const { holdHeightDuringNavigation } = await import('@/lib/pageFocus');
    heldHeight.current = holdHeightDuringNavigation(sessionRef.current);
    setView(next);
  };

  const openInspection = async (step: 'isi' | 'hasil', data?: Pick<SampleLabelCase, 'label' | 'answers'>) => {
    let resolved = data;
    if (!resolved) {
      const { SAMPLE_LABEL_CASES } = await import('@/domain/sampleLabels');
      resolved = SAMPLE_LABEL_CASES[selectedIndex]!;
    }
    await navigate({
      kind: 'periksa',
      initial: { label: resolved.label, answers: resolved.answers, step, farthestStep: 'hasil' },
    });
  };

  const openPrint = (label: LabelData, answers: AdditionalAnswers) => {
    const now = new Date().toISOString();
    void navigate({
      kind: 'cetak',
      product: { id: sample.id, nama: label.namaProduk.trim() || 'Label demo', label, answers, dibuatPada: now, diperbaruiPada: now },
    });
  };

  return (
    <div ref={sessionRef} className="space-y-5 print:space-y-0">
      {view.kind === 'intro' ? (
        <>
          <section aria-labelledby="juri-judul" className="glass-float grid items-center gap-6 rounded-[28px] p-4 sm:p-7 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10 lg:p-9">
            <div className="space-y-4 px-1 sm:px-0">
              <p className="type-eyebrow">Demo juri · Data rekaan</p>
              <h1 id="juri-judul" tabIndex={-1} className="type-h1 focus:outline-none">Dari foto ke label siap cetak</h1>
              <p className="max-w-prose text-ink-2">Pilih kemasan di bawah. Tulisan label dan data produknya sudah terisi, jadi kamu bisa langsung mencoba hasil pemeriksaan, benahi temuan, dan pratinjau cetak.</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button iconAfter="arrowRight" onClick={() => void openInspection('hasil')}>Lihat hasil demo</Button>
                <Button size="md" variant="secondary" icon="edit" onClick={() => void openInspection('isi')}>Lihat isian</Button>
              </div>
            </div>
            <LabelScan key={sample.id} sample={sample} photo={photo} />
          </section>

          <section aria-labelledby="juri-contoh-judul" className="space-y-3">
            <h2 id="juri-contoh-judul" className="type-h3">Pilih kemasan demo</h2>
            <ul className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
              {introSamples.map((item, index) => {
                const choice = SAMPLE_PHOTOS.find((option) => option.caseId === item.id);
                const selected = index === selectedIndex;
                return (
                  <li key={item.id} className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedIndex(index)}
                      className={cn(
                        'press flex h-full w-full items-center gap-3 rounded-[18px] border p-3 text-left',
                        selected ? 'border-brand bg-brand-tint' : 'border-line bg-surface',
                      )}
                    >
                      {choice && <Image src={samplePhotoDisplayUrl(choice, 'thumb')} alt="" width={120} height={160} unoptimized sizes="52px" className="h-14 w-12 shrink-0 rounded-[10px] object-cover" />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{choice?.nama ?? item.namaProduk}</span>
                        <span className="block text-xs leading-snug text-ink-2 sm:text-sm">{item.kategori}</span>
                      </span>
                      {selected && <Icon name="check" size={18} className="shrink-0 text-brand-deep" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : (
        <>
          <div className="panel flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-5 print:hidden">
            <p className="text-sm text-ink-2"><strong className="text-ink">Demo juri</strong> · {photo?.nama ?? sample.namaProduk} rekaan</p>
            <div className="flex flex-wrap gap-2">
              {view.kind === 'cetak' && <Button size="md" variant="secondary" icon="arrowLeft" onClick={() => void openInspection('hasil', view.product)}>Kembali ke hasil demo</Button>}
              <Button size="md" variant="ghost" onClick={() => void navigate({ kind: 'intro' })}>Ganti contoh</Button>
            </div>
          </div>
          {view.kind === 'periksa' ? (
            <PeriksaFlowClient initial={view.initial} onDemoPrint={openPrint} />
          ) : (
            <CetakIsi product={view.product} onEdit={() => void openInspection('isi', view.product)} />
          )}
        </>
      )}
    </div>
  );
}
