'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { PermitPathView } from '@/components/periksa/PermitPathView';
import { SAMPLE_PHOTOS, samplePhotoUrl } from '@/components/periksa/SamplePhotos';
import { Disclosure } from '@/components/ui/disclosure';
import { evaluateLabelRules, evaluatePermitPath } from '@/domain';
import type { SampleLabelCase } from '@/domain/sampleLabels';
import { cn } from '@/lib/cn';
import { LabelReportView } from './LabelReportView';

function SampleData({ sample }: { sample: SampleLabelCase }) {
  const { label, answers } = sample;
  const labelRows = [
    ['Nama jenis pangan', label.namaProduk],
    ['Daftar bahan', label.daftarBahanTeks],
    ['Isi bersih', label.beratBersihTeks],
    ['Nama produsen', label.namaProdusen],
    ['Alamat produsen', label.alamatProdusen],
    ['Keterangan halal', label.keteranganHalalTeks],
    ['Kode produksi', label.kodeProduksiTeks],
    ['Tanggal produksi', label.tanggalProduksiTeks],
    ['Kedaluwarsa', label.kedaluwarsaTeks],
    ['Nomor izin', label.nomorIzinTeks],
    ['Pernyataan alergen', label.pernyataanAlergenTeks],
    ['Cara penyimpanan', label.caraPenyimpananTeks],
    ['Klaim kemasan', label.pernyataanLain.join(' · ')],
  ];
  const yesNo = (value: boolean | null | undefined) => value == null ? '—' : value ? 'Ya' : 'Tidak';
  const equipment = { manual: 'Manual', semi_otomatis: 'Semi otomatis', otomatis: 'Otomatis' };
  const answerRows = [
    ['Umur simpan', answers.umurSimpanHari == null ? '—' : `${answers.umurSimpanHari} hari`],
    ['Cara simpan khusus', yesNo(answers.bergantungCaraSimpan)],
    ['Sertifikat halal', yesNo(answers.punyaSertifikatHalal)],
    ['Alat produksi', answers.alatProduksi ? equipment[answers.alatProduksi] : '—'],
  ];

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="font-semibold">Tulisan pada label</h2>
        <dl className="mt-1 divide-y divide-line">
          {labelRows.map(([name, value]) => (
            <div key={name} className="py-2">
              <dt className="font-semibold">{name}</dt>
              <dd className="wrap-anywhere text-ink-2">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h2 className="font-semibold">Data produk</h2>
        <dl className="mt-1 divide-y divide-line">
          {answerRows.map(([name, value]) => (
            <div key={name} className="flex justify-between gap-2 py-2">
              <dt className="font-semibold">{name}</dt>
              <dd className="text-ink-2">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h2 className="font-semibold">Takaran resep</h2>
        <ul className="mt-1 divide-y divide-line">
          {answers.resep.slice().sort((a, b) => b.jumlahGram - a.jumlahGram).map((item) => (
            <li key={item.nama} className="flex justify-between gap-2 py-2 text-ink-2">
              <span>{item.nama}</span>
              <span className="tabular shrink-0">{item.jumlahGram} g</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SampleSelectorClient({ cases }: { cases: SampleLabelCase[] }) {
  const [selectedId, setSelectedId] = useState(cases[0]?.id);
  const sample = cases.find((item) => item.id === selectedId) ?? cases[0];
  if (!sample) return null;

  const photo = SAMPLE_PHOTOS.find((item) => item.caseId === sample.id);
  const report = evaluateLabelRules(sample.label, sample.answers);
  const permit = evaluatePermitPath(sample.label, sample.answers);

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Pilih contoh kemasan" className="grid grid-cols-3 gap-2 sm:gap-3">
        {cases.map((item) => {
          const active = item.id === sample.id;
          const choice = SAMPLE_PHOTOS.find((photo) => photo.caseId === item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(item.id)}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-2 rounded-[18px] border px-2 py-2.5 text-center text-sm font-semibold leading-tight sm:flex-row sm:justify-start sm:gap-3 sm:px-3 sm:text-left sm:text-base',
                active ? 'border-brand bg-brand-tint text-ink' : 'border-line bg-surface text-ink-2 hover:bg-brand-tint',
              )}
            >
              {choice && (
                <Image
                  src={samplePhotoUrl(choice)}
                  alt=""
                  width={1080}
                  height={1440}
                  sizes="48px"
                  className="size-11 rounded-xl object-cover sm:size-12"
                />
              )}
              <span className="flex-1">{choice?.nama ?? item.label.namaProduk}</span>
              {active && <Icon name="check" size={18} className="hidden shrink-0 text-brand sm:block" />}
            </button>
          );
        })}
      </div>

      <div key={sample.id} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.53fr)]">
        <aside className="min-w-0 space-y-4 md:col-start-2 md:row-start-1" aria-label="Kemasan dan data contoh">
          {photo && (
            <figure className="panel p-3.5 sm:p-4">
              <Image
                src={samplePhotoUrl(photo)}
                alt={`Ilustrasi label ${sample.label.namaProduk}`}
                width={1080}
                height={1440}
                loading="eager"
                sizes="(min-width: 1200px) 380px, (min-width: 768px) 35vw, 90vw"
                className="max-h-[32rem] w-full rounded-[16px] bg-paper object-contain"
              />
              <figcaption className="mt-3 text-sm text-ink-2">{sample.ringkasanSingkat}</figcaption>
            </figure>
          )}
          <Disclosure label="Isi label dan resep" icon="tag">
            <SampleData sample={sample} />
          </Disclosure>
        </aside>
        <div className="min-w-0 space-y-4 md:col-start-1 md:row-start-1">
          <LabelReportView report={report} productTitle={sample.label.namaProduk} />
          <PermitPathView result={permit} />
        </div>
      </div>
    </div>
  );
}
