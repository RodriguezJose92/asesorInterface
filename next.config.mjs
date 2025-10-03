/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs)$/,
      use: "raw-loader",
    });
    return config;
  },
  output: "export", // 👈 Habilita el `next export`
  basePath: "/proyectos/asesorMudi", // 👈 Define la ruta base
  assetPrefix: "/proyectos/asesorMudi/", // 👈 Define la ruta de los assets
  eslint: {
    // 🚫 Ignora los errores de ESLint durante el build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 🚫 Ignora los errores de TypeScript durante el build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
