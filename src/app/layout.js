import { Fira_Code, Sora } from "next/font/google";
import "./globals.css";

// Konfigurasi font utama agar tampilan lebih modern dan konsisten.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

// Konfigurasi font monospace untuk elemen data numerik jika diperlukan.
const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

// Metadata default aplikasi yang akan tampil pada tab browser dan SEO dasar.
export const metadata = {
  title: "SkyCast | Prediksi Cuaca Modern",
  description: "Website prediksi cuaca modern dan responsif dengan OpenWeatherMap.",
};

// Root layout untuk membungkus seluruh halaman dengan style global dan font.
export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${sora.variable} ${firaCode.variable}`}>
        {children}
      </body>
    </html>
  );
}
