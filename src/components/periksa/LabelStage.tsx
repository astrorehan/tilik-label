'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { TilikMascot } from '@/components/asisten/TilikMascot';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { PreparedImage } from '@/lib/image/prepareImage';
import { CameraCapture } from './CameraCapture';
import { ReadingTicker } from './ReadingStatus';
import type { FlowStep } from './StepIndicator';
import type { ImagePicker } from './useImagePicker';

const MAX_ZOOM = 4;

interface ViewState {
  zoom: number;
  x: number;
  y: number;
}

/** Menjaga foto yang diperbesar tetap menutupi kotaknya. */
function clampView(view: ViewState, size: { width: number; height: number }): ViewState {
  if (view.zoom <= 1) return { zoom: 1, x: 0, y: 0 };
  const maxX = (size.width * (view.zoom - 1)) / 2;
  const maxY = (size.height * (view.zoom - 1)) / 2;
  return {
    zoom: view.zoom,
    x: Math.max(-maxX, Math.min(maxX, view.x)),
    y: Math.max(-maxY, Math.min(maxY, view.y)),
  };
}

/** Memperbesar dengan titik (relatif ke tengah kotak) tetap di bawah kursor. */
function zoomView(
  view: ViewState,
  level: number,
  point: { x: number; y: number },
  size: { width: number; height: number },
): ViewState {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, Math.round(level * 100) / 100));
  return clampView(
    {
      zoom,
      x: point.x - (zoom * (point.x - view.x)) / view.zoom,
      y: point.y - (zoom * (point.y - view.y)) / view.zoom,
    },
    size,
  );
}

/**
 * Meja foto di kolom kiri. Isinya berganti mengikuti keadaan: tempat menaruh foto,
 * jendela kamera, foto yang sedang dipindai, lalu foto acuan yang bisa diperbesar.
 */
export function LabelStage({
  step,
  image,
  reading,
  picker,
  onReplace,
  onAddPhoto,
}: {
  step: FlowStep;
  image: PreparedImage | null;
  reading: boolean;
  picker: ImagePicker;
  onReplace: () => void;
  onAddPhoto: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (!image && picker.cameraOpen && step === 'mulai') {
    return (
      <CameraCapture
        onCaptured={picker.handleCaptured}
        onUseUpload={picker.openFilePicker}
        onCancel={picker.closeCamera}
      />
    );
  }

  if (!image) {
    if (step === 'mulai') return <DropStage picker={picker} />;
    return <NoPhotoStage onAddPhoto={onAddPhoto} />;
  }

  const reference = step !== 'mulai';
  return (
    <div className="space-y-2">
      {reference && (
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <p className="text-sm font-semibold text-ink-2">Foto label</p>
          <Button
            variant="ghost"
            size="md"
            icon={collapsed ? 'eye' : 'chevronDown'}
            className="-mr-2"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? 'Tampilkan' : 'Sembunyikan'}
          </Button>
        </div>
      )}
      <div className={cn(collapsed && reference && 'hidden lg:block')}>
        <PhotoViewer
          image={image}
          reading={reading}
          overlay={
            step === 'mulai' && !reading ? (
              <>
                <QualityChip image={image} />
                <button
                  type="button"
                  onClick={onReplace}
                  className="press glass-dark absolute top-3 right-3 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold"
                >
                  <Icon name="reset" size={16} />
                  Ganti foto
                </button>
              </>
            ) : null
          }
        />
      </div>
    </div>
  );
}

function QualityChip({ image }: { image: PreparedImage }) {
  const good = image.mutu.baik;
  return (
    <p className="glass-dark absolute top-3 left-3 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold">
      <Icon name={good ? 'check' : 'warning'} size={16} className={good ? 'text-action' : 'text-gold'} />
      {good ? 'Foto cukup jelas' : 'Agak sulit dibaca'}
    </p>
  );
}

function DropStage({ picker }: { picker: ImagePicker }) {
  const { dragging, busy } = picker;
  return (
    <div className="panel p-2.5 sm:p-3">
      <div
        {...picker.dropHandlers}
        role="button"
        tabIndex={0}
        aria-label="Pilih foto label dari perangkat, atau seret gambar ke sini"
        aria-describedby="format-foto"
        onClick={picker.openFilePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            picker.openFilePicker();
          }
        }}
        className={cn(
          'group/drop relative flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[18px] px-6 py-8 text-center transition-colors duration-200 sm:min-h-80 lg:min-h-[min(30rem,calc(100dvh-17rem))]',
          dragging && !busy
            ? 'bg-brand-soft'
            : 'bg-[linear-gradient(160deg,rgb(240_243_228/0.9),rgb(225_232_201/0.55))] hover:bg-brand-tint',
        )}
      >
        <div aria-hidden className="bingkai-bidik inset-4! text-brand/55 sm:inset-5!" />

        <div aria-hidden className="float-idle relative mb-6 w-36 sm:w-44">
          <div className="relative overflow-hidden rounded-[14px] border border-ink/10 bg-surface p-3 shadow-floating">
            <div className="mb-2 h-3 w-3/4 rounded-full bg-ink/80" />
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-ink/20" />
              <div className="h-1.5 w-11/12 rounded-full bg-ink/20" />
              <div className="h-1.5 w-4/5 rounded-full bg-ink/20" />
              <div className="h-1.5 w-2/3 rounded-full bg-ink/20" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="h-1.5 w-1/3 rounded-full bg-brand/50" />
              <div className="h-4 w-8 rounded bg-gold/70" />
            </div>
            <div className="scan-sweep opacity-80 [background-image:none]!" />
          </div>
          <TilikMascot size={58} mood={dragging ? 'happy' : 'idle'} className="absolute -right-9 -bottom-5" />
        </div>

        <p className="type-h3 text-ink">
          {busy ? 'Menyiapkan gambar…' : dragging ? 'Lepaskan, aku tangkap' : 'Taruh foto label di sini'}
        </p>
        <p id="format-foto" className="mt-1 max-w-[18rem] text-sm text-ink-2">
          Seret gambar ke kotak ini atau klik untuk memilih. JPG, PNG, atau WebP.
        </p>
      </div>
    </div>
  );
}

