import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchMetrics } from "../api/client";
import SectionCard from "../components/SectionCard";

const chartPalette = ["#24d1ce", "#ffb65c", "#7fd85c", "#ff7d7d", "#69a5ff"];

function heatmapColor(value) {
  const normalized = (Number(value || 0) + 1) / 2;
  const red = Math.round(20 + (1 - normalized) * 180);
  const green = Math.round(80 + normalized * 140);
  const blue = Math.round(90 + normalized * 90);
  return `rgba(${red}, ${green}, ${blue}, 0.9)`;
}

function formatLabel(raw) {
  return raw.replaceAll("_", " ");
}

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      try {
        setLoading(true);
        const payload = await fetchMetrics();
        if (active) {
          setMetrics(payload);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.detail || "Unable to load analytics data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMetrics();
    return () => {
      active = false;
    };
  }, []);

  const featureData = useMemo(
    () =>
      (metrics?.feature_insights || []).map((item) => ({
        feature: formatLabel(item.feature),
        importance: Number((item.importance * 100).toFixed(2)),
      })),
    [metrics],
  );

  const hourlyData = useMemo(
    () =>
      (metrics?.segments?.hourly_ctr || []).map((item) => ({
        hour: item.hour,
        ctr: Number((item.ctr * 100).toFixed(3)),
      })),
    [metrics],
  );

  const genderData = useMemo(
    () =>
      (metrics?.segments?.gender_ctr || []).map((item) => ({
        segment: item.segment,
        value: Number((item.ctr * 100).toFixed(2)),
      })),
    [metrics],
  );

  const labels = metrics?.heatmap?.labels || [];
  const values = metrics?.heatmap?.values || [];

  return (
    <div className="page-enter space-y-6">
      {loading ? <p className="text-sm text-slate-300">Loading analytics...</p> : null}
      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <SectionCard className="xl:col-span-3" title="Feature Contribution" subtitle="Top ranked drivers from model importance">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis type="number" stroke="#a7c6dd" unit="%" />
                <YAxis type="category" dataKey="feature" width={120} stroke="#a7c6dd" />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                  {featureData.map((entry, idx) => (
                    <Cell key={`feature-${entry.feature}`} fill={chartPalette[idx % chartPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard className="xl:col-span-2" title="Audience Slice" subtitle="CTR split by gender segments">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="segment" innerRadius={62} outerRadius={100} label>
                  {genderData.map((entry, idx) => (
                    <Cell key={`gender-${entry.segment}`} fill={chartPalette[idx % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Hourly CTR Pattern" subtitle="Signal quality by time-of-day">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="hour" stroke="#a7c6dd" />
              <YAxis stroke="#a7c6dd" unit="%" />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Line type="monotone" dataKey="ctr" stroke="#24d1ce" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Correlation Heatmap" subtitle="Cross-feature relationship intensity">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid gap-1" style={{ gridTemplateColumns: `180px repeat(${labels.length}, minmax(70px, 1fr))` }}>
              <div className="text-xs uppercase tracking-[0.15em] text-slate-400">features</div>
              {labels.map((columnLabel) => (
                <div key={`head-${columnLabel}`} className="text-center text-xs text-slate-300">
                  {formatLabel(columnLabel)}
                </div>
              ))}

              {labels.map((rowLabel, rowIdx) => (
                <Fragment key={`row-${rowLabel}`}>
                  <div className="flex items-center text-xs text-slate-300">{formatLabel(rowLabel)}</div>
                  {values[rowIdx]?.map((cellValue, colIdx) => (
                    <div
                      key={`cell-${rowLabel}-${labels[colIdx]}`}
                      className="rounded-md px-1.5 py-2 text-center text-xs font-medium text-white"
                      style={{ backgroundColor: heatmapColor(cellValue) }}
                    >
                      {Number(cellValue).toFixed(2)}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
