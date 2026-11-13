import { describe, expect, it, vi } from 'vitest';
import { OUT_OF_SCOPE_ANSWER } from '../../domain/assistant';
import {
  ASSISTANT_SYSTEM_PROMPT,
  ASSISTANT_UNAVAILABLE,
  ASSISTANT_UNSURE,
  askAssistant,
  checkAnswer,
} from '../server/assistant';
import type { FetchLike } from '../server/labelReader';

const ENV = { LLM_DEEPSEEK_API_KEY: 'kunci-uji-ds', LLM_HAIKU_API_KEY: 'kunci-uji-hk' };

function deepseek(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function anthropic(text: string) {
  return new Response(
    JSON.stringify({
      id: 'msg_uji',
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-5-5',
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('checkAnswer', () => {
  it('jawaban di luar cakupan diganti kalimat penolakan baku', () => {
    expect(checkAnswer({ diLuarCakupan: true, jawaban: 'Resep sambal: ...' })).toEqual({
      diLuarCakupan: true,
      jawaban: OUT_OF_SCOPE_ANSWER,
    });
  });

  it('jawaban yang menyebut pasal di luar bahan acuan tidak dipakai', () => {
    expect(checkAnswer({ diLuarCakupan: false, jawaban: 'Sesuai Pasal 123, ...' })?.jawaban).toBe(
      ASSISTANT_UNSURE,
    );
  });

  it('bentuk salah, kosong, atau terlalu panjang ditolak', () => {
    expect(checkAnswer(undefined)).toBeNull();
    expect(checkAnswer({ jawaban: 'x' })).toBeNull();
    expect(checkAnswer({ diLuarCakupan: false, jawaban: ' ' })).toBeNull();
    expect(checkAnswer({ diLuarCakupan: false, jawaban: 'a'.repeat(1501) })).toBeNull();
  });

  it('jawaban wajar dipakai apa adanya', () => {
    expect(checkAnswer({ diLuarCakupan: false, jawaban: 'Urutkan bahan dari yang terbanyak (Pasal 14).' })).toEqual({
      diLuarCakupan: false,
      jawaban: 'Urutkan bahan dari yang terbanyak (Pasal 14).',
    });
  });
});

describe('askAssistant', () => {
  it('system prompt melarang mengubah status dan mengarang pasal, memuat bahan acuan', () => {
    expect(ASSISTANT_SYSTEM_PROMPT).toMatch(/Jangan pernah mengubah/);
    expect(ASSISTANT_SYSTEM_PROMPT).toMatch(/Jangan mengarang pasal/);
    expect(ASSISTANT_SYSTEM_PROMPT).toMatch(/L-01 \|/);
  });

  it('konteks terkunci dan pertanyaan dikirim di pesan pengguna, system prompt tetap', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      deepseek(JSON.stringify({ diLuarCakupan: false, jawaban: 'Penjelasan.' })),
    );
    const result = await askAssistant({ temuan: [{ kode: 'L-03', status: 'kurang' }] }, 'Apa maksudnya?', {
      env: ENV,
      fetchImpl,
    });
    expect(result).toEqual({ ok: true, jawaban: 'Penjelasan.', diLuarCakupan: false, penyedia: 'deepseek' });
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.messages[0]).toEqual({ role: 'system', content: ASSISTANT_SYSTEM_PROMPT });
    expect(body.messages[1].content).toMatch(/"status":"kurang"/);
    expect(body.messages[1].content).toMatch(/Apa maksudnya\?/);
  });

  it('haiku memakai system prompt yang di-cache', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      anthropic(JSON.stringify({ diLuarCakupan: false, jawaban: 'Oke.' })),
    );
    const result = await askAssistant({}, 'Tanya', { env: { ...ENV, LLM_PROVIDER: 'haiku' }, fetchImpl });
    expect(result.ok && result.penyedia).toBe('haiku');
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('penyedia utama gagal: penyedia satunya dicoba; semua gagal: pesan tidak tersedia', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return url.includes('deepseek') ? deepseek('{}', 500) : anthropic('bukan json');
    });
    expect(await askAssistant({}, 'Tanya', { env: ENV, fetchImpl })).toEqual({
      ok: false,
      pesan: ASSISTANT_UNAVAILABLE,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('tanpa kunci tidak memanggil jaringan', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    expect((await askAssistant({}, 'Tanya', { env: {}, fetchImpl })).ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
