'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import type { AdditionalAnswers, LabelData } from '@/domain';
import { MAX_SAVED_PRODUCTS, saveProductResult, type SaveFailure, type SavedProduct } from '@/lib/produkSaya';

interface SaveProductButtonProps {
  label: LabelData;
  answers: AdditionalAnswers;
  /** Isi bila produk ini dibuka dari Produk saya, supaya disimpan ulang sebagai pembaruan. */
  productId?: string;
  onSaved?: (product: SavedProduct) => void;
}

type SaveState = { kind: 'idle' } | { kind: 'saved'; product: SavedProduct } | { kind: 'failed'; reason: SaveFailure };

const FAILURE_COPY: Record<SaveFailure, { title: string; body: string }> = {
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

export function SaveProductButton({ label, answers, productId, onSaved }: SaveProductButtonProps) {
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  // Setelah tersimpan, klik berikutnya memperbarui produk yang sama, bukan membuat salinan.
  const [savedId, setSavedId] = useState<string | undefined>(productId);

  function handleSave() {
    const result = saveProductResult({ id: savedId ?? productId, label, answers });
    if (result.ok) {
      setSavedId(result.product.id);
      setState({ kind: 'saved', product: result.product });
      onSaved?.(result.product);
    } else {
      setState({ kind: 'failed', reason: result.reason });
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="secondary" size="md" icon="download" onClick={handleSave}>
        Simpan ke Produk saya
      </Button>

      <div aria-live="polite" className="w-full">
        {state.kind === 'saved' && (
          <Notice tone="success" title={`"${state.product.nama}" tersimpan di perangkat ini`}>
            <Link href="/produk" className="font-semibold text-brand-deep underline underline-offset-2">
              Lihat di Produk saya
            </Link>
            . Data hanya ada di perangkat ini dan hilang bila data peramban dihapus.
          </Notice>
        )}
        {state.kind === 'failed' && (
          <Notice tone="warning" title={FAILURE_COPY[state.reason].title}>
            {FAILURE_COPY[state.reason].body}
          </Notice>
        )}
      </div>
    </div>
  );
}