function NoPhotoStage({ onAddPhoto }: { onAddPhoto: () => void }) {
  return (
    <div className="panel hidden flex-col items-center px-6 py-8 text-center lg:flex">
      <div aria-hidden className="mb-5 w-40 rotate-[-3deg] rounded-[14px] border border-dashed border-line-strong/60 bg-surface/70 p-3">
        <div className="mb-2 h-3 w-3/4 rounded-full bg-ink/15" />
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-ink/10" />
          <div className="h-1.5 w-5/6 rounded-full bg-ink/10" />
          <div className="h-1.5 w-2/3 rounded-full bg-ink/10" />
        </div>
      </div>
      <p className="type-h3">Kamu mengisi tanpa foto</p>
      <p className="mt-1 max-w-xs text-sm text-ink-2">
        Tidak apa-apa. Kalau nanti ada fotonya, Tilik bisa membacakan isinya untukmu.
      </p>
      <Button variant="secondary" size="md" icon="camera" className="mt-4" onClick={onAddPhoto}>
        Tambah foto label
      </Button>
    </div>
  );
}

function PhotoViewer({
  image,
  reading,
  overlay,
}: {
  image: PreparedImage;
  reading: boolean;
  overlay?: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>({ zoom: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ id: number; x: number; y: number; baseX: number; baseY: number } | null>(null);
  const { zoom } = view;

  const boxSize = () => ({
    width: boxRef.current?.clientWidth ?? 0,
    height: boxRef.current?.clientHeight ?? 0,
  });

  const pointFrom = (clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  const zoomTo = (level: number, point = { x: 0, y: 0 }) => {
    const size = boxSize();
    setView((current) => zoomView(current, level, point, size));
  };

  // Cubit di trackpad mengirim wheel + ctrlKey; perlu pendengar non-pasif.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const rect = box.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      };
      const size = { width: box.clientWidth, height: box.clientHeight };
      const factor = event.deltaY < 0 ? 1.12 : 0.89;
      setView((current) => zoomView(current, current.zoom * factor, point, size));
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= 1 || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, baseX: view.x, baseY: view.y };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const size = boxSize();
    const x = drag.baseX + event.clientX - drag.x;
    const y = drag.baseY + event.clientY - drag.y;
    setView((current) => clampView({ zoom: current.zoom, x, y }, size));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('button')) return;
        zoomTo(zoom > 1 ? 1 : 2.5, pointFrom(event.clientX, event.clientY));
      }}
      className={cn(
        'relative overflow-hidden rounded-[24px] bg-[#1b1f17] shadow-floating ring-1 ring-black/5 select-none',
        zoom > 1 ? (dragging ? 'cursor-grabbing touch-none' : 'cursor-grab touch-none') : 'cursor-zoom-in',
      )}
    >
      <Image
        unoptimized
        src={image.dataUrl}
        width={image.width}
        height={image.height}
        alt="Foto label yang sedang diperiksa"
        draggable={false}
        className="mx-auto block h-auto max-h-[46dvh] w-full object-contain lg:max-h-[min(36rem,calc(100dvh-15rem))]"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${zoom})`,
          transition: dragging ? 'none' : 'transform 240ms var(--ease-out)',
        }}
      />

      {reading && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.05),rgb(0_0_0/0.5))]" />
          <div className="scan-sweep" />
          <div className="bingkai-bidik inset-4! text-action" />
        </div>
      )}

      {reading && (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-[18px] glass-dark py-2 pr-4 pl-2">
          <TilikMascot size={44} mood="thinking" />
          <ReadingTicker className="min-w-0 text-sm font-semibold" />
        </div>
      )}

      {!reading && overlay}

      {!reading && (
        <div className="glass-dark absolute right-3 bottom-3 flex items-center gap-0.5 rounded-full p-1">
          <button
            type="button"
            className="press grid size-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40"
            onClick={() => zoomTo(zoom / 1.5)}
            disabled={zoom <= 1}
            aria-label="Perkecil foto"
          >
            <Icon name="minus" size={18} />
          </button>
          <span className="tabular min-w-12 text-center text-xs font-semibold" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="press grid size-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40"
            onClick={() => zoomTo(zoom * 1.5)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Perbesar foto"
          >
            <Icon name="plus" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
