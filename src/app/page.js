"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

// Interval auto-refresh data cuaca setiap 10 menit.
const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_CITY = "Jakarta";

export default function Home() {
  // State utama untuk input, data cuaca, status loading, dan error.
  const [cityInput, setCityInput] = useState(DEFAULT_CITY);
  const [activeCity, setActiveCity] = useState(DEFAULT_CITY);
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fungsi untuk mengambil data cuaca dari API internal menggunakan fetch.
  const fetchWeather = useCallback(async (cityName, options = {}) => {
    const { silent = false } = options;

    if (!cityName) {
      setErrorMessage("Nama kota tidak boleh kosong.");
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Gagal mengambil data cuaca.");
      }

      setWeatherData(payload);
      setActiveCity(payload.city);
      setLastUpdated(payload.updatedAt);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Ambil data awal saat halaman pertama kali dibuka.
  useEffect(() => {
    fetchWeather(DEFAULT_CITY);
  }, [fetchWeather]);

  // Jalankan auto-refresh untuk kota aktif setiap 10 menit.
  useEffect(() => {
    if (!activeCity) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      fetchWeather(activeCity, { silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [activeCity, fetchWeather]);

  // Handler form untuk pencarian kota secara manual.
  const handleSearch = async (event) => {
    event.preventDefault();

    const normalizedCity = cityInput.trim();
    if (!normalizedCity) {
      setErrorMessage("Masukkan nama kota terlebih dahulu.");
      return;
    }

    await fetchWeather(normalizedCity);
  };

  // Data turunan agar render JSX lebih bersih.
  const currentWeather = weatherData?.current ?? null;
  const forecastList = weatherData?.forecast ?? [];

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) {
      return "Menunggu data cuaca terbaru...";
    }

    return `Terakhir diperbarui: ${formatDateTime(lastUpdated)}`;
  }, [lastUpdated]);

  return (
    <div className={styles.page}>
      {/* Shape dekoratif agar tampilan lebih modern dan tidak flat. */}
      <div className={styles.blobOne} />
      <div className={styles.blobTwo} />

      <main className={styles.container}>
        {/* Header utama aplikasi. */}
        <header className={styles.header}>
          <span className={styles.badge}>Real-Time Weather</span>
          <h1 className={styles.title}>Prediksi Cuaca Modern</h1>
          <p className={styles.subtitle}>
            Cari cuaca terbaru per kota dan pantau prakiraan 5 hari ke depan.
          </p>
          <p className={styles.refreshInfo}>{updatedLabel}</p>
        </header>

        {/* Form pencarian kota. */}
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Contoh: Jakarta, Surabaya, Bandung"
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
            aria-label="Nama kota"
          />
          <button className={styles.searchButton} type="submit" disabled={isLoading}>
            {isLoading ? "Memuat..." : "Cari Cuaca"}
          </button>
        </form>

        {/* Pesan error jika request gagal atau input tidak valid. */}
        {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

        {/* Konten utama dashboard cuaca. */}
        <section className={styles.dashboard}>
          <article className={styles.card}>
            <p className={styles.cardLabel}>Cuaca Saat Ini</p>
            <h2 className={styles.cityName}>
              {weatherData ? `${weatherData.city}, ${weatherData.country}` : "-"}
            </h2>

            {currentWeather ? (
              <div className={styles.currentWeather}>
                <div className={styles.temperatureArea}>
                  <Image
                    src={buildIconUrl(currentWeather.icon)}
                    alt={currentWeather.description}
                    width={92}
                    height={92}
                  />
                  <div>
                    <p className={styles.temperature}>{Math.round(currentWeather.temp)}&deg;C</p>
                    <p className={styles.description}>
                      {capitalizeText(currentWeather.description)}
                    </p>
                  </div>
                </div>

                <div className={styles.metricsGrid}>
                  <div className={styles.metricItem}>
                    <span>Kelembapan</span>
                    <strong>{currentWeather.humidity}%</strong>
                  </div>
                  <div className={styles.metricItem}>
                    <span>Angin</span>
                    <strong>{currentWeather.windSpeed} m/s</strong>
                  </div>
                  <div className={styles.metricItem}>
                    <span>Terasa</span>
                    <strong>{Math.round(currentWeather.feelsLike)}&deg;C</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles.emptyState}>Data cuaca akan muncul setelah pencarian kota.</p>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.forecastHeader}>
              <p className={styles.cardLabel}>Prakiraan 5 Hari</p>
              <span className={styles.autoRefreshLabel}>Auto-refresh: 10 menit</span>
            </div>

            {forecastList.length > 0 ? (
              <ul className={styles.forecastList}>
                {forecastList.map((item) => (
                  <li className={styles.forecastItem} key={item.date}>
                    <span className={styles.forecastDay}>{formatForecastDate(item.date)}</span>
                    <div className={styles.forecastInfo}>
                      <Image
                        src={buildIconUrl(item.icon)}
                        alt={item.description}
                        width={44}
                        height={44}
                      />
                      <span>{capitalizeText(item.description)}</span>
                    </div>
                    <strong className={styles.forecastTemp}>
                      {Math.round(item.tempMax)}&deg; / {Math.round(item.tempMin)}&deg;
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>Prakiraan akan tampil saat data tersedia.</p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

// Helper untuk format waktu update terakhir ke format Indonesia.
function formatDateTime(dateValue) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(dateValue));
}

// Helper untuk format tanggal prakiraan agar ringkas dan mudah dibaca.
function formatForecastDate(dateValue) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateValue}T00:00:00`));
}

// Helper untuk membuat huruf pertama menjadi kapital.
function capitalizeText(text) {
  if (!text) {
    return "-";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Helper untuk menyusun URL icon cuaca dari OpenWeatherMap.
function buildIconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

