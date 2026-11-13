'use client';

import { useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import {
  ACCEPTED_IMAGE_TYPES,
  ImagePrepareError,
  prepareImageFile,
  type PreparedImage,
} from '@/lib/image/prepareImage';
import { CameraCapture } from './CameraCapture';
import { ImageCheck } from './ImageCheck';

type Mode = 'pilih' | 'kamera';

interface StartStepProps {
  image: PreparedImage | null;
  onImage: (image: PreparedImage | null) => void;
  /** Lanjut ke isian label (dengan atau tanpa gambar). */
  onContinue: () => void;
  /** Pintu "belum punya label": langsung ke isian kosong. */
  onWithoutLabel: () => void;
  /** Membaca isi label dari gambar lewat server. */
  onRead?: () => void;
  reading?: boolean;
}

function DoorButton({
  icon,
  title,
  body,
  onClick,
}: {
  icon: IconName;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-4 rounded-[20px] border border-line bg-surface p-5 text-left transition-[border-color,background-color] duration-150 hover:border-brand hover:bg-brand-tint/40"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-deep">
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-ink-2">{body}</span>
      </span>
    </button>
  );
}

/** Langkah awal F-02: kamera, unggah berkas, atau tanpa label. */
export function StartStep({
  image,
  onImage,
  onContinue,
  onWithoutLabel,
  onRead,
  reading,
}: StartStepProps) {
  const [mode, setMode] = useState<Mode>('pilih');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    setMode('pilih');
    fileRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onImage(await prepareImageFile(file));
    } catch (caught) {
      setError(
        caught instanceof ImagePrepareError ? caught.message : 'Gambar gagal diolah. Coba berkas lain.',
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <Notice tone="info" title="Ke mana gambarmu dikirim?" icon="shield">
        Gambar dikecilkan dulu di HP-mu, lalu dikirim ke penyedia model bahasa untuk dibaca isinya.
        Gambar tidak disimpan di server Tilik Label. Isi label yang terbaca selalu ditampilkan dulu
        supaya bisa kamu betulkan.
      </Notice>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {error && (
        <Notice tone="danger" title="Gambar belum bisa dipakai">
          {error}
        </Notice>
      )}

      {busy && (
        <p role="status" className="text-sm font-semibold text-ink-2">
          Mengolah gambar di perangkat…
        </p>
      )}

      {image ? (
        <ImageCheck
          image={image}
          onRetake={() => {
            onImage(null);
            setMode('pilih');
          }}
          onContinue={onContinue}
          onRead={onRead}
          reading={reading}
        />
      ) : mode === 'kamera' ? (
        <CameraCapture
          onCaptured={(captured) => {
            onImage(captured);
            setMode('pilih');
          }}
          onUseUpload={openFilePicker}
          onCancel={() => setMode('pilih')}
        />
      ) : (
        <div className="grid gap-3">
          <DoorButton
            icon="camera"
            title="Foto kemasan"
            body="Pakai kamera HP untuk memotret label yang sudah tercetak."
            onClick={() => {
              setError(null);
              setMode('kamera');
            }}
          />
          <DoorButton
            icon="upload"
            title="Unggah gambar label"
            body="Pilih foto atau desain label (JPG, PNG, atau WebP) dari galeri atau komputer."
            onClick={openFilePicker}
          />
          <DoorButton
            icon="edit"
            title="Belum punya label"
            body="Langsung isi keterangan label sendiri. Cocok bila label baru akan dibuat."
            onClick={onWithoutLabel}
          />
        </div>
      )}

      {!image && mode === 'pilih' && (
        <p className="text-sm text-ink-2">
          Tidak ingin mengirim gambar?{' '}
          <Button variant="ghost" size="md" className="!min-h-11 !px-2 underline" onClick={onWithoutLabel}>
            Isi sendiri saja
          </Button>
        </p>
      )}
    </div>
  );
}
