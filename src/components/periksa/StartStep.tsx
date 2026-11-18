'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import { cn } from '@/lib/cn';
import type { PreparedImage } from '@/lib/image/prepareImage';
import { ReadingChecklist } from './ReadingStatus';
import { SAMPLE_PHOTOS, samplePhotoDisplayUrl } from './SamplePhotos';
import type { ImagePicker } from './useImagePicker';

interface StartStepProps {
  image: PreparedImage | null;
  picker: ImagePicker;
  onContinue: () => void;
  onWithoutLabel: () => void;
  onRead: () => void;
  onCancelRead: () => void;
  reading: boolean;
  readCancelled: boolean;
}

const PHOTO_TIPS: { icon: IconName; text: string }[] = [
  { icon: 'document', text: 'Foto sisi yang ada daftar bahannya' },
  { icon: 'scan', text: 'Semua tulisan masuk bingkai' },
  { icon: 'flashlight', text: 'Cahaya merata, tanpa pantulan' },
];

/** Alur setelah foto siap. Menegaskan pembagian kerja: AI membaca, aturan memutuskan. */
const NEXT_STEPS: { icon: IconName; title: string; text: string; tag?: string }[] = [
  {
    icon: 'scan',
    title: 'Tilik membaca foto',
    text: 'Tulisan di kemasan disalin ke kolom isian. Kamu tinggal mencocokkan.',
    tag: 'AI',
  },
  {
    icon: 'help',
    title: 'Lima pertanyaan singkat',
    text: 'Lengkapi umur simpan, resep, dan data produksi yang masih perlu dipastikan.',
  },
  {
    icon: 'shield',
    title: '20 aturan BPOM memeriksa',
    text: 'Lolos atau tidaknya diputuskan aturan tertulis, bukan tebakan AI.',
    tag: 'Aturan',
  },
  {
    icon: 'printer',
    title: 'Label perbaikan siap cetak',
    text: 'Yang bisa dibetulkan langsung dibetulkan, sisanya kita benahi bersama.',
  },
];

/** Kolom kanan langkah pertama: cara menambah foto, lalu tombol baca. */
export function StartStep({
  image,
  picker,
  onContinue,
  onWithoutLabel,
  onRead,
  onCancelRead,
  reading,
  readCancelled,
}: StartStepProps) {
  return (
    <div className="space-y-4">
      {picker.error && (
        <div role="alert">
          <Notice tone="danger" title="Gambar belum bisa dipakai">{picker.error}</Notice>
        </div>
      )}
      <p role="status" className={picker.busy ? 'text-sm font-semibold text-ink-2' : 'sr-only'}>
        {picker.busy ? 'Menyiapkan gambar…' : ''}
      </p>

      {image ? (
        <ReadPanel
          image={image}
          reading={reading}
          readCancelled={readCancelled}
          onRead={onRead}
          onCancelRead={onCancelRead}
          onContinue={onContinue}
        />
      ) : picker.cameraOpen ? (
        <div className="panel enter space-y-4 p-5 sm:p-6">
          <h2 className="type-h3">Bidik labelnya</h2>
          <TipList />
          <Button variant="secondary" icon="arrowLeft" onClick={picker.closeCamera}>
            Pilih cara lain
          </Button>
        </div>
      ) : (
        <ChooseSource picker={picker} onWithoutLabel={onWithoutLabel} />
      )}
    </div>
  );
}

function TipList() {
  return (
    <ul className="space-y-2">
      {PHOTO_TIPS.map((tip) => (
        <li key={tip.text} className="flex items-center gap-3 text-sm text-ink-2">
          <span className="icon-tile size-9! rounded-[12px]!">
            <Icon name={tip.icon} size={18} />
          </span>
          {tip.text}
        </li>
      ))}
    </ul>
  );
}

function SourceCard({
  icon,
  title,
  description,
  onClick,
  disabled,
  primary,
}: {
  icon: IconName;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'press panel flex w-full items-center gap-4 p-4 text-left disabled:opacity-60 sm:p-5',
        primary && 'bg-action/80! border-action-hover/60!',
      )}
    >
      <span
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-[16px]',
          primary ? 'bg-ink text-action' : 'bg-brand-tint text-brand-deep',
        )}
      >
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink-2">{description}</span>
      </span>
      <Icon name="arrowRight" size={20} className="shrink-0 text-ink-2" />
    </button>
  );
}

