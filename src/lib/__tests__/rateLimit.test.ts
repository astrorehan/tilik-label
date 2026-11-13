import { describe, expect, it } from 'vitest';
import {
  SlidingWindowLimiter,
  createQuotaGuard,
  limitMessage,
  readLimits,
  visitorKey,
} from '../server/rateLimit';

const MIN = 60_000;
const HOUR = 60 * MIN;

function headers(ip: string) {
  return new Headers({ 'x-forwarded-for': `${ip}, 10.0.0.1` });
}

describe('SlidingWindowLimiter', () => {
  it('mengizinkan sampai batas lalu menolak dengan waktu tunggu', () => {
    const limiter = new SlidingWindowLimiter([{ ms: HOUR, max: 3, nama: 'jam' }]);
    expect(limiter.take('a', 0).allowed).toBe(true);
    expect(limiter.take('a', 10 * MIN).allowed).toBe(true);
    expect(limiter.take('a', 20 * MIN).allowed).toBe(true);
    const denied = limiter.take('a', 30 * MIN);
    expect(denied).toEqual({ allowed: false, retryAfterSec: 30 * 60, jendela: 'jam' });
  });

  it('jendela bergeser: panggilan lama keluar setelah satu jam', () => {
    const limiter = new SlidingWindowLimiter([{ ms: HOUR, max: 1, nama: 'jam' }]);
    limiter.take('a', 0);
    expect(limiter.take('a', HOUR - 1).allowed).toBe(false);
    expect(limiter.take('a', HOUR).allowed).toBe(true);
  });

  it('panggilan yang ditolak tidak ikut dihitung', () => {
    const limiter = new SlidingWindowLimiter([{ ms: HOUR, max: 1, nama: 'jam' }]);
    limiter.take('a', 0);
    for (let i = 1; i <= 5; i++) limiter.take('a', i * MIN);
    expect(limiter.take('a', HOUR).allowed).toBe(true);
  });

  it('kunci berbeda punya jatah sendiri', () => {
    const limiter = new SlidingWindowLimiter([{ ms: HOUR, max: 1, nama: 'jam' }]);
    expect(limiter.take('a', 0).allowed).toBe(true);
    expect(limiter.take('b', 0).allowed).toBe(true);
  });

  it('beberapa jendela: yang paling ketat menentukan', () => {
    const limiter = new SlidingWindowLimiter([
      { ms: HOUR, max: 5, nama: 'jam' },
      { ms: 24 * HOUR, max: 6, nama: 'hari' },
    ]);
    for (let i = 0; i < 5; i++) limiter.take('a', i);
    expect(limiter.take('a', 10).jendela).toBe('jam');
    expect(limiter.take('a', 2 * HOUR).allowed).toBe(true);
    expect(limiter.take('a', 3 * HOUR)).toMatchObject({ allowed: false, jendela: 'hari' });
  });

  it('jumlah kunci dibatasi supaya memori tidak membengkak', () => {
    const limiter = new SlidingWindowLimiter([{ ms: HOUR, max: 1, nama: 'jam' }], 100);
    for (let i = 0; i < 500; i++) limiter.take(`ip-${i}`, i);
    expect(limiter.size).toBeLessThanOrEqual(100);
  });

  it('peek tidak mencatat', () => {
    const limiter = new SlidingWindowLimiter([{ ms: HOUR, max: 1, nama: 'jam' }]);
    limiter.peek('a', 0);
    expect(limiter.take('a', 0).allowed).toBe(true);
  });
});

describe('readLimits', () => {
  it('nilai bawaan dan pengaturan lewat environment', () => {
    expect(readLimits({}).baca.map((w) => w.max)).toEqual([10, 30]);
    expect(readLimits({ LLM_BATAS_BACA_PER_JAM: '3' }).baca[0]?.max).toBe(3);
    expect(readLimits({ LLM_BATAS_BACA_PER_JAM: 'abc' }).baca[0]?.max).toBe(10);
    expect(readLimits({ LLM_BATAS_BACA_PER_JAM: '-1' }).baca[0]?.max).toBe(10);
  });
});

describe('visitorKey', () => {
  it('memakai IP pertama dari x-forwarded-for, lalu x-real-ip', () => {
    expect(visitorKey(headers('1.2.3.4'))).toBe('1.2.3.4');
    expect(visitorKey(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(visitorKey(new Headers())).toBe('tanpa-ip');
  });
});

describe('createQuotaGuard', () => {
  it('menolak setelah batas per jam dengan pesan yang jelas', () => {
    const guard = createQuotaGuard({ LLM_BATAS_BACA_PER_JAM: '2' });
    expect(guard.check('baca', headers('1.1.1.1'), 0).allowed).toBe(true);
    expect(guard.check('baca', headers('1.1.1.1'), 1).allowed).toBe(true);
    const denied = guard.check('baca', headers('1.1.1.1'), 2);
    expect(denied.allowed).toBe(false);
    if (denied.allowed) return;
    expect(denied.pesan).toMatch(/Batas pembacaan foto/);
    expect(denied.pesan).toMatch(/isi keterangan label sendiri/);
    expect(denied.retryAfterSec).toBe(3600);
  });

  it('jatah baca dan asisten terpisah', () => {
    const guard = createQuotaGuard({ LLM_BATAS_BACA_PER_JAM: '1' });
    guard.check('baca', headers('1.1.1.1'), 0);
    expect(guard.check('baca', headers('1.1.1.1'), 1).allowed).toBe(false);
    expect(guard.check('asisten', headers('1.1.1.1'), 1).allowed).toBe(true);
  });

  it('batas harian server berlaku untuk semua pengunjung', () => {
    const guard = createQuotaGuard({ LLM_BATAS_HARIAN_SERVER: '2' });
    expect(guard.check('baca', headers('1.1.1.1'), 0).allowed).toBe(true);
    expect(guard.check('asisten', headers('2.2.2.2'), 1).allowed).toBe(true);
    const denied = guard.check('baca', headers('3.3.3.3'), 2);
    expect(denied.allowed).toBe(false);
    expect(!denied.allowed && denied.pesan).toMatch(/batas harian server/);
  });

  it('pengunjung yang ditolak tidak menghabiskan jatah server', () => {
    const guard = createQuotaGuard({ LLM_BATAS_BACA_PER_JAM: '1', LLM_BATAS_HARIAN_SERVER: '2' });
    guard.check('baca', headers('1.1.1.1'), 0);
    for (let i = 0; i < 5; i++) guard.check('baca', headers('1.1.1.1'), i + 1);
    expect(guard.check('baca', headers('2.2.2.2'), 10).allowed).toBe(true);
  });
});

describe('limitMessage', () => {
  it('menulis waktu tunggu dalam detik, menit, atau jam', () => {
    expect(limitMessage('baca', { allowed: false, retryAfterSec: 30 })).toMatch(/30 detik/);
    expect(limitMessage('baca', { allowed: false, retryAfterSec: 600 })).toMatch(/10 menit/);
    expect(limitMessage('asisten', { allowed: false, retryAfterSec: 20_000 })).toMatch(/6 jam/);
  });
});
