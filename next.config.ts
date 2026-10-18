import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone and LAN devices to load Next.js dev scripts and chunks over local Wi-Fi
  allowedDevOrigins: [
    '192.168.1.10',
    '192.168.1.7',
    '192.168.1.*',
    '192.168.*.*',
    '10.*.*.*',
    '172.*.*.*',
    '*.local',
    'localhost',
    '127.0.0.1',
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
