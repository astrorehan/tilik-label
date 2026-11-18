'use client';

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AnyRuleId } from '@/domain';
import { AssistantChat, type AssistantInput } from './AssistantChat';
import { AssistantDrawer, type AssistantLaunch } from './AssistantDrawer';
import { openExistingReportAssistant, useReportAssistant } from './ReportAssistant';

export function AssistantBox({
  label,
  answers,
  ruleId,
  title,
}: AssistantInput & {
  ruleId?: AnyRuleId;
  title: string;
}) {
  const id = useId();
  const [launch, setLaunch] = useState<AssistantLaunch>();
  const input = { label, answers };

  return (
    <>
      <Button
        size="md"
        variant="secondary"
        icon="chat"
        aria-haspopup="dialog"
        onClick={(event) => {
          const opener = event.currentTarget;
          if (!ruleId && openExistingReportAssistant(input, opener)) return;
          setLaunch({ open: true, opener });
        }}
      >
        Tanya Tilik
      </Button>
      {launch && (
        <AssistantDrawer id={id} launch={launch} onClose={() => setLaunch((current) => current && { ...current, open: false })}>
          <AssistantChat id={id} open={launch.open} title={title} input={input} ruleId={ruleId} />
        </AssistantDrawer>
      )}
    </>
  );
}

export function RuleAssistant({ label, answers, ruleId }: AssistantInput & { ruleId: AnyRuleId }) {
  const report = useReportAssistant();
  const registerInput = report?.registerInput;

  useEffect(() => {
    registerInput?.({ label, answers });
  }, [registerInput, label, answers]);

  // Ringkasan merender peluncur untuk semua temuan. Pemanggil lama memasok data dari sini.
  if (report) return null;

  return <AssistantBox label={label} answers={answers} ruleId={ruleId} title="Temuan pemeriksaan" />;
}
