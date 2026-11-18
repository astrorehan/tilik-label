'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import { cn } from '@/lib/cn';
import { ImagePrepareError, prepareVideoFrame, type PreparedImage } from '@/lib/image/prepareImage';
import { ANALYSIS_SIDE, analyzeImagePixels, type ImageIssueCode } from '@/lib/image/quality';

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

type LiveHint = { tone: 'baik' | 'saran'; text: string };

const HINT_BY_ISSUE: Partial<Record<ImageIssueCode, string>> = {
  gelap: 'Terlalu gelap. Cari tempat yang lebih terang.',
  terang: 'Terlalu silau. Miringkan sedikit agar tidak memantul.',
  buram: 'Masih buram. Tahan HP dengan tenang.',
};

/** Berapa kali berturut-turut bingkai harus bagus sebelum jepret otomatis berjalan. */
const STEADY_CHECKS = 3;
const CHECK_INTERVAL_MS = 450;

/**
 * Jendela bidik kamera belakang. Setiap setengah detik bingkai dinilai di perangkat
 * (terang, silau, buram) supaya pengguna tahu kapan foto siap dijepret.
 */
export function CameraCapture({ onCaptured, onUseUpload, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [state, setState] = useState<CameraState>(() =>
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? { kind: 'meminta' }
      : { kind: 'tidak_ada' },
  );
  const [hint, setHint] = useState<LiveHint | null>(null);
  const [steady, setSteady] = useState(0);
  // Jepret otomatis menyala bawaan di HP; di laptop kamera biasanya menghadap wajah.
  const [autoCapture, setAutoCapture] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );
  const [flashing, setFlashing] = useState(false);
  const capturedRef = useRef(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      return;
    }
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
        streamRef.current = media;
        const video = videoRef.current;
        if (video) {
          video.srcObject = media;
          await video.play().catch(() => undefined);
        }
        if (!cancelled) setState({ kind: 'siap' });
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
      if (captureTimer.current) clearTimeout(captureTimer.current);
      stopStream();
    };
  }, []);

  // Matikan kamera begitu tidak dipakai lagi (galat, ditolak, atau tidak tersedia).
  useEffect(() => {
    if (state.kind !== 'siap' && state.kind !== 'meminta') stopStream();
  }, [state.kind]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || capturedRef.current) return;
    try {
      const captured = prepareVideoFrame(video);
      capturedRef.current = true;
      setFlashing(true);
      stopStream();
      captureTimer.current = setTimeout(() => onCaptured(captured), 260);
    } catch (error) {
      setState({
        kind: 'galat',
        pesan: error instanceof ImagePrepareError ? error.message : 'Foto gagal diambil.',
      });
    }
  };

  // Penilaian bingkai langsung di perangkat.
  useEffect(() => {
    if (state.kind !== 'siap') return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || capturedRef.current) return;
      const scale = ANALYSIS_SIDE / Math.max(video.videoWidth, video.videoHeight);
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      const report = analyzeImagePixels(context.getImageData(0, 0, width, height).data, width, height, {
        width: video.videoWidth,
        height: video.videoHeight,
      });
      const issue = report.masalah.find((item) => HINT_BY_ISSUE[item.kode]);
      if (issue) {
        setHint({ tone: 'saran', text: HINT_BY_ISSUE[issue.kode] as string });
        setSteady(0);
      } else {
        setHint({ tone: 'baik', text: 'Tulisan terlihat jelas. Siap dijepret.' });
        setSteady((count) => count + 1);
      }
    }, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [state.kind]);

  const countdown = autoCapture && hint?.tone === 'baik' ? Math.max(0, STEADY_CHECKS + 2 - steady) : null;

  useEffect(() => {
    if (countdown === 0 && !flashing) {
      const timer = setTimeout(capture, 0);
      return () => clearTimeout(timer);
    }
  });

  if (state.kind === 'ditolak' || state.kind === 'tidak_ada' || state.kind === 'galat') {
    const title =
      state.kind === 'ditolak'
        ? 'Izin kamera ditolak'
        : state.kind === 'tidak_ada'
          ? 'Kamera tidak tersedia di perangkat ini'
          : state.pesan;
    return (
      <div className="panel space-y-4 p-4 sm:p-6">
        <div role="status">
          <Notice tone="warning" title={title}>
            Ambil foto lewat aplikasi kamera di perangkatmu, lalu unggah di sini.
          </Notice>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon="upload" onClick={onUseUpload}>Unggah gambar</Button>
          <Button variant="secondary" onClick={onCancel}>Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[24px] bg-[#151912] shadow-floating">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Pratinjau kamera"
          className="aspect-[3/4] max-h-[min(68dvh,38rem)] w-full object-cover"
        />

        {/* Bingkai bidik */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.45))]" />
          <div
            className={cn(
              'bingkai-bidik transition-colors duration-300',
              hint?.tone === 'baik' ? 'text-action' : 'text-white/85',
            )}
          />
        </div>

        {state.kind === 'meminta' && (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-white"
          >
            Meminta izin kamera…
          </p>
        )}

        {state.kind === 'siap' && hint && (
          <div className="absolute inset-x-3 top-3 flex justify-center">
            <p
              key={hint.text}
              role="status"
              className="glass-dark animate-fade flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold"
            >
              <Icon
                name={hint.tone === 'baik' ? 'check' : 'info'}
                size={17}
                className={hint.tone === 'baik' ? 'text-action' : 'text-gold'}
              />
              {hint.text}
            </p>
          </div>
        )}

        {countdown !== null && countdown > 0 && countdown <= 3 && (
          <div aria-live="assertive" className="pointer-events-none absolute inset-0 grid place-items-center">
            <span
              key={countdown}
              className="animate-pop grid size-20 place-items-center rounded-full bg-black/35 font-label text-4xl font-bold text-white"
            >
              {countdown}
            </span>
          </div>
        )}

        {/* Tombol rana di dalam jendela bidik */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-linear-to-t from-black/60 to-transparent px-4 pt-10 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="press glass-dark grid size-12 place-items-center rounded-full"
            aria-label="Tutup kamera"
          >
            <Icon name="close" size={20} />
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={state.kind !== 'siap'}
            aria-label="Jepret foto"
            className="press grid size-[4.5rem] place-items-center rounded-full border-4 border-white/90 bg-white/15 disabled:opacity-50"
          >
            <span className="size-14 rounded-full bg-white shadow-[0_0_0_2px_rgb(0_0_0/0.12)]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoCapture((value) => !value);
              setSteady(0);
            }}
            aria-pressed={autoCapture}
            className={cn(
              'press grid size-12 place-items-center rounded-full',
              autoCapture ? 'bg-action text-ink' : 'glass-dark',
            )}
            aria-label={autoCapture ? 'Matikan jepret otomatis' : 'Nyalakan jepret otomatis'}
            title="Jepret otomatis"
          >
            <Icon name="scan" size={20} />
          </button>
        </div>

        {flashing && <div aria-hidden className="flash pointer-events-none absolute inset-0 bg-white" />}
      </div>
      <p className="text-sm leading-snug text-ink-2">
        Masukkan seluruh label ke dalam bingkai.{' '}
        {autoCapture
          ? 'Jepret otomatis menyala: Tilik menjepret sendiri saat tulisan sudah jelas.'
          : 'Ketuk tombol putih untuk menjepret, atau nyalakan jepret otomatis.'}
      </p>
    </div>
  );
}
