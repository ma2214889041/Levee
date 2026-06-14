/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow reading shared/regions.json and the program IDL from outside frontend/.
  outputFileTracingRoot: undefined,
};

export default nextConfig;
