import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Webpack's persistent filesystem cache intermittently crashes the production build
  // with "WasmHash._updateWithBuffer: Cannot read properties of undefined (reading
  // 'length')" — a known webpack hashing bug where a null hash propagates out of the
  // FS cache. It surfaced after adding @trigger.dev/react-hooks (larger module graph)
  // and reproduces on Vercel's restored build cache. Disabling the cache for the
  // production build removes the crashing path (the confirmed webpack workaround); it
  // only trades incremental-build speed, never output correctness. Dev cache untouched.
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
