'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  ImagePrepareError,
  prepareImageFile,
  type PreparedImage,
} from '@/lib/image/prepareImage';
import { samplePhotoUrl, type SamplePhoto } from './SamplePhotos';

export interface ImagePicker {
  cameraOpen: boolean;
  busy: boolean;
  dragging: boolean;
  error: string | null;
  openFilePicker: () => void;
  openCamera: () => void;
  closeCamera: () => void;
  handleFile: (file?: File) => void;
  handleSample: (photo: SamplePhoto) => void;
  handleCaptured: (image: PreparedImage) => void;
  dropHandlers: {
    onDragEnter: (event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (event: DragEvent) => void;
  };
}

/**
 * Keadaan bersama untuk menambah foto: unggah, seret, kamera, dan foto contoh.
 * `sample` hanya terisi bila gambar berasal dari kemasan contoh.
 */
export function useImagePicker(onImage: (image: PreparedImage, sample?: SamplePhoto) => void): {
  picker: ImagePicker;
  /** Pasang ke input berkas tersembunyi. */
  attachFileInput: (node: HTMLInputElement | null) => void;
} {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const mountedRef = useRef(false);
  const onImageRef = useRef(onImage);

  useEffect(() => {
    onImageRef.current = onImage;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const prepare = async (load: () => Promise<Blob>, fallbackError: string, sample?: SamplePhoto) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareImageFile(await load());
      if (mountedRef.current) {
        setCameraOpen(false);
        onImageRef.current(prepared, sample);
      }
    } catch (caught) {
      if (mountedRef.current) {
        setError(caught instanceof ImagePrepareError ? caught.message : fallbackError);
      }
    } finally {
      if (mountedRef.current) setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = (file?: File) => {
    if (file) void prepare(async () => file, 'Gambar gagal diolah. Coba berkas lain.');
  };

  const attachFileInput = useCallback((node: HTMLInputElement | null) => {
    fileRef.current = node;
  }, []);

  const picker: ImagePicker = {
    cameraOpen,
    busy,
    dragging,
    error,
    openFilePicker: () => {
      setCameraOpen(false);
      fileRef.current?.click();
    },
    openCamera: () => {
      setError(null);
      setCameraOpen(true);
    },
    closeCamera: () => setCameraOpen(false),
    handleFile,
    handleSample: (photo) => {
      void prepare(async () => {
        const response = await fetch(samplePhotoUrl(photo));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      }, 'Foto contoh gagal dimuat. Coba lagi atau pilih foto lain.', photo);
    },
    handleCaptured: (image) => {
      setCameraOpen(false);
      onImageRef.current(image);
    },
    dropHandlers: {
      onDragEnter: (event) => {
        if (event.dataTransfer.types.includes('Files')) dragDepth.current += 1;
      },
      onDragOver: (event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
        if (!busy) setDragging(true);
      },
      onDragLeave: () => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      },
      onDrop: (event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handleFile(event.dataTransfer.files[0]);
      },
    },
  };

  return { picker, attachFileInput };
}
