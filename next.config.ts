import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /* pdfkit reads its font files from disk — keep it out of the bundle */
  serverExternalPackages: ["pdfkit"],
  allowedDevOrigins: ["dorie-dimissory-rambunctiously.ngrok-free.dev"],
};

export default nextConfig;
