import { NextResponse } from 'next/server';
import { DEFAULT_PROTOCOL_VERSION, handleMcpPayload } from '@/lib/server/mcpServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 200_000;

const MCP_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'MCP-Protocol-Version': DEFAULT_PROTOCOL_VERSION,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'MCP-Protocol-Version',
};

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

/**
 * POST /api/mcp
 * Endpoint MCP (Model Context Protocol) Streamable HTTP tanpa status.
 * Memaparkan fungsi deterministik `src/domain/` tanpa memanggil LLM server.
 */
export async function POST(request: Request) {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    if (!/^\d+$/.test(declared.trim())) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } },
        { status: 400, headers: MCP_HEADERS },
      );
    }
    if (Number(declared) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request payload too large' } },
        { status: 413, headers: MCP_HEADERS },
      );
    }
  }

  const text = await readBoundedBody(request).catch(() => undefined);
  if (text === null) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request payload too large' } },
      { status: 413, headers: MCP_HEADERS },
    );
  }

  let payload: unknown;
  try {
    if (!text) throw new Error('kosong');
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400, headers: MCP_HEADERS },
    );
  }

  const outcome = handleMcpPayload(payload);
  if (outcome.status === 202) {
    return new NextResponse(null, { status: 202, headers: MCP_HEADERS });
  }
  return NextResponse.json(outcome.body, { status: 200, headers: MCP_HEADERS });
}

/** Server MCP tanpa status tidak membuka aliran SSE; spesifikasi meminta 405 Method Not Allowed. */
export async function GET() {
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32000,
        message: 'Method Not Allowed: gunakan POST untuk permintaan JSON-RPC MCP.',
      },
    },
    { status: 405, headers: { ...MCP_HEADERS, Allow: 'POST, OPTIONS' } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MCP_HEADERS });
}
