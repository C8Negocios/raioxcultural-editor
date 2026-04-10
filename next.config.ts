import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem 'standalone' — usa npm start normalmente (mais simples no nixpacks)
  env: {
    NEXT_PUBLIC_VIDEO_SERVICE_URL: process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL || "",
    NEXT_PUBLIC_EDITOR_API_KEY:    process.env.NEXT_PUBLIC_EDITOR_API_KEY    || "c8club-editor-2026",
  },
};

export default nextConfig;
