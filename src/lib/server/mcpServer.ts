import {
  ALLERGEN_STATEMENT,
  BAHAN_BELUM_TERBACA,
  DEFAULT_STICKER_DIMENSIONS_MM,
  FIELDS_BY_RULE,
  HAL_TIDAK_DIPERIKSA,
  MAX_STICKER_HEIGHT_MM,
  MAX_STICKER_WIDTH_MM,
  MIN_STICKER_HEIGHT_MM,
  MIN_STICKER_WIDTH_MM,
  QUESTION_BY_RULE,
  REGULATION_LAST_READ,
  RULE_CATALOG,
  STICKER_PRESETS_MM,
  buildCorrectedLabel,
  detectAllergens,
  evaluateLabelPrintFit,
  getUnansweredQuestions,
  prepareForCheck,
  reviewLabel,
  sanitizeCheckInput,
  splitAllergenParts,
  type FindingEntry,
  type IngredientPart,
} from '@/domain';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

/**
 * Server Model Context Protocol (MCP) tanpa status (stateless) untuk Tilik Label.
 *
 * Hanya memaparkan fungsi deterministik dari `src/domain/` (aturan BPOM 31/2018, 4/2024,
 * 10/2026, penyusun label perbaikan, dan skala cetak fisik). Tidak memanggil model LLM
 * di server dan tidak menyimpan data pengguna.
 */

export const MCP_SERVER_INFO = {
  name: 'tilik-label',
  version: '0.1.0',
} as const;

export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
] as const;

export const DEFAULT_PROTOCOL_VERSION = '2025-03-26';

export const DISCLAIMER_TEXT =
  'Pemeriksaan awal, bukan pengesahan. Keputusan akhir tetap berada di Dinas Kesehatan atau BPOM.';

export const MCP_INSTRUCTIONS = [
  'Tilik Label memeriksa kelengkapan label pangan olahan rumah tangga Indonesia secara deterministik berdasarkan Peraturan BPOM 31/2018, 4/2024, dan 10/2026.',
  'Selalu sampaikan bahwa hasil adalah pemeriksaan awal, bukan pengesahan resmi Dinas Kesehatan atau BPOM.',
  'Jangan pernah menebak fakta produksi yang hanya diketahui produsen (takaran resep, kepemilikan sertifikat halal resmi, umur simpan, ketergantungan cara simpan, alat produksi). Bila `pertanyaanBelumDijawab` masih berisi pertanyaan, tanyakan ke produsen lalu panggil ulang `periksa_label`.',
  'Jangan mengarang nomor P-IRT, nomor sertifikat halal, tanggal, atau alamat produsen.',
].join(' ');

export type JsonRpcId = string | number | null;

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface McpToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: McpToolAnnotations;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

const READ_ONLY_ANNOTATIONS: McpToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const LABEL_OBJECT_SCHEMA = {
  type: 'object',
  description:
    'Teks isi label kemasan apa adanya seperti tertulis di kemasan atau draf stiker. Kolom yang tidak tercantum boleh dikosongkan.',
  properties: {
    namaProduk: { type: 'string', description: 'Nama jenis pangan atau nama produk.' },
    daftarBahanTeks: {
      type: 'string',
      description: 'Daftar bahan lengkap beserta kata pembukanya (mis. "Komposisi: ...").',
    },
    daftarBahanBerformat: {
      type: 'string',
      description:
        'Opsional: salinan persis daftarBahanTeks dengan **penanda tebal** bila format cetak tebal diketahui.',
    },
    beratBersihTeks: { type: 'string', description: 'Berat bersih atau isi bersih (mis. "Berat bersih: 150 g").' },
    namaProdusen: { type: 'string', description: 'Nama produsen atau usaha pembuat.' },
    alamatProdusen: { type: 'string', description: 'Alamat lengkap produsen (minimal kota, kode pos, Indonesia).' },
    keteranganHalalTeks: { type: 'string', description: 'Tulisan halal atau nomor sertifikat halal di label.' },
    kodeProduksiTeks: { type: 'string', description: 'Kode produksi atau kode batch.' },
    tanggalProduksiTeks: { type: 'string', description: 'Tanggal produksi bila terpisah dari kode produksi.' },
    kedaluwarsaTeks: { type: 'string', description: 'Keterangan kedaluwarsa (mis. "Baik digunakan sebelum: 25 Des 2026").' },
    nomorIzinTeks: { type: 'string', description: 'Nomor izin edar atau P-IRT.' },
    pernyataanAlergenTeks: { type: 'string', description: 'Kalimat peringatan alergen di label.' },
    caraPenyimpananTeks: { type: 'string', description: 'Petunjuk cara penyimpanan di label.' },
    pernyataanLain: {
      type: 'array',
      items: { type: 'string' },
      description: 'Klaim atau kalimat promosi lain di kemasan (mis. "Tanpa pengawet", "Murni").',
    },
  },
} as const;

