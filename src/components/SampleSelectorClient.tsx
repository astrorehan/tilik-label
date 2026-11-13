'use client';

import { useState } from 'react';
import { evaluateLabelRules } from '@/domain';
import type { SampleLabelCase } from '@/domain/sampleLabels';
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cases.map((item) => {
          const isSelected = item.id === activeCase.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-emerald-700 bg-emerald-50/40'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <span className="text-xs font-medium text-emerald-800">{item.kategori}</span>
              <p className="mt-1 text-sm font-semibold text-stone-900">{item.judul}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                {item.ringkasanSingkat}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-4 lg:self-start">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Data label rekaan
            </span>
            <h2 className="mt-1 text-base font-semibold text-stone-900">{activeCase.judul}</h2>
          </div>

          <dl className="divide-y divide-stone-200 text-xs">
            <div className="py-2.5">
              <dt className="font-medium text-stone-500">Nama produk</dt>
              <dd className="mt-0.5 text-stone-900">{activeCase.label.namaProduk || '-'}</dd>
            </div>
            <div className="py-2.5">
              <dt className="font-medium text-stone-500">Daftar bahan</dt>
              <dd className="mt-0.5 text-stone-900">{activeCase.label.daftarBahanTeks || '-'}</dd>
            </div>
            <div className="py-2.5">
              <dt className="font-medium text-stone-500">Berat / isi bersih</dt>
              <dd className="mt-0.5 text-stone-900">{activeCase.label.beratBersihTeks || '-'}</dd>
            </div>
            <div className="py-2.5">
              <dt className="font-medium text-stone-500">Produsen & alamat</dt>
              <dd className="mt-0.5 text-stone-900">
                {activeCase.label.namaProdusen} — {activeCase.label.alamatProdusen}
              </dd>
            </div>
            <div className="py-2.5">
              <dt className="font-medium text-stone-500">Kedaluwarsa & kode</dt>
              <dd className="mt-0.5 text-stone-900">
                {activeCase.label.kedaluwarsaTeks || '-'} · {activeCase.label.kodeProduksiTeks || '-'}
              </dd>
            </div>
            <div className="py-2.5">
              <dt className="font-medium text-stone-500">Izin & alergen</dt>
              <dd className="mt-0.5 text-stone-900">
                {activeCase.label.nomorIzinTeks || '-'} ·{' '}
                {activeCase.label.pernyataanAlergenTeks || '(tanpa kalimat alergen)'}
              </dd>
            </div>
            <div className="py-2.5">
              <dt className="font-medium text-stone-500">Resep (takaran terbanyak)</dt>
              <dd className="mt-0.5 font-mono text-stone-800">
                {activeCase.answers.resep
                  .slice()
                  .sort((a, b) => b.jumlahGram - a.jumlahGram)
                  .map((r) => `${r.nama} (${r.jumlahGram} g)`)
                  .join(', ')}
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
