'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import type { ExtractedRecipeItem } from '@/domain/recipeExtraction';
import { cn } from '@/lib/cn';
import { ACCEPTED_IMAGE_TYPES, type PreparedImage } from '@/lib/image/prepareImage';
import { requestRecipeRead } from '@/lib/readRecipeClient';
import { CameraCapture } from './CameraCapture';
import { useImagePicker } from './useImagePicker';

const READ_TIMEOUT_MS = 35_000;

type RecipeReadNotice =
  | { kind: 'applied'; total: number; perluLengkapi: number; mode: 'replace' | 'append' }
  | { kind: 'pending'; bahan: ExtractedRecipeItem[]; perluLengkapi: number }
  | { kind: 'error'; message: string }
  | { kind: 'cancelled' };

interface RecipePhotoReaderProps {
  hasExistingRows: boolean;
  onApply: (items: ExtractedRecipeItem[], mode: 'replace' | 'append') => void;
}

/**
 * Pemindai foto buku atau catatan resep. Pengguna dapat memotret atau mengunggah
 * foto daftar bahan; Tilik menyalinnya ke baris RecipeEditor untuk dicocokkan.
 */
export function RecipePhotoReader({ hasExistingRows, onApply }: RecipePhotoReaderProps) {
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<RecipeReadNotice | null>(null);
  const requestRef = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  const hasExistingRef = useRef(hasExistingRows);
  const onApplyRef = useRef(onApply);

  useEffect(() => {
    hasExistingRef.current = hasExistingRows;
    onApplyRef.current = onApply;
  });

  const abortCurrent = () => {
    const active = requestRef.current;
    if (!active) return;
    requestRef.current = null;
    clearTimeout(active.timer);
    active.controller.abort();
  };

  useEffect(() => () => abortCurrent(), []);

  const readPhoto = async (prepared: PreparedImage) => {
    abortCurrent();
    setPhoto(prepared);
    setPreviewOpen(false);
    setNotice(null);
    setReading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    requestRef.current = { controller, timer };

    const result = await requestRecipeRead(prepared.dataUrl, controller.signal);
    clearTimeout(timer);
    if (requestRef.current?.controller !== controller) return;
    requestRef.current = null;
    setReading(false);

    if (controller.signal.aborted) {
      setNotice({
        kind: 'error',
        message: 'Waktu baca foto resep habis. Coba foto ulang atau tulis bahannya sendiri.',
      });
      return;
    }

    if (!result.ok) {
      setNotice({ kind: 'error', message: result.pesan });
      return;
    }

    if (hasExistingRef.current) {
      setNotice({ kind: 'pending', bahan: result.bahan, perluLengkapi: result.perluLengkapi });
    } else {
      onApplyRef.current(result.bahan, 'replace');
      setNotice({
        kind: 'applied',
        total: result.bahan.length,
        perluLengkapi: result.perluLengkapi,
        mode: 'replace',
      });
    }
  };

  const { picker, attachFileInput } = useImagePicker((prepared) => {
    void readPhoto(prepared);
  });

  const cancelReading = () => {
    abortCurrent();
    setReading(false);
    setNotice({ kind: 'cancelled' });
  };

  const confirmPending = (mode: 'replace' | 'append') => {
    if (notice?.kind !== 'pending') return;
    onApply(notice.bahan, mode);
    setNotice({
      kind: 'applied',
      total: notice.bahan.length,
      perluLengkapi: notice.perluLengkapi,
      mode,
    });
  };

  const fileInput = (
    <input
      ref={attachFileInput}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(',')}
      hidden
      onChange={(event) => picker.handleFile(event.target.files?.[0])}
    />
  );

  if (picker.cameraOpen) {
    return (
      <div className="space-y-3">
        {fileInput}
        <CameraCapture
          frameHint="Masukkan daftar bahan resep ke dalam bingkai."
          onCaptured={picker.handleCaptured}
          onUseUpload={picker.openFilePicker}
          onCancel={picker.closeCamera}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fileInput}

      <div
        {...picker.dropHandlers}
        className={cn(
          'rounded-[18px] border p-3.5 transition-colors sm:p-4',
          picker.dragging
            ? 'border-brand bg-brand-tint/45'
            : 'border-line bg-paper/80',
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-brand-tint text-brand-deep">
              <Icon name="ledger" size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                Punya buku atau catatan resep?
              </p>
              <p className="mt-0.5 text-sm leading-snug text-ink-2">
                {picker.dragging
                  ? 'Lepaskan foto resep di sini untuk dibaca Tilik.'
                  : 'Foto atau unggah halamannya, biar Tilik menyalin daftar bahannya untukmu.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon="camera"
              disabled={picker.busy || reading}
              onClick={picker.openCamera}
            >
              Foto resep
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon="upload"
              disabled={picker.busy || reading}
              onClick={picker.openFilePicker}
            >
              Unggah foto
            </Button>
          </div>
        </div>

        <p className="mt-2.5 text-xs text-ink-3">
          Foto resep hanya dikirim untuk dibaca dan tidak disimpan. Mendukung catatan tulisan tangan maupun buku cetak (JPG, PNG, WebP).
        </p>
      </div>

      {picker.error && (
        <div role="alert">
          <Notice tone="danger" title="Foto resep belum bisa dipakai">
            {picker.error}
          </Notice>
        </div>
      )}

      {picker.busy && (
        <p role="status" className="text-sm font-semibold text-ink-2">
          Menyiapkan foto resep…
        </p>
      )}

      {reading && photo && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-[18px] border border-brand/30 bg-brand-tint/35 p-3.5 sm:flex-row sm:items-center sm:p-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Image
              src={photo.dataUrl}
              alt="Foto catatan resep yang sedang dibaca"
              width={photo.width}
              height={photo.height}
              unoptimized
              className="size-14 shrink-0 rounded-[12px] border border-line object-cover"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="scan" size={16} className="shrink-0 text-brand" />
                Tilik sedang membaca catatan resepmu…
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
                Biasanya 5 sampai 15 detik. Setelah selesai, kamu tetap bisa membetulkan tiap baris.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="md" onClick={cancelReading}>
            Batalkan
          </Button>
        </div>
      )}

      {!reading && notice?.kind === 'cancelled' && (
        <p role="status" className="text-sm text-ink-2">
          Pembacaan foto resep dibatalkan. Kamu bisa foto ulang atau tulis bahannya sendiri.
        </p>
      )}

      {!reading && notice?.kind === 'error' && (
        <div role="status">
          <Notice
            tone="warning"
            title="Foto resep belum terbaca"
            action={
              photo && (
                <Button variant="secondary" size="md" icon="scan" onClick={() => void readPhoto(photo)}>
                  Coba baca lagi
                </Button>
              )
            }
          >
            <p>{notice.message}</p>
            {photo && !photo.mutu.baik && photo.mutu.masalah.length > 0 && (
              <p className="mt-1 text-xs text-ink-2">
                Catatan foto: {photo.mutu.masalah.map((item) => item.pesan).join(' ')}
              </p>
            )}
          </Notice>
        </div>
      )}

      {!reading && notice?.kind === 'pending' && (
        <div role="status" aria-live="polite">
          <Notice
            tone="info"
            title={`Tilik menyalin ${notice.bahan.length} bahan dari foto resep`}
          >
            <p>
              Daftar resepmu sudah terisi. Mau ditambahkan ke daftar yang ada, atau menggantinya?
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button size="md" icon="plus" onClick={() => confirmPending('append')}>
                Tambahkan ke daftar
              </Button>
              <Button variant="secondary" size="md" onClick={() => confirmPending('replace')}>
                Ganti daftar
              </Button>
              <Button variant="ghost" size="md" onClick={() => setNotice(null)}>
                Abaikan
              </Button>
            </div>
          </Notice>
        </div>
      )}

      {!reading && notice?.kind === 'applied' && (
        <div role="status" aria-live="polite">
          <Notice
            tone={notice.perluLengkapi > 0 ? 'info' : 'success'}
            title={
              notice.perluLengkapi > 0
                ? `Tilik ${notice.mode === 'append' ? 'menambahkan' : 'menyalin'} ${notice.total} bahan (${notice.perluLengkapi} belum dalam gram/ml)`
                : `Tilik ${notice.mode === 'append' ? 'menambahkan' : 'menyalin'} ${notice.total} bahan dari foto resep`
            }
            action={
              photo && (
                <Button
                  variant="secondary"
                  size="md"
                  icon="eye"
                  aria-expanded={previewOpen}
                  onClick={() => setPreviewOpen((open) => !open)}
                >
                  {previewOpen ? 'Tutup foto' : 'Lihat foto'}
                </Button>
              )
            }
          >
            {notice.perluLengkapi > 0
              ? 'Baris yang ditandai memakai satuan selain gram/ml (misalnya sendok atau butir). Isi perkiraan gram/ml supaya ikut dicek urutannya.'
              : 'Cocokkan nama bahan dan takaran di bawah dengan catatan aslimu sebelum lanjut.'}
          </Notice>
        </div>
      )}

      {!reading && photo && previewOpen && (
        <figure className="overflow-hidden rounded-[18px] border border-line bg-surface p-2">
          <Image
            src={photo.dataUrl}
            alt="Foto catatan resep yang diunggah"
            width={photo.width}
            height={photo.height}
            unoptimized
            className="max-h-80 w-full rounded-[12px] object-contain bg-paper"
          />
          <figcaption className="mt-2 flex items-center justify-between px-1 text-xs text-ink-2">
            <span>Foto catatan resep (hanya dipakai di sesi ini, tidak disimpan)</span>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="font-semibold text-brand-deep hover:underline"
            >
              Sembunyikan
            </button>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
