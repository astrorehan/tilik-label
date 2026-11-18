'use client';

import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { Notice } from '@/components/ui/surface';
import type { LabelCheckReport, LabelRuleId, LabelRuleResult, RuleStatus } from '@/domain';
import { cn } from '@/lib/cn';

interface LabelReportViewProps {
  report: LabelCheckReport;
  productTitle: string;
  actions?: ReactNode;
  renderRuleExtra?: (item: LabelRuleResult) => ReactNode;
}

const INITIAL_FINDINGS = 4;

const FINDING_LABEL: Record<LabelRuleId, string> = {
  'L-01': 'Nama jenis pangan',
  'L-02': 'Pembuka daftar bahan',
  'L-03': 'Urutan bahan',
  'L-04': 'Penulisan nama bahan',
  'L-05': 'Satuan isi bersih',
  'L-06': 'Nama dan alamat produsen',
  'L-07': 'Keterangan halal',
  'L-08': 'Tanggal dan kode produksi',
  'L-09': 'Pembuka keterangan kedaluwarsa',
  'L-10': 'Format tanggal kedaluwarsa',
  'L-11': 'Penulisan P-IRT',
  'L-12': 'Pernyataan alergen',
  'L-13': 'Cetak tebal bahan alergen',
  'L-14': 'Ukuran huruf',
  'L-15': 'Klaim kesehatan',
  'L-16': 'Klaim tanpa pengawet dan sejenisnya',
  'L-17': 'Klaim bebas bahan tambahan pangan',
  'L-18': 'Klaim alami, murni, atau sejenisnya',
  'L-19': 'Petunjuk penyimpanan',
  'L-20': 'Bahasa pada label',
};

const STATUS: Record<RuleStatus, { icon: IconName; color: string; empty: string }> = {
  kurang: {
    icon: 'warning',
    color: 'text-danger-ink',
    empty: 'Tidak ada kekurangan yang terdeteksi.',
  },
  tidak_bisa_dicek: {
    icon: 'eye',
    color: 'text-warning-ink',
    empty: 'Tidak ada bagian yang menunggu pengecekan tambahan.',
  },
  lengkap: {
    icon: 'check',
    color: 'text-success-ink',
    empty: 'Belum ada bagian yang terkonfirmasi lengkap.',
  },
};

function Finding({
  item,
  initiallyOpen,
  children,
}: {
  item: LabelRuleResult;
  initiallyOpen?: boolean;
  children?: ReactNode;
}) {
  const look = STATUS[item.status];
  return (
    <li>
      <details className="group/finding" open={initiallyOpen}>
        <summary className="disclosure-summary font-semibold">
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon name={look.icon} size={19} className={cn('shrink-0', look.color)} />
            <span>{FINDING_LABEL[item.id]}</span>
          </span>
          <Icon name="chevronDown" size={18} className="shrink-0 text-ink-3 transition-transform group-open/finding:rotate-180" />
        </summary>
        <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed sm:pl-12">
          {item.saranPerbaikan && <p className="font-semibold text-ink">{item.saranPerbaikan}</p>}
          <p className="text-ink-2">{item.penjelasan}</p>
          {item.contohBenar && (
            <div className="rounded-xl bg-paper p-3">
              <p className="text-xs font-semibold text-ink-2">Contoh penulisan</p>
              <p className="mt-1 wrap-anywhere">{item.contohBenar}</p>
            </div>
          )}
          <p className="text-xs text-ink-3">{item.id} · {item.rujukan.peraturan}, {item.rujukan.pasal}</p>
          {children}
        </div>
      </details>
    </li>
  );
}

export function LabelReportView({ report, productTitle, actions, renderRuleExtra }: LabelReportViewProps) {
  const { kurang, tidakBisaDicek, lengkap } = report.ringkasan;
  const [filter, setFilter] = useState<RuleStatus>(() => {
    if (kurang > 0) return 'kurang';
    if (tidakBisaDicek > 0) return 'tidak_bisa_dicek';
    return 'lengkap';
  });
  const filters: { id: RuleStatus; label: string; count: number }[] = [
    { id: 'kurang', label: 'Perlu diperbaiki', count: kurang },
    { id: 'tidak_bisa_dicek', label: 'Perlu dicek lagi', count: tidakBisaDicek },
    { id: 'lengkap', label: 'Lengkap', count: lengkap },
  ];
  const findings = report.hasil.filter((item) => item.status === filter);
  const additionalCount = findings.length - INITIAL_FINDINGS;

  return (
    <section aria-label="Ringkasan pemeriksaan label" className="space-y-4">
      <div className="panel bg-linear-to-br from-surface to-brand-tint p-5 sm:p-7">
        <p className="mb-1 font-semibold wrap-anywhere text-ink-2">{productTitle}</p>
        <h2 className="type-h1">
          {kurang > 0 ? `${kurang} bagian perlu diperbaiki` : 'Tidak ada kekurangan terdeteksi'}
        </h2>
        {tidakBisaDicek > 0 && (
          <p className="mt-2 text-sm text-ink-2">{tidakBisaDicek} bagian perlu dicek lagi dengan data tambahan atau kemasan fisik.</p>
        )}
        {actions && <div className="mt-4">{actions}</div>}
      </div>

      {report.alergenTerdeteksi.length > 0 && (
        <Notice tone="warning" title="Alergen terdeteksi">
          {report.alergenTerdeteksi.join(', ')}. Cocokkan dengan pernyataan alergen di label.
        </Notice>
      )}

      <div className="panel">
        <div role="group" aria-label="Saring temuan" className="flex flex-wrap gap-1.5 border-b border-line p-3 sm:p-4">
          {filters.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={cn(
                'flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold leading-tight sm:px-4',
                filter === id
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line text-ink-2 hover:bg-brand-tint',
              )}
            >
              {label}
              <span className="tabular text-xs">{count}</span>
            </button>
          ))}
        </div>

        <div key={filter}>
          {findings.length > 0 ? (
            <ul aria-label={filters.find((item) => item.id === filter)?.label} className="divide-y divide-line">
              {findings.slice(0, INITIAL_FINDINGS).map((item, index) => (
                <Finding key={item.id} item={item} initiallyOpen={index === 0 && filter === 'kurang'}>
                  {renderRuleExtra?.(item)}
                </Finding>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-ink-2">{STATUS[filter].empty}</p>
          )}
          {additionalCount > 0 && (
            <details className="group/more rounded-b-[24px] border-t border-line">
              <summary className="disclosure-summary font-semibold text-brand-deep">
                Lihat {additionalCount} lainnya
                <Icon name="chevronDown" size={18} className="shrink-0 transition-transform group-open/more:rotate-180" />
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {findings.slice(INITIAL_FINDINGS).map((item) => (
                  <Finding key={item.id} item={item}>{renderRuleExtra?.(item)}</Finding>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
