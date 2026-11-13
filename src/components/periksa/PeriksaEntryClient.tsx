'use client';

import { useState, useSyncExternalStore } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import {
  STORAGE_UNAVAILABLE_SNAPSHOT,
  getProductsSnapshot,
  parseProductsSnapshot,
  subscribeProducts,
  type SavedProduct,
} from '@/lib/produkSaya';
import { PeriksaFlowClient } from './PeriksaFlowClient';

const SERVER_SNAPSHOT = '\u0000server';

/**
 * Pintu masuk /periksa. Bila ada `?produk=<id>`, isi label dan jawaban dari
 * Produk saya dimuat dari perangkat lalu langsung dibuka di langkah hasil.
 */
export function PeriksaEntryClient({ produkId }: { produkId?: string }) {
  const snapshot = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    () => SERVER_SNAPSHOT,
  );

  // Produk dibekukan begitu ditemukan, supaya perubahan daftar dari tab lain
  // tidak me-remount alur dan menghapus isian yang sedang dibetulkan.
  const [frozen, setFrozen] = useState<SavedProduct | null>(null);
  const found =
    produkId && snapshot !== SERVER_SNAPSHOT
      ? parseProductsSnapshot(snapshot).find((item) => item.id === produkId)
      : undefined;
  if (found && frozen?.id !== found.id) setFrozen(found);
  const product = frozen && frozen.id === produkId ? frozen : found;

  if (!produkId) {
    return <PeriksaFlowClient />;
  }

  if (snapshot === SERVER_SNAPSHOT) {
    return (
      <p className="text-sm text-ink-2" role="status">
        Membuka produk dari perangkat…
      </p>
    );
  }

  if (!product && snapshot === STORAGE_UNAVAILABLE_SNAPSHOT) {
    return (
      <div className="space-y-6">
        <Notice
          tone="warning"
          title="Penyimpanan di perangkat tidak bisa dipakai di peramban ini"
          action={
            <ButtonLink href="/produk" size="md" variant="secondary">
              Produk saya
            </ButtonLink>
          }
        >
          Produk tersimpan tidak bisa dibuka. Ini biasa terjadi di mode privat atau bila penyimpanan
          situs diblokir. Kamu tetap bisa memeriksa label dari awal di bawah.
        </Notice>
        <PeriksaFlowClient />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Notice
          tone="warning"
          title="Produk tidak ditemukan di perangkat ini"
          action={
            <ButtonLink href="/produk" size="md" variant="secondary">
              Produk saya
            </ButtonLink>
          }
        >
          Mungkin sudah dihapus, atau data peramban sudah dibersihkan. Kamu bisa mulai periksa dari
          awal di bawah.
        </Notice>
        <PeriksaFlowClient />
      </div>
    );
  }

  return (
    <PeriksaFlowClient
      key={product.id}
      productId={product.id}
      initial={{ label: product.label, answers: product.answers, step: 'hasil' }}
    />
  );
}
