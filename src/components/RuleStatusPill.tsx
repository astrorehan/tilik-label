import { Pill, type PillTone } from '@/components/ui/surface';
import type { RuleStatus } from '@/domain';

const STATUS_CONFIG: Record<RuleStatus, { label: string; tone: PillTone }> = {
  lengkap: {
    label: 'Lengkap',
    tone: 'success',
  },
  kurang: {
    label: 'Kurang',
    tone: 'danger',
  },
  tidak_bisa_dicek: {
    label: 'Tidak bisa dicek',
    tone: 'warning',
  },
};

export function RuleStatusPill({ status }: { status: RuleStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Pill tone={cfg.tone} dot>
      {cfg.label}
    </Pill>
  );
}
