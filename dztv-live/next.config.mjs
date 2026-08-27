/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' } // logos de chaînes proviennent de nombreux domaines différents
    ]
  }
};

export default nextConfig;
