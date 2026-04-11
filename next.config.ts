import type { NextConfig } from "next";

const VIDEO_SERVICE = process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VIDEO_SERVICE_URL: process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL || "",
    NEXT_PUBLIC_EDITOR_API_KEY:    process.env.NEXT_PUBLIC_EDITOR_API_KEY    || "c8club-editor-2026",
  },
  async rewrites() {
    return [
      {
        // O browser faz fetch('/api/vs/...')  →  Next proxia para o video-service HTTP (server-side)
        // Isso elimina Mixed Content sem precisar de HTTPS no video-service
        source: '/api/vs/:path*',
        destination: `${VIDEO_SERVICE}/:path*`,
      },
    ];
  },
};

export default nextConfig;
