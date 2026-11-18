import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import type { NextConfig } from 'next';

const localIps = Object.values(networkInterfaces())
  .flat()
  .filter(
    (iface): iface is NetworkInterfaceInfo =>
      iface !== undefined && iface.family === 'IPv4' && !iface.internal,
  )
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...localIps, '*.trycloudflare.com'],
  images: {
    formats: ['image/webp'],
    qualities: [60, 75],
  },
};

export default nextConfig;

