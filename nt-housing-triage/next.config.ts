import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The parser talks to a local Ollama instance over HTTP; keep it explicit
  // so the app still builds/runs with zero network access (fallback parser).
  reactStrictMode: true,
};

export default nextConfig;
