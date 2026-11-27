import type { NextConfig } from "next";
import path from "path";

/**
 * Deploy profiles (build-time via NEXT_PUBLIC_BASE_PATH in Docker build args):
 * - IP-root (temporary default): unset, "", or "/" → no Next basePath (site at /)
 * - Nginx subpath (flip-back): /dev/gardenia-legal-pilot
 */
const rawBase = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath =
  rawBase === undefined || rawBase === "" || rawBase === "/"
    ? undefined
    : rawBase;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;