import { NextResponse } from 'next/server';
import {
  parseImageDataUrl,
  readLabelImage,
  type ReaderProviderId,
} from '@/lib/server/labelReader';
import { getQuotaGuard } from '@/lib/server/rateLimit';

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

const TOO_LARGE = 'Gambar terlalu besar. Coba foto ulang atau isi sendiri.';

/**
 * POST /api/baca-label
 * Badan: { gambar: "data:image/jpeg;base64,..." }
 * Gambar hanya diteruskan ke penyedia model untuk dibaca dan tidak disimpan di server.
 */
export async function POST(request: Request) {
  // Permintaan dari situs lain ditolak supaya kuota tidak dipakai pihak luar lewat peramban.
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
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

  // Batas pemanggilan model per pengunjung (F-12). Diperiksa setelah masukan sah,
  // supaya permintaan rusak tidak menghabiskan jatah.
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

  // Skrip pembanding boleh memilih satu penyedia, hanya di luar produksi.
  const requested = request.headers.get('x-tilik-penyedia');
  const onlyProvider: ReaderProviderId | undefined =
    process.env.NODE_ENV !== 'production' && (requested === 'deepseek' || requested === 'haiku')
      ? requested
      : undefined;

  const outcome = await readLabelImage(image, { onlyProvider });
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
      label: outcome.label,
      tidakTerbaca: outcome.tidakTerbaca,
      penyedia: outcome.penyedia,
      model: outcome.model,
      durasiMs: outcome.durasiMs,
      ...(process.env.NODE_ENV !== 'production' ? { percobaan: outcome.percobaan } : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
