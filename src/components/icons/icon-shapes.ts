export type IconShape =
  | { kind: 'path'; d: string; signal?: boolean }
  | { kind: 'circle'; cx: number; cy: number; r: number; signal?: boolean }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx?: number; signal?: boolean };

const path = (d: string, signal = false): IconShape => ({ kind: 'path', d, signal });
const circle = (cx: number, cy: number, r: number, signal = false): IconShape => ({
  kind: 'circle',
  cx,
  cy,
  r,
  signal,
});
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0,
  signal = false,
): IconShape => ({
  kind: 'rect',
  x,
  y,
  width,
  height,
  rx,
  signal,
});

export const ICON_SHAPES = {
  home: [
    path('M3.5 11.2 12 4l8.5 7.2'),
    path('M6 9.6V20h12V9.6'),
    path('M10 20v-4.5h4V20'),
    circle(12, 10.6, 1.5, true),
  ],
  scale: [
    path('M3.6 15.6h16.8v3a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z'),
    path('M5.6 15.6a6.4 6.4 0 0 1 12.8 0'),
    path('M12 15.6l2.6-3.6'),
    path('M8.2 11.2l.8.8M12 9.6v1.2M15.8 11.2l-.8.8'),
    circle(12, 15.6, 1.5, true),
  ],
  eye: [
    circle(12, 12, 8.6),
    circle(12, 12, 3.8, true),
    path('M6.9 10.6a5.4 5.4 0 0 1 3.6-3.8'),
  ],
  camera: [
    path(
      'M3 8.6A1.6 1.6 0 0 1 4.6 7H7l1.6-2.6h6.8L17 7h2.4A1.6 1.6 0 0 1 21 8.6v9.2a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.8Z',
    ),
    circle(12, 13.1, 3.6),
    circle(12, 13.1, 1.4, true),
  ],
  flashlight: [
    path('M7.6 8.4h8.8l-1.6 4.2H9.2Z'),
    path('M9.6 12.6h4.8v7.4a1.4 1.4 0 0 1-1.4 1.4h-2a1.4 1.4 0 0 1-1.4-1.4Z'),
    path('M12 2.8v2.6M6 4.4l1.5 1.6M18 4.4l-1.5 1.6'),
    circle(12, 16.4, 1, true),
  ],
  upload: [
    path('M12 15V4.2'),
    path('M7.6 8.6 12 4.2l4.4 4.4'),
    path('M4 14.4v4.2A1.4 1.4 0 0 0 5.4 20h13.2a1.4 1.4 0 0 0 1.4-1.4v-4.2'),
  ],
  download: [
    path('M12 4v10.8'),
    path('M7.6 10.4 12 14.8l4.4-4.4'),
    path('M4 14.4v4.2A1.4 1.4 0 0 0 5.4 20h13.2a1.4 1.4 0 0 0 1.4-1.4v-4.2'),
  ],
  qr: [
    rect(3.5, 3.5, 6.5, 6.5, 1.5),
    rect(14, 3.5, 6.5, 6.5, 1.5),
    rect(3.5, 14, 6.5, 6.5, 1.5),
    rect(14.4, 14.4, 2.6, 2.6, 0.4, true),
    rect(17.9, 17.9, 2.6, 2.6, 0.4, true),
  ],
  scan: [
    path(
      'M4 8.5V5.6A1.6 1.6 0 0 1 5.6 4h2.9M15.5 4h2.9A1.6 1.6 0 0 1 20 5.6v2.9M20 15.5v2.9a1.6 1.6 0 0 1-1.6 1.6h-2.9M8.5 20H5.6A1.6 1.6 0 0 1 4 18.4v-2.9',
    ),
    rect(4, 11, 16, 2, 1, true),
  ],
  tag: [
    path('M3.2 12 9.6 5.4h9.2a1.6 1.6 0 0 1 1.6 1.6v10a1.6 1.6 0 0 1-1.6 1.6H9.6Z'),
    circle(9.4, 12, 1.5, true),
    path('M13.5 10h4M13.5 14h2.5'),
  ],
  jar: [
    rect(7, 2.8, 10, 3.2, 1),
    path(
      'M8 6v2.2C6.2 9 5.2 10.4 5.2 12.2v7a1.6 1.6 0 0 0 1.6 1.6h10.4a1.6 1.6 0 0 0 1.6-1.6v-7c0-1.8-1-3.2-2.8-4V6',
    ),
    path('M5.2 13.2h13.6'),
    rect(9.6, 15.2, 4.8, 3, 0.6, true),
  ],
  check: [path('M5 12.6 9.6 17.2 19 7.6')],
  close: [path('M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6')],
  arrowLeft: [path('M19 12H5.4'), path('M11 6.2 5.2 12l5.8 5.8')],
  arrowRight: [path('M5 12h13.6'), path('M13 6.2l5.8 5.8-5.8 5.8')],
  chevronRight: [path('M9.2 5.4 15.8 12l-6.6 6.6')],
  chevronLeft: [path('M14.8 5.4 8.2 12l6.6 6.6')],
  chevronDown: [path('M5.4 9.2 12 15.8l6.6-6.6')],
  plus: [path('M12 5v14M5 12h14')],
  minus: [path('M5 12h14')],
  clock: [circle(12, 12, 8.6), path('M12 7.2V12l3.2 2.2'), circle(12, 12, 1.2, true)],
  calendar: [
    rect(3.5, 5.2, 17, 15.3, 2),
    path('M8 3.2v4M16 3.2v4M3.5 10h17'),
    rect(14.2, 13.8, 3, 3, 0.6, true),
  ],
  chat: [
    path('M4 19.2V6.6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8.4Z'),
    path('M9 10.6h6M13 8.6l2 2-2 2'),
  ],
  send: [path('M21 3 3.2 10.4l7 2.6 2.6 7Z'), path('M10.2 13 21 3')],
  printer: [
    path('M7 8.2V3.6h10v4.6'),
    rect(3.5, 8.2, 17, 8, 1.6),
    path('M7 13.4h10v7H7Z'),
    circle(17, 11, 1, true),
  ],
  document: [
    path(
      'M6 2.8h7.8l4.6 4.6v12.2a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6V4.4A1.6 1.6 0 0 1 6 2.8Z',
    ),
    path('M13.6 2.8v4.8h4.8'),
    path('M8 12.2h7.6M8 15.6h7.6M8 19h4.4'),
  ],
  info: [circle(12, 12, 8.8), path('M12 11v5.6'), circle(12, 7.8, 1.25, true)],
  warning: [
    path('M10.3 4.3a2 2 0 0 1 3.4 0l7.5 13a2 2 0 0 1-1.7 3H4.5a2 2 0 0 1-1.7-3Z'),
    path('M12 9.4v4.6'),
    circle(12, 17, 1.2, true),
  ],
  savedOnDevice: [
    rect(6.6, 2.6, 10.8, 18.8, 2.6),
    path('M9.6 11.6 11.4 13.4 14.8 10'),
    circle(12, 18.2, 1, true),
  ],
  sync: [
    path('M19.6 10.6A7.8 7.8 0 0 0 5.4 7.4L4 9'),
    path('M4 4.6V9h4.4'),
    path('M4.4 13.4a7.8 7.8 0 0 0 14.2 3.2L20 15'),
    path('M20 19.4V15h-4.4'),
  ],
  copy: [
    rect(8.4, 8.4, 12, 12, 2),
    path('M15.6 8.4V5.6a2 2 0 0 0-2-2H5.6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.8'),
  ],
  search: [circle(10.6, 10.6, 6.6), path('M15.4 15.4 20.4 20.4')],
  menu: [path('M4 7h16M4 12h16M4 17h10'), circle(19, 17, 1.4, true)],
  reset: [
    path('M4.4 12a7.6 7.6 0 1 0 2.4-5.6L4.4 8.6'),
    path('M4.4 4.2v4.4h4.4'),
    circle(12, 12, 1.4, true),
  ],
  stamp: [
    path('M9.2 3.4h5.6v3.8l2.2 3H7l2.2-3Z'),
    rect(4, 10.2, 16, 4.4, 1.2),
    rect(5, 18, 14, 2.4, 1.2, true),
  ],
  ledger: [
    path(
      'M3.4 5.4c3-1 6-1 8.6.6 2.6-1.6 5.6-1.6 8.6-.6v13.4c-3-1-6-1-8.6.6-2.6-1.6-5.6-1.6-8.6-.6Z',
    ),
    path('M12 6v13.4'),
    path('M6 9.6h3.4M6 12.8h3.4M14.6 9.6H18', true),
  ],
  external: [
    path('M13.6 4H20v6.4M20 4l-8.6 8.6'),
    path('M18 14v4.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4V7.6A1.6 1.6 0 0 1 5.6 6H10'),
  ],
  edit: [
    path('M15.4 4.6a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L9.2 18.8 4.4 19.6l.8-4.8Z'),
    path('M13.4 6.6l4 4'),
  ],
  filter: [path('M4 5.2h16l-6.2 7.4V19l-3.6 1.8v-8.2Z')],
  help: [
    circle(12, 12, 8.8),
    path('M9.6 9.6a2.6 2.6 0 0 1 5 1c0 1.8-2.6 2.2-2.6 3.8'),
    circle(12, 17.2, 1.2, true),
  ],
  shield: [
    path('M12 3.2 19.4 6v5.6c0 4.4-3 7.8-7.4 9.2-4.4-1.4-7.4-4.8-7.4-9.2V6Z'),
    path('M8.8 12.2l2.2 2.2 4.2-4.4'),
  ],
  dot: [circle(12, 12, 4, true)],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICON_SHAPES;
