import { NextResponse } from 'next/server';
import {
  buildLockedContext,
  isKnownRuleId,
  resolveQuestion,
  sanitizeCheckInput,
  type AssistantRequest,
  type QuickQuestionId,
} from '@/domain';
import { askAssistant } from '@/lib/server/assistant';
import { getQuotaGuard } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BODY_BYTES = 60_000;

function reply(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

/**
 * POST /api/asisten
 * Badan: { label, answers, ruleId?, pertanyaanId? | pertanyaanBebas? }
 * Hasil pemeriksaan dihitung ulang di server dari label dan jawaban, jadi peramban
 * tidak bisa menyisipkan status temuan sendiri.
 */
export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 403);
  }
  const text = await request.text().catch(() => '');
  if (!text || text.length > MAX_BODY_BYTES) {
    return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 400);
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('bukan objek');
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 400);
  }

  const input = sanitizeCheckInput(body.label, body.answers);
  const ruleId = body.ruleId === undefined ? undefined : body.ruleId;
  if (!input || (ruleId !== undefined && !isKnownRuleId(ruleId))) {
    return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 400);
  }
  const assistantRequest: AssistantRequest | null =
    typeof body.pertanyaanId === 'string'
      ? { ruleId, pertanyaanId: body.pertanyaanId as QuickQuestionId }
      : typeof body.pertanyaanBebas === 'string'
        ? { ruleId, pertanyaanBebas: body.pertanyaanBebas }
        : null;
  const question = assistantRequest ? resolveQuestion(assistantRequest) : null;
  if (!question) {
    return reply({ ok: false, pesan: 'Pertanyaan tidak sah atau terlalu panjang.' }, 400);
  }

  const quota = getQuotaGuard().check('asisten', request.headers);
  if (!quota.allowed) {
    return reply(
      { ok: false, pesan: quota.pesan, batasTercapai: true },
      429,
      { 'Retry-After': String(quota.retryAfterSec) },
    );
  }

  const context = buildLockedContext(input.label, input.answers, ruleId);
  const outcome = await askAssistant(context, question);
  return reply(outcome.ok ? { ok: true, jawaban: outcome.jawaban, diLuarCakupan: outcome.diLuarCakupan } : outcome);
}