function ChooseSource({ picker, onWithoutLabel }: { picker: ImagePicker; onWithoutLabel: () => void }) {
  return (
    <div className="stagger space-y-3">
      <SourceCard
        primary
        icon="camera"
        title="Ambil foto langsung"
        description="Pakai kamera HP atau laptop. Tilik memberi tahu kapan fotonya sudah jelas."
        onClick={picker.openCamera}
        disabled={picker.busy}
      />
      <SourceCard
        icon="upload"
        title="Unggah gambar"
        description="Foto kemasan atau desain stiker dari galeri. JPG, PNG, atau WebP."
        onClick={picker.openFilePicker}
        disabled={picker.busy}
      />

      <div className="panel p-4 sm:p-5">
        <p className="font-semibold text-ink">Belum punya foto? Coba kemasan contoh</p>
        <p className="mt-0.5 text-sm text-ink-2">Kemasan rekaan, aman untuk mencoba pembaca foto.</p>
        <ul className="mt-3 grid grid-cols-3 gap-2.5">
          {SAMPLE_PHOTOS.map((photo) => (
            <li key={photo.file}>
              <button
                type="button"
                onClick={() => picker.handleSample(photo)}
                disabled={picker.busy}
                className="press group/sample block w-full overflow-hidden rounded-[16px] border border-line bg-surface text-left disabled:opacity-60"
              >
                <Image
                  src={samplePhotoDisplayUrl(photo, 'card')}
                  alt=""
                  width={256}
                  height={341}
                  unoptimized
                  sizes="(min-width: 1024px) 160px, 30vw"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-300 ease-out group-hover/sample:scale-[1.04]"
                />
                <span className="block px-2.5 py-2 text-xs font-semibold leading-tight text-ink sm:text-sm">
                  {photo.nama}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {PHOTO_TIPS.map((tip) => (
            <span key={tip.text} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
              <Icon name={tip.icon} size={15} className="text-brand" />
              {tip.text}
            </span>
          ))}
        </div>
        <Button variant="ghost" size="md" icon="edit" className="-ml-3 shrink-0 self-start whitespace-nowrap sm:ml-0" onClick={onWithoutLabel} disabled={picker.busy}>
          Isi tanpa foto
        </Button>
      </div>
    </div>
  );
}

function ReadPanel({
  image,
  reading,
  readCancelled,
  onRead,
  onCancelRead,
  onContinue,
}: {
  image: PreparedImage;
  reading: boolean;
  readCancelled: boolean;
  onRead: () => void;
  onCancelRead: () => void;
  onContinue: () => void;
}) {
  const readButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reading) cancelButtonRef.current?.focus({ preventScroll: true });
    if (readCancelled) readButtonRef.current?.focus({ preventScroll: true });
  }, [reading, readCancelled]);

  if (reading) {
    return (
      <section aria-labelledby="membaca-judul" className="panel enter space-y-4 p-5 sm:p-6">
        <div>
          <h2 id="membaca-judul" className="type-h2">Tilik sedang membaca labelmu</h2>
          <p className="mt-1 text-sm text-ink-2">
            Biasanya 5 sampai 15 detik. Semua hasil bacaan tetap bisa kamu betulkan.
          </p>
        </div>
        <ReadingChecklist />
        <p role="status" className="sr-only">Tulisan pada foto sedang dibaca.</p>
        <Button ref={cancelButtonRef} variant="secondary" onClick={onCancelRead}>
          Batalkan
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="siap-judul" className="stagger space-y-3">
      <div className="panel space-y-4 p-5 sm:p-6">
        {image.mutu.baik ? (
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-tint text-success-ink">
              <Icon name="check" size={22} />
            </span>
            <div>
              <h2 id="siap-judul" className="type-h3">Foto siap dibaca</h2>
              <p className="text-sm text-ink-2">Tulisannya cukup terang dan tajam.</p>
            </div>
          </div>
        ) : (
          <>
            <h2 id="siap-judul" className="sr-only">Mutu foto</h2>
            <Notice tone="warning" title="Sebagian tulisan mungkin sulit dibaca">
              <ul className="list-disc space-y-1 pl-4">
                {image.mutu.masalah.map((issue) => <li key={issue.kode}>{issue.pesan}</li>)}
              </ul>
            </Notice>
          </>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button ref={readButtonRef} size="lg" icon="scan" onClick={onRead}>
            Baca label dengan Tilik
          </Button>
          <Button variant="secondary" size="lg" onClick={onContinue}>
            Isi sendiri
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-ink-2">
          Saat kamu memilih Baca label, foto dikirim ke layanan pembaca. Tilik Label tidak menyimpan fotonya.
        </p>
        <p role="status" className={readCancelled ? 'text-sm text-ink-2' : 'sr-only'}>
          {readCancelled && 'Pembacaan dibatalkan. Kamu bisa mencoba lagi atau mengisi sendiri.'}
        </p>
      </div>
      <WhatsNext />
    </section>
  );
}

function WhatsNext() {
  return (
    <div className="panel p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-ink-2">Setelah ini</h3>
      <ol className="mt-4">
        {NEXT_STEPS.map((item, index) => (
          <li key={item.title} className="relative flex gap-3.5 pb-5 last:pb-0">
            {index < NEXT_STEPS.length - 1 && (
              <span aria-hidden className="absolute top-11 bottom-1 left-5 w-px -translate-x-1/2 bg-line" />
            )}
            <span className="icon-tile size-10! shrink-0 rounded-[13px]!">
              <Icon name={item.icon} size={19} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                {item.title}
                {item.tag && (
                  <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[0.6875rem] leading-none font-bold tracking-wide text-brand-deep uppercase">
                    {item.tag}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-ink-2">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
