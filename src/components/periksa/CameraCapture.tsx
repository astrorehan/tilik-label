'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import { ImagePrepareError, prepareVideoFrame, type PreparedImage } from '@/lib/image/prepareImage';

type CameraState =
  | { kind: 'meminta' }
  | { kind: 'siap' }
  | { kind: 'ditolak' }
  | { kind: 'tidak_ada' }
  | { kind: 'galat'; pesan: string };

interface CameraCaptureProps {
  onCaptured: (image: PreparedImage) => void;
  /** Dipanggil bila kamera tidak bisa dipakai, untuk mengarahkan ke unggah berkas. */
  onUseUpload: () => void;
  onCancel: () => void;
}

/** Kamera belakang lewat getUserMedia. Izin ditolak diarahkan ke unggah berkas. */
export function CameraCapture({ onCaptured, onUseUpload, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>(() =>
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? { kind: 'meminta' }
      : { kind: 'tidak_ada' },
  );

  useEffect(() => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (video) {
          video.srcObject = media;
          await video.play().catch(() => undefined);
        }
        setState({ kind: 'siap' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setState({ kind: 'ditolak' });
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setState({ kind: 'tidak_ada' });
        } else {
          setState({ kind: 'galat', pesan: 'Kamera tidak bisa dibuka.' });
        }
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (state.kind === 'ditolak' || state.kind === 'tidak_ada' || state.kind === 'galat') {
    const title =
      state.kind === 'ditolak'
        ? 'Izin kamera ditolak'
        : state.kind === 'tidak_ada'
          ? 'Kamera tidak tersedia di perangkat ini'
          : state.pesan;
    return (
      <Notice
        tone="warning"
        title={title}
        action={
          <Button size="md" icon="upload" onClick={onUseUpload}>
            Unggah foto
          </Button>
        }
      >
        Tidak apa-apa. Kamu bisa memotret dengan aplikasi kamera biasa, lalu unggah fotonya di sini.
        {state.kind === 'ditolak' &&
          ' Bila ingin memakai kamera langsung, izinkan kamera untuk situs ini di pengaturan peramban.'}
      </Notice>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[20px] border border-line bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Pratinjau kamera"
          className="aspect-[3/4] w-full object-cover sm:aspect-video"
        />
        {state.kind === 'meminta' && (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-white"
          >
            Meminta izin kamera…
          </p>
        )}
      </div>
      <p className="text-sm leading-snug text-ink-2">
        Pastikan seluruh label masuk bingkai, cahaya cukup, dan tidak ada pantulan lampu.
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          size="lg"
          icon="camera"
          disabled={state.kind !== 'siap'}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            try {
              onCaptured(prepareVideoFrame(video));
            } catch (error) {
              setState({
                kind: 'galat',
                pesan:
                  error instanceof ImagePrepareError ? error.message : 'Foto gagal diambil.',
              });
            }
          }}
        >
          Ambil foto
        </Button>
        <Button variant="secondary" size="lg" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}
