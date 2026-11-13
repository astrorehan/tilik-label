'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cleanRecipe, parseAmountInput } from '@/domain';
import type { RecipeIngredient } from '@/domain';

interface RecipeRow {
  key: number;
  nama: string;
  jumlah: string;
}

function toRows(resep: RecipeIngredient[]): RecipeRow[] {
  const rows = resep.map((item, index) => ({
    key: index,
    nama: item.nama,
    jumlah: String(item.jumlahGram).replace('.', ','),
  }));
  return rows.length > 0 ? rows : [{ key: 0, nama: '', jumlah: '' }];
}

function toRecipe(rows: RecipeRow[]): RecipeIngredient[] {
  return cleanRecipe(
    rows.map((row) => ({ nama: row.nama, jumlahGram: parseAmountInput(row.jumlah) ?? 0 })),
  );
}

interface RecipeEditorProps {
  value: RecipeIngredient[];
  onChange: (next: RecipeIngredient[]) => void;
  describedBy?: string;
}

/** Isian resep per baris: nama bahan dan takaran dalam gram atau ml. */
export function RecipeEditor({ value, onChange, describedBy }: RecipeEditorProps) {
  const [rows, setRows] = useState<RecipeRow[]>(() => toRows(value));
  const [nextKey, setNextKey] = useState(() => Math.max(value.length, 1));

  const update = (next: RecipeRow[]) => {
    setRows(next);
    onChange(toRecipe(next));
  };

  return (
    <div className="space-y-2.5" aria-describedby={describedBy}>
      <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_2.75rem] gap-2 px-1 text-xs font-semibold text-ink-3 sm:grid">
        <span>Nama bahan</span>
        <span>Takaran (g/ml)</span>
        <span className="sr-only">Hapus</span>
      </div>
      <ol className="space-y-2.5">
        {rows.map((row, index) => {
          const amountInvalid = row.jumlah.trim() !== '' && parseAmountInput(row.jumlah) === null;
          return (
            <li
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.75rem] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_2.75rem]"
            >
              <label className="sr-only" htmlFor={`resep-nama-${row.key}`}>
                Nama bahan ke-{index + 1}
              </label>
              <input
                id={`resep-nama-${row.key}`}
                type="text"
                value={row.nama}
                placeholder={index === 0 ? 'Contoh: tepung terigu' : 'Nama bahan'}
                onChange={(event) =>
                  update(rows.map((r) => (r.key === row.key ? { ...r, nama: event.target.value } : r)))
                }
                className="min-h-12 w-full rounded-[14px] border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-ink-3 focus:border-brand focus:shadow-[0_0_0_4px_var(--color-brand-soft)] focus:outline-none"
              />
              <label className="sr-only" htmlFor={`resep-jumlah-${row.key}`}>
                Takaran bahan ke-{index + 1} dalam gram atau ml
              </label>
              <input
                id={`resep-jumlah-${row.key}`}
                type="text"
                inputMode="decimal"
                value={row.jumlah}
                placeholder="gram"
                aria-invalid={amountInvalid || undefined}
                onChange={(event) =>
                  update(
                    rows.map((r) => (r.key === row.key ? { ...r, jumlah: event.target.value } : r)),
                  )
                }
                className="tabular min-h-12 w-full rounded-[14px] border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-ink-3 focus:border-brand focus:shadow-[0_0_0_4px_var(--color-brand-soft)] focus:outline-none aria-[invalid=true]:border-danger"
              />
              <Button
                variant="ghost"
                size="md"
                icon="close"
                className="!min-h-12 !px-0"
                aria-label={`Hapus bahan ke-${index + 1}`}
                disabled={rows.length === 1 && !row.nama && !row.jumlah}
                onClick={() => {
                  const remaining = rows.filter((r) => r.key !== row.key);
                  if (remaining.length === 0) {
                    update([{ key: nextKey, nama: '', jumlah: '' }]);
                    setNextKey(nextKey + 1);
                  } else {
                    update(remaining);
                  }
                }}
              >
                <span className="sr-only">Hapus</span>
              </Button>
              {amountInvalid && (
                <p className="col-span-3 text-xs font-semibold text-danger-ink">
                  Takaran harus angka, misalnya 250 atau 1,5.
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <Button
        variant="secondary"
        size="md"
        icon="plus"
        onClick={() => {
          update([...rows, { key: nextKey, nama: '', jumlah: '' }]);
          setNextKey(nextKey + 1);
        }}
      >
        Tambah bahan
      </Button>
    </div>
  );
}
