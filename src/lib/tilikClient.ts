import type { AdditionalQuestionId } from '@/domain/questions';
import type { AnswerPatch, LabelEdit } from '@/domain/tilikActions';
import type { AdditionalAnswers, LabelData, LabelRuleId } from '@/domain/types';

export interface TilikInput {
  label: LabelData;
  answers: AdditionalAnswers;
}

interface Actions {
  jawab: { input: { pertanyaanId: AdditionalQuestionId; jawaban: string }; output: { jawaban: AnswerPatch } };
  sapaan: { input: TilikInput; output: { prioritas: LabelRuleId[] } };
  klaim: { input: TilikInput & { indeks: number; klaim: string }; output: { usulan: string[] } };
  ubah: { input: TilikInput & { perintah: string }; output: { edit: LabelEdit } };
}

export async function requestTilik<A extends keyof Actions>(
  aksi: A,
  input: Actions[A]['input'],
  signal: AbortSignal,
): Promise<({ ok: true } & Actions[A]['output']) | { ok: false; pesan: string }> {
  try {
    const response = await fetch('/api/asisten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, aksi }),
      signal,
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.ok === true && data.aksi === aksi) return data;
    return { ok: false, pesan: data?.pesan ?? 'Tilik sedang tidak tersedia. Coba lagi nanti.' };
  } catch {
    return { ok: false, pesan: 'Koneksi terputus. Periksa koneksi internet, lalu coba lagi.' };
  }
}
