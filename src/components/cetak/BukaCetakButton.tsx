'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import type { AdditionalAnswers, LabelData } from '@/domain';
import { getProduct, saveProductResult } from '@/lib/produkSaya';

/**
 * Membuka /cetak untuk produk ini. Bila isi yang tampil berbeda dari yang
 * tersimpan (atau belum pernah disimpan), disimpan dulu supaya label dan
 * ringkasan memakai isi yang sama dengan hasil di layar.
 */
export function BukaCetakButton({
  label,
  answers,
  productId,
  onSaved,
  children,
  variant = 'secondary',
  size = 'md',
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  productId?: string;
  onSaved: (id: string) => void;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  function handleClick() {
    const stored = productId ? getProduct(productId) : null;
    const unchanged =
      stored !== null &&
      JSON.stringify(stored.label) === JSON.stringify(label) &&
      JSON.stringify(stored.answers) === JSON.stringify(answers);
    if (stored && unchanged) {
      router.push(`/cetak?produk=${encodeURIComponent(stored.id)}`);
      return;
    }
    const result = saveProductResult({ id: productId, label, answers });
    if (!result.ok) {
      setFailed(true);
      return;
    }
    setFailed(false);
    onSaved(result.product.id);
    router.push(`/cetak?produk=${encodeURIComponent(result.product.id)}`);
  }

  return (
    <div className="min-w-0">
      <Button variant={variant} size={size} icon="printer" onClick={handleClick}>
        {children ?? (productId ? 'Buka draf cetak' : 'Simpan & buka draf cetak')}
      </Button>
      <div aria-live="polite" className="[&:not(:empty)]:mt-3">
        {failed && (
          <Notice tone="warning" title="Belum bisa membuka label perbaikan">
            Hasil harus disimpan ke Produk saya dulu, tetapi penyimpanan di perangkat ini menolak
            (mode privat, penuh, atau daftar sudah mencapai batas). Hapus produk lama di Produk
            saya, lalu coba lagi.
          </Notice>
        )}
      </div>
    </div>
  );
}
