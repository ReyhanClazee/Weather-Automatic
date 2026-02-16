import { NextResponse } from "next/server";

const OPEN_WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

// Paksa route ini selalu dinamis agar data cuaca selalu terbaru.
export const dynamic = "force-dynamic";

export async function GET(request) {
  // Ambil query parameter `city` dari URL request.
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();

  // Ambil API key dari environment variable server.
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Validasi API key agar request ke OpenWeatherMap dapat berjalan.
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server belum memiliki OPENWEATHER_API_KEY." },
      { status: 500 },
    );
  }

  // Validasi nama kota sebelum melakukan fetch ke API eksternal.
  if (!city) {
    return NextResponse.json({ error: "Parameter city wajib diisi." }, { status: 400 });
  }

  // Siapkan query string untuk endpoint current weather dan forecast.
  const baseQuery = new URLSearchParams({
    q: city,
    appid: apiKey,
    units: "metric",
    lang: "id",
  });

  try {
    // Ambil data cuaca saat ini dan forecast 5 hari secara paralel.
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`${OPEN_WEATHER_BASE_URL}/weather?${baseQuery.toString()}`, {
        cache: "no-store",
      }),
      fetch(`${OPEN_WEATHER_BASE_URL}/forecast?${baseQuery.toString()}`, {
        cache: "no-store",
      }),
    ]);

    // Tangani error dari endpoint cuaca saat ini.
    if (!currentResponse.ok) {
      const errorPayload = await currentResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: mapOpenWeatherError(currentResponse.status, errorPayload?.message),
        },
        { status: normalizeStatusCode(currentResponse.status) },
      );
    }

    // Tangani error dari endpoint forecast.
    if (!forecastResponse.ok) {
      const errorPayload = await forecastResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: mapOpenWeatherError(forecastResponse.status, errorPayload?.message),
        },
        { status: normalizeStatusCode(forecastResponse.status) },
      );
    }

    // Parsing body JSON dari kedua response setelah validasi sukses.
    const [currentData, forecastData] = await Promise.all([
      currentResponse.json(),
      forecastResponse.json(),
    ]);

    // Bentuk struktur data cuaca saat ini yang ringkas untuk frontend.
    const currentWeather = {
      temp: currentData.main.temp,
      feelsLike: currentData.main.feels_like,
      humidity: currentData.main.humidity,
      windSpeed: currentData.wind.speed,
      description: currentData.weather?.[0]?.description ?? "-",
      icon: currentData.weather?.[0]?.icon ?? "01d",
    };

    // Bentuk forecast harian 5 hari dari data 3-jam-an OpenWeatherMap.
    const forecast = mapFiveDayForecast(
      forecastData.list ?? [],
      currentData.timezone ?? 0,
      currentData.dt ?? Math.floor(Date.now() / 1000),
    );

    // Kirim response final ke client dengan format yang konsisten.
    return NextResponse.json({
      city: currentData.name,
      country: currentData.sys?.country ?? "",
      updatedAt: new Date().toISOString(),
      current: currentWeather,
      forecast,
    });
  } catch {
    // Tangani kegagalan jaringan atau gangguan endpoint eksternal.
    return NextResponse.json(
      { error: "Terjadi gangguan saat mengambil data dari OpenWeatherMap." },
      { status: 502 },
    );
  }
}

// Konversi error kode HTTP OpenWeatherMap ke pesan yang lebih ramah pengguna.
function mapOpenWeatherError(status, originalMessage) {
  if (status === 404) {
    return "Kota tidak ditemukan. Coba nama kota lain.";
  }

  if (status === 401) {
    return "API key OpenWeatherMap tidak valid.";
  }

  return originalMessage || "Gagal mengambil data cuaca.";
}

// Batasi status code agar kegagalan upstream tak terduga menjadi 502.
function normalizeStatusCode(status) {
  if (status === 400 || status === 401 || status === 404) {
    return status;
  }

  return 502;
}

// Ubah data forecast 3-jam menjadi ringkasan harian untuk 5 hari mendatang.
function mapFiveDayForecast(forecastList, timezoneOffset, currentUnixTime) {
  const todayKey = toCityDateKey(currentUnixTime, timezoneOffset);
  const groupedByDay = new Map();

  for (const item of forecastList) {
    const dateKey = toCityDateKey(item.dt, timezoneOffset);

    // Lewati hari ini agar yang ditampilkan benar-benar hari berikutnya.
    if (dateKey <= todayKey) {
      continue;
    }

    if (!groupedByDay.has(dateKey)) {
      groupedByDay.set(dateKey, []);
    }

    groupedByDay.get(dateKey).push(item);
  }

  return [...groupedByDay.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(0, 5)
    .map(([date, dayItems]) => {
      const representative = pickRepresentativeItem(dayItems, timezoneOffset);

      return {
        date,
        tempMin: Math.min(...dayItems.map((entry) => entry.main.temp_min)),
        tempMax: Math.max(...dayItems.map((entry) => entry.main.temp_max)),
        description: representative.weather?.[0]?.description ?? "-",
        icon: representative.weather?.[0]?.icon ?? "01d",
      };
    });
}

// Pilih satu item forecast terdekat dengan jam 12 siang sebagai representasi harian.
function pickRepresentativeItem(dayItems, timezoneOffset) {
  const targetHour = 12;

  return dayItems.reduce((closest, item) => {
    const closestHour = toCityHour(closest.dt, timezoneOffset);
    const itemHour = toCityHour(item.dt, timezoneOffset);

    return Math.abs(itemHour - targetHour) < Math.abs(closestHour - targetHour)
      ? item
      : closest;
  }, dayItems[0]);
}

// Ubah unix timestamp ke format tanggal lokal kota (YYYY-MM-DD).
function toCityDateKey(unixSeconds, timezoneOffset) {
  const shiftedDate = new Date((unixSeconds + timezoneOffset) * 1000);
  return shiftedDate.toISOString().slice(0, 10);
}

// Ambil jam lokal kota (0-23) dari unix timestamp untuk pemilihan data representatif.
function toCityHour(unixSeconds, timezoneOffset) {
  const shiftedDate = new Date((unixSeconds + timezoneOffset) * 1000);
  return shiftedDate.getUTCHours();
}
