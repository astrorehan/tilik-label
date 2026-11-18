import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { LabelCheckReport, LabelRuleId } from '@/domain';
import type { LabelEdit } from '@/domain/tilikActions';
import type { AssistantInput } from './AssistantChat';
import type { AssistantLaunch } from './AssistantDrawer';
import { TilikMascot } from './TilikMascot';

const AssistantChat = dynamic(() => import('./AssistantChat').then((mod) => mod.AssistantChat));
const AssistantDrawer = dynamic(() => import('./AssistantDrawer').then((mod) => mod.AssistantDrawer));

type OpenReportAssistant = (opener: HTMLButtonElement, ruleId?: LabelRuleId) => void;

interface ReportAssistantContext {
  controls?: string;
  openAssistant: OpenReportAssistant;
  registerInput: (input: AssistantInput) => void;
}

const ReportContext = createContext<ReportAssistantContext | null>(null);
const reportLaunchers = new WeakMap<AssistantInput['label'], WeakMap<AssistantInput['answers'], OpenReportAssistant>>();

export function useReportAssistant() {
  return useContext(ReportContext);
}

/** Mengarahkan peluncur di luar ringkasan ke percakapan produk yang sama. */
export function openExistingReportAssistant({ label, answers }: AssistantInput, opener: HTMLButtonElement) {
  const launch = reportLaunchers.get(label)?.get(answers);
  launch?.(opener);
  return Boolean(launch);
}

export function ReportAssistant({
  report,
  productTitle,
  input,
  onApplyLabelEdit,
  children,
}: {
  report: LabelCheckReport;
  productTitle: string;
  input?: AssistantInput;
  onApplyLabelEdit?: (edit: LabelEdit) => void;
  children: ReactNode;
}) {
  const dialogId = useId();
  const [launch, setLaunch] = useState<(AssistantLaunch & { ruleId?: LabelRuleId })>();
  const [registeredInput, setRegisteredInput] = useState<AssistantInput>();
  const source = input ?? registeredInput;
  const controls = launch ? dialogId : undefined;
  const finding = report.hasil.find((item) => item.id === launch?.ruleId);

  const openAssistant = useCallback<OpenReportAssistant>((opener, ruleId) => {
    setLaunch({ open: true, opener, ruleId });
  }, []);
  const registerInput = useCallback((next: AssistantInput) => {
    setRegisteredInput((previous) =>
      previous?.label === next.label && previous.answers === next.answers ? previous : next,
    );
  }, []);
  const session = useMemo(
    () => ({ controls, openAssistant, registerInput }),
    [controls, openAssistant, registerInput],
  );

  useEffect(() => {
    if (!source) return;
    let byAnswers = reportLaunchers.get(source.label);
    if (!byAnswers) {
      byAnswers = new WeakMap();
      reportLaunchers.set(source.label, byAnswers);
    }
    byAnswers.set(source.answers, openAssistant);
    return () => {
      if (byAnswers.get(source.answers) === openAssistant) byAnswers.delete(source.answers);
    };
  }, [source, openAssistant]);

  return (
    <ReportContext.Provider value={session}>
      <section aria-label="Ringkasan pemeriksaan label" className="space-y-4">{children}</section>
      {launch && (
        <AssistantDrawer
          id={dialogId}
          launch={launch}
          onClose={() => setLaunch((current) => current && { ...current, open: false })}
        >
          <AssistantChat
            id={dialogId}
            open={launch.open}
            title={finding?.judul ?? productTitle}
            initialMood={finding?.status === 'lengkap' ? 'happy' : 'idle'}
            input={source}
            ruleId={launch.ruleId}
            report={report}
            finding={finding}
            onApplyLabelEdit={onApplyLabelEdit}
          />
        </AssistantDrawer>
      )}
    </ReportContext.Provider>
  );
}

export function ReportAssistantCompanion({ summary }: { summary: LabelCheckReport['ringkasan'] }) {
  const session = useReportAssistant();
  if (!session) return null;

  const { kurang, tidakBisaDicek } = summary;
  const invitation = kurang > 0 ? 'Mau lihat apa yang perlu dibenahi dulu?'
    : tidakBisaDicek > 0 ? 'Yuk lihat bagian yang masih perlu dicek.'
      : 'Mau bahas hasil pemeriksaan labelmu?';

  return (
    <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-[20px] bg-brand-deep p-3 text-surface sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-3.5 print:hidden">
      <div className="row-span-2 grid size-16 place-items-center rounded-[17px] bg-brand sm:row-span-1 sm:size-20 sm:rounded-[20px]">
        <TilikMascot
          size={76}
          mood={kurang > 0 ? 'alert' : tidakBisaDicek > 0 ? 'idle' : 'happy'}
          className="size-14 sm:size-[4.5rem]"
        />
      </div>
      <p className="text-sm leading-snug sm:text-base">
        <strong>Aku Tilik.</strong> {invitation}
      </p>
      <Button
        size="md"
        iconAfter="arrowRight"
        className="col-start-2 justify-self-start px-3.5! sm:col-start-3"
        aria-haspopup="dialog"
        aria-controls={session.controls}
        onClick={(event) => session.openAssistant(event.currentTarget)}
      >
        Tanya Tilik
      </Button>
    </div>
  );
}

export function ReportFindingAssistant({ ruleId, title }: { ruleId: LabelRuleId; title: string }) {
  const session = useReportAssistant();
  if (!session) return null;

  return (
    <Button
      size="md"
      variant="ghost"
      icon="chat"
      className="px-3! text-brand-deep! print:hidden"
      aria-label={`Tanya Tilik tentang ${title} (${ruleId})`}
      aria-haspopup="dialog"
      aria-controls={session.controls}
      onClick={(event) => session.openAssistant(event.currentTarget, ruleId)}
    >
      Tanya Tilik
    </Button>
  );
}
