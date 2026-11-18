'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import type { PreparedImage } from '@/lib/image/prepareImage';

export function ImageCheck({
  image,
  onRetake,
  onContinue,
  onRead,
  reading,
}: {
  image: PreparedImage;
  onRetake: () => void;
  onContinue: () => void;
  onRead: () => void;
  reading: boolean;
}) {
  return (
    <div className="panel p-4 sm:p-6">
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-6">
        <Image
          unoptimized
          src={image.dataUrl}
          width={image.width}
          height={image.height}
          alt="Gambar label yang akan diperiksa"
          className="h-auto max-h-72 w-full rounded-[16px] border border-line bg-paper object-contain"
        />
        <div className="min-w-0 space-y-3">
          {image.mutu.baik ? (
            <h2 className="type-h3">Foto siap dibaca</h2>
          ) : (
            <Notice tone="warning" title="Sebagian tulisan mungkin sulit dibaca">
              <ul className="list-disc space-y-1 pl-4">
                {image.mutu.masalah.map((issue) => <li key={issue.kode}>{issue.pesan}</li>)}
              </ul>
            </Notice>
          )}
          <p className="text-sm leading-relaxed text-ink-2">
            Saat kamu memilih Baca label, foto dikirim ke layanan pembaca. Tilik Label tidak menyimpan fotonya.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button icon="scan" busy={reading} disabled={reading} onClick={onRead}>
              {reading ? 'Membaca label…' : 'Baca label'}
            </Button>
            <Button variant="secondary" onClick={onContinue} disabled={reading}>Isi sendiri</Button>
          </div>
          <Button variant="ghost" size="md" icon="reset" className="-ml-3" onClick={onRetake} disabled={reading}>
            Ganti gambar
          </Button>
          <p role="status" className={reading ? 'text-sm text-ink-2' : 'sr-only'}>
            {reading ? 'Tulisan pada foto sedang dibaca. Hasilnya bisa kamu koreksi.' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
