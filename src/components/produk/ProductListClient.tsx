'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, Notice, Pill } from '@/components/ui/surface';
import {
  MAX_SAVED_PRODUCTS,
  STORAGE_UNAVAILABLE_SNAPSHOT,
  deleteProduct,
  getProductsSnapshot,
  parseProductsSnapshot,
  subscribeProducts,
  summarizeProduct,
  type SavedProduct,
} from '@/lib/produkSaya';

const LOADING_SNAPSHOT = '\u0000memuat';

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' });

function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '-' : dateFormatter.format(new Date(time));
}

export function ProductListClient() {
  // Server dan render hidrasi pertama memakai penanda "memuat"; localStorage baru dibaca setelah mount.
  const snapshot = useSyncExternalStore(subscribeProducts, getProductsSnapshot, () => LOADING_SNAPSHOT);
  const products = useMemo(() => parseProductsSnapshot(snapshot), [snapshot]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const loading = snapshot === LOADING_SNAPSHOT;
  const unavailable = snapshot === STORAGE_UNAVAILABLE_SNAPSHOT;

  function handleDelete(id: string) {
    const ok = deleteProduct(id);
    setDeleteFailed(!ok);
    setConfirmId(null);
  }

  return (
    <div className="space-y-6">
      <Notice tone="info" title="Data hanya ada di perangkat ini">
        Produk saya disimpan di peramban perangkat ini saja, tidak ada akun dan tidak dikirim ke
        server. Data akan hilang bila data peramban dihapus, dan tidak muncul di HP atau laptop lain.
        Cetak atau simpan hasil sebagai PDF bila perlu salinan.
      </Notice>

      <div aria-live="polite">
        {deleteFailed && (
          <Notice tone="warning" title="Produk belum terhapus">
            Penyimpanan di peramban ini menolak perubahan. Coba lagi sebentar lagi.
          </Notice>
        )}
      </div>

      {loading && <p className="text-sm text-ink-2">Memuat daftar produk...</p>}

      {unavailable && (
        <Notice tone="warning" title="Penyimpanan tidak tersedia di peramban ini">
          Daftar produk tidak bisa dibaca atau disimpan. Ini biasa terjadi di mode privat atau bila
          penyimpanan situs diblokir. Pemeriksaan label tetap bisa dipakai seperti biasa.
        </Notice>
      )}

      {!loading && !unavailable && products.length === 0 && (
        <Card className="flex flex-col items-start gap-4 p-6 sm:p-8">
          <div className="max-w-xl">
            <h2 className="type-h3 text-ink">Belum ada produk tersimpan</h2>
            <p className="mt-2 text-base leading-relaxed text-ink-2">
              Periksa label produkmu, lalu pilih &quot;Simpan ke Produk saya&quot; di halaman hasil.
              Produk yang tersimpan bisa dibuka lagi dan dibetulkan kapan saja.
            </p>
          </div>
          <ButtonLink href="/periksa" size="md" icon="scan">
            Mulai periksa label
          </ButtonLink>
        </Card>
      )}

      {products.length > 0 && (
        <>
          <p className="text-sm text-ink-2">
            {products.length} dari maksimal {MAX_SAVED_PRODUCTS} produk
          </p>
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {products.map((product) => (
              <li key={product.id} className="min-w-0">
                <ProductCard
                  product={product}
                  confirming={confirmId === product.id}
                  onAskDelete={() => setConfirmId(product.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  onConfirmDelete={() => handleDelete(product.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ProductCard({
  product,
  confirming,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  product: SavedProduct;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const summary = useMemo(() => summarizeProduct(product), [product]);
  const { kurang, tidakBisaDicek } = summary.ringkasan;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="min-w-0">
        <h2 className="type-h3 break-words text-ink">{product.nama}</h2>
        <p className="mt-1 text-sm text-ink-2">
          Diperbarui <time dateTime={product.diperbaruiPada}>{formatDate(product.diperbaruiPada)}</time>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {kurang === 0 ? (
          <Pill tone="success" icon="check">
            Siap cetak
          </Pill>
        ) : (
          <Pill tone="danger" icon="warning">
            {kurang} butir kurang
          </Pill>
        )}
        {tidakBisaDicek > 0 && <Pill tone="neutral">{tidakBisaDicek} tidak bisa dicek</Pill>}
      </div>

      <p className="text-sm leading-snug text-ink-2">
        <span className="font-semibold text-ink">Jalur izin: </span>
        {summary.jalurIzinJudul}
      </p>

      <div className="mt-auto pt-1">
        {confirming ? (
          <div role="group" aria-label={`Konfirmasi hapus ${product.nama}`} className="space-y-3">
            <p className="text-sm font-semibold text-ink">
              Hapus &quot;{product.nama}&quot; dari perangkat ini? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" size="md" icon="close" onClick={onConfirmDelete}>
                Ya, hapus
              </Button>
              <Button variant="secondary" size="md" onClick={onCancelDelete}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href={`/periksa?produk=${encodeURIComponent(product.id)}`}
              size="md"
              icon="edit"
            >
              Buka lagi
            </ButtonLink>
            <Button
              variant="secondary"
              size="md"
              onClick={onAskDelete}
              aria-label={`Hapus ${product.nama}`}
            >
              Hapus
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
