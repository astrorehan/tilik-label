'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { TextField } from '@/components/ui/fields';
import { Notice, Pill } from '@/components/ui/surface';
import {
  BODY_FONT_SIZE_MM,
  DEFAULT_STICKER_DIMENSIONS_MM,
  HEADING_WARNING_FONT_SIZE_MM,
  MAX_STICKER_HEIGHT_MM,
  MAX_STICKER_WIDTH_MM,
  MIN_STICKER_HEIGHT_MM,
  MIN_STICKER_WIDTH_MM,
  REGULATION_LAST_READ,
  STICKER_PRESETS_MM,
  buildCorrectedLabel,
  evaluateLabelPrintFit,
  evaluateLabelRules,
  evaluatePermitPath,
  measureLowercaseOHeightMm,
  prepareForCheck,
  type CorrectedLabelRow,
  type LabelRuleResult,
  type StickerDimensionsMm,
} from '@/domain';
import { cn } from '@/lib/cn';
import type { SavedProduct } from '@/lib/produkSaya';

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });

function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '-' : dateFormatter.format(new Date(time));
}

type Bagian = 'label' | 'ringkasan';

const PAGE_STYLE_ID = 'ukuran-halaman-stiker';
const PREVIEW_ZOOM = [100, 150, 200];

function resetCetak() {
  delete document.documentElement.dataset.cetak;
  document.getElementById(PAGE_STYLE_ID)?.remove();
}

function cetak(bagian: Bagian, ukuranHalaman?: StickerDimensionsMm) {
  resetCetak();
  if (bagian === 'label' && ukuranHalaman) {
    const style = document.createElement('style');
    style.id = PAGE_STYLE_ID;
    style.textContent = `@media print {
      @page stiker {
        size: ${ukuranHalaman.lebarMm}mm ${ukuranHalaman.tinggiMm}mm;
        margin: 6mm;
      }
    }`;
    document.head.append(style);
  }
  document.documentElement.dataset.cetak = bagian;
  window.print();
}

