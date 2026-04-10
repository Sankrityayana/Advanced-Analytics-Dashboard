import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn(() => ({
        get: getMock,
        post: postMock,
      })),
    },
  };
});

import axios from "axios";
import { fetchForecast, fetchMetrics, predictCTR } from "./client";

describe("api client", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("configures axios instance with default backend URL", () => {
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://127.0.0.1:8000",
        timeout: 15000,
      }),
    );
  });

  it("fetchMetrics requests /metrics", async () => {
    getMock.mockResolvedValueOnce({ data: { kpis: {} } });

    const result = await fetchMetrics();

    expect(getMock).toHaveBeenCalledWith("/metrics");
    expect(result).toEqual({ kpis: {} });
  });

  it("fetchForecast requests /forecast with days parameter", async () => {
    getMock.mockResolvedValueOnce({ data: { forecast: [] } });

    const result = await fetchForecast(45);

    expect(getMock).toHaveBeenCalledWith("/forecast", { params: { days: 45 } });
    expect(result).toEqual({ forecast: [] });
  });

  it("predictCTR posts payload to /predict", async () => {
    const payload = { age: 30, model_name: "ensemble" };
    postMock.mockResolvedValueOnce({ data: { click_probability_pct: 11.2 } });

    const result = await predictCTR(payload);

    expect(postMock).toHaveBeenCalledWith("/predict", payload);
    expect(result).toEqual({ click_probability_pct: 11.2 });
  });
});
