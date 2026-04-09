import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchForecast } from "../api/client";
import SectionCard from "../components/SectionCard";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Forecasting() {
  const [days, setDays] = useState(30);
  const [appliedDays, setAppliedDays] = useState(30);
  const [forecastPayload, setForecastPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedDays(days);
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [days]);

  useEffect(() => {
    let active = true;

    async function loadForecast() {
      try {
        setLoading(true);
        const payload = await fetchForecast(appliedDays);
        if (active) {
          setForecastPayload(payload);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.detail || "Unable to load forecast data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadForecast();
    return () => {
      active = false;
    };
  }, [appliedDays]);

  const historyData = useMemo(
    () =>
      (forecastPayload?.history || []).slice(-60).map((point) => ({
        date: formatDate(point.date),
        actual: Number((point.ctr * 100).toFixed(3)),
        predicted: null,
        lower: null,
        upper: null,
      })),
    [forecastPayload],
  );

  const projectedData = useMemo(
    () =>
      (forecastPayload?.forecast || []).map((point) => ({
        date: formatDate(point.date),
        actual: null,
        predicted: Number((point.ctr * 100).toFixed(3)),
        lower: Number((point.lower * 100).toFixed(3)),
        upper: Number((point.upper * 100).toFixed(3)),
      })),
    [forecastPayload],
  );

  const chartData = useMemo(() => [...historyData, ...projectedData], [historyData, projectedData]);

  const summary = useMemo(() => {
    if (!projectedData.length) {
      return { average: 0, peak: 0, floor: 0 };
    }

    const values = projectedData.map((item) => item.predicted).filter((value) => Number.isFinite(value));
    const average = values.reduce((acc, value) => acc + value, 0) / values.length;
    const peak = Math.max(...values);
    const floor = Math.min(...values);

    return {
      average: Number(average.toFixed(2)),
      peak: Number(peak.toFixed(2)),
      floor: Number(floor.toFixed(2)),
    };
  }, [projectedData]);

  return (
    <div className="page-enter space-y-6">
      <SectionCard
        title="CTR Forecasting Horizon"
        subtitle="Prophet-based projection with confidence bounds"
        action={
          <div className="flex min-w-[210px] items-center gap-3">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-300">days</span>
            <input
              type="range"
              min="7"
              max="90"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="w-full"
            />
            <span className="metric-value text-sm text-cyan-100">{days}</span>
          </div>
        }
      >
        {loading ? <p className="text-sm text-slate-300">Loading forecast...</p> : null}
        {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="date" minTickGap={25} stroke="#a7c6dd" />
              <YAxis stroke="#a7c6dd" unit="%" />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Line type="monotone" dataKey="actual" stroke="#24d1ce" strokeWidth={2.5} dot={false} name="Historical CTR" />
              <Line type="monotone" dataKey="predicted" stroke="#ffb65c" strokeWidth={3} dot={false} name="Forecast" />
              <Line type="monotone" dataKey="lower" stroke="#7fd85c" strokeDasharray="5 5" dot={false} name="Lower Bound" />
              <Line type="monotone" dataKey="upper" stroke="#ff7d7d" strokeDasharray="5 5" dot={false} name="Upper Bound" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="glass-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Average forecast CTR</p>
          <p className="metric-value mt-2 text-3xl text-white">{summary.average.toFixed(2)}%</p>
        </article>
        <article className="glass-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Peak forecast CTR</p>
          <p className="metric-value mt-2 text-3xl text-white">{summary.peak.toFixed(2)}%</p>
        </article>
        <article className="glass-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Floor forecast CTR</p>
          <p className="metric-value mt-2 text-3xl text-white">{summary.floor.toFixed(2)}%</p>
        </article>
      </div>
    </div>
  );
}