function parseDimension(raw: string, min: number, max: number) {
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
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
    const media = window.matchMedia('print');
    const onMedia = (event: MediaQueryListEvent) => {
      if (!event.matches) resetCetak();
    };
    window.addEventListener('afterprint', resetCetak);
    media.addEventListener('change', onMedia);
    return () => {
      window.removeEventListener('afterprint', resetCetak);
      media.removeEventListener('change', onMedia);
      resetCetak();
    };
  }, []);

  const kurang = report.hasil.filter((item) => item.status === 'kurang');
  const tidakBisaDicek = report.hasil.filter((item) => item.status === 'tidak_bisa_dicek');
  const namaCetak = product.nama;
  const hrefIsian = `/periksa?produk=${encodeURIComponent(product.id)}&step=isi`;

  return (
    <div className="space-y-10 print:space-y-0">
      <header className="cetak-tidak-dicetak flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="max-w-2xl">
          <p className="type-eyebrow">Label skala fisik &amp; ringkasan</p>
          <h1 className="type-h1 mt-1.5 break-words text-ink">{namaCetak}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2 sm:text-base">
            Stiker ditata pada skala milimeter nyata dengan ukuran huruf minimum Pasal 9 yang
            dijamin aplikasi. Pilih &ldquo;Simpan sebagai PDF&rdquo; dengan skala 100% di dialog cetak.
          </p>
        </div>
        <ButtonLink
          href={hrefIsian}
          size="md"
          variant="secondary"
          icon="edit"
        >
          Ubah isi produk
        </ButtonLink>
      </header>

      <LabelBagian corrected={corrected} namaProduk={namaCetak} hrefIsian={hrefIsian} />

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
              Satu lembar A4 untuk dibawa ke Dinas Kesehatan atau percetakan.
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
  hrefIsian,
}: {
  corrected: ReturnType<typeof buildCorrectedLabel>;
  namaProduk: string;
  hrefIsian: string;
}) {
  const { baris, siapUnduh, butirKosong, catatan, bahanBagian } = corrected;
  const tampil = baris.filter((row) => row.wajib || !row.kosong);

  const [dimensi, setDimensi] = useState<StickerDimensionsMm>(DEFAULT_STICKER_DIMENSIONS_MM);
  const [lebarInput, setLebarInput] = useState(String(DEFAULT_STICKER_DIMENSIONS_MM.lebarMm));
  const [tinggiInput, setTinggiInput] = useState(String(DEFAULT_STICKER_DIMENSIONS_MM.tinggiMm));
  const [zoom, setZoom] = useState(100);
  const stickerRef = useRef<HTMLDivElement>(null);

  const lebarValid = parseDimension(lebarInput, MIN_STICKER_WIDTH_MM, MAX_STICKER_WIDTH_MM);
  const tinggiValid = parseDimension(tinggiInput, MIN_STICKER_HEIGHT_MM, MAX_STICKER_HEIGHT_MM);
  const ukuranValid = lebarValid !== null && tinggiValid !== null;
  const bisaCetak = siapUnduh && ukuranValid;

  const fit = useMemo(() => evaluateLabelPrintFit(baris, dimensi), [baris, dimensi]);
  const bodyOMm = measureLowercaseOHeightMm(BODY_FONT_SIZE_MM);
  const headingOMm = measureLowercaseOHeightMm(HEADING_WARNING_FONT_SIZE_MM);
  const minimum = fit.ukuranMinimumDisarankan;
  const standar = fit.ukuranProporsionalDisarankan;

  const applyDimensions = (next: StickerDimensionsMm) => {
    setDimensi(next);
    setLebarInput(String(next.lebarMm));
    setTinggiInput(String(next.tinggiMm));
  };

  const cetakLabel = () => {
    const tinggiPx = stickerRef.current?.getBoundingClientRect().height ?? 0;
    // Sisakan 12 mm untuk margin halaman dan 14 mm untuk garis uji.
    const tinggiLabelMm = Math.ceil((tinggiPx / (zoom / 100)) * (25.4 / 96));
    cetak('label', {
      lebarMm: dimensi.lebarMm + 16,
      tinggiMm: Math.max(dimensi.tinggiMm, fit.tinggiDibutuhkanMm, tinggiLabelMm) + 26,
    });
  };

  const stickerStyle = {
    '--stiker-lebar': `${dimensi.lebarMm}mm`,
    '--stiker-tinggi': `${dimensi.tinggiMm}mm`,
    '--stiker-zoom': zoom / 100,
  } as CSSProperties;

  return (
    <section
      data-cetak-bagian="label"
      data-siap={bisaCetak ? 'true' : 'false'}
      aria-labelledby="label-judul"
      className="space-y-5 print:space-y-0"
    >
      <div className="cetak-tidak-dicetak space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="label-judul" className="type-h2 text-ink">
              Label perbaikan berskala fisik
            </h2>
            <p className="mt-1 text-sm leading-snug text-ink-2">
              Teks ditata langsung dalam satuan milimeter (mm). Huruf kecil &ldquo;o&rdquo; pada
              font aplikasi dijamin <strong>{bodyOMm.toLocaleString('id-ID')} mm</strong> untuk teks
              umum (min. 1 mm, Pasal 9 ayat 2) dan{' '}
              <strong>{headingOMm.toLocaleString('id-ID')} mm</strong> untuk nama pangan serta
              peringatan alergen (min. 2 mm, Pasal 9 ayat 3 &amp; 4).
            </p>
          </div>
          <Button
            icon="printer"
            size="md"
            disabled={!bisaCetak}
            aria-describedby={!siapUnduh ? 'butir-kosong-daftar' : !ukuranValid ? 'status-ukuran-stiker' : undefined}
            onClick={cetakLabel}
          >
            Simpan PDF label (1:1)
          </Button>
        </div>

        {/* Pengatur ukuran stiker dalam milimeter */}
        <div className="panel space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink">Ukuran stiker kemasan (milimeter)</h3>
              <p className="text-xs text-ink-2">
                Pilih ukuran stiker atau masukkan lebar dan tinggi dalam mm.
              </p>
            </div>
            <div id="status-ukuran-stiker" role="status">
              {ukuranValid ? (
                <Pill tone={fit.muat ? 'success' : 'warning'} dot>
                  {fit.muat
                    ? `Muat pada ${dimensi.lebarMm} × ${dimensi.tinggiMm} mm (isi ~${fit.tinggiDibutuhkanMm} mm)`
                    : `Butuh minimal ${minimum.lebarMm} × ${minimum.tinggiMm} mm`}
                </Pill>
              ) : (
                <p className="text-xs font-semibold text-danger-ink">
                  Perbaiki ukuran untuk mencetak. Pratinjau masih memakai ukuran terakhir yang valid.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Ukuran stiker standar">
            {STICKER_PRESETS_MM.map((preset) => {
                const active = ukuranValid &&
                preset.dimensi.lebarMm === dimensi.lebarMm &&
                preset.dimensi.tinggiMm === dimensi.tinggiMm;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyDimensions(preset.dimensi)}
                  className={cn(
                    'rounded-[12px] border px-3 py-2 text-left text-xs transition-colors',
                    active
                      ? 'border-2 border-brand bg-brand-tint/45 font-bold text-brand-deep'
                      : 'border-line bg-paper hover:border-line-strong text-ink',
                  )}
                >
                  <span className="block font-semibold">{preset.label}</span>
                  <span className="text-[11px] text-ink-3">{preset.kegunaan}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 xs:grid-cols-2 sm:max-w-md">
            <TextField
              id="stiker-lebar-mm"
              label="Lebar stiker (mm)"
              type="number"
              inputMode="numeric"
              min={MIN_STICKER_WIDTH_MM}
              max={MAX_STICKER_WIDTH_MM}
              value={lebarInput}
              hint={`${MIN_STICKER_WIDTH_MM}–${MAX_STICKER_WIDTH_MM} mm`}
              error={lebarValid === null ? `Masukkan lebar bulat antara ${MIN_STICKER_WIDTH_MM} dan ${MAX_STICKER_WIDTH_MM} mm.` : undefined}
              onChange={(event) => {
                const raw = event.target.value;
                const lebarMm = parseDimension(raw, MIN_STICKER_WIDTH_MM, MAX_STICKER_WIDTH_MM);
                setLebarInput(raw);
                if (lebarMm !== null) setDimensi((prev) => ({ ...prev, lebarMm }));
              }}
            />
            <TextField
              id="stiker-tinggi-mm"
              label="Tinggi stiker (mm)"
              type="number"
              inputMode="numeric"
              min={MIN_STICKER_HEIGHT_MM}
              max={MAX_STICKER_HEIGHT_MM}
              value={tinggiInput}
              hint={`${MIN_STICKER_HEIGHT_MM}–${MAX_STICKER_HEIGHT_MM} mm`}
              error={tinggiValid === null ? `Masukkan tinggi bulat antara ${MIN_STICKER_HEIGHT_MM} dan ${MAX_STICKER_HEIGHT_MM} mm.` : undefined}
              onChange={(event) => {
                const raw = event.target.value;
                const tinggiMm = parseDimension(raw, MIN_STICKER_HEIGHT_MM, MAX_STICKER_HEIGHT_MM);
                setTinggiInput(raw);
                if (tinggiMm !== null) setDimensi((prev) => ({ ...prev, tinggiMm }));
              }}
            />
          </div>

          {ukuranValid && !fit.muat && fit.alasanTidakMuat && (
            <Notice tone="warning" title="Ukuran stiker terlalu kecil untuk memuat seluruh butir wajib">
              <p>{fit.alasanTidakMuat}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {minimum.tinggiMm <= MAX_STICKER_HEIGHT_MM && (
                  <Button size="md" onClick={() => applyDimensions(minimum)}>
                    Pakai ukuran minimum ({minimum.lebarMm} × {minimum.tinggiMm} mm)
                  </Button>
                )}
                {standar.lebarMm <= MAX_STICKER_WIDTH_MM &&
                  standar.tinggiMm <= MAX_STICKER_HEIGHT_MM &&
                  (standar.lebarMm !== minimum.lebarMm || standar.tinggiMm !== minimum.tinggiMm) && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => applyDimensions(standar)}
                  >
                    Pakai ukuran standar ({standar.lebarMm} × {standar.tinggiMm} mm)
                  </Button>
                )}
              </div>
            </Notice>
          )}
        </div>

        {!siapUnduh && (
          <Notice tone="danger" title="Label belum bisa diunduh: masih ada butir wajib yang kosong">
            <p>
              Aplikasi tidak mengarang isi label. Lengkapi butir berikut di isi produk, lalu buka
              halaman ini lagi.
            </p>
            <ul id="butir-kosong-daftar" className="mt-2 list-disc space-y-1 pl-5">
              {butirKosong.map((judul) => (
                <li key={judul} className="font-semibold text-ink">
                  {judul}
                </li>
              ))}
            </ul>
            <ButtonLink href={hrefIsian} variant="secondary" size="md" icon="edit" className="mt-3">
              Lengkapi isian label
            </ButtonLink>
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

      <div className="cetak-tidak-dicetak flex flex-wrap items-center gap-2" role="group" aria-label="Zoom pratinjau">
        <span className="mr-1 text-sm font-semibold">Zoom pratinjau</span>
        {PREVIEW_ZOOM.map((level) => (
          <Button
            key={level}
            variant={zoom === level ? 'accent' : 'secondary'}
            size="md"
            aria-pressed={zoom === level}
            onClick={() => setZoom(level)}
          >
            {level}%
          </Button>
        ))}
      </div>

      <div
        role="region"
        aria-label="Area pratinjau stiker"
        tabIndex={0}
        className="overflow-x-auto rounded-[20px] border border-line bg-surface p-4 sm:p-6 print:overflow-visible print:rounded-none print:border-0 print:p-0"
      >
        <div
          ref={stickerRef}
          className="label-cetak"
          style={stickerStyle}
          aria-label={`Pratinjau label ${namaProduk} ukuran ${dimensi.lebarMm} kali ${dimensi.tinggiMm} milimeter`}
          role="group"
        >
          {tampil.map((row) => (
            <LabelBaris key={row.kunci} row={row} bahanBagian={bahanBagian} />
          ))}
        </div>

        {/* Garis skala 10 mm ikut tercetak di PDF untuk verifikasi penggaris fisik */}
        <div
          aria-label="Garis uji skala 10 milimeter"
          className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-ink-2 print:break-inside-avoid print:text-black"
        >
          <div className="inline-flex items-center gap-2 rounded border border-line bg-paper px-2.5 py-1.5 print:border-black print:bg-white">
            <span className="skala-10mm-bar" aria-hidden />
            <span className="type-code font-bold text-ink print:text-black">10 mm</span>
          </div>
          <span className="cetak-tidak-dicetak">
            Ukur garis ini dengan penggaris setelah dicetak (harus tepat <strong>10 mm</strong> / 1
            cm). Bila menyusut, matikan <em>Fit to page</em> di pengaturan cetak. Ukuran stiker:{' '}
            <strong>
              {dimensi.lebarMm} × {dimensi.tinggiMm} mm
            </strong>
            .
          </span>
        </div>
      </div>

      <details className="cetak-tidak-dicetak">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-brand-deep">
          Dasar pasal &amp; ukuran huruf tiap butir
        </summary>
        <ul className="mt-2 divide-y divide-line rounded-[16px] border border-line bg-surface">
          {fit.rincianBaris.map((est) => {
            const row = tampil.find((r) => r.kunci === est.kunci);
            return (
              <li
                key={est.kunci}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-semibold text-ink">{est.judul}</span>
                  {row && (
                    <span className="text-ink-2">
                      {' '}
                      · {row.rujukan.peraturan}, {row.rujukan.pasal}
                    </span>
                  )}
                </div>
                <span className="type-code text-xs text-ink-3">
                  huruf &ldquo;o&rdquo; {est.tinggiHurufOMm.toLocaleString('id-ID')} mm ·{' '}
                  {est.jumlahBaris} baris (~{est.tinggiMm.toLocaleString('id-ID')} mm)
                </span>
              </li>
            );
          })}
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
    return <p className="italic">[Belum diisi: {row.judul}]</p>;
  }
  if (row.kunci === 'namaProduk') {
    return <p className="label-cetak-nama">{row.teks}</p>;
  }
  if (row.kunci === 'pernyataanAlergen') {
    return <p className="label-cetak-peringatan">{row.teks}</p>;
  }
  if (row.kunci === 'daftarBahan') {
    return (
      <p className="whitespace-pre-line">
        {bahanBagian.map((part, index) => (
          <Fragment key={index}>{part.alergen ? <strong>{part.teks}</strong> : part.teks}</Fragment>
        ))}
      </p>
    );
  }
  return <p className="whitespace-pre-line">{row.teks}</p>;
}
