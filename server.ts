import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to fetch weather for a single lat/lon
async function fetchCityWeather(city: string, lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,uv_index_max,weather_code&timezone=Europe/Madrid&forecast_days=7`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch weather for ${city}: ${response.statusText}`);
  }
  return await response.json();
}

// API endpoint to fetch all Extremadura locations weather data
app.get("/api/weather", async (req, res) => {
  const cities = [
    { key: "caceres", name: "Cáceres", lat: 39.4764, lon: -6.3722 },
    { key: "badajoz", name: "Badajoz", lat: 38.8778, lon: -6.9706 },
    { key: "coria", name: "Coria", lat: 39.9831, lon: -6.5361 },
    { key: "plasencia", name: "Plasencia", lat: 40.0302, lon: -6.0894 },
    { key: "navalmoral", name: "Navalmoral de la Mata", lat: 39.8916, lon: -5.5414 },
    { key: "valenciaAlcantara", name: "Valencia de Alcántara", lat: 39.4128, lon: -7.2435 },
    { key: "trujillo", name: "Trujillo", lat: 39.4597, lon: -5.8812 },
    { key: "zorita", name: "Zorita", lat: 39.2847, lon: -5.6991 },
    { key: "jerez", name: "Jerez de los Caballeros", lat: 38.3204, lon: -6.7725 },
    { key: "castuera", name: "Castuera", lat: 38.7231, lon: -5.5435 },
    { key: "merida", name: "Mérida", lat: 38.9161, lon: -6.3437 },
    { key: "donBenito", name: "Don Benito", lat: 38.9554, lon: -5.8614 },
    { key: "herrera", name: "Herrera del Duque", lat: 39.1681, lon: -5.0506 },
    { key: "zafra", name: "Zafra", lat: 38.4233, lon: -6.4172 },
    { key: "azuaga", name: "Azuaga", lat: 38.2588, lon: -5.6775 },
  ];

  try {
    const lats = cities.map(c => c.lat).join(",");
    const lons = cities.map(c => c.lon).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,uv_index_max,weather_code&timezone=Europe/Madrid&forecast_days=7`;

    let dataResults: any[] = [];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo batch fetching error status: ${response.status}`);
      }
      const json = await response.json();
      if (Array.isArray(json)) {
        dataResults = json;
      } else if (json && typeof json === "object") {
        dataResults = [json];
      } else {
        throw new Error("Formato de respuesta desconocido de Open-Meteo.");
      }
    } catch (batchError) {
      console.warn("Batch API failed, falling back to sequential/parallel individual queries:", batchError);
      dataResults = await Promise.all(
        cities.map(async (city) => {
          return await fetchCityWeather(city.name, city.lat, city.lon);
        })
      );
    }

    const weatherData: Record<string, any> = {};
    cities.forEach((city, index) => {
      weatherData[city.key] = dataResults[index];
    });

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error: any) {
    console.error("Critical meteorological fetching failure:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener la información climatológica de Extremadura.",
    });
  }
});

// Configure Vite or production static routes
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mode Development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Mode Production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Extremadura Weather App running on port ${PORT}`);
  });
}

setupServer();
