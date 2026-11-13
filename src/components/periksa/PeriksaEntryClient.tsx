'use client';

import { useSyncExternalStore } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import { getProductsSnapshot, parseProductsSnapshot, subscribeProducts } from '@/lib/produkSaya';
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

  const product = parseProductsSnapshot(snapshot).find((item) => item.id === produkId);
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
