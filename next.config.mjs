/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' } // logos de chaînes proviennent de nombreux domaines différents
    ]
  },
  allowedDevOrigins: ['127.0.0.1', 'http://localhost:3000', '192.168.1.9'],
  // Active instrumentation.js (préchauffage du catalogue TV au démarrage).
  experimental: { instrumentationHook: true },
};

export default nextConfig;
