'use client';

import { useState } from 'react';
import { Segmented } from '@/components/ui/choices';
import { TextArea, TextField } from '@/components/ui/fields';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  evaluateLabelRules,
} from '@/domain';
import type { AdditionalAnswers, LabelData, RecipeIngredient } from '@/domain';
import { LabelReportView } from './LabelReportView';

function parseRecipeLines(rawText: string): RecipeIngredient[] {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, weightPart] = line.split(':').map((part) => part.trim());
      const parsedGram = Number((weightPart ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
      return {
        nama: namePart ?? '',
        jumlahGram: Number.isFinite(parsedGram) && parsedGram > 0 ? parsedGram : 0,
      };
    })
    .filter((item) => item.nama.length > 0 && item.jumlahGram > 0);
}

export function ManualCheckerClient() {
  const [label, setLabel] = useState<LabelData>(() => createEmptyLabelData());
  const [claimsInput, setClaimsInput] = useState('');
  const [recipeInput, setRecipeInput] = useState('');
  const [umurSimpanInput, setUmurSimpanInput] = useState('');
  const [bergantungCaraSimpan, setBergantungCaraSimpan] = useState<'belum' | 'ya' | 'tidak'>(
    'belum',
  );
  const [punyaSertifikatHalal, setPunyaSertifikatHalal] = useState<'belum' | 'ya' | 'tidak'>(
    'belum',
  );

  const answers: AdditionalAnswers = {
    ...createEmptyAnswers(),
    resep: parseRecipeLines(recipeInput),
    umurSimpanHari:
      umurSimpanInput.trim() && Number(umurSimpanInput) > 0 ? Number(umurSimpanInput) : null,
    bergantungCaraSimpan:
      bergantungCaraSimpan === 'belum' ? null : bergantungCaraSimpan === 'ya',
    punyaSertifikatHalal:
      punyaSertifikatHalal === 'belum' ? null : punyaSertifikatHalal === 'ya',
  };

  const normalizedLabel: LabelData = {
    ...label,
    pernyataanLain: claimsInput
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
  };

  const report = evaluateLabelRules(normalizedLabel, answers);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <form
        onSubmit={(event) => event.preventDefault()}
        className="panel space-y-5 p-5 sm:p-6 lg:col-span-5 lg:self-start"
      >
        <div className="record-heading">
          <div>
            <h2 className="type-h2 text-ink">Isian label kemasan</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">
              Isi keterangan seperti yang tertulis pada label. Hasil pemeriksaan di samping
              langsung memperbarui 20 butir aturan BPOM 31/2018.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <TextField
            id="namaProduk"
            label="Nama jenis pangan"
            type="text"
            value={label.namaProduk}
            onChange={(e) => setLabel({ ...label, namaProduk: e.target.value })}
            placeholder="Contoh: Keripik Pisang Manis"
          />

          <TextArea
            id="daftarBahan"
            label="Daftar bahan (komposisi)"
            rows={3}
            value={label.daftarBahanTeks}
            onChange={(e) => setLabel({ ...label, daftarBahanTeks: e.target.value })}
            placeholder="Contoh: Komposisi: pisang kepok, minyak kelapa sawit, gula pasir, garam."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="beratBersih"
              label="Berat / isi bersih"
              type="text"
              value={label.beratBersihTeks}
              onChange={(e) => setLabel({ ...label, beratBersihTeks: e.target.value })}
              placeholder="Contoh: Berat bersih: 150 g"
            />

            <TextField
              id="nomorIzin"
              label="Nomor izin / P-IRT"
              type="text"
              value={label.nomorIzinTeks}
              onChange={(e) => setLabel({ ...label, nomorIzinTeks: e.target.value })}
              placeholder="Contoh: P-IRT 2053273010123-29"
            />
          </div>

          <TextField
            id="namaProdusen"
            label="Nama produsen"
            type="text"
            value={label.namaProdusen}
            onChange={(e) => setLabel({ ...label, namaProdusen: e.target.value })}
            placeholder="Contoh: Dapur Bu Rina"
          />

          <TextField
            id="alamatProdusen"
            label="Alamat produsen"
            type="text"
            value={label.alamatProdusen}
            onChange={(e) => setLabel({ ...label, alamatProdusen: e.target.value })}
            placeholder="Contoh: Jl. Melati 12, Kota Bandung 40115, Indonesia"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="kodeProduksi"
              label="Kode produksi"
              type="text"
              value={label.kodeProduksiTeks}
              onChange={(e) => setLabel({ ...label, kodeProduksiTeks: e.target.value })}
              placeholder="Contoh: B01-131126"
            />

            <TextField
              id="tanggalProduksi"
              label="Tanggal produksi"
              type="text"
              value={label.tanggalProduksiTeks}
              onChange={(e) => setLabel({ ...label, tanggalProduksiTeks: e.target.value })}
              placeholder="Contoh: 13 Nov 2026"
            />
          </div>

          <TextField
            id="kedaluwarsa"
            label="Keterangan kedaluwarsa"
            type="text"
            value={label.kedaluwarsaTeks}
            onChange={(e) => setLabel({ ...label, kedaluwarsaTeks: e.target.value })}
            placeholder="Contoh: Baik digunakan sebelum: 13 Des 2026"
          />

          <TextField
            id="pernyataanAlergen"
            label="Pernyataan alergen"
            type="text"
            value={label.pernyataanAlergenTeks}
            onChange={(e) => setLabel({ ...label, pernyataanAlergenTeks: e.target.value })}
            placeholder="Contoh: Mengandung alergen, lihat daftar bahan yang dicetak tebal."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="keteranganHalal"
              label="Keterangan halal di label"
              type="text"
              value={label.keteranganHalalTeks}
              onChange={(e) => setLabel({ ...label, keteranganHalalTeks: e.target.value })}
              placeholder="Kosongkan bila tidak ada"
            />

            <TextField
              id="caraPenyimpanan"
              label="Cara penyimpanan"
              type="text"
              value={label.caraPenyimpananTeks}
              onChange={(e) => setLabel({ ...label, caraPenyimpananTeks: e.target.value })}
              placeholder="Contoh: Simpan di tempat kering"
            />
          </div>

          <TextArea
            id="pernyataanLain"
            label="Klaim atau tulisan tambahan (satu per baris)"
            rows={2}
            value={claimsInput}
            onChange={(e) => setClaimsInput(e.target.value)}
            placeholder="Contoh: Tanpa pengawet"
          />

          <div className="border-t border-line pt-5">
            <h3 className="type-h3 text-ink">Pertanyaan tambahan</h3>

            <div className="mt-3 space-y-4">
              <TextArea
                id="resep"
                label="Takaran bahan sekali produksi"
                hint="Format: nama bahan: gram, satu per baris"
                rows={3}
                value={recipeInput}
                onChange={(e) => setRecipeInput(e.target.value)}
                placeholder={'pisang kepok: 1000\nminyak kelapa sawit: 300\ngula pasir: 150'}
                className="[&_textarea]:type-code [&_textarea]:text-xs"
              />

              <TextField
                id="umurSimpan"
                label="Umur simpan"
                type="number"
                min={1}
                suffix="hari"
                value={umurSimpanInput}
                onChange={(e) => setUmurSimpanInput(e.target.value)}
                placeholder="Contoh: 30"
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">Sertifikat halal?</span>
                <Segmented
                  label="Sertifikat halal?"
                  value={punyaSertifikatHalal}
                  onChange={setPunyaSertifikatHalal}
                  options={[
                    { value: 'belum', title: 'Belum dipilih' },
                    { value: 'ya', title: 'Sudah punya' },
                    { value: 'tidak', title: 'Belum punya' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">Bergantung cara simpan?</span>
                <Segmented
                  label="Bergantung cara simpan?"
                  value={bergantungCaraSimpan}
                  onChange={setBergantungCaraSimpan}
                  options={[
                    { value: 'belum', title: 'Belum dipilih' },
                    { value: 'ya', title: 'Ya' },
                    { value: 'tidak', title: 'Tidak' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      <div className="lg:col-span-7">
        <LabelReportView report={report} productTitle={label.namaProduk || 'Label Baru'} />
      </div>
    </div>
  );
}
