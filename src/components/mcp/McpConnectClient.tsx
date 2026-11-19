'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { Notice, Pill } from '@/components/ui/surface';
import { cn } from '@/lib/cn';

const PROD_ORIGIN = 'https://tilik-label.vercel.app';
const LOCAL_ORIGIN = 'http://localhost:3000';

type EnvMode = 'prod' | 'local';
type PromptPresetId = 'init' | 'audit' | 'print';
type ClientTabId = 'json' | 'claude-code' | 'vscode' | 'claude-desktop' | 'curl';

interface PromptPreset {
  id: PromptPresetId;
  label: string;
  hint: string;
  build: (url: string) => string;
}

const PROMPT_PRESETS: readonly PromptPreset[] = [
  {
    id: 'init',
    label: 'Pasang & inisialisasi MCP',
    hint: 'Tempel ke Claude Code, Cursor, Codex, atau agen lain agar agen mendaftarkan server MCP Tilik Label sendiri.',
    build: (url) =>
      [
        `Hubungkan dan inisialisasi server MCP Tilik Label (Streamable HTTP, tanpa API key):`,
        `- Nama server: tilik-label`,
        `- Transport: http (Streamable HTTP)`,
        `- URL: ${url}`,
        '',
        `Setelah terpasang, panggil tool "daftar_aturan_bpom" atau cek daftar tool yang tersedia untuk memastikan koneksi berhasil, lalu ringkas kemampuan yang siap dipakai.`,
      ].join('\n'),
  },
  {
    id: 'audit',
    label: 'Audit label kemasan',
    hint: 'Gunakan setelah MCP terpasang agar agen memeriksa label secara deterministik tanpa menebak data produsen.',
    build: (url) =>
      [
        `Gunakan server MCP "tilik-label" (${url}) untuk memeriksa label kemasan pangan berikut.`,
        `1. Ekstrak teks label apa adanya (jangan memperbaiki ejaan atau urutan bahan dulu) lalu panggil tool "periksa_label".`,
        `2. Jika "pertanyaanBelumDijawab" masih berisi pertanyaan (misalnya resep, umur simpan, cara simpan, sertifikat halal, alat produksi), tanyakan langsung ke saya sebelum menyimpulkan — jangan menebak.`,
        `3. Laporkan skor, temuan yang kurang beserta nomor pasal BPOM-nya, dan jalur izin SPP-IRT.`,
        `4. Sertakan penafian bahwa ini pemeriksaan awal, bukan pengesahan Dinas Kesehatan atau BPOM.`,
      ].join('\n'),
  },
  {
    id: 'print',
    label: 'Susun label & cek ukuran stiker',
    hint: 'Cocok untuk agen desain atau pembuat stiker sebelum mencetak.',
    build: (url) =>
      [
        `Gunakan server MCP "tilik-label" (${url}) dan panggil tool "susun_label_perbaikan" dengan data label saya serta ukuran stiker 90 x 65 mm.`,
        `Tampilkan:`,
        `- Teks setiap baris label perbaikan yang sudah sesuai format BPOM 31/2018.`,
        `- Daftar bahan dengan penanda cetak tebal (**alergen**) sesuai Pasal 51.`,
        `- Daftar butir wajib yang masih kosong (jangan mengarang nomor P-IRT, halal, atau tanggal).`,
        `- Hasil pengecekan skala cetak Pasal 9 (apakah muat pada ukuran stiker, atau ukuran minimum yang disarankan).`,
      ].join('\n'),
  },
];

interface ClientConfig {
  id: ClientTabId;
  label: string;
  fileHint: string;
  build: (url: string) => string;
}

const CLIENT_TABS: readonly ClientConfig[] = [
  {
    id: 'json',
    label: 'JSON (Cursor / Umum)',
    fileHint: 'Simpan di .cursor/mcp.json atau berkas konfigurasi MCP klienmu.',
    build: (url) =>
      JSON.stringify(
        {
          mcpServers: {
            'tilik-label': {
              type: 'http',
              url,
            },
          },
        },
        null,
        2,
      ),
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    fileHint: 'Jalankan perintah ini di terminal proyekmu.',
    build: (url) => `claude mcp add --transport http tilik-label ${url}`,
  },
  {
    id: 'vscode',
    label: 'VS Code / Copilot',
    fileHint: 'Simpan di .vscode/mcp.json di dalam workspace.',
    build: (url) =>
      JSON.stringify(
        {
          servers: {
            'tilik-label': {
              type: 'http',
              url,
            },
          },
        },
        null,
        2,
      ),
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    fileHint:
      'Buka Settings -> Connectors -> Add custom connector dan masukkan URL di atas, atau pakai mcp-remote di claude_desktop_config.json:',
    build: (url) =>
      JSON.stringify(
        {
          mcpServers: {
            'tilik-label': {
              command: 'npx',
              args: ['-y', 'mcp-remote', url],
            },
          },
        },
        null,
        2,
      ),
  },
  {
    id: 'curl',
    label: 'cURL / Inspector',
    fileHint: 'Uji langsung handshake JSON-RPC dari terminal atau buka MCP Inspector.',
    build: (url) =>
      [
        `# Uji daftar tool lewat cURL`,
        `curl -sS -X POST "${url}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
        '',
        `# Atau buka antarmuka uji MCP Inspector`,
        `npx -y @modelcontextprotocol/inspector`,
      ].join('\n'),
  },
];

