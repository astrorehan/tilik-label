'use client';

import { useState } from 'react';
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
        className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 lg:col-span-5"
      >
        <div className="border-b border-stone-200 pb-4">
          <h2 className="text-base font-semibold text-stone-900">Isian label kemasan</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            Isi keterangan seperti yang tertulis pada label. Hasil pemeriksaan di samping langsung
            memperbarui 20 butir aturan BPOM 31/2018.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <label htmlFor="namaProduk" className="text-xs font-medium text-stone-800">
              Nama jenis pangan
            </label>
            <input
              id="namaProduk"
              type="text"
              value={label.namaProduk}
              onChange={(e) => setLabel({ ...label, namaProduk: e.target.value })}
              placeholder="Contoh: Keripik Pisang Manis"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="daftarBahan" className="text-xs font-medium text-stone-800">
              Daftar bahan (komposisi)
            </label>
            <textarea
              id="daftarBahan"
              rows={3}
              value={label.daftarBahanTeks}
              onChange={(e) => setLabel({ ...label, daftarBahanTeks: e.target.value })}
              placeholder="Contoh: Komposisi: pisang kepok, minyak kelapa sawit, gula pasir, garam."
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="beratBersih" className="text-xs font-medium text-stone-800">
                Berat / isi bersih
              </label>
              <input
                id="beratBersih"
                type="text"
                value={label.beratBersihTeks}
                onChange={(e) => setLabel({ ...label, beratBersihTeks: e.target.value })}
                placeholder="Contoh: Berat bersih: 150 g"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="nomorIzin" className="text-xs font-medium text-stone-800">
                Nomor izin / P-IRT
              </label>
              <input
                id="nomorIzin"
                type="text"
                value={label.nomorIzinTeks}
                onChange={(e) => setLabel({ ...label, nomorIzinTeks: e.target.value })}
                placeholder="Contoh: P-IRT 2053273010123-29"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="namaProdusen" className="text-xs font-medium text-stone-800">
              Nama produsen
            </label>
            <input
              id="namaProdusen"
              type="text"
              value={label.namaProdusen}
              onChange={(e) => setLabel({ ...label, namaProdusen: e.target.value })}
              placeholder="Contoh: Dapur Bu Rina"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="alamatProdusen" className="text-xs font-medium text-stone-800">
              Alamat produsen
            </label>
            <input
              id="alamatProdusen"
              type="text"
              value={label.alamatProdusen}
              onChange={(e) => setLabel({ ...label, alamatProdusen: e.target.value })}
              placeholder="Contoh: Jl. Melati 12, Kota Bandung 40115, Indonesia"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="kodeProduksi" className="text-xs font-medium text-stone-800">
                Kode produksi
              </label>
              <input
                id="kodeProduksi"
                type="text"
                value={label.kodeProduksiTeks}
                onChange={(e) => setLabel({ ...label, kodeProduksiTeks: e.target.value })}
                placeholder="Contoh: B01-131126"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="tanggalProduksi" className="text-xs font-medium text-stone-800">
                Tanggal produksi
              </label>
              <input
                id="tanggalProduksi"
                type="text"
                value={label.tanggalProduksiTeks}
                onChange={(e) => setLabel({ ...label, tanggalProduksiTeks: e.target.value })}
                placeholder="Contoh: 13 Nov 2026"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="kedaluwarsa" className="text-xs font-medium text-stone-800">
              Keterangan kedaluwarsa
            </label>
            <input
              id="kedaluwarsa"
              type="text"
              value={label.kedaluwarsaTeks}
              onChange={(e) => setLabel({ ...label, kedaluwarsaTeks: e.target.value })}
              placeholder="Contoh: Baik digunakan sebelum: 13 Des 2026"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="pernyataanAlergen" className="text-xs font-medium text-stone-800">
              Pernyataan alergen
            </label>
            <input
              id="pernyataanAlergen"
              type="text"
              value={label.pernyataanAlergenTeks}
              onChange={(e) => setLabel({ ...label, pernyataanAlergenTeks: e.target.value })}
              placeholder="Contoh: Mengandung alergen, lihat daftar bahan yang dicetak tebal."
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="keteranganHalal" className="text-xs font-medium text-stone-800">
                Keterangan halal di label
              </label>
              <input
                id="keteranganHalal"
                type="text"
                value={label.keteranganHalalTeks}
                onChange={(e) => setLabel({ ...label, keteranganHalalTeks: e.target.value })}
                placeholder="Kosongkan bila tidak ada"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="caraPenyimpanan" className="text-xs font-medium text-stone-800">
                Cara penyimpanan
              </label>
              <input
                id="caraPenyimpanan"
                type="text"
                value={label.caraPenyimpananTeks}
                onChange={(e) => setLabel({ ...label, caraPenyimpananTeks: e.target.value })}
                placeholder="Contoh: Simpan di tempat kering"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="pernyataanLain" className="text-xs font-medium text-stone-800">
              Klaim atau tulisan tambahan (satu per baris)
            </label>
            <textarea
              id="pernyataanLain"
              rows={2}
              value={claimsInput}
              onChange={(e) => setClaimsInput(e.target.value)}
              placeholder="Contoh: Tanpa pengawet"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-sm font-semibold text-stone-900">Pertanyaan tambahan</h3>

            <div className="mt-3 space-y-4">
              <div className="grid gap-1.5">
                <label htmlFor="resep" className="text-xs font-medium text-stone-800">
                  Takaran bahan sekali produksi (format: nama bahan: gram, satu per baris)
                </label>
                <textarea
                  id="resep"
                  rows={3}
                  value={recipeInput}
                  onChange={(e) => setRecipeInput(e.target.value)}
                  placeholder={'pisang kepok: 1000\nminyak kelapa sawit: 300\ngula pasir: 150'}
                  className="rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <label htmlFor="umurSimpan" className="text-xs font-medium text-stone-800">
                    Umur simpan (hari)
                  </label>
                  <input
                    id="umurSimpan"
                    type="number"
                    min={1}
                    value={umurSimpanInput}
                    onChange={(e) => setUmurSimpanInput(e.target.value)}
                    placeholder="Contoh: 30"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="statusHalal" className="text-xs font-medium text-stone-800">
                    Sertifikat halal?
                  </label>
                  <select
                    id="statusHalal"
                    value={punyaSertifikatHalal}
                    onChange={(e) =>
                      setPunyaSertifikatHalal(e.target.value as 'belum' | 'ya' | 'tidak')
                    }
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="belum">Belum dipilih</option>
                    <option value="ya">Sudah punya</option>
                    <option value="tidak">Belum punya</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="butuhCaraSimpan" className="text-xs font-medium text-stone-800">
                    Bergantung cara simpan?
                  </label>
                  <select
                    id="butuhCaraSimpan"
                    value={bergantungCaraSimpan}
                    onChange={(e) =>
                      setBergantungCaraSimpan(e.target.value as 'belum' | 'ya' | 'tidak')
                    }
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="belum">Belum dipilih</option>
                    <option value="ya">Ya</option>
                    <option value="tidak">Tidak</option>
                  </select>
                </div>
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
