/**
 * Pengaman layanan (F-12): batas pemanggilan model per pengunjung.
 *
 * Penghitung disimpan di memori proses server. Di Vercel serverless, setiap instans
 * punya memorinya sendiri dan bisa dimulai ulang kapan saja, jadi batas ini adalah
 * rem pertama, bukan jaminan. Pengaman terakhir tetap batas belanja di akun penyedia.
 */

export interface RateWindow {
  /** Panjang jendela waktu (ms). */
  ms: number;
  /** Jumlah panggilan maksimum dalam jendela. */
  max: number;
  /** Nama jendela untuk pesan, mis. "jam" atau "hari". */
  nama: string;
}

export interface RateDecision {
  allowed: boolean;
  /** Detik sampai boleh mencoba lagi (0 bila diizinkan). */
  retryAfterSec: number;
  /** Jendela yang membuat permintaan ditolak. */
  jendela?: string;
}

/**
 * Pembatas jendela geser sederhana: menyimpan waktu tiap panggilan per kunci.
 * Fungsi murni terhadap waktu yang diberikan, sehingga mudah diuji.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly longest: number;

  constructor(
    private readonly windows: RateWindow[],
    private readonly maxKeys = 10_000,
  ) {
    this.longest = Math.max(...windows.map((w) => w.ms));
  }

  /** Memeriksa tanpa mencatat. */
  peek(key: string, now: number): RateDecision {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.longest);
    for (const window of this.windows) {
      const inWindow = recent.filter((t) => now - t < window.ms);
      if (inWindow.length >= window.max) {
        const oldest = inWindow[0] ?? now;
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil((oldest + window.ms - now) / 1000)),
          jendela: window.nama,
        };
      }
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  /** Memeriksa lalu mencatat bila diizinkan. */
  take(key: string, now: number): RateDecision {
    const decision = this.peek(key, now);
    if (!decision.allowed) {
      return decision;
    }
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.longest);
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    this.prune(now);
    return decision;
  }

  /** Jumlah kunci yang sedang dilacak (untuk test). */
  get size(): number {
    return this.hits.size;
  }

  private prune(now: number) {
    if (this.hits.size <= this.maxKeys) return;
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.longest)) {
        this.hits.delete(key);
      }
      if (this.hits.size <= this.maxKeys) return;
    }
    // Masih penuh: buang kunci tertua (Map menjaga urutan sisip, kunci aktif disisip ulang di take).
    const oldest = this.hits.keys().next().value;
    if (oldest !== undefined) this.hits.delete(oldest);
  }
}

export type ModelUse = 'baca' | 'asisten';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** Batas bawaan, bisa diubah lewat environment variable server. */
export function readLimits(env: Record<string, string | undefined> = process.env) {
  return {
    baca: [
      { ms: HOUR, max: numberFromEnv(env.LLM_BATAS_BACA_PER_JAM, 10), nama: 'jam' },
      { ms: DAY, max: numberFromEnv(env.LLM_BATAS_BACA_PER_HARI, 30), nama: 'hari' },
    ],
    asisten: [
      { ms: HOUR, max: numberFromEnv(env.LLM_BATAS_ASISTEN_PER_JAM, 20), nama: 'jam' },
      { ms: DAY, max: numberFromEnv(env.LLM_BATAS_ASISTEN_PER_HARI, 60), nama: 'hari' },
    ],
    /** Batas seluruh pengunjung per instans server per hari. */
    server: [{ ms: DAY, max: numberFromEnv(env.LLM_BATAS_HARIAN_SERVER, 1000), nama: 'hari' }],
  } satisfies Record<ModelUse | 'server', RateWindow[]>;
}

/**
 * Pengenal pengunjung dari alamat IP (header proksi Vercel). Tanpa login, IP adalah
 * pengenal terbaik yang ada; pengguna di jaringan yang sama berbagi batas.
 */
export function visitorKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = headers.get('x-real-ip')?.trim();
  return forwarded || real || 'tanpa-ip';
}

const LIMIT_MESSAGES: Record<ModelUse, string> = {
  baca: 'Batas pembacaan foto untukmu sudah tercapai',
  asisten: 'Batas pertanyaan ke asisten untukmu sudah tercapai',
};

function waitText(seconds: number): string {
  if (seconds < 90) return `${seconds} detik`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 90) return `${minutes} menit`;
  return `${Math.ceil(minutes / 60)} jam`;
}

/** Pesan yang jelas saat batas tercapai. */
export function limitMessage(use: ModelUse, decision: RateDecision, server = false): string {
  const fallback =
    use === 'baca'
      ? 'Sementara itu kamu tetap bisa mengisi keterangan label sendiri dan mendapat hasil pemeriksaan.'
      : 'Sementara itu penjelasan setiap temuan dan pasalnya tetap bisa dibaca di halaman hasil.';
  if (server) {
    return `Layanan sedang ramai dan batas harian server tercapai. Coba lagi dalam ${waitText(decision.retryAfterSec)}. ${fallback}`;
  }
  return `${LIMIT_MESSAGES[use]}. Coba lagi dalam ${waitText(decision.retryAfterSec)}. ${fallback}`;
}

export interface QuotaGuard {
  check(
    use: ModelUse,
    headers: Headers,
    now?: number,
  ): { allowed: true } | { allowed: false; pesan: string; retryAfterSec: number };
}

/** Membuat pengaman kuota dengan penghitung terpisah per jenis pemakaian dan satu batas server. */
export function createQuotaGuard(env: Record<string, string | undefined> = process.env): QuotaGuard {
  const limits = readLimits(env);
  const limiters: Record<ModelUse, SlidingWindowLimiter> = {
    baca: new SlidingWindowLimiter(limits.baca),
    asisten: new SlidingWindowLimiter(limits.asisten),
  };
  const server = new SlidingWindowLimiter(limits.server);
  return {
    check(use, headers, now = Date.now()) {
      const key = visitorKey(headers);
      const visitor = limiters[use].peek(key, now);
      if (!visitor.allowed) {
        return { allowed: false, pesan: limitMessage(use, visitor), retryAfterSec: visitor.retryAfterSec };
      }
      const global = server.take('server', now);
      if (!global.allowed) {
        return { allowed: false, pesan: limitMessage(use, global, true), retryAfterSec: global.retryAfterSec };
      }
      limiters[use].take(key, now);
      return { allowed: true };
    },
  };
}

let sharedGuard: QuotaGuard | null = null;

/** Pengaman bersama untuk semua route model di satu instans server. */
export function getQuotaGuard(): QuotaGuard {
  sharedGuard ??= createQuotaGuard();
  return sharedGuard;
}
