'use client';

import { useState } from 'react';
import { LedgerRow, Pill } from '@/components/ui/surface';
import { evaluateLabelRules } from '@/domain';
import type { SampleLabelCase } from '@/domain/sampleLabels';
import { cn } from '@/lib/cn';
import { LabelReportView } from './LabelReportView';

interface SampleSelectorClientProps {
  cases: SampleLabelCase[];
}

export function SampleSelectorClient({ cases }: SampleSelectorClientProps) {
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? '');
  const activeCase = cases.find((item) => item.id === selectedId) ?? cases[0];

  if (!activeCase) {
    return null;
  }

  const report = evaluateLabelRules(activeCase.label, activeCase.answers);
  const sortedRecipe = activeCase.answers.resep
    .slice()
    .sort((a, b) => b.jumlahGram - a.jumlahGram);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {cases.map((item) => {
          const isSelected = item.id === activeCase.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              aria-pressed={isSelected}
              className={cn(
                'flex flex-col items-start rounded-[20px] p-5 text-left transition-[border-color,background-color] duration-150',
                isSelected
                  ? 'border-2 border-brand bg-brand-tint/45'
                  : 'border border-line bg-surface hover:border-line-strong',
              )}
            >
              <Pill tone={isSelected ? 'info' : 'neutral'}>{item.kategori}</Pill>
              <p className="mt-3 text-base font-semibold text-ink">{item.judul}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{item.ringkasanSingkat}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="panel space-y-5 p-5 sm:p-6 lg:col-span-4 lg:self-start">
          <div className="record-heading">
            <div>
              <span className="type-eyebrow text-xs">Data label rekaan</span>
              <h2 className="type-h2 mt-1 text-ink">{activeCase.judul}</h2>
            </div>
          </div>

          <dl className="divide-y divide-line text-sm">
            <div className="py-3 first:pt-0">
              <dt className="text-xs font-semibold text-ink-3">Nama produk</dt>
              <dd className="mt-1 text-ink">{activeCase.label.namaProduk || '-'}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">Daftar bahan</dt>
              <dd className="mt-1 text-ink">{activeCase.label.daftarBahanTeks || '-'}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">Berat / isi bersih</dt>
              <dd className="mt-1 text-ink">{activeCase.label.beratBersihTeks || '-'}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">Produsen & alamat</dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.namaProdusen} — {activeCase.label.alamatProdusen}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">Kedaluwarsa & kode</dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.kedaluwarsaTeks || '-'} · {activeCase.label.kodeProduksiTeks || '-'}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">Izin & alergen</dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.nomorIzinTeks || '-'} ·{' '}
                {activeCase.label.pernyataanAlergenTeks || '(tanpa kalimat alergen)'}
              </dd>
            </div>
            <div className="py-3 last:pb-0">
              <dt className="mb-2 text-xs font-semibold text-ink-3">Resep (takaran terbanyak)</dt>
              <dd className="space-y-1.5">
                {sortedRecipe.map((r) => (
                  <LedgerRow
                    key={r.nama}
                    label={r.nama}
                    value={`${r.jumlahGram} g`}
                    className="text-xs text-ink"
                  />
                ))}
              </dd>
            </div>
          </dl>
        </aside>

        <div className="lg:col-span-8">
          <LabelReportView report={report} productTitle={activeCase.judul} />
        </div>
      </div>
    </div>
  );
}