type ProbeState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; serverName: string; version: string; toolsCount: number; resourcesCount: number }
  | { kind: 'error'; message: string };

function useCopyFlag() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      setCopiedKey(null);
    }
  };

  return { copiedKey, copy };
}

export function McpConnectClient() {
  const [envMode, setEnvMode] = useState<EnvMode>('prod');
  const [promptId, setPromptId] = useState<PromptPresetId>('init');
  const [clientTab, setClientTab] = useState<ClientTabId>('json');
  const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });
  const { copiedKey, copy } = useCopyFlag();
  const promptPanelId = useId();
  const configPanelId = useId();

  const endpointUrl = `${envMode === 'prod' ? PROD_ORIGIN : LOCAL_ORIGIN}/api/mcp`;
  const activePrompt = PROMPT_PRESETS.find((p) => p.id === promptId) ?? PROMPT_PRESETS[0]!;
  const activeClient = CLIENT_TABS.find((c) => c.id === clientTab) ?? CLIENT_TABS[0]!;
  const promptText = activePrompt.build(endpointUrl);
  const configText = activeClient.build(endpointUrl);

  const testConnection = async () => {
    setProbe({ kind: 'checking' });
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: { name: 'tilik-label-web', version: '0.1.0' },
            },
          },
          { jsonrpc: '2.0', id: 2, method: 'tools/list' },
          { jsonrpc: '2.0', id: 3, method: 'resources/list' },
        ]),
      });
      if (!response.ok) {
        setProbe({ kind: 'error', message: `Server menjawab status ${response.status}.` });
        return;
      }
      const batch = (await response.json()) as Array<{
        id: number;
        result?: {
          serverInfo?: { name?: string; version?: string };
          tools?: unknown[];
          resources?: unknown[];
        };
      }>;
      const init = batch.find((entry) => entry.id === 1)?.result;
      const tools = batch.find((entry) => entry.id === 2)?.result?.tools;
      const resources = batch.find((entry) => entry.id === 3)?.result?.resources;
      if (!init?.serverInfo?.name || !Array.isArray(tools) || !Array.isArray(resources)) {
        setProbe({ kind: 'error', message: 'Respons MCP tidak sesuai format JSON-RPC 2.0.' });
        return;
      }
      setProbe({
        kind: 'ok',
        serverName: init.serverInfo.name,
        version: init.serverInfo.version ?? '0.1.0',
        toolsCount: tools.length,
        resourcesCount: resources.length,
      });
    } catch {
      setProbe({ kind: 'error', message: 'Tidak bisa menghubungi endpoint /api/mcp di origin ini.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Bilah alamat endpoint + tombol uji koneksi */}
      <section aria-labelledby="mcp-endpoint-judul" className="panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="mcp-endpoint-judul" className="type-h3">
              Alamat server MCP
            </h2>
            <p className="mt-0.5 text-sm text-ink-2">
              Streamable HTTP (JSON-RPC 2.0), tanpa akun dan tanpa kunci API.
            </p>
          </div>
          <div
            role="group"
            aria-label="Pilih alamat server"
            className="inline-flex rounded-full border border-line bg-paper p-1"
          >
            <button
              type="button"
              aria-pressed={envMode === 'prod'}
              onClick={() => setEnvMode('prod')}
              className={cn(
                'min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors',
                envMode === 'prod'
                  ? 'bg-ink text-surface'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              Produksi (Vercel)
            </button>
            <button
              type="button"
              aria-pressed={envMode === 'local'}
              onClick={() => setEnvMode('local')}
              className={cn(
                'min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors',
                envMode === 'local'
                  ? 'bg-ink text-surface'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              Lokal
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] border border-line-strong/40 bg-ink px-4 py-2.5 font-mono text-sm text-paper">
            <span className="shrink-0 rounded bg-action px-1.5 py-0.5 text-[0.6875rem] font-bold text-ink">
              POST
            </span>
            <code className="min-w-0 flex-1 truncate">{endpointUrl}</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="md"
              icon={copiedKey === 'url' ? 'check' : 'copy'}
              onClick={() => void copy('url', endpointUrl)}
            >
              {copiedKey === 'url' ? 'URL tersalin' : 'Salin URL'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon="sync"
              busy={probe.kind === 'checking'}
              disabled={probe.kind === 'checking'}
              onClick={() => void testConnection()}
            >
              {probe.kind === 'checking' ? 'Menguji…' : 'Uji koneksi'}
            </Button>
          </div>
        </div>

        {probe.kind === 'ok' && (
          <div role="status" aria-live="polite">
            <Notice tone="success" title={`Terhubung ke ${probe.serverName} v${probe.version}`}>
              Endpoint <code className="font-mono text-xs">/api/mcp</code> menjawab handshake JSON-RPC 2.0 dengan{' '}
              <strong>{probe.toolsCount} tool</strong> dan <strong>{probe.resourcesCount} resource</strong> aktif.
            </Notice>
          </div>
        )}
        {probe.kind === 'error' && (
          <div role="alert">
            <Notice tone="warning" title="Uji koneksi belum berhasil">
              {probe.message}
            </Notice>
          </div>
        )}
      </section>

      {/* Kartu 1: Salin prompt untuk inisialisasi oleh agen sendiri */}
      <section aria-labelledby="mcp-prompt-judul" className="panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="info" dot>Cara tercepat</Pill>
              <span className="text-xs font-semibold text-ink-3">Biarkan agen memasang sendiri</span>
            </div>
            <h2 id="mcp-prompt-judul" className="type-h2 mt-2">
              Salin prompt untuk agen AI
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Tempel teks ini langsung ke obrolan agen AI-mu (Claude, ChatGPT, Cursor, atau Codex) agar agen langsung memasang atau menjalankan pemeriksaan BPOM.
            </p>
          </div>
        </div>

        <div role="tablist" aria-label="Pilihan prompt agen" className="flex flex-wrap gap-2">
          {PROMPT_PRESETS.map((preset) => {
            const active = preset.id === activePrompt.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={promptPanelId}
                onClick={() => setPromptId(preset.id)}
                className={cn(
                  'press min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors',
                  active
                    ? 'border-ink bg-action text-ink'
                    : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div id={promptPanelId} role="tabpanel" className="space-y-2.5">
          <p className="text-sm text-ink-2">{activePrompt.hint}</p>
          <div className="overflow-hidden rounded-[18px] border border-ink/15 bg-ink text-paper shadow-raised">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-paper/80">
                <Icon name="chat" size={15} className="text-action" />
                Prompt · {activePrompt.label}
              </span>
              <button
                type="button"
                onClick={() => void copy(`prompt-${activePrompt.id}`, promptText)}
                className="press inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-paper transition-colors hover:bg-white/20"
              >
                <Icon
                  name={copiedKey === `prompt-${activePrompt.id}` ? 'check' : 'copy'}
                  size={14}
                  className={copiedKey === `prompt-${activePrompt.id}` ? 'text-action' : undefined}
                />
                {copiedKey === `prompt-${activePrompt.id}` ? 'Tersalin!' : 'Salin prompt'}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-paper/95">
              <code>{promptText}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Kartu 2: Konfigurasi JSON / CLI per klien */}
      <section aria-labelledby="mcp-json-judul" className="panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 id="mcp-json-judul" className="type-h2">
            Salin konfigurasi JSON atau perintah CLI
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            Untuk konfigurasi manual di editor atau klien MCP pilihanmu.
          </p>
        </div>

        <div role="tablist" aria-label="Pilih klien MCP" className="flex flex-wrap gap-2">
          {CLIENT_TABS.map((tab) => {
            const active = tab.id === activeClient.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={configPanelId}
                onClick={() => setClientTab(tab.id)}
                className={cn(
                  'press min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors',
                  active
                    ? 'border-ink bg-ink text-surface'
                    : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div id={configPanelId} role="tabpanel" className="space-y-2.5">
          <p className="text-sm text-ink-2">{activeClient.fileHint}</p>
          <div className="overflow-hidden rounded-[18px] border border-ink/15 bg-ink text-paper shadow-raised">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-xs text-paper/80">{activeClient.label}</span>
              <button
                type="button"
                onClick={() => void copy(`config-${activeClient.id}`, configText)}
                className="press inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-paper transition-colors hover:bg-white/20"
              >
                <Icon
                  name={copiedKey === `config-${activeClient.id}` ? 'check' : 'copy'}
                  size={14}
                  className={copiedKey === `config-${activeClient.id}` ? 'text-action' : undefined}
                />
                {copiedKey === `config-${activeClient.id}` ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed text-paper/95">
              <code>{configText}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
