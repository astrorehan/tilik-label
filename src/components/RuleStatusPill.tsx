import type { RuleStatus } from '@/domain';

const STATUS_CONFIG: Record<
  RuleStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  lengkap: {
    label: 'Lengkap',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dotClass: 'bg-emerald-600',
  },
  kurang: {
    label: 'Kurang',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-800',
    dotClass: 'bg-rose-600',
  },
  tidak_bisa_dicek: {
    label: 'Tidak bisa dicek',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    dotClass: 'bg-amber-600',
  },
};

export function RuleStatusPill({ status }: { status: RuleStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