const ANSWERS_OBJECT_SCHEMA = {
  type: 'object',
  description:
    'Fakta produksi dari pemilik produk. Isi hanya yang sudah dinyatakan produsen; jangan menebak.',
  properties: {
    resep: {
      type: 'array',
      description: 'Daftar bahan dan takaran sekali masak dalam gram atau ml.',
      items: {
        type: 'object',
        required: ['nama', 'jumlahGram'],
        properties: {
          nama: { type: 'string' },
          jumlahGram: { type: 'number', description: 'Takaran dalam gram atau ml (> 0).' },
        },
      },
    },
    umurSimpanHari: {
      type: ['number', 'null'],
      description: 'Perkiraan umur simpan dalam hari sejak dibuat.',
    },
    bergantungCaraSimpan: {
      type: ['boolean', 'null'],
      description: 'true bila produk butuh cara penyimpanan khusus agar awet.',
    },
    punyaSertifikatHalal: {
      type: ['boolean', 'null'],
      description: 'true hanya bila sertifikat halal resmi sudah terbit.',
    },
    alatProduksi: {
      enum: ['manual', 'semi_otomatis', 'otomatis', null],
      description: 'Jenis alat produksi untuk penentuan jalur SPP-IRT.',
    },
    panganSiapSaji: { type: ['boolean', 'null'] },
    produksiDiRumah: { type: ['boolean', 'null'] },
    butuhPenangananKhusus: { type: ['boolean', 'null'] },
    wajibSni: { type: ['boolean', 'null'] },
  },
} as const;

