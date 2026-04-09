import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 15000,
});

export async function fetchMetrics() {
  const response = await apiClient.get("/metrics");
  return response.data;
}

export async function fetchForecast(days = 30) {
  const response = await apiClient.get("/forecast", { params: { days } });
  return response.data;
}

export async function predictCTR(payload) {
  const response = await apiClient.post("/predict", payload);
  return response.data;
}
