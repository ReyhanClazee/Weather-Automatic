/** @type {import('next').NextConfig} */
const nextConfig = {
  // Izinkan Next Image mengambil ikon cuaca dari domain OpenWeatherMap.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "openweathermap.org",
        pathname: "/img/wn/**",
      },
    ],
  },
};

export default nextConfig;
