import type { ReactNode } from 'react';
import { Disclosure } from '@/components/ui/disclosure';
import { Pill, type PillTone } from '@/components/ui/surface';
import type { PermitPathResult, PermitRuleImpact } from '@/domain';

const IMPACT_LOOK: Record<PermitRuleImpact, { label: string; tone: PillTone }> = {
  membebaskan: { label: 'Membebaskan', tone: 'success' },
  memenuhi: { label: 'Memenuhi', tone: 'success' },
  tidak_berlaku: { label: 'Tidak berlaku', tone: 'neutral' },
  menghalangi: { label: 'Menghalangi', tone: 'danger' },
  belum_dijawab: { label: 'Belum dijawab', tone: 'warning' },
  perlu_dicek: { label: 'Perlu dicek', tone: 'warning' },
};

export function PermitPathView({
  result,
  defaultOpen,
  children,
}: {
  result: PermitPathResult;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  return (
    <Disclosure
      icon="stamp"
      open={defaultOpen}
      label={
        <span>
          <span className="block">Jalur izin</span>
          <span className="block text-sm font-normal text-ink-2">{result.judul}</span>
        </span>
      }
    >
      <div className="space-y-4">
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
          {result.alasan.map((item) => <li key={item}>{item}</li>)}
        </ul>

        {result.perluDicek.length > 0 && (
          <div className="rounded-xl bg-paper p-4">
            <p className="text-sm font-semibold">Perlu dicek ke Dinas Kesehatan</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-2">
              {result.perluDicek.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {children}
        <Disclosure label="Rincian aturan izin" className="rounded-xl">
          <ul className="divide-y divide-line">
            {result.aturan.map((rule) => {
              const impact = IMPACT_LOOK[rule.dampak];
              return (
                <li key={rule.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{rule.judul}</p>
                    <Pill tone={impact.tone}>{impact.label}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{rule.penjelasan}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    {rule.id} · {rule.rujukan.peraturan}, {rule.rujukan.pasal}
                  </p>
                </li>
              );
            })}
          </ul>
        </Disclosure>
      </div>
    </Disclosure>
  );
}
