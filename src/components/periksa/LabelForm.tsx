'use client';

import { useState } from 'react';
import { Disclosure } from '@/components/ui/disclosure';
import { TextArea, TextField } from '@/components/ui/fields';
import { containsValidDate, type LabelData, type LabelFieldKey } from '@/domain';

type TextFieldKey = Exclude<LabelFieldKey, 'pernyataanLain'>;

interface FieldConfig {
  key: TextFieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
  requiredForPrint?: boolean;
}

const PRODUCT_FIELDS: FieldConfig[][] = [
  [{ key: 'namaProduk', label: 'Nama jenis pangan', placeholder: 'Keripik Pisang Manis', requiredForPrint: true }],
  [
    {
      key: 'daftarBahanTeks',
      label: 'Daftar bahan (komposisi)',
      placeholder: 'Pisang kepok, minyak kelapa sawit, gula pasir, garam',
      multiline: true,
      requiredForPrint: true,
    },
  ],
  [
    { key: 'beratBersihTeks', label: 'Berat atau isi bersih', placeholder: '150 g', requiredForPrint: true },
    { key: 'nomorIzinTeks', label: 'Nomor izin', placeholder: 'P-IRT 2053273010123-29', requiredForPrint: true },
  ],
];

const PRODUCTION_FIELDS: FieldConfig[][] = [
  [{ key: 'namaProdusen', label: 'Nama produsen', placeholder: 'Dapur Bu Rina', requiredForPrint: true }],
  [{ key: 'alamatProdusen', label: 'Alamat produsen', placeholder: 'Jl. Melati 12, Kota Bandung 40115', requiredForPrint: true }],
  [
    { key: 'kodeProduksiTeks', label: 'Kode produksi', placeholder: 'B01-131126', requiredForPrint: true },
    { key: 'tanggalProduksiTeks', label: 'Tanggal produksi', placeholder: '13 Nov 2026' },
  ],
  [{
    key: 'kedaluwarsaTeks',
    label: 'Keterangan kedaluwarsa',
    placeholder: 'Baik digunakan sebelum 13 Des 2026',
    requiredForPrint: true,
  }],
];

const EXTRA_FIELDS: FieldConfig[][] = [
  [
    {
      key: 'pernyataanAlergenTeks',
      label: 'Pernyataan alergen',
      placeholder: 'Mengandung alergen, lihat daftar bahan yang dicetak tebal.',
    },
  ],
  [
    { key: 'keteranganHalalTeks', label: 'Keterangan halal di label', placeholder: 'Halal Indonesia' },
    { key: 'caraPenyimpananTeks', label: 'Cara penyimpanan', placeholder: 'Simpan di tempat kering' },
  ],
];

const UNREADABLE_STYLE = 'rounded-[16px] border-2 border-warning bg-warning-tint p-3';
const UNREADABLE_NOTE = (
  <span className="font-semibold text-warning-ink">Tidak terbaca. Cocokkan dengan label.</span>
);

export function LabelForm({
  value,
  onChange,
  showExtras,
}: {
  value: LabelData;
  onChange: (next: LabelData) => void;
  showExtras: boolean;
}) {
  const [extrasInitiallyOpen] = useState(() =>
    showExtras ||
    EXTRA_FIELDS.flat().some(({ key }) => value[key].trim() || value.unreadableFields?.includes(key)) ||
    value.pernyataanLain.some((claim) => claim.trim()) ||
    value.unreadableFields?.includes('pernyataanLain'),
  );

  const setField = (key: LabelFieldKey, text: string) => {
    const unreadableFields = value.unreadableFields?.filter((field) => field !== key);
    const update = key === 'pernyataanLain' ? { pernyataanLain: text.split('\n') } : { [key]: text };
    onChange({ ...value, ...update, ...(unreadableFields ? { unreadableFields } : {}) });
  };

  const needsProductionDate = !containsValidDate(value.kodeProduksiTeks);
  const unreadableClaims = value.unreadableFields?.includes('pernyataanLain');

  const renderGroups = (groups: FieldConfig[][]) =>
    groups.map((group) => (
      <div
        key={group.map(({ key }) => key).join('-')}
        className={group.length > 1 ? 'grid gap-4 sm:grid-cols-2' : undefined}
      >
        {group.map((field) => {
          const Field = field.multiline ? TextArea : TextField;
          const unreadable = value.unreadableFields?.includes(field.key);
          const required = field.requiredForPrint || (field.key === 'tanggalProduksiTeks' && needsProductionDate);
          const fieldHint = field.key === 'tanggalProduksiTeks'
            ? 'Isi jika tanggal belum tercantum dalam kode produksi.'
            : field.key === 'caraPenyimpananTeks'
              ? 'Wajib untuk cetak bila produk perlu cara simpan khusus. Jika tidak, jawab Tidak di Data produk.'
              : undefined;
          return (
            <Field
              key={field.key}
              id={`isian-${field.key}`}
              label={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {field.label}
                  {required && (
                    <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs text-brand-deep">
                      Wajib untuk cetak
                    </span>
                  )}
                </span>
              }
              className={unreadable ? UNREADABLE_STYLE : undefined}
              hint={unreadable ? <>{UNREADABLE_NOTE}{fieldHint && ` ${fieldHint}`}</> : fieldHint}
              value={value[field.key]}
              onChange={(event) => setField(field.key, event.target.value)}
              placeholder={field.placeholder}
            />
          );
        })}
      </div>
    ));

  return (
    <div className="space-y-4">
      <section aria-labelledby="isian-produk-judul" className="panel space-y-4 p-4 sm:p-6">
        <h2 id="isian-produk-judul" className="type-h3">Produk dan komposisi</h2>
        <p className="text-sm text-ink-2">
          Kamu bisa lanjut memeriksa dengan isian kosong. Lengkapi butir bertanda wajib sebelum mencetak stiker.
        </p>
        {renderGroups(PRODUCT_FIELDS)}
      </section>
      <section aria-labelledby="isian-produksi-judul" className="panel space-y-4 p-4 sm:p-6">
        <h2 id="isian-produksi-judul" className="type-h3">Produsen dan tanggal</h2>
        {renderGroups(PRODUCTION_FIELDS)}
      </section>
      <Disclosure label="Alergen, halal, cara simpan, dan klaim" open={extrasInitiallyOpen}>
        <div className="space-y-4">
          {renderGroups(EXTRA_FIELDS)}
          <TextArea
            id="isian-pernyataanLain"
            label="Klaim atau tulisan lain"
            className={unreadableClaims ? UNREADABLE_STYLE : undefined}
            hint={unreadableClaims ? UNREADABLE_NOTE : 'Tulis satu klaim per baris.'}
            value={value.pernyataanLain.join('\n')}
            onChange={(event) => setField('pernyataanLain', event.target.value)}
            placeholder="Tanpa pengawet"
          />
        </div>
      </Disclosure>
    </div>
  );
}
