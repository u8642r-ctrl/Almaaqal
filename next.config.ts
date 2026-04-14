import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ضغط الاستجابات تلقائياً
  compress: true,
  // تحسين استيراد المكتبات الكبيرة
  experimental: {
    optimizePackageImports: ["next-auth", "react-icons"],
  },
  // تحسين الصور
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // كاش الصور ليوم كامل
  },
  // headers للكاش
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // كاش الـ static assets لمدة سنة
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
