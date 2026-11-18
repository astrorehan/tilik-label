import { NextResponse } from 'next/server';
import {
  OUT_OF_SCOPE_ANSWER,
  buildLockedContext,
  isKnownRuleId,
  isQuestionInScope,
  resolveQuestion,
  sanitizeCheckInput,
  type AssistantRequest,
  type QuickQuestionId,
} from '@/domain';
import { prepareForCheck } from '@/domain/questions';
import {
  QUESTION_ANSWER_LIMIT,
  directProductAnswer,
  flaggedClaim,
  isProductQuestion,
  labelEditRequest,
  readLabelEdit,
} from '@/domain/tilikActions';
import { askAssistant } from '@/lib/server/assistant';
import { getQuotaGuard, isForeignBrowserRequest } from '@/lib/server/rateLimit';
import { interpretProductAnswer, suggestClaims, suggestGreeting, suggestLabelEdit } from '@/lib/server/tilikActions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BODY_BYTES = 60_000;

function reply(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function quotaFailure(headers: Headers) {
  const quota = getQuotaGuard().check('asisten', headers);
  if (quota.allowed) return null;
  return reply({ ok: false, pesan: quota.pesan, batasTercapai: true }, 429, {
    'Retry-After': String(quota.retryAfterSec),
  });
}

async function performAction(body: Record<string, unknown>, request: Request) {
  const { aksi } = body;
  if (aksi === 'jawab') {
    const { pertanyaanId, jawaban } = body;
    const text = typeof jawaban === 'string' ? jawaban.replace(/\s+/g, ' ').trim() : '';
    if (!isProductQuestion(pertanyaanId) || !text || text.length > QUESTION_ANSWER_LIMIT) {
      return reply({ ok: false, pesan: 'Jawaban kosong atau terlalu panjang.' }, 400);
    }
    const direct = directProductAnswer(pertanyaanId, text);
    if (direct) return reply({ ok: true, aksi, jawaban: direct });

    const failure = quotaFailure(request.headers);
    if (failure) return failure;
    const interpreted = await interpretProductAnswer(pertanyaanId, text, request.signal);
    return interpreted
      ? reply({ ok: true, aksi, jawaban: interpreted })
      : reply({ ok: false, pesan: 'Aku belum bisa mencocokkan jawaban itu. Coba lebih spesifik atau isi pilihan di atas.' });
  }

  const input = sanitizeCheckInput(body.label, body.answers);
  if (!input) return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 400);
  const { label, answers } = prepareForCheck(input.label, input.answers);

  if (aksi === 'sapaan') {
    const failure = quotaFailure(request.headers);
    if (failure) return failure;
    const prioritas = await suggestGreeting(label, answers, request.signal);
    return reply({ ok: true, aksi, prioritas });
  }

  if (aksi === 'klaim') {
    const index = body.indeks;
    // Indeks merujuk ke isian asli, termasuk jika ada baris kosong di antaranya.
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 ||
        flaggedClaim(input.label, answers, index)?.text !== body.klaim || typeof body.klaim !== 'string') {
      return reply({ ok: false, pesan: 'Klaim sudah berubah atau belum perlu diganti.' }, 400);
    }
    const failure = quotaFailure(request.headers);
    if (failure) return failure;
    const usulan = await suggestClaims(input.label, answers, index, request.signal);
    return usulan
      ? reply({ ok: true, aksi, usulan })
      : reply({ ok: false, pesan: 'Aku belum menemukan tiga pengganti yang bisa ditampilkan. Kamu tetap bisa mengubah klaimnya langsung.' });
  }

  if (aksi === 'ubah') {
    const command = typeof body.perintah === 'string' ? labelEditRequest(body.perintah) : null;
    const help = 'Sebutkan satu kolom dan nilai barunya. Misalnya, “ganti kedaluwarsa jadi 25 Des 2026”.';
    if (!command) return reply({ ok: false, pesan: help }, 400);
    const direct = readLabelEdit(command.field, command.value);
    if (direct) return reply({ ok: true, aksi, edit: direct });

    const failure = quotaFailure(request.headers);
    if (failure) return failure;
    const edit = await suggestLabelEdit(command.field, command.value, request.signal);
    return edit ? reply({ ok: true, aksi, edit }) : reply({ ok: false, pesan: help });
  }

  return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 400);
}

/**
 * POST /api/asisten
 * Menerima pertanyaan penjelasan temuan atau salah satu aksi Tilik yang terstruktur.
 * Hasil pemeriksaan dihitung ulang di server dari label dan jawaban, jadi peramban
 * tidak bisa menyisipkan status temuan sendiri.
 */
export async function POST(request: Request) {
  if (isForeignBrowserRequest(request)) {
    return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 403);
  }
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    return reply({ ok: false, pesan: 'Permintaan terlalu besar.' }, 413);
  }
  const text = await request.text().catch(() => '');
  if (!text || Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
    return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 400);
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('bukan objek');
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ ok: false, pesan: 'Permintaan tidak sah.' }, 400);
  }

  if (body.aksi !== undefined) return performAction(body, request);

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

  // Pertanyaan bebas yang jelas di luar topik ditolak tanpa memanggil model dan tanpa memakai jatah.
  if ('pertanyaanBebas' in (assistantRequest ?? {}) && !isQuestionInScope(question, ruleId)) {
    return reply({ ok: true, jawaban: OUT_OF_SCOPE_ANSWER, diLuarCakupan: true });
  }

  const failure = quotaFailure(request.headers);
  if (failure) return failure;

  const context = buildLockedContext(input.label, input.answers, ruleId);
  const outcome = await askAssistant(context, question, { signal: request.signal });
  return reply(outcome.ok ? { ok: true, jawaban: outcome.jawaban, diLuarCakupan: outcome.diLuarCakupan } : outcome);
}
