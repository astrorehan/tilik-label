import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Icon } from '@/components/icons/icon';
import { McpConnectClient } from '@/components/mcp/McpConnectClient';
import { Navbar } from '@/components/Navbar';
import { Disclosure } from '@/components/ui/disclosure';
import { Notice, Pill } from '@/components/ui/surface';
import { REGULATION_LAST_READ } from '@/domain';
import {
  DEFAULT_PROTOCOL_VERSION,
  MCP_RESOURCES,
  MCP_TOOLS,
} from '@/lib/server/mcpServer';

export const metadata: Metadata = {
  title: 'Server MCP untuk Agen AI',
  description:
    'Hubungkan agen AI (Claude, Cursor, VS Code, atau bot UMKM) ke mesin aturan BPOM deterministik Tilik Label lewat Model Context Protocol.',
};

function toolParamNames(schema: Record<string, unknown>): { required: string[]; optional: string[] } {
  const properties =
    typeof schema.properties === 'object' && schema.properties !== null
      ? Object.keys(schema.properties as Record<string, unknown>)
      : [];
  const required = Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === 'string')
    : [];
  const optional = properties.filter((key) => !required.includes(key));
  return { required, optional };
}

export default function McpPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="page-shell max-w-[58rem] flex-1 space-y-6 py-8 sm:py-12">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="ink">MCP</Pill>
            <Pill tone="info">Streamable HTTP · {DEFAULT_PROTOCOL_VERSION}</Pill>
            <Pill tone="success">Tanpa API key</Pill>
          </div>
          <h1 className="type-h1">Hubungkan agen AI ke Tilik Label</h1>
          <p className="max-w-3xl text-base leading-relaxed text-ink-2">
            Pasang server MCP Tilik Label agar agen AI (Claude, Cursor, VS Code, asisten desain, atau bot UMKM)
            bisa menjalankan 20 aturan label BPOM, penentu jalur izin SPP-IRT, dan perhitungan skala cetak fisik
            secara deterministik — tanpa mengarang pasal dan tanpa menyimpan data produk.
          </p>
        </header>

        <McpConnectClient />

        {/* Daftar tool & resource langsung dari definisi server */}
        <section aria-labelledby="mcp-katalog-judul" className="space-y-3">
          <h2 id="mcp-katalog-judul" className="type-h2">
            Yang tersedia untuk agen
          </h2>

          <Disclosure label={`Tool pemeriksaan (${MCP_TOOLS.length})`} icon="shield" open>
            <ul className="divide-y divide-line">
              {MCP_TOOLS.map((tool) => {
                const params = toolParamNames(tool.inputSchema);
                return (
                  <li key={tool.name} className="space-y-2 py-3.5 first:pt-1 last:pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-[8px] bg-paper-deep px-2.5 py-1 font-mono text-sm font-semibold text-ink">
                        {tool.name}
                      </code>
                      <Pill tone="neutral" className="min-h-7 py-0.5 text-xs">
                        Read-only
                      </Pill>
                      <Pill tone="info" className="min-h-7 py-0.5 text-xs">
                        Deterministik
                      </Pill>
                    </div>
                    <p className="text-sm leading-relaxed text-ink-2">{tool.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                      <span className="font-semibold text-ink-2">Parameter:</span>
                      {params.required.map((name) => (
                        <code
                          key={name}
                          className="rounded border border-brand/30 bg-brand-tint/60 px-2 py-0.5 font-mono text-brand-deep"
                        >
                          {name}*
                        </code>
                      ))}
                      {params.optional.map((name) => (
                        <code
                          key={name}
                          className="rounded border border-line bg-paper px-2 py-0.5 font-mono text-ink-2"
                        >
                          {name}
                        </code>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Disclosure>

          <Disclosure label={`Resource rujukan (${MCP_RESOURCES.length})`} icon="ledger">
            <ul className="divide-y divide-line">
              {MCP_RESOURCES.map((resource) => (
                <li key={resource.uri} className="space-y-1 py-3 first:pt-1 last:pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{resource.name}</p>
                    <code className="rounded-[8px] bg-paper-deep px-2.5 py-0.5 font-mono text-xs text-ink-2">
                      {resource.uri}
                    </code>
                  </div>
                  <p className="text-sm text-ink-2">{resource.description}</p>
                </li>
              ))}
            </ul>
          </Disclosure>
        </section>

        <Notice tone="info" title="Prinsip pengaman yang tetap berlaku di MCP">
          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              <strong>Tanpa penyimpanan &amp; tanpa biaya LLM server:</strong> endpoint hanya menjalankan fungsi
              aturan murni di <code className="font-mono text-xs">src/domain/</code>, lalu langsung membuang
              masukan setelah menjawab.
            </li>
            <li>
              <strong>Fakta produsen tidak ditebak:</strong> bila resep, sertifikat halal, umur simpan, atau alat
              produksi belum dikirim, <code className="font-mono text-xs">periksa_label</code> mengembalikan{' '}
              <code className="font-mono text-xs">pertanyaanBelumDijawab</code> supaya agen menanyakannya dulu
              ke pemilik produk.
            </li>
            <li>
              <strong>Pemeriksaan awal, bukan pengesahan:</strong> keputusan akhir tetap berada di Dinas Kesehatan
              atau BPOM.
            </li>
          </ul>
        </Notice>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/aturan" className="action-link">
              Lihat daftar aturan BPOM <Icon name="arrowRight" size={17} />
            </Link>
            <Link href="/periksa" className="action-link">
              Periksa label lewat web <Icon name="arrowRight" size={17} />
            </Link>
          </div>
          <p className="text-sm text-ink-3">Rujukan BPOM ditinjau {REGULATION_LAST_READ}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
