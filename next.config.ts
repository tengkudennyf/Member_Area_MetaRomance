import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Batas terbesar yang lewat Server Action: file ebook PDF ≤50MB
    // (actions/products.ts MAX_FILE) + overhead multipart. Bukti transfer
    // ≤5MB ikut tercakup. Default Next hanya 1MB.
    serverActions: { bodySizeLimit: "55mb" },
  },
};

export default nextConfig;
