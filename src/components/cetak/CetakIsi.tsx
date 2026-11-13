'use client';

import { Fragment, useEffect, useMemo } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import {
  REGULATION_LAST_READ,
  buildCorrectedLabel,
  evaluateLabelRules,
  evaluatePermitPath,
  prepareForCheck,
  type CorrectedLabelRow,
  type LabelRuleResult,
} from '@/domain';
import type { SavedProduct } from '@/lib/produkSaya';

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });

function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '-' : dateFormatter.format(new Date(time));
}

type Bagian = 'label' | 'ringkasan';

function cetak(bagian: Bagian) {
  document.documentElement.dataset.cetak = bagian;
  window.print();
}

function pasalText(item: { rujukan: { peraturan: string; pasal: string } }): string {
  return `${item.rujukan.peraturan}, ${item.rujukan.pasal}`;
}

export function CetakIsi({ product }: { product: SavedProduct }) {
  const prepared = useMemo(
    () => prepareForCheck(product.label, product.answers),
    [product.label, product.answers],
  );
  const corrected = useMemo(
    () => buildCorrectedLabel(prepared.label, prepared.answers),
    [prepared],
  );
  const report = useMemo(
    () => evaluateLabelRules(prepared.label, prepared.answers),
    [prepared],
  );
  const permit = useMemo(
    () => evaluatePermitPath(prepared.label, prepared.answers),
    [prepared],
  );

  useEffect(() => {
    const reset = () => {
      delete document.documentElement.dataset.cetak;
    };
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  const kurang = report.hasil.filter((item) => item.status === 'kurang');
  const tidakBisaDicek = report.hasil.filter((item) => item.status === 'tidak_bisa_dicek');
  const namaCetak = product.nama;

  return (
    <div className="space-y-10">
      <header className="cetak-tidak-dicetak flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="max-w-2xl">
          <p className="type-eyebrow">Label perbaikan dan ringkasan</p>
          <h1 className="type-h1 mt-1.5 break-words text-ink">{namaCetak}</h1>
          <p className="mt-2.5 text-base leading-relaxed text-ink-2">
            Dua lembar yang bisa dicetak atau disimpan sebagai PDF: label teks yang sudah dirapikan,
            dan ringkasan temuan. Pilih &quot;Simpan sebagai PDF&quot; di dialog cetak peramban.
          </p>
        </div>
        <ButtonLink
          href={`/periksa?produk=${encodeURIComponent(product.id)}`}
          size="md"
          variant="secondary"
          icon="edit"
        >
          Ubah isi produk
        </ButtonLink>
      </header>

      <LabelBagian corrected={corrected} namaProduk={namaCetak} />

      <section
        data-cetak-bagian="ringkasan"
        aria-labelledby="ringkasan-judul"
        className="space-y-5"
      >
        <div className="cetak-tidak-dicetak flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="ringkasan-judul" className="type-h2 text-ink">
              Lembar ringkasan
            </h2>
            <p className="mt-1 text-sm leading-snug text-ink-2">
              Satu lembar untuk dibawa ke Dinas Kesehatan atau percetakan.
            </p>
          </div>
          <Button icon="printer" size="md" onClick={() => cetak('ringkasan')}>
            Simpan PDF ringkasan
          </Button>
        </div>

        <article className="ringkasan-cetak rounded-[20px] border border-line p-5 sm:p-7 print:rounded-none print:border-0 print:p-0">
          <h2 className="text-2xl font-bold leading-tight break-words">
            Ringkasan pemeriksaan label: {namaCetak}
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="font-semibold">Tanggal pemeriksaan</dt>
            <dd>{formatDate(product.diperbaruiPada)}</dd>
            <dt className="font-semibold">Aturan terakhir dibaca</dt>
            <dd>{REGULATION_LAST_READ}</dd>
          </dl>

          <p className="mt-4 border-2 border-current p-3 text-base font-bold">
            Pemeriksaan awal, bukan pengesahan. Yang memutuskan tetap Dinas Kesehatan atau BPOM.
          </p>

          <section className="mt-6">
            <h3 className="text-lg font-bold">Jalur izin</h3>
            <p className="mt-1 font-semibold">{permit.judul}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
              {permit.alasan.map((alasan) => (
                <li key={alasan}>{alasan}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-sm">
              Dasar: {permit.rujukan.map((ref) => `${ref.peraturan}, ${ref.pasal}`).join('; ')}
            </p>
            {permit.perluDicek.length > 0 && (
              <div className="mt-2 text-sm">
                <p className="font-semibold">Perlu dicek ke Dinas Kesehatan</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {permit.perluDicek.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <FindingList
            judul={`Temuan kurang (${kurang.length})`}
            kosong="Tidak ada butir yang kurang."
            items={kurang}
          />
          <FindingList
            judul={`Tidak bisa dicek (${tidakBisaDicek.length})`}
            kosong="Semua butir bisa dicek."
            items={tidakBisaDicek}
          />

          <p className="mt-6 border-t border-current pt-3 text-xs">
            Dasar aturan: Peraturan BPOM Nomor 31 Tahun 2018 (label), Nomor 4 Tahun 2024 (jalur
            izin). Teks resmi dibaca terakhir pada {REGULATION_LAST_READ}. Hal yang belum pasti perlu
            dicek ke Dinas Kesehatan.
          </p>
        </article>
      </section>
    </div>
  );
}

function FindingList({
  judul,
  kosong,
  items,
}: {
  judul: string;
  kosong: string;
  items: LabelRuleResult[];
}) {
  return (
    <section className="mt-6">
      <h3 className="text-lg font-bold">{judul}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm">{kosong}</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="text-sm leading-snug">
              <p className="font-semibold">
                {item.id} · {item.judul}
              </p>
              <p className="mt-0.5">{item.penjelasan}</p>
              {item.saranPerbaikan && <p className="mt-0.5">Saran: {item.saranPerbaikan}</p>}
              <p className="mt-0.5 text-xs">Dasar: {pasalText(item)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LabelBagian({
  corrected,
  namaProduk,
}: {
  corrected: ReturnType<typeof buildCorrectedLabel>;
  namaProduk: string;
}) {
  const { baris, siapUnduh, butirKosong, catatan, bahanBagian } = corrected;
  // Butir yang tidak wajib dan kosong tidak dicetak.
  const tampil = baris.filter((row) => row.wajib || !row.kosong);

  return (
    <section
      data-cetak-bagian="label"
      data-siap={siapUnduh ? 'true' : 'false'}
      aria-labelledby="label-judul"
      className="space-y-5"
    >
      <div className="cetak-tidak-dicetak space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="label-judul" className="type-h2 text-ink">
              Label perbaikan
            </h2>
            <p className="mt-1 text-sm leading-snug text-ink-2">
              Teks label siap cetak, bahan alergen dicetak tebal. Urutan butir adalah usulan tata
              letak; atur ukuran huruf di desain kemasan (minimal 1 mm, nama produk dan peringatan
              minimal 2 mm, Pasal 9).
            </p>
          </div>
          <Button icon="printer" size="md" disabled={!siapUnduh} onClick={() => cetak('label')}>
            Simpan PDF label
          </Button>
        </div>

        {!siapUnduh && (
          <Notice tone="danger" title="Label belum bisa diunduh: masih ada butir wajib yang kosong">
            <p>
              Aplikasi tidak mengarang isi label. Lengkapi butir berikut di isi produk, lalu buka
              halaman ini lagi.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {butirKosong.map((judul) => (
                <li key={judul} className="font-semibold text-ink">
                  {judul}
                </li>
              ))}
            </ul>
          </Notice>
        )}

        {catatan.length > 0 && (
          <Notice tone="info" title="Yang diubah dan yang perlu kamu cek">
            <ul className="list-disc space-y-1 pl-5">
              {catatan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Notice>
        )}
      </div>

      <div
        className="label-cetak"
        aria-label={`Pratinjau label ${namaProduk}`}
        role="group"
      >
        {tampil.map((row) => (
          <LabelBaris key={row.kunci} row={row} bahanBagian={bahanBagian} />
        ))}
      </div>

      <details className="cetak-tidak-dicetak">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-brand-deep">
          Dasar pasal tiap butir
        </summary>
        <ul className="mt-2 divide-y divide-line rounded-[16px] border border-line bg-surface">
          {baris
            .filter((row) => row.wajib || !row.kosong)
            .map((row) => (
              <li key={row.kunci} className="px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{row.judul}</span>
                <span className="text-ink-2">
                  {' '}
                  · {row.rujukan.peraturan}, {row.rujukan.pasal}
                </span>
              </li>
            ))}
        </ul>
      </details>
    </section>
  );
}

function LabelBaris({
  row,
  bahanBagian,
}: {
  row: CorrectedLabelRow;
  bahanBagian: Array<{ teks: string; alergen: boolean }>;
}) {
  if (row.kosong) {
    return (
      <p className="italic">
        [Belum diisi: {row.judul}]
      </p>
    );
  }
  if (row.kunci === 'namaProduk') {
    return <p className="label-cetak-nama">{row.teks}</p>;
  }
  if (row.kunci === 'daftarBahan') {
    return (
      <p>
        {bahanBagian.map((part, index) => (
          <Fragment key={index}>{part.alergen ? <strong>{part.teks}</strong> : part.teks}</Fragment>
        ))}
      </p>
    );
  }
  return <p className="whitespace-pre-line">{row.teks}</p>;
}
