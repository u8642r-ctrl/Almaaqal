import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: {
    // تجاهل أخطاء TypeScript أثناء الرفع (Build)
    ignoreBuildErrors: true,
  },
  eslint: {
    // تجاهل أخطاء ESLint أثناء الرفع (Build)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
