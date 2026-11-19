'use client';

import {
  Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode, type RefObject,
} from 'react';
import { Icon } from '@/components/icons/icon';
import { Button, ButtonLink } from '@/components/ui/button';
import { Segmented } from '@/components/ui/choices';
import { TextField } from '@/components/ui/fields';
import { Notice } from '@/components/ui/surface';
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
  evaluateLabelPrintFit,
  measureLowercaseOHeightMm,
  prepareForCheck,
  reviewLabel,
  type CorrectedLabel,
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
type PreviewZoom = 'muat' | '100' | '150' | '200';
const PREVIEW_ZOOM: { value: PreviewZoom; title: string }[] = [
  { value: 'muat', title: 'Muat' },
  { value: '100', title: '100%' },
  { value: '150', title: '150%' },
  { value: '200', title: '200%' },
];
const CUSTOM_SIZE_ID = 'khusus';
const STICKER_SIZE_OPTIONS = [
  ...STICKER_PRESETS_MM,
  { id: CUSTOM_SIZE_ID, label: 'Kustom', kegunaan: 'Atur lebar dan tinggi', dimensi: null },
];

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

function sameDimensions(a: StickerDimensionsMm, b: StickerDimensionsMm) {
  return a.lebarMm === b.lebarMm && a.tinggiMm === b.tinggiMm;
}

function pasalText(item: { rujukan: { peraturan: string; pasal: string } }): string {
  return `${item.rujukan.peraturan}, ${item.rujukan.pasal}`;
}

