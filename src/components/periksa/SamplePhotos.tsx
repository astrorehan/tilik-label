import Image from 'next/image';
import { Icon } from '@/components/icons/icon';

export interface SamplePhoto {
  file: string;
  nama: string;
}

const SAMPLE_PHOTOS: SamplePhoto[] = [
  { file: 'kue-kering-kacang.jpg', nama: 'Kue kering kacang' },
  { file: 'sambal-bawang.jpg', nama: 'Sambal bawang' },
  { file: 'kerupuk-ikan.jpg', nama: 'Kerupuk ikan' },
];

export const samplePhotoUrl = (photo: SamplePhoto) => `/contoh-foto/${photo.file}`;

export function SamplePhotos({
  onPick,
  disabled,
}: {
  onPick: (photo: SamplePhoto) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-2">Pilih kemasan rekaan untuk mencoba pembaca foto.</p>
      <ul className="divide-y divide-line">
        {SAMPLE_PHOTOS.map((photo) => (
          <li key={photo.file}>
            <button
              type="button"
              onClick={() => onPick(photo)}
              disabled={disabled}
              className="flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left hover:bg-brand-tint disabled:opacity-60"
            >
              <Image
                src={samplePhotoUrl(photo)}
                alt=""
                width={1080}
                height={1440}
                sizes="44px"
                className="size-11 shrink-0 rounded-lg object-cover"
              />
              <span className="flex-1 text-sm font-semibold text-ink">{photo.nama}</span>
              <Icon name="arrowRight" size={17} className="shrink-0 text-brand-deep" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
