import { NextResponse } from 'next/server';
import { parseImageDataUrl, type ReaderProviderId } from '@/lib/server/labelReader';
import { getQuotaGuard, isForeignBrowserRequest } from '@/lib/server/rateLimit';
import { readRecipeImage } from '@/lib/server/recipeReader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Batas ukuran badan permintaan (byte). */
const MAX_BODY_BYTES = 6_500_000;

function manual(pesan: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { ok: false, pesan, arahan: 'isi_manual', ...extra },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

/** Membaca badan permintaan per potongan; null bila melewati batas. */
async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

const TOO_LARGE = 'Gambar terlalu besar. Coba foto ulang atau tulis bahannya sendiri.';

/**
 * POST /api/baca-resep
 * Badan: { gambar: "data:image/jpeg;base64,..." }
 * Foto buku/catatan resep hanya diteruskan ke penyedia model untuk disalin daftar bahannya
 * dan tidak disimpan di server.
 */
export async function POST(request: Request) {
  if (isForeignBrowserRequest(request)) {
    return manual('Permintaan tidak sah.', 403);
  }

  const declared = request.headers.get('content-length');
  if (declared !== null) {
    if (!/^\d+$/.test(declared.trim())) {
      return manual('Permintaan tidak sah.', 400);
    }
    if (Number(declared) > MAX_BODY_BYTES) {
      return manual(TOO_LARGE, 413);
    }
  }

  const text = await readBoundedBody(request).catch(() => undefined);
  if (text === null) {
    return manual(TOO_LARGE, 413);
  }
  let body: unknown;
  try {
    if (text === undefined) throw new Error('baca');
    body = JSON.parse(text);
  } catch {
    return manual('Permintaan tidak sah.', 400);
  }
  const image = parseImageDataUrl(
    typeof body === 'object' && body !== null ? (body as { gambar?: unknown }).gambar : undefined,
  );
  if (!image) {
    return manual('Gambar tidak sah. Pakai foto berformat JPG, PNG, atau WebP.', 400);
  }

  const quota = getQuotaGuard().check('baca', request.headers);
  if (!quota.allowed) {
    return NextResponse.json(
      { ok: false, pesan: quota.pesan, arahan: 'isi_manual', batasTercapai: true },
      {
        status: 429,
        headers: { 'Retry-After': String(quota.retryAfterSec), 'Cache-Control': 'no-store' },
      },
    );
  }

  const requested = request.headers.get('x-tilik-penyedia');
  const onlyProvider: ReaderProviderId | undefined =
    process.env.NODE_ENV !== 'production' && (requested === 'deepseek' || requested === 'haiku')
      ? requested
      : undefined;

  const outcome = await readRecipeImage(image, { onlyProvider, signal: request.signal });
  if (!outcome.ok) {
    return manual(
      outcome.pesan,
      200,
      process.env.NODE_ENV !== 'production' ? { percobaan: outcome.percobaan } : {},
    );
  }
  return NextResponse.json(
    {
      ok: true,
      bahan: outcome.bahan,
      perluLengkapi: outcome.perluLengkapi,
      penyedia: outcome.penyedia,
      model: outcome.model,
      durasiMs: outcome.durasiMs,
      ...(process.env.NODE_ENV !== 'production' ? { percobaan: outcome.percobaan } : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
