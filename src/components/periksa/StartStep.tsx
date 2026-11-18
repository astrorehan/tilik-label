'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { Notice } from '@/components/ui/surface';
import { cn } from '@/lib/cn';
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

interface StartStepProps {
  image: PreparedImage | null;
  onImage: (image: PreparedImage | null) => void;
  onContinue: () => void;
  onWithoutLabel: () => void;
  onRead: () => void;
  onCancelRead: () => void;
  reading: boolean;
  readCancelled: boolean;
}

export function StartStep({
  image,
  onImage,
  onContinue,
  onWithoutLabel,
  onRead,
  onCancelRead,
  reading,
  readCancelled,
}: StartStepProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const mountedRef = useRef(false);
  const panel = image ? 'preview' : cameraOpen ? 'camera' : 'choose';
  const previousPanel = useRef(panel);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (previousPanel.current !== panel) {
      previousPanel.current = panel;
      regionRef.current?.focus();
    }
  }, [panel]);

  const openFilePicker = () => {
    setCameraOpen(false);
    fileRef.current?.click();
  };

  const prepare = async (load: () => Promise<Blob>, fallbackError: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareImageFile(await load());
      if (mountedRef.current) onImage(prepared);
    } catch (caught) {
      if (mountedRef.current) {
        setError(caught instanceof ImagePrepareError ? caught.message : fallbackError);
      }
    } finally {
      if (mountedRef.current) setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = (file?: File) => {
    if (file) void prepare(async () => file, 'Gambar gagal diolah. Coba berkas lain.');
  };

  const handleSample = (photo: SamplePhoto) => {
    void prepare(async () => {
      const response = await fetch(samplePhotoUrl(photo));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    }, 'Foto contoh gagal dimuat. Coba lagi atau pilih foto lain.');
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {error && <Notice tone="danger" title="Gambar belum bisa dipakai">{error}</Notice>}
      <p role="status" className={busy ? 'text-sm font-semibold text-ink-2' : 'sr-only'}>
        {busy ? 'Menyiapkan gambar…' : ''}
      </p>

      <div
        ref={regionRef}
        tabIndex={-1}
        role="group"
        aria-label={image ? 'Pratinjau foto' : cameraOpen ? 'Kamera' : 'Cara menambahkan label'}
        className="focus:outline-none"
      >
        {image ? (
          <ImageCheck
            image={image}
            onRetake={() => {
              onImage(null);
              setCameraOpen(false);
            }}
            onContinue={onContinue}
            onRead={onRead}
            onCancelRead={onCancelRead}
            reading={reading}
            readCancelled={readCancelled}
          />
        ) : cameraOpen ? (
          <CameraCapture
            onCaptured={(captured) => {
              onImage(captured);
              setCameraOpen(false);
            }}
            onUseUpload={openFilePicker}
            onCancel={() => setCameraOpen(false)}
          />
        ) : (
          <div className="panel p-3.5 sm:p-5">
            <div
              className={cn(
                'flex flex-col items-center rounded-[18px] border-2 border-dashed px-4 py-7 text-center transition-colors sm:py-10',
                dragging && !busy ? 'border-brand bg-brand-soft' : 'border-brand/45 bg-brand-tint/60',
              )}
              onDragEnter={(event) => {
                if (event.dataTransfer.types.includes('Files')) dragDepth.current += 1;
              }}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes('Files')) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => {
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dragDepth.current = 0;
                setDragging(false);
                handleFile(event.dataTransfer.files[0]);
              }}
            >
              <span className="mb-3 grid size-13 place-items-center rounded-[18px] bg-brand-soft text-brand-deep">
                <Icon name="scan" size={28} />
              </span>
              <p className="mb-1 font-semibold text-ink">
                {dragging && !busy ? 'Lepaskan gambar di sini' : 'Seret gambar ke sini atau pilih cara di bawah'}
              </p>
              <p id="format-foto" className="mb-4 text-sm text-ink-2">
                Pakai foto kemasan atau desain stiker dalam format JPG, PNG, atau WebP.
              </p>
              <div className="flex w-full flex-col justify-center gap-2 xs:w-auto xs:flex-row">
                <Button
                  size="md"
                  icon="upload"
                  className="min-h-12 whitespace-nowrap"
                  onClick={openFilePicker}
                  disabled={busy}
                  aria-describedby="format-foto"
                >
                  Unggah gambar
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  icon="camera"
                  className="min-h-12 whitespace-nowrap"
                  onClick={() => {
                    setError(null);
                    setCameraOpen(true);
                  }}
                  disabled={busy}
                >
                  Ambil foto
                </Button>
              </div>
            </div>
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="md" icon="edit" onClick={onWithoutLabel} disabled={busy}>
                Isi tanpa foto
              </Button>
            </div>
          </div>
        )}
      </div>

      {!image && !cameraOpen && (
        <div className="grid items-start gap-2.5 sm:grid-cols-2">
          <Disclosure label="Cara mengambil foto" icon="help">
            <PhotoGuide />
          </Disclosure>
          <Disclosure label="Pakai foto contoh" icon="tag">
            <SamplePhotos onPick={handleSample} disabled={busy} />
          </Disclosure>
        </div>
      )}
    </div>
  );
}
