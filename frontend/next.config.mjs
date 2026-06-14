/** @type {import('next').NextConfig} */
const isStatic = process.env.NEXT_STATIC === "1";

const nextConfig = {
  reactStrictMode: true,
  // Allow reading shared/regions.json and the program IDL from outside frontend/.
  outputFileTracingRoot: undefined,
  // NEXT_STATIC=1 builds a fully static site (out/) for Cloudflare Pages.
  ...(isStatic ? { output: "export", images: { unoptimized: true } } : {}),
};

export default nextConfig;
