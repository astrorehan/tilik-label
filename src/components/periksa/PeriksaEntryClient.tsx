'use client';

import { useState, useSyncExternalStore } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import { prepareForCheck } from '@/domain';
import {
  clearPeriksaDraft,
  getPeriksaDraftSnapshot,
  hasDraftContent,
  parsePeriksaDraftSnapshot,
  subscribePeriksaDraft,
  type PeriksaDraft,
} from '@/lib/periksaDraft';
import {
  STORAGE_UNAVAILABLE_SNAPSHOT,
  getProductsSnapshot,
  isSameProductData,
  parseProductsSnapshot,
  subscribeProducts,
  type SavedProduct,
} from '@/lib/produkSaya';
import { PeriksaFlowClient, type JudgeTemplate } from './PeriksaFlowClient';

const SERVER_SNAPSHOT = '\u0000server';

type DraftSession =
  | { kind: 'pending' }
  | { kind: 'fresh'; revision: number }
  | { kind: 'restored'; revision: number; draft: PeriksaDraft; savedProduct?: SavedProduct };

/**
 * Pintu masuk /periksa. Bila ada `?produk=<id>`, isi label dan jawaban dari
 * Produk saya dimuat dari perangkat dan dibuka di hasil atau isian label.
 * Bila tanpa `?produk`, draf pemeriksaan terakhir yang berisi isian/jawaban
 * dipulihkan otomatis setelah hidrasi klien agar aman untuk SSR.
 */
export function PeriksaEntryClient({
  produkId,
  initialStep = 'hasil',
  judgeTemplates,
}: {
  produkId?: string;
  initialStep?: 'isi' | 'hasil';
  /** Mode juri: kemasan contoh membawa isi cepat di formulir yang sama. */
  judgeTemplates?: JudgeTemplate[];
}) {
  const snapshot = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const draftSnapshot = useSyncExternalStore(
    subscribePeriksaDraft,
    getPeriksaDraftSnapshot,
    () => SERVER_SNAPSHOT,
  );

  // Produk dibekukan begitu ditemukan, supaya perubahan daftar dari tab lain
  // tidak me-remount alur dan menghapus isian yang sedang dibetulkan.
  const [frozen, setFrozen] = useState<SavedProduct | null>(null);
  const found =
    produkId && snapshot !== SERVER_SNAPSHOT
      ? parseProductsSnapshot(snapshot).find((item) => item.id === produkId)
      : undefined;
  if (found && frozen?.id !== found.id) setFrozen(found);
  const product = frozen && frozen.id === produkId ? frozen : found;

  // Draf pemeriksaan juga dibekukan saat pertama dibaca di klien supaya
  // auto-save berikutnya tidak me-remount formulir yang sedang diisi.
  const [draftSession, setDraftSession] = useState<DraftSession>({ kind: 'pending' });
  if (!produkId && draftSnapshot !== SERVER_SNAPSHOT && draftSession.kind === 'pending') {
    const parsedDraft = parsePeriksaDraftSnapshot(draftSnapshot);
    if (parsedDraft && hasDraftContent(parsedDraft)) {
      const candidate =
        parsedDraft.productId && snapshot !== SERVER_SNAPSHOT
          ? parseProductsSnapshot(snapshot).find((item) => item.id === parsedDraft.productId)
          : undefined;
      const savedProduct =
        candidate && isSameProductData(candidate, prepareForCheck(parsedDraft.label, parsedDraft.answers))
          ? candidate
          : undefined;
      setDraftSession({ kind: 'restored', revision: 0, draft: parsedDraft, savedProduct });
    } else {
      setDraftSession({ kind: 'fresh', revision: 0 });
    }
  }

  const handleResetDraft = () => {
    clearPeriksaDraft();
    setDraftSession((previous) => ({
      kind: 'fresh',
      revision: previous.kind === 'pending' ? 1 : previous.revision + 1,
    }));
  };

  if (!produkId) {
    if (draftSnapshot === SERVER_SNAPSHOT || draftSession.kind === 'pending') {
      return <PeriksaFlowClient key="fresh-0" persistDraft={false} judgeTemplates={judgeTemplates} />;
    }

    if (draftSession.kind === 'restored') {
      return (
        <PeriksaFlowClient
          key={`restored-${draftSession.revision}`}
          judgeTemplates={judgeTemplates}
          productId={draftSession.draft.productId}
          initialSavedProduct={draftSession.savedProduct}
          initial={{
            label: draftSession.draft.label,
            answers: draftSession.draft.answers,
            step: draftSession.draft.step,
            farthestStep: draftSession.draft.farthestStep,
          }}
          persistDraft
          restoredFromDraft
          onResetDraft={handleResetDraft}
        />
      );
    }

    return (
      <PeriksaFlowClient
        key={`fresh-${draftSession.revision}`}
        judgeTemplates={judgeTemplates}
        persistDraft
        onResetDraft={handleResetDraft}
      />
    );
  }

  if (snapshot === SERVER_SNAPSHOT) {
    return (
      <p className="text-sm text-ink-2" role="status">
        Membuka produk dari perangkat…
      </p>
    );
  }

  if (!product && snapshot === STORAGE_UNAVAILABLE_SNAPSHOT) {
    return (
      <div className="space-y-6">
        <Notice
          tone="warning"
          title="Penyimpanan di perangkat tidak bisa dipakai di peramban ini"
          action={
            <ButtonLink href="/produk" size="md" variant="secondary">
              Produk saya
            </ButtonLink>
          }
        >
          Produk tersimpan tidak bisa dibuka. Ini biasa terjadi di mode privat atau bila penyimpanan
          situs diblokir. Kamu tetap bisa memeriksa label dari awal di bawah.
        </Notice>
        <PeriksaFlowClient persistDraft={false} judgeTemplates={judgeTemplates} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Notice
          tone="warning"
          title="Produk tidak ditemukan di perangkat ini"
          action={
            <ButtonLink href="/produk" size="md" variant="secondary">
              Produk saya
            </ButtonLink>
          }
        >
          Mungkin sudah dihapus, atau data peramban sudah dibersihkan. Kamu bisa mulai periksa dari
          awal di bawah.
        </Notice>
        <PeriksaFlowClient persistDraft judgeTemplates={judgeTemplates} />
      </div>
    );
  }

  return (
    <PeriksaFlowClient
      key={`${product.id}:${initialStep}`}
      judgeTemplates={judgeTemplates}
      productId={product.id}
      initialSavedProduct={product}
      initial={{ label: product.label, answers: product.answers, step: initialStep, farthestStep: 'hasil' }}
      persistDraft={false}
    />
  );
}
