'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import {
  STORAGE_UNAVAILABLE_SNAPSHOT,
  getProductsSnapshot,
  parseProductsSnapshot,
  subscribeProducts,
} from '@/lib/produkSaya';
import { CetakIsi } from './CetakIsi';

const SERVER_SNAPSHOT = '\u0000server';

/** Pintu masuk /cetak: memuat produk dari Produk saya lewat `?produk=<id>`. */
export function CetakClient({ produkId }: { produkId?: string }) {
  const snapshot = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const products = useMemo(
    () =>
      snapshot === SERVER_SNAPSHOT || snapshot === STORAGE_UNAVAILABLE_SNAPSHOT
        ? []
        : parseProductsSnapshot(snapshot),
    [snapshot],
  );
  const product = produkId ? products.find((item) => item.id === produkId) : undefined;

  // Pilihan bagian cetak tidak boleh tertinggal bila halaman ditinggalkan saat dialog cetak terbuka.
  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.cetak;
    };
  }, []);

  if (snapshot === SERVER_SNAPSHOT) {
    return (
      <p className="text-sm text-ink-2" role="status">
        Membuka produk dari perangkat…
      </p>
    );
  }

  if (!product) {
    const unavailable = snapshot === STORAGE_UNAVAILABLE_SNAPSHOT;
    return (
      <div className="space-y-6">
        <header className="border-b border-line pb-6">
          <p className="type-eyebrow">Label perbaikan dan ringkasan</p>
          <h1 className="type-h1 mt-1.5 text-ink">Produk belum dipilih</h1>
        </header>
        <Notice
          tone="warning"
          title={
            unavailable
              ? 'Penyimpanan di perangkat tidak bisa dipakai di peramban ini'
              : produkId
                ? 'Produk tidak ditemukan di perangkat ini'
                : 'Belum ada produk yang dipilih'
          }
          action={
            <ButtonLink href="/produk" size="md" variant="secondary">
              Produk saya
            </ButtonLink>
          }
        >
          {unavailable
            ? 'Ini biasa terjadi di mode privat atau bila penyimpanan situs diblokir. Periksa label dari awal lalu cetak dari halaman hasil.'
            : 'Label perbaikan dan ringkasan dibuat dari produk yang sudah disimpan. Pilih produk di Produk saya, atau periksa label baru lalu simpan hasilnya.'}
        </Notice>
        <ButtonLink href="/periksa" size="md" icon="scan">
          Periksa label baru
        </ButtonLink>
      </div>
    );
  }

  return <CetakIsi product={product} />;
}
