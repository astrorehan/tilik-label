'use client';

import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CorrectedLabel, CorrectedLabelKey, CorrectedLabelRow } from '@/domain';
import { cn } from '@/lib/cn';

/** Lebar stiker bawaan dalam piksel layar (90 mm pada 96 dpi). */
const STICKER_WIDTH_PX = (90 / 25.4) * 96;

export interface RowMark {
  /** Nomor perbaikan otomatis yang menyentuh baris ini. */
  numbers: number[];
  /** Masih ada aturan pada baris ini yang menunggu keputusan pengguna. */
  needsDecision: boolean;
}

/**
 * Pratinjau label perbaikan dengan ukuran huruf berskala milimeter seperti hasil cetak,
 * diperkecil agar muat di kolom. Baris yang diubah Tilik diberi tanda bernomor, dan
 * baris yang masih menunggu keputusan diberi garis bawah merah.
 */
export function CorrectedLabelPreview({
  corrected,
  marks,
}: {
  corrected: CorrectedLabel;
  marks: Partial<Record<CorrectedLabelKey, RowMark>>;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const rows = corrected.baris.filter((row) => row.wajib || !row.kosong);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? box.clientWidth;
      setZoom(Math.max(0.6, Math.min(1.3, (width - 8) / STICKER_WIDTH_PX)));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="flex justify-center">
      <div
        className="label-cetak relative rounded-[1.2mm] shadow-[0_18px_40px_-22px_rgb(36_41_31/0.55)]"
        style={{ '--stiker-zoom': zoom, borderWidth: '0.3mm' } as CSSProperties}
        role="group"
        aria-label="Pratinjau label perbaikan"
      >
        {rows.map((row) => (
          <PreviewRow
            key={row.kunci}
            row={row}
            parts={corrected.bahanBagian}
            mark={marks[row.kunci]}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewRow({
  row,
  parts,
  mark,
}: {
  row: CorrectedLabelRow;
  parts: CorrectedLabel['bahanBagian'];
  mark?: RowMark;
}) {
  const fixed = Boolean(mark && mark.numbers.length > 0);
  const badge = mark ? (
    <>
      {mark.numbers.map((number) => (
        <span
          key={number}
          aria-label={`perubahan nomor ${number}`}
          className="mr-[0.8mm] inline-grid size-[3.6mm] place-items-center rounded-full bg-brand-deep align-[0.2mm] font-sans text-[2mm] leading-none font-bold text-white"
        >
          {number}
        </span>
      ))}
      {mark.needsDecision && <span className="sr-only">(masih menunggu keputusanmu) </span>}
    </>
  ) : null;
  const highlight = cn(
    fixed && !mark?.needsDecision && 'rounded-[0.8mm] bg-action/60 [box-decoration-break:clone] px-[0.6mm]',
    mark?.needsDecision &&
      'underline decoration-danger decoration-wavy decoration-[0.3mm] underline-offset-[0.7mm] [text-decoration-skip-ink:none]',
  );

  if (row.kosong) {
    return (
      <p className="rounded-[0.8mm] bg-danger-tint px-[0.6mm] text-danger-ink italic">
        [Belum diisi: {row.judul}]
      </p>
    );
  }
  if (row.kunci === 'namaProduk') {
    return <p className={cn('label-cetak-nama', highlight)}>{badge}{row.teks}</p>;
  }
  if (row.kunci === 'pernyataanAlergen') {
    return <p className={cn('label-cetak-peringatan', highlight)}>{badge}{row.teks}</p>;
  }
  if (row.kunci === 'daftarBahan') {
    return (
      <p className={cn('whitespace-pre-line', highlight)}>
        {badge}
        {parts.map((part, index) => (
          <Fragment key={index}>{part.alergen ? <strong>{part.teks}</strong> : part.teks}</Fragment>
        ))}
      </p>
    );
  }
  return <p className={cn('whitespace-pre-line', highlight)}>{badge}{row.teks}</p>;
}
