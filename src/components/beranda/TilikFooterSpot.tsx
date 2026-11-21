import { TilikPerch } from './TilikPerch';

/** Tempat Tilik di pemandangan teras footer, persinggahan terakhirnya di beranda. */
export const TILIK_FOOTER_SPOT_ID = 'tilik-footer-spot';

const LINES = [
  'Sampai jumpa! Cek labelmu sebelum cetak, ya.',
  'Aku jaga terasnya dulu.',
  'Hihi, geli!',
];

export function TilikFooterSpot() {
  return <TilikPerch id={TILIK_FOOTER_SPOT_ID} lines={LINES} className="tilik-footer-spot" />;
}
