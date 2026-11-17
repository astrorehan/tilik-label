'use client';

import Image from 'next/image';

export interface SamplePhoto {
  file: string;
  nama: string;
  kemasan: string;
}

/** Foto kemasan rekaan. Isinya sama dengan tiga contoh di halaman Contoh untuk juri. */
export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    file: 'kue-kering-kacang.jpg',
    nama: 'Kue kering kacang',
    kemasan: 'Pouch kertas',
  },
  { file: 'sambal-bawang.jpg', nama: 'Sambal bawang', kemasan: 'Toples kaca' },
  { file: 'kerupuk-ikan.jpg', nama: 'Kerupuk ikan', kemasan: 'Plastik bening' },
];

export const samplePhotoUrl = (photo: SamplePhoto) =>
  `/contoh-foto/${photo.file}`;

/** Pilihan foto contoh untuk mencoba alur baca foto tanpa kemasan sungguhan. */
export function SamplePhotos({
  onPick,
  disabled,
}: {
  onPick: (photo: SamplePhoto) => void;
  disabled?: boolean;
}) {
  return (
    <section aria-labelledby="foto-contoh-judul" className="space-y-3">
      <div>
        <h2 id="foto-contoh-judul" className="text-base font-semibold text-ink">
          Belum ada kemasan di dekatmu?
        </h2>
        <p className="mt-1 text-sm leading-snug text-ink-2">
          Coba dulu dengan foto contoh. Semua nama, alamat, dan nomor di
          dalamnya rekaan.
        </p>
      </div>
      <div className="grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3">
        {SAMPLE_PHOTOS.map((photo) => (
          <button
            key={photo.file}
            type="button"
            onClick={() => onPick(photo)}
            disabled={disabled}
            className="group overflow-hidden rounded-[16px] border border-line bg-surface text-left transition-[border-color] duration-150 hover:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Image
              src={samplePhotoUrl(photo)}
              alt=""
              width={1080}
              height={1440}
              sizes="(min-width: 640px) 190px, 30vw"
              className="aspect-[3/4] h-auto w-full object-cover"
            />
            <span className="block px-2.5 py-2">
              <span className="block text-sm font-semibold leading-tight text-ink">
                {photo.nama}
              </span>
              <span className="mt-0.5 block text-xs text-ink-3">
                {photo.kemasan}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
