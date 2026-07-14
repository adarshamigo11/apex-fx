/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Service-Worker-Allowed', value: '/' }] }];
  },
};
module.exports = nextConfig;