export function CetakIsi({ product, onEdit }: { product: SavedProduct; onEdit?: () => void }) {
  const prepared = useMemo(
    () => prepareForCheck(product.label, product.answers),
    [product.label, product.answers],
  );
  const { corrected, report, permit, keputusanKlaim } = useMemo(
    () => reviewLabel(prepared.label, prepared.answers),
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
  const editButton = (children: string, className?: string) => onEdit ? (
    <Button size="md" variant="secondary" icon="edit" className={className} onClick={onEdit}>{children}</Button>
  ) : (
    <ButtonLink href={hrefIsian} size="md" variant="secondary" icon="edit" className={className}>{children}</ButtonLink>
  );

  return (
    <div className="space-y-4 sm:space-y-8 print:space-y-0">
      <header className="cetak-tidak-dicetak grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line pb-4">
        <p className="type-eyebrow col-start-1 row-start-1">Cetak label</p>
        <h1
          id="cetak-judul"
          tabIndex={-1}
          className="type-h1 col-span-2 col-start-1 row-start-2 wrap-anywhere text-ink focus:outline-none md:col-span-1"
        >
          {namaCetak}
        </h1>
        <div className="col-start-2 row-start-1 md:row-span-2 md:self-end">
          {editButton('Ubah isi produk')}
        </div>
      </header>

      {keputusanKlaim && (
        <Notice tone="warning" title="Butuh keputusanmu" className="cetak-tidak-dicetak">
          <p>{keputusanKlaim.aturan.penjelasan}</p>
          <p className="mt-1">{keputusanKlaim.saran}</p>
        </Notice>
      )}

      <LabelBagian corrected={corrected} namaProduk={namaCetak} editButton={editButton} />

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
            <h3 className="text-lg font-bold">Jalur izin untuk label perbaikan</h3>
            <p className="mt-1 font-semibold">{permit.judul}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
              {permit.alasan.map((alasan) => (
                <li key={alasan}>{alasan}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-sm">
              Dasar: {permit.rujukan.map((ref) => `${ref.peraturan}, ${ref.pasal}`).join('; ')}
            </p>
            {keputusanKlaim && (
              <div className="mt-2 text-sm">
                <p className="font-semibold">Butuh keputusanmu</p>
                <p>{keputusanKlaim.saran}</p>
              </div>
            )}
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
            judul={`Temuan kurang pada label awal (${kurang.length})`}
            kosong="Tidak ada butir yang kurang."
            items={kurang}
          />
          <FindingList
            judul={`Belum bisa dicek dari label awal (${tidakBisaDicek.length})`}
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
  editButton,
}: {
  corrected: CorrectedLabel;
  namaProduk: string;
  editButton: (text: string, className?: string) => ReactNode;
}) {
  const { baris, siapUnduh, butirKosong, catatan, bahanBagian } = corrected;
  const tampil = baris.filter((row) => row.wajib || !row.kosong);

  const [dimensi, setDimensi] = useState<StickerDimensionsMm>(DEFAULT_STICKER_DIMENSIONS_MM);
  const [lebarInput, setLebarInput] = useState(String(DEFAULT_STICKER_DIMENSIONS_MM.lebarMm));
  const [tinggiInput, setTinggiInput] = useState(String(DEFAULT_STICKER_DIMENSIONS_MM.tinggiMm));
  const [ukuranKhusus, setUkuranKhusus] = useState(false);
  const namaPilihanUkuran = useId();
  const stickerRef = useRef<HTMLDivElement>(null);

  const lebarValid = parseDimension(lebarInput, MIN_STICKER_WIDTH_MM, MAX_STICKER_WIDTH_MM);
  const tinggiValid = parseDimension(tinggiInput, MIN_STICKER_HEIGHT_MM, MAX_STICKER_HEIGHT_MM);
  const ukuranValid = lebarValid !== null && tinggiValid !== null;
  const bisaCetak = siapUnduh && ukuranValid;

  const fit = useMemo(() => evaluateLabelPrintFit(baris, dimensi), [baris, dimensi]);
  const minimum = fit.ukuranMinimumDisarankan;
  const standar = fit.ukuranProporsionalDisarankan;
  const presetAktif = ukuranKhusus ? CUSTOM_SIZE_ID : STICKER_PRESETS_MM.find(
    (preset) => sameDimensions(preset.dimensi, dimensi),
  )?.id;

  const applyDimensions = (next: StickerDimensionsMm) => {
    setDimensi(next);
    setLebarInput(String(next.lebarMm));
    setTinggiInput(String(next.tinggiMm));
    setUkuranKhusus(!STICKER_PRESETS_MM.some((preset) => sameDimensions(preset.dimensi, next)));
  };

  const updateCustomDimensions = (lebar: string, tinggi: string) => {
    setLebarInput(lebar);
    setTinggiInput(tinggi);
    const lebarMm = parseDimension(lebar, MIN_STICKER_WIDTH_MM, MAX_STICKER_WIDTH_MM);
    const tinggiMm = parseDimension(tinggi, MIN_STICKER_HEIGHT_MM, MAX_STICKER_HEIGHT_MM);
    if (lebarMm !== null && tinggiMm !== null) setDimensi({ lebarMm, tinggiMm });
  };

  const cetakLabel = () => {
    const tinggiPx = stickerRef.current?.offsetHeight ?? 0;
    // Sisakan 12 mm untuk margin halaman dan 14 mm untuk garis uji.
    const tinggiLabelMm = Math.ceil(tinggiPx * (25.4 / 96));
    cetak('label', {
      lebarMm: dimensi.lebarMm + 16,
      tinggiMm: Math.max(dimensi.tinggiMm, fit.tinggiDibutuhkanMm, tinggiLabelMm) + 26,
    });
  };

  return (
    <section
      data-cetak-bagian="label"
      data-siap={bisaCetak ? 'true' : 'false'}
      aria-labelledby="label-judul"
      className="space-y-4 print:space-y-0"
    >
      <h2 id="label-judul" className="cetak-tidak-dicetak sr-only">Label perbaikan</h2>

      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:grid-rows-[auto_1fr] md:gap-4 print:block">
        <div className="cetak-tidak-dicetak cetak-pilihan-ukuran panel min-w-0 p-3 sm:p-4 md:col-start-1">
          <fieldset className="min-w-0">
            <legend className="mb-2.5 type-h3 text-ink sm:mb-3">
              Ukuran stiker <span className="text-sm font-normal text-ink-2">(mm)</span>
            </legend>
            <div className="grid grid-cols-3 gap-1.5 md:grid-cols-2 md:gap-2">
              {STICKER_SIZE_OPTIONS.map(({ id, label, kegunaan, dimensi: pilihan }) => {
                const aktif = id === presetAktif;
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex min-h-11 min-w-0 cursor-pointer flex-col justify-center rounded-[12px] border px-1.5 py-1.5 text-center leading-snug transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand md:min-h-[4.5rem] md:px-2.5 md:py-2 md:text-left',
                      aktif ? 'border-brand bg-brand-tint text-brand-deep' : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-paper',
                    )}
                  >
                    <input
                      type="radio"
                      name={namaPilihanUkuran}
                      value={id}
                      checked={aktif}
                      onChange={() => {
                        if (pilihan) applyDimensions(pilihan);
                        else setUkuranKhusus(true);
                      }}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-center gap-1 text-sm font-bold whitespace-nowrap tabular md:justify-between">
                      {pilihan ? `${pilihan.lebarMm} × ${pilihan.tinggiMm}` : label}
                      {aktif && <Icon name="check" className="hidden shrink-0 md:block" size={16} strokeWidth={2.5} />}
                    </span>
                    <span className="hidden text-xs text-ink-2 md:mt-0.5 md:block">{kegunaan}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {ukuranKhusus && (
            <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-line pt-3">
              <TextField
                label="Lebar (mm)"
                type="number"
                inputMode="numeric"
                min={MIN_STICKER_WIDTH_MM}
                max={MAX_STICKER_WIDTH_MM}
                value={lebarInput}
                error={lebarValid === null ? `Isi angka bulat ${MIN_STICKER_WIDTH_MM}–${MAX_STICKER_WIDTH_MM}.` : undefined}
                onChange={(event) => updateCustomDimensions(event.target.value, tinggiInput)}
              />
              <TextField
                label="Tinggi (mm)"
                type="number"
                inputMode="numeric"
                min={MIN_STICKER_HEIGHT_MM}
                max={MAX_STICKER_HEIGHT_MM}
                value={tinggiInput}
                error={tinggiValid === null ? `Isi angka bulat ${MIN_STICKER_HEIGHT_MM}–${MAX_STICKER_HEIGHT_MM}.` : undefined}
                onChange={(event) => updateCustomDimensions(lebarInput, event.target.value)}
              />
            </div>
          )}
        </div>

        <PratinjauStiker
          dimensi={dimensi}
          namaProduk={namaProduk}
          rows={tampil}
          bahanBagian={bahanBagian}
          stickerRef={stickerRef}
        >
          <div id="status-ukuran-stiker" role="status" className="text-sm leading-snug">
            {!ukuranValid ? (
              <p className="text-danger-ink">Ukuran belum valid. Pratinjau memakai ukuran terakhir.</p>
            ) : fit.muat ? (
              <p className="flex items-center gap-1 font-semibold text-success-ink">
                <Icon name="check" size={17} strokeWidth={2.5} /> Isi muat
              </p>
            ) : (
              <p className="flex items-center gap-1 font-semibold text-warning-ink">
                <Icon name="warning" size={17} className="shrink-0" /> Perlu tinggi sekitar {minimum.tinggiMm} mm
              </p>
            )}
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
        </PratinjauStiker>

        {ukuranValid && !fit.muat && (
          <Notice
            tone="warning"
            title="Perkiraan isi melebihi tinggi stiker"
            className="cetak-tidak-dicetak min-w-0 md:col-start-1"
          >
            <p>Tinggi label di PDF menyesuaikan jika teks melebihi ukuran pilihan.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {minimum.tinggiMm <= MAX_STICKER_HEIGHT_MM && (
                <Button size="md" variant="secondary" onClick={() => applyDimensions(minimum)}>
                  Pakai {minimum.lebarMm} × {minimum.tinggiMm} mm
                </Button>
              )}
              {standar.lebarMm <= MAX_STICKER_WIDTH_MM &&
                standar.tinggiMm <= MAX_STICKER_HEIGHT_MM &&
                !sameDimensions(standar, minimum) && (
                <Button size="md" variant="secondary" onClick={() => applyDimensions(standar)}>
                  Pakai {standar.lebarMm} × {standar.tinggiMm} mm
                </Button>
              )}
            </div>
          </Notice>
        )}
      </div>

      {!siapUnduh && (
        <Notice tone="danger" title="Lengkapi butir wajib untuk menyimpan label" className="cetak-tidak-dicetak">
          <ul id="butir-kosong-daftar" className="list-disc space-y-1 pl-5">
            {butirKosong.map((judul) => <li key={judul}>{judul}</li>)}
          </ul>
          {editButton('Lengkapi isian label', 'mt-3')}
        </Notice>
      )}

      {catatan.length > 0 && (
        <Notice tone="info" title="Yang diubah dan yang perlu kamu cek" className="cetak-tidak-dicetak">
          <ul className="list-disc space-y-1 pl-5">
            {catatan.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Notice>
      )}

      <details className="cetak-tidak-dicetak">
        <summary className="cursor-pointer py-3 text-sm font-semibold text-brand-deep">
          Panduan cetak dan ukuran huruf
        </summary>
        <p className="max-w-prose text-sm text-ink-2">
          Pilih &ldquo;Simpan sebagai PDF&rdquo; dengan skala 100% di dialog cetak. Ukur garis uji pada hasil cetak dengan penggaris.
          Panjangnya harus tepat 10 mm. Matikan <em>Fit to page</em> jika garis menyusut.
        </p>
        <p className="mt-2 max-w-prose text-sm text-ink-2">
          Tinggi huruf kecil &ldquo;o&rdquo; adalah {measureLowercaseOHeightMm(BODY_FONT_SIZE_MM).toLocaleString('id-ID')} mm pada teks umum
          dan {measureLowercaseOHeightMm(HEADING_WARNING_FONT_SIZE_MM).toLocaleString('id-ID')} mm pada nama pangan serta peringatan alergen.
        </p>
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

function PratinjauStiker({
  dimensi,
  namaProduk,
  rows,
  bahanBagian,
  stickerRef,
  children,
}: {
  dimensi: StickerDimensionsMm;
  namaProduk: string;
  rows: CorrectedLabelRow[];
  bahanBagian: CorrectedLabel['bahanBagian'];
  stickerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<PreviewZoom>('muat');
  const [skalaMuat, setSkalaMuat] = useState(1);
  const { lebarMm, tinggiMm } = dimensi;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const sticker = stickerRef.current;
    if (!canvas || !sticker) return;

    const ukur = () => {
      if (canvas.clientWidth <= 2 || canvas.clientHeight <= 2) return;
      setSkalaMuat(Math.min(
        1.5,
        (canvas.clientWidth - 2) / sticker.offsetWidth,
        (canvas.clientHeight - 2) / sticker.offsetHeight,
      ));
    };
    ukur();
    const observer = new ResizeObserver(ukur);
    observer.observe(canvas);
    observer.observe(sticker);
    return () => observer.disconnect();
  }, [lebarMm, tinggiMm, stickerRef]);

  useEffect(() => {
    canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  }, [lebarMm, tinggiMm, zoom]);

  const stickerStyle = {
    '--stiker-lebar': `${lebarMm}mm`,
    '--stiker-tinggi': `${tinggiMm}mm`,
    '--stiker-zoom': zoom === 'muat' ? skalaMuat : Number(zoom) / 100,
  } as CSSProperties;

  return (
    <div className="panel min-w-0 space-y-3 p-3 sm:p-4 md:sticky md:top-24 md:col-start-2 md:row-span-2 md:row-start-1 print:contents print:space-y-0">
      <header className="cetak-tidak-dicetak flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="type-h3 text-ink">Pratinjau</h3>
          <p className="text-xs text-ink-2 tabular">{lebarMm} × {tinggiMm} mm</p>
        </div>
        <Segmented
          label="Pembesaran pratinjau"
          value={zoom}
          onChange={setZoom}
          options={PREVIEW_ZOOM}
          className="[&>label]:px-1 [&>label]:text-[0.6875rem] xs:[&>label]:px-2.5 xs:[&>label]:text-xs"
        />
      </header>

      <div className="cetak-kanvas rounded-[16px] border border-line bg-brand-tint p-2.5 sm:p-4 print:contents">
        <div
          ref={canvasRef}
          role="region"
          aria-label="Area pratinjau stiker"
          tabIndex={0}
          className="h-[clamp(8rem,30svh,18rem)] overflow-auto xs:h-[clamp(9rem,34svh,18rem)] md:h-[clamp(14rem,48svh,27rem)] print:contents"
        >
          <div className="grid min-h-full w-max min-w-full place-items-center print:contents">
            <div
              ref={stickerRef}
              className="label-cetak shadow-raised print:shadow-none"
              style={stickerStyle}
              aria-label={`Pratinjau label ${namaProduk} ukuran ${lebarMm} kali ${tinggiMm} milimeter`}
              role="group"
            >
              {rows.map((row) => <LabelBaris key={row.kunci} row={row} bahanBagian={bahanBagian} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="cetak-tidak-dicetak flex flex-wrap items-center justify-between gap-2">
        {children}
      </div>

      <div className="hidden w-fit items-center gap-2 rounded border border-black bg-white px-2.5 py-1.5 text-black print:mt-3 print:flex print:break-inside-avoid">
        <span className="skala-10mm-bar" aria-hidden />
        <span className="type-code font-bold">10 mm</span>
      </div>
    </div>
  );
}

function LabelBaris({
  row,
  bahanBagian,
}: {
  row: CorrectedLabelRow;
  bahanBagian: CorrectedLabel['bahanBagian'];
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
