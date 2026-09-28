/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    // Document uploads (PDF/image) go through a Server Action; the default
    // body limit is 1 MB, which is too small for a scanned certificate.
    serverActions: { bodySizeLimit: '10mb' },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
