'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import type { PreparedImage } from '@/lib/image/prepareImage';

function formatKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('id-ID')} KB`;
}

/** Pratinjau gambar yang sudah dikecilkan beserta hasil cek mutunya. */
export function ImageCheck({
  image,
  onRetake,
  onContinue,
  continueLabel = 'Lanjut isi label',
}: {
  image: PreparedImage;
  onRetake: () => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div className="panel space-y-4 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <Image
          unoptimized
          src={image.dataUrl}
          width={image.width}
          height={image.height}
          alt="Gambar label yang akan diperiksa"
          className="h-auto max-h-80 w-full rounded-[14px] border border-line bg-paper object-contain"
        />
        <div className="min-w-0 space-y-3">
          {image.mutu.baik ? (
            <Notice tone="success" title="Gambar tampak cukup jelas">
              Tetap periksa hasil bacaannya nanti, karena tulisan kecil bisa saja salah terbaca.
            </Notice>
          ) : (
            <Notice tone="warning" title="Mutu gambar kurang baik">
              <ul className="list-disc space-y-1 pl-4">
                {image.mutu.masalah.map((issue) => (
                  <li key={issue.kode}>{issue.pesan}</li>
                ))}
              </ul>
              <p className="mt-1.5">Sebaiknya foto ulang. Kamu tetap boleh lanjut.</p>
            </Notice>
          )}
          <p className="text-xs text-ink-3">
            Sudah dikecilkan di perangkat: {image.originalWidth}×{image.originalHeight} menjadi{' '}
            {image.width}×{image.height} piksel, sekitar {formatKb(image.bytes)}.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line pt-4 sm:flex-row sm:justify-between">
        <Button variant="secondary" size="lg" icon="reset" onClick={onRetake}>
          Ganti gambar
        </Button>
        <Button size="lg" iconAfter="arrowRight" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
