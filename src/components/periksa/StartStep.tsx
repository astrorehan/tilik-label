'use client';

import { useEffect, useRef, useState } from 'react';
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
import { PhotoGuide } from './PhotoGuide';
import { SamplePhotos, samplePhotoUrl, type SamplePhoto } from './SamplePhotos';

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
  disabled,
}: {
  icon: IconName;
  title: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-4 rounded-[20px] border border-line bg-surface p-5 text-left transition-[border-color,background-color] duration-150 hover:border-brand hover:bg-brand-tint/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line disabled:hover:bg-surface"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-deep">
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-ink-2">
          {body}
        </span>
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
  const regionRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Setelah berpindah antara pilihan dan kamera, fokus ikut pindah ke area yang baru.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    regionRef.current?.focus();
  }, [mode]);

  const openFilePicker = () => {
    setMode('pilih');
    fileRef.current?.click();
  };

  const prepare = async (load: () => Promise<Blob>, fallbackError: string) => {
    setBusy(true);
    setError(null);
    try {
      onImage(await prepareImageFile(await load()));
    } catch (caught) {
      setError(
        caught instanceof ImagePrepareError ? caught.message : fallbackError,
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    void prepare(async () => file, 'Gambar gagal diolah. Coba berkas lain.');
  };

  const handleSample = (photo: SamplePhoto) => {
    void prepare(async () => {
      const response = await fetch(samplePhotoUrl(photo));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    }, 'Foto contoh gagal dimuat. Periksa sambungan internet lalu coba lagi.');
  };

  return (
    <div className="space-y-5">
      <Notice tone="info" title="Ke mana gambarmu dikirim?" icon="shield">
        Gambar dikecilkan dulu di HP-mu, lalu dikirim ke penyedia model bahasa
        untuk dibaca isinya. Gambar tidak disimpan di server Tilik Label. Isi
        label yang terbaca selalu ditampilkan dulu supaya bisa kamu betulkan.
      </Notice>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
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
        <div
          ref={regionRef}
          tabIndex={-1}
          role="group"
          aria-label="Ambil foto dengan kamera"
          className="outline-none"
        >
          <CameraCapture
            onCaptured={(captured) => {
              onImage(captured);
              setMode('pilih');
            }}
            onUseUpload={openFilePicker}
            onCancel={() => setMode('pilih')}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <PhotoGuide />
          <div
            ref={regionRef}
            tabIndex={-1}
            role="group"
            aria-label="Pilih cara memulai"
            className="grid gap-3 outline-none"
          >
            <DoorButton
              icon="camera"
              title="Foto kemasan"
              body="Pakai kamera HP untuk memotret label yang sudah tercetak."
              onClick={() => {
                setError(null);
                setMode('kamera');
              }}
              disabled={busy}
            />
            <DoorButton
              icon="upload"
              title="Unggah gambar label"
              body="Pilih foto atau desain label (JPG, PNG, atau WebP) dari galeri atau komputer."
              onClick={openFilePicker}
              disabled={busy}
            />
            <DoorButton
              icon="edit"
              title="Belum punya label"
              body="Langsung isi keterangan label sendiri. Cocok bila label baru akan dibuat."
              onClick={onWithoutLabel}
              disabled={busy}
            />
          </div>
          <SamplePhotos onPick={handleSample} disabled={busy} />
        </div>
      )}

      {!image && mode === 'pilih' && (
        <p className="text-sm text-ink-2">
          Tidak ingin mengirim gambar?{' '}
          <Button
            variant="ghost"
            size="md"
            className="!min-h-11 !px-2 underline"
            onClick={onWithoutLabel}
          >
            Isi sendiri saja
          </Button>
        </p>
      )}
    </div>
  );
}