export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'periksa_label',
    description:
      'Memeriksa draf atau isi label kemasan pangan terhadap 20 aturan label Peraturan BPOM 31/2018 dan 8 aturan jalur izin Peraturan BPOM 4/2024 secara deterministik. Mengembalikan skor, temuan berpasal, jalur izin, dan daftar pertanyaan fakta produksi yang masih perlu ditanyakan ke pemilik.',
    inputSchema: {
      type: 'object',
      required: ['label'],
      properties: {
        label: LABEL_OBJECT_SCHEMA,
        answers: ANSWERS_OBJECT_SCHEMA,
      },
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: 'susun_label_perbaikan',
    description:
      'Menyusun teks label perbaikan siap cetak sesuai Peraturan BPOM 31/2018 (awalan baku, urutan bahan dari resep, kalimat dan cetak tebal alergen, penghapusan keterangan tidak sah) sekaligus mengecek apakah teks muat di ukuran stiker fisik dengan tinggi huruf minimum Pasal 9 (1 mm teks umum, 2 mm nama produk & peringatan alergen).',
    inputSchema: {
      type: 'object',
      required: ['label'],
      properties: {
        label: LABEL_OBJECT_SCHEMA,
        answers: ANSWERS_OBJECT_SCHEMA,
        ukuranStikerMm: {
          type: 'object',
          description: `Ukuran stiker fisik dalam milimeter (bawaan ${DEFAULT_STICKER_DIMENSIONS_MM.lebarMm} x ${DEFAULT_STICKER_DIMENSIONS_MM.tinggiMm} mm).`,
          properties: {
            lebarMm: {
              type: 'number',
              description: `Lebar stiker dalam mm (${MIN_STICKER_WIDTH_MM}–${MAX_STICKER_WIDTH_MM}).`,
            },
            tinggiMm: {
              type: 'number',
              description: `Tinggi stiker dalam mm (${MIN_STICKER_HEIGHT_MM}–${MAX_STICKER_HEIGHT_MM}).`,
            },
          },
        },
      },
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: 'cek_alergen_komposisi',
    description:
      'Mendeteksi 10 kelompok alergen resmi Peraturan BPOM 31/2018 Pasal 49 pada teks daftar bahan dan mengembalikan kalimat peringatan alergen wajib serta teks komposisi dengan **penanda cetak tebal** sesuai Pasal 51.',
    inputSchema: {
      type: 'object',
      required: ['daftarBahanTeks'],
      properties: {
        daftarBahanTeks: {
          type: 'string',
          description: 'Teks komposisi atau daftar bahan pangan.',
        },
      },
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: 'daftar_aturan_bpom',
    description:
      'Mengambil katalog resmi aturan BPOM yang dipakai Tilik Label (Peraturan BPOM 31/2018, 4/2024, dan 10/2026) beserta nomor pasal, cara pemeriksaan, tautan dokumen resmi, dan batasan pemeriksaan agar agen tidak mengarang rujukan hukum.',
    inputSchema: {
      type: 'object',
      properties: {
        kategori: {
          type: 'string',
          enum: ['semua', 'label', 'izin', 'gizi'],
          description: 'Saring berdasarkan kelompok aturan (bawaan: semua).',
        },
        kodeAturan: {
          type: 'string',
          description: 'Opsional: ambil satu aturan spesifik, misalnya "L-12", "I-05", atau "G-01".',
        },
      },
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
];

export const MCP_RESOURCES: readonly McpResourceDefinition[] = [
  {
    uri: 'bpom://aturan/katalog',
    name: 'Katalog Aturan BPOM Tilik Label',
    description: 'Daftar lengkap aturan label (L-01–L-20), jalur izin (I-01–I-08), dan nilai gizi (G-01–G-06) beserta pasal dan tautan PDF resmi.',
    mimeType: 'application/json',
  },
  {
    uri: 'bpom://aturan/batasan',
    name: 'Batasan Pemeriksaan & Ukuran Stiker Standar',
    description: 'Hal yang tidak diperiksa otomatis, rujukan yang masih perlu ditinjau, dan prasetel ukuran stiker fisik (mm).',
    mimeType: 'application/json',
  },
  {
    uri: 'bpom://contoh/kemasan',
    name: 'Tiga Kemasan Contoh Rekaan',
    description: 'Tiga kasus contoh fiktif beserta data label dan jawaban resep untuk menguji tool pemeriksaan Tilik Label.',
    mimeType: 'application/json',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatBoldParts(parts: readonly IngredientPart[]): string {
  return parts.map((part) => (part.alergen ? `**${part.teks}**` : part.teks)).join('');
}

function serializeFinding(entry: FindingEntry) {
  const item = entry.group === 'keputusan' ? entry.sesudah : entry.asli;
  return {
    id: item.id,
    judul: item.judul,
    statusAsli: entry.asli.status,
    statusSesudahPerbaikan: entry.sesudah.status,
    rujukan: item.rujukan,
    penjelasan: item.penjelasan,
    ...(item.saranPerbaikan ? { saranPerbaikan: item.saranPerbaikan } : {}),
    ...(item.contohBenar ? { contohBenar: item.contohBenar } : {}),
    ...(FIELDS_BY_RULE[item.id] ? { kolomTerkait: FIELDS_BY_RULE[item.id] } : {}),
    ...(QUESTION_BY_RULE[item.id] ? { pertanyaanTerkait: QUESTION_BY_RULE[item.id] } : {}),
  };
}

function toolOk(data: Record<string, unknown>) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function toolError(message: string) {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

function parseLabelAndAnswers(args: Record<string, unknown>) {
  const rawLabel = args.label;
  const rawAnswers = args.answers === undefined ? {} : args.answers;
  const sanitized = sanitizeCheckInput(rawLabel, rawAnswers);
  if (!sanitized) return null;
  return prepareForCheck(sanitized.label, sanitized.answers);
}

function parseStickerSize(raw: unknown) {
  if (raw === undefined) return DEFAULT_STICKER_DIMENSIONS_MM;
  if (!isRecord(raw)) return null;
  const lebar = raw.lebarMm === undefined ? DEFAULT_STICKER_DIMENSIONS_MM.lebarMm : raw.lebarMm;
  const tinggi = raw.tinggiMm === undefined ? DEFAULT_STICKER_DIMENSIONS_MM.tinggiMm : raw.tinggiMm;
  if (
    typeof lebar !== 'number' ||
    typeof tinggi !== 'number' ||
    !Number.isFinite(lebar) ||
    !Number.isFinite(tinggi) ||
    lebar <= 0 ||
    tinggi <= 0 ||
    lebar > MAX_STICKER_WIDTH_MM ||
    tinggi > MAX_STICKER_HEIGHT_MM
  ) {
    return null;
  }
  return { lebarMm: lebar, tinggiMm: tinggi };
}

function callTool(name: string, rawArgs: unknown) {
  const args = rawArgs === undefined ? {} : rawArgs;
  if (!isRecord(args)) {
    return toolError('Argumen tool harus berupa objek JSON.');
  }

  switch (name) {
    case 'periksa_label': {
      const prepared = parseLabelAndAnswers(args);
      if (!prepared) {
        return toolError('Argumen "label" wajib berupa objek berisi kolom teks label.');
      }
      const review = reviewLabel(prepared.label, prepared.answers);
      const unanswered = getUnansweredQuestions(prepared.answers).map((q) => ({
        id: q.id,
        judul: q.judul,
        pertanyaan: q.pertanyaan,
        bantuan: q.bantuan,
        dipakaiUntuk: q.dipakaiUntuk,
      }));
      return toolOk({
        penafian: DISCLAIMER_TEXT,
        skor: review.skor,
        ringkasan: review.report.ringkasan,
        siapCetak: review.corrected.siapUnduh,
        butirWajibKosong: review.corrected.butirKosong,
        alergenTerdeteksi: review.report.alergenTerdeteksi,
        jalurIzin: review.permit,
        keputusanKlaim: review.keputusanKlaim ?? null,
        temuan: {
          perluKeputusan: review.groups.keputusan.map(serializeFinding),
          dibetulkanOtomatis: review.groups.otomatis.map(serializeFinding),
          perluDicek: review.groups.cek.map(serializeFinding),
          aman: review.groups.aman.map(serializeFinding),
        },
        pertanyaanBelumDijawab: unanswered,
      });
    }

    case 'susun_label_perbaikan': {
      const prepared = parseLabelAndAnswers(args);
      if (!prepared) {
        return toolError('Argumen "label" wajib berupa objek berisi kolom teks label.');
      }
      const dimensi = parseStickerSize(args.ukuranStikerMm);
      if (!dimensi) {
        return toolError(
          `ukuranStikerMm harus berisi lebarMm (<= ${MAX_STICKER_WIDTH_MM}) dan tinggiMm (<= ${MAX_STICKER_HEIGHT_MM}) berupa angka positif.`,
        );
      }
      const corrected = buildCorrectedLabel(prepared.label, prepared.answers);
      const printFit = evaluateLabelPrintFit(corrected.baris, dimensi);
      return toolOk({
        penafian: DISCLAIMER_TEXT,
        siapUnduh: corrected.siapUnduh,
        butirKosong: corrected.butirKosong,
        catatanPerbaikan: corrected.catatan,
        alergenTerdeteksi: corrected.alergenTerdeteksi,
        daftarBahanBerformat: formatBoldParts(corrected.bahanBagian),
        baris: corrected.baris,
        skalaCetak: printFit,
      });
    }

    case 'cek_alergen_komposisi': {
      const text = typeof args.daftarBahanTeks === 'string' ? args.daftarBahanTeks.slice(0, 1500).trim() : '';
      if (!text) {
        return toolError('Argumen "daftarBahanTeks" wajib berupa teks daftar bahan yang tidak kosong.');
      }
      const alergenTerdeteksi = detectAllergens(text);
      const bagian = splitAllergenParts(text);
      const wajibPeringatan = alergenTerdeteksi.length > 0;
      return toolOk({
        alergenTerdeteksi,
        wajibPeringatanAlergen: wajibPeringatan,
        kalimatPeringatanResmi: wajibPeringatan ? ALLERGEN_STATEMENT : null,
        daftarBahanBerformat: formatBoldParts(bagian),
        rujukan: {
          peraturan: 'Peraturan BPOM Nomor 31 Tahun 2018',
          pasal: 'Pasal 49 dan Pasal 51',
        },
      });
    }

    case 'daftar_aturan_bpom': {
      const kategori = args.kategori === undefined ? 'semua' : args.kategori;
      if (kategori !== 'semua' && kategori !== 'label' && kategori !== 'izin' && kategori !== 'gizi') {
        return toolError('kategori harus salah satu dari: semua, label, izin, gizi.');
      }
      const kode =
        typeof args.kodeAturan === 'string' ? args.kodeAturan.trim().toUpperCase() : '';
      const sections = RULE_CATALOG.filter((section) => kategori === 'semua' || section.kunci === kategori);
      if (kode) {
        const match = sections
          .flatMap((section) =>
            section.entri.map((entri) => ({
              kategori: section.kunci,
              peraturan: section.peraturan,
              tautan: section.tautan,
              ...entri,
            })),
          )
          .find((entry) => entry.id.toUpperCase() === kode);
        if (!match) {
          return toolError(`Kode aturan "${kode}" tidak ditemukan pada katalog Tilik Label.`);
        }
        return toolOk({
          terakhirDitinjau: REGULATION_LAST_READ,
          aturan: match,
        });
      }
      return toolOk({
        terakhirDitinjau: REGULATION_LAST_READ,
        katalog: sections,
        halTidakDiperiksa: HAL_TIDAK_DIPERIKSA,
        bahanBelumTerbaca: BAHAN_BELUM_TERBACA,
      });
    }

    default:
      return null;
  }
}

function readResource(uri: string) {
  switch (uri) {
    case 'bpom://aturan/katalog':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              { terakhirDitinjau: REGULATION_LAST_READ, katalog: RULE_CATALOG },
              null,
              2,
            ),
          },
        ],
      };
    case 'bpom://aturan/batasan':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                penafian: DISCLAIMER_TEXT,
                halTidakDiperiksa: HAL_TIDAK_DIPERIKSA,
                bahanBelumTerbaca: BAHAN_BELUM_TERBACA,
                prasetelStikerMm: STICKER_PRESETS_MM,
              },
              null,
              2,
            ),
          },
        ],
      };
    case 'bpom://contoh/kemasan':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ catatan: 'Semua contoh adalah data rekaan.', contoh: SAMPLE_LABEL_CASES }, null, 2),
          },
        ],
      };
    default:
      return null;
  }
}

