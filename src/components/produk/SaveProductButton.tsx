'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import type { AdditionalAnswers, LabelData } from '@/domain';
import {
  MAX_SAVED_PRODUCTS,
  saveProductResult,
  type SaveFailure,
  type SaveResult,
  type SavedProduct,
} from '@/lib/produkSaya';

export type ProductSaveStatus =
  | { kind: 'idle' }
  | { kind: 'saved'; product: SavedProduct; source: 'auto' | 'manual' }
  | { kind: 'failed'; reason: SaveFailure };

interface SaveProductButtonProps {
  label: LabelData;
  answers: AdditionalAnswers;
  /** Isi bila produk ini dibuka dari Produk saya atau sudah tersimpan otomatis, supaya disimpan ulang sebagai pembaruan. */
  productId?: string;
  /** Status penyimpanan dari induk (mis. hasil auto-save di langkah Hasil). */
  autoSaveStatus?: ProductSaveStatus;
  /** Sembunyikan Notice bawaan bila induk sudah menampilkan status penyimpanan secara terpadu. */
  hideInlineStatus?: boolean;
  onSaved?: (product: SavedProduct) => void;
  onSaveResult?: (result: SaveResult) => void;
}

export const SAVE_FAILURE_COPY: Record<SaveFailure, { title: string; body: string }> = {
  tidak_tersedia: {
    title: 'Data tidak bisa disimpan di peramban ini',
    body: 'Penyimpanan di perangkat sedang tidak bisa dipakai. Ini biasa terjadi di mode privat atau bila penyimpanan situs diblokir. Hasil pemeriksaan tetap bisa dilihat dan dicetak, tetapi tidak akan masuk ke Produk saya.',
  },
  gagal_tulis: {
    title: 'Gagal menyimpan',
    body: 'Penyimpanan di perangkat penuh atau menolak tulisan. Hapus produk lama di Produk saya, lalu coba lagi.',
  },
  batas_penuh: {
    title: 'Daftar Produk saya sudah penuh',
    body: `Daftar dibatasi ${MAX_SAVED_PRODUCTS} produk supaya penyimpanan perangkat tidak penuh. Hapus produk yang sudah tidak dipakai, lalu coba lagi.`,
  },
};

export function SaveProductButton({
  label,
  answers,
  productId,
  autoSaveStatus,
  hideInlineStatus = false,
  onSaved,
  onSaveResult,
}: SaveProductButtonProps) {
  const [localState, setLocalState] = useState<ProductSaveStatus>({ kind: 'idle' });
  // Setelah tersimpan, klik berikutnya memperbarui produk yang sama, bukan membuat salinan.
  const [savedId, setSavedId] = useState<string | undefined>(productId);
  const effectiveProductId = productId ?? savedId;
  const activeState = localState.kind !== 'idle' ? localState : (autoSaveStatus ?? localState);
  const alreadySaved = Boolean(effectiveProductId) || activeState.kind === 'saved';

  function handleSave() {
    const result = saveProductResult({ id: effectiveProductId, label, answers });
    onSaveResult?.(result);
    if (result.ok) {
      setSavedId(result.product.id);
      setLocalState({ kind: 'saved', product: result.product, source: 'manual' });
      onSaved?.(result.product);
    } else {
      setLocalState({ kind: 'failed', reason: result.reason });
    }
  }

  return (
    <div className="min-w-0">
      <Button
        variant="secondary"
        size="md"
        icon={alreadySaved ? 'savedOnDevice' : 'download'}
        onClick={handleSave}
      >
        {alreadySaved ? 'Perbarui di Produk saya' : 'Simpan ke Produk saya'}
      </Button>

      {!hideInlineStatus && (
        <div aria-live="polite" className="[&:not(:empty)]:mt-3">
          {activeState.kind === 'saved' && (
            <Notice
              tone="success"
              title={
                <span className="break-words [overflow-wrap:anywhere]">
                  {activeState.source === 'auto'
                    ? `"${activeState.product.nama}" tersimpan otomatis di perangkat ini`
                    : `"${activeState.product.nama}" tersimpan di perangkat ini`}
                </span>
              }
            >
              <Link href="/produk" className="font-semibold text-brand-deep underline underline-offset-2">
                Lihat di Produk saya
              </Link>
              . Data hanya ada di peramban ini dan hilang bila data peramban dihapus.
            </Notice>
          )}
          {activeState.kind === 'failed' && (
            <Notice tone="warning" title={SAVE_FAILURE_COPY[activeState.reason].title}>
              {SAVE_FAILURE_COPY[activeState.reason].body}
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}
