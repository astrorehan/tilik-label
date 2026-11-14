'use client';

import type { ReactNode } from 'react';
import { TextArea, TextField } from '@/components/ui/fields';
import type { LabelData, LabelFieldKey } from '@/domain';

type TextFieldKey = Exclude<LabelFieldKey, 'pernyataanLain'>;

interface FieldConfig {
  key: TextFieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

/** Urutan isian mengikuti urutan butir wajib label. */
export const LABEL_FIELD_GROUPS: FieldConfig[][] = [
  [{ key: 'namaProduk', label: 'Nama jenis pangan', placeholder: 'Contoh: Keripik Pisang Manis' }],
  [
    {
      key: 'daftarBahanTeks',
      label: 'Daftar bahan (komposisi)',
      placeholder: 'Contoh: Komposisi: pisang kepok, minyak kelapa sawit, gula pasir, garam.',
      multiline: true,
    },
  ],
  [
    { key: 'beratBersihTeks', label: 'Berat atau isi bersih', placeholder: 'Contoh: Berat bersih: 150 g' },
    { key: 'nomorIzinTeks', label: 'Nomor izin (P-IRT)', placeholder: 'Contoh: P-IRT 2053273010123-29' },
  ],
  [{ key: 'namaProdusen', label: 'Nama produsen', placeholder: 'Contoh: Dapur Bu Rina' }],
  [
    {
      key: 'alamatProdusen',
      label: 'Alamat produsen',
      placeholder: 'Contoh: Jl. Melati 12, Kota Bandung 40115, Indonesia',
    },
  ],
  [
    { key: 'kodeProduksiTeks', label: 'Kode produksi', placeholder: 'Contoh: B01-131126' },
    { key: 'tanggalProduksiTeks', label: 'Tanggal produksi', placeholder: 'Contoh: 13 Nov 2026' },
  ],
  [
    {
      key: 'kedaluwarsaTeks',
      label: 'Keterangan kedaluwarsa',
      placeholder: 'Contoh: Baik digunakan sebelum: 13 Des 2026',
    },
  ],
  [
    {
      key: 'pernyataanAlergenTeks',
      label: 'Pernyataan alergen',
      placeholder: 'Contoh: Mengandung alergen, lihat daftar bahan yang dicetak tebal.',
    },
  ],
  [
    { key: 'keteranganHalalTeks', label: 'Keterangan halal di label', placeholder: 'Kosongkan bila tidak ada' },
    { key: 'caraPenyimpananTeks', label: 'Cara penyimpanan', placeholder: 'Contoh: Simpan di tempat kering' },
  ],
];

interface LabelFormProps {
  value: LabelData;
  onChange: (next: LabelData) => void;
  /** Catatan tambahan per isian, misalnya penanda "tidak terbaca" dari pembaca foto. */
  renderFieldNote?: (key: LabelFieldKey) => ReactNode;
}

export function LabelForm({ value, onChange, renderFieldNote }: LabelFormProps) {
  const setField = (key: TextFieldKey, text: string) => {
    const unreadable = value.unreadableFields?.filter((field) => field !== key);
    onChange({ ...value, [key]: text, ...(unreadable ? { unreadableFields: unreadable } : {}) });
  };

  const setClaims = (text: string) => {
    const unreadable = value.unreadableFields?.filter((field) => field !== 'pernyataanLain');
    onChange({
      ...value,
      pernyataanLain: text.split('\n'),
      ...(unreadable ? { unreadableFields: unreadable } : {}),
    });
  };

  return (
    <div className="space-y-4">
      {LABEL_FIELD_GROUPS.map((group) => (
        <div
          key={group.map((field) => field.key).join('-')}
          className={group.length > 1 ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : undefined}
        >
          {group.map((field) => {
            const note = renderFieldNote?.(field.key);
            return field.multiline ? (
              <TextArea
                key={field.key}
                id={`isian-${field.key}`}
                label={field.label}
                hint={note}
                rows={3}
                value={value[field.key]}
                onChange={(event) => setField(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            ) : (
              <TextField
                key={field.key}
                id={`isian-${field.key}`}
                label={field.label}
                hint={note}
                type="text"
                value={value[field.key]}
                onChange={(event) => setField(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            );
          })}
        </div>
      ))}

      <TextArea
        id="isian-pernyataanLain"
        label="Klaim atau tulisan lain di kemasan"
        hint={renderFieldNote?.('pernyataanLain') ?? 'Satu tulisan per baris, misalnya "Tanpa pengawet".'}
        rows={3}
        value={value.pernyataanLain.join('\n')}
        onChange={(event) => setClaims(event.target.value)}
        placeholder={'Contoh:\nTanpa pengawet\nRenyah dan gurih'}
      />
    </div>
  );
}
