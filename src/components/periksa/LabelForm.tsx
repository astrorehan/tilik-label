'use client';

import { useState, type ReactNode } from 'react';
import { Disclosure } from '@/components/ui/disclosure';
import { TextArea, TextField } from '@/components/ui/fields';
import type { LabelData, LabelFieldKey } from '@/domain';

type TextFieldKey = Exclude<LabelFieldKey, 'pernyataanLain'>;

interface FieldConfig {
  key: TextFieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

const PRODUCT_FIELDS: FieldConfig[][] = [
  [{ key: 'namaProduk', label: 'Nama jenis pangan', placeholder: 'Keripik Pisang Manis' }],
  [
    {
      key: 'daftarBahanTeks',
      label: 'Daftar bahan (komposisi)',
      placeholder: 'Pisang kepok, minyak kelapa sawit, gula pasir, garam',
      multiline: true,
    },
  ],
  [
    { key: 'beratBersihTeks', label: 'Berat atau isi bersih', placeholder: '150 g' },
    { key: 'nomorIzinTeks', label: 'Nomor izin', placeholder: 'P-IRT 2053273010123-29' },
  ],
];

const PRODUCTION_FIELDS: FieldConfig[][] = [
  [{ key: 'namaProdusen', label: 'Nama produsen', placeholder: 'Dapur Bu Rina' }],
  [{ key: 'alamatProdusen', label: 'Alamat produsen', placeholder: 'Jl. Melati 12, Kota Bandung 40115' }],
  [
    { key: 'kodeProduksiTeks', label: 'Kode produksi', placeholder: 'B01-131126' },
    { key: 'tanggalProduksiTeks', label: 'Tanggal produksi', placeholder: '13 Nov 2026' },
  ],
  [{
    key: 'kedaluwarsaTeks',
    label: 'Keterangan kedaluwarsa',
    placeholder: 'Baik digunakan sebelum 13 Des 2026',
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

export function LabelForm({
  value,
  onChange,
  renderFieldNote,
  showExtras,
}: {
  value: LabelData;
  onChange: (next: LabelData) => void;
  renderFieldNote?: (key: LabelFieldKey) => ReactNode;
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

  const renderGroups = (groups: FieldConfig[][]) =>
    groups.map((group) => (
      <div
        key={group.map(({ key }) => key).join('-')}
        className={group.length > 1 ? 'grid gap-4 sm:grid-cols-2' : undefined}
      >
        {group.map((field) => {
          const Field = field.multiline ? TextArea : TextField;
          return (
            <Field
              key={field.key}
              id={`isian-${field.key}`}
              label={field.label}
              hint={renderFieldNote?.(field.key)}
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
            hint={renderFieldNote?.('pernyataanLain') ?? 'Tulis satu klaim per baris.'}
            value={value.pernyataanLain.join('\n')}
            onChange={(event) => setField('pernyataanLain', event.target.value)}
            placeholder="Tanpa pengawet"
          />
        </div>
      </Disclosure>
    </div>
  );
}