function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: data === undefined ? { code, message } : { code, message, data },
  };
}

function rpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

/**
 * Menangani satu pesan JSON-RPC 2.0 MCP.
 * Mengembalikan `null` untuk notifikasi (pesan tanpa `id` atau metode `notifications/*`)
 * sesuai spesifikasi MCP Streamable HTTP.
 */
export function handleMcpMessage(message: unknown): JsonRpcResponse | null {
  if (!isRecord(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    const id = isRecord(message) && (typeof message.id === 'string' || typeof message.id === 'number')
      ? message.id
      : null;
    return rpcError(id, -32600, 'Invalid Request');
  }

  const hasId = Object.hasOwn(message, 'id') && message.id !== undefined;
  const id: JsonRpcId =
    typeof message.id === 'string' || typeof message.id === 'number' || message.id === null
      ? message.id
      : null;
  const { method, params } = message;

  // Notifikasi JSON-RPC tidak meminta respons.
  if (!hasId || method.startsWith('notifications/')) {
    return null;
  }

  switch (method) {
    case 'initialize': {
      const requested = isRecord(params) && typeof params.protocolVersion === 'string'
        ? params.protocolVersion
        : '';
      const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
        ? requested
        : DEFAULT_PROTOCOL_VERSION;
      return rpcResult(id, {
        protocolVersion,
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: MCP_SERVER_INFO,
        instructions: MCP_INSTRUCTIONS,
      });
    }

    case 'ping':
      return rpcResult(id, {});

    case 'tools/list':
      return rpcResult(id, { tools: MCP_TOOLS });

    case 'tools/call': {
      if (!isRecord(params) || typeof params.name !== 'string') {
        return rpcError(id, -32602, 'Invalid params: "name" is required.');
      }
      const outcome = callTool(params.name, params.arguments);
      if (outcome === null) {
        return rpcError(id, -32602, `Unknown tool: ${params.name}`);
      }
      return rpcResult(id, outcome);
    }

    case 'resources/list':
      return rpcResult(id, { resources: MCP_RESOURCES });

    case 'resources/read': {
      if (!isRecord(params) || typeof params.uri !== 'string') {
        return rpcError(id, -32602, 'Invalid params: "uri" is required.');
      }
      const resource = readResource(params.uri);
      if (!resource) {
        return rpcError(id, -32002, `Resource not found: ${params.uri}`, { uri: params.uri });
      }
      return rpcResult(id, resource);
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

/** Menangani payload JSON-RPC tunggal maupun batch. */
export function handleMcpPayload(
  payload: unknown,
): { status: 200; body: JsonRpcResponse | JsonRpcResponse[] } | { status: 202 } {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return { status: 200, body: rpcError(null, -32600, 'Invalid Request') };
    }
    const responses = payload
      .map((entry) => handleMcpMessage(entry))
      .filter((entry): entry is JsonRpcResponse => entry !== null);
    return responses.length === 0 ? { status: 202 } : { status: 200, body: responses };
  }
  const response = handleMcpMessage(payload);
  return response === null ? { status: 202 } : { status: 200, body: response };
}
