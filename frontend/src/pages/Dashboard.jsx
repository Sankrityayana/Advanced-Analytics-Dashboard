import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchMetrics } from "../api/client";
import KpiCard from "../components/KpiCard";
import SectionCard from "../components/SectionCard";

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatPct(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

export default function Dashboard() {
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
          setError(err?.response?.data?.detail || "Unable to load dashboard metrics.");
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

  const trendData = useMemo(() => {
    return (metrics?.trend || []).slice(-90).map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ctr: Number((item.ctr * 100).toFixed(3)),
      clicks: item.clicks,
      impressions: item.impressions,
    }));
  }, [metrics]);

  const volumeData = useMemo(() => trendData.slice(-16), [trendData]);

  const kpis = metrics?.kpis || {
    ctr: 0,
    clicks: 0,
    impressions: 0,
    ctr_change_pct: 0,
    clicks_change_pct: 0,
    impressions_change_pct: 0,
  };

  return (
    <div className="page-enter space-y-6">
      {loading ? <p className="text-sm text-slate-300">Loading dashboard metrics...</p> : null}
      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="CTR"
          value={formatPct(kpis.ctr)}
          delta={kpis.ctr_change_pct}
          helper="Rolling 30-day click-through rate"
          tone="cyan"
        />
        <KpiCard
          title="Clicks"
          value={compactNumber.format(kpis.clicks)}
          delta={kpis.clicks_change_pct}
          helper="Total clicks in recent window"
          tone="amber"
        />
        <KpiCard
          title="Impressions"
          value={compactNumber.format(kpis.impressions)}
          delta={kpis.impressions_change_pct}
          helper="Delivered impressions in recent window"
          tone="lime"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="CTR Trendline"
          subtitle="Daily movement with campaign seasonality"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="date" minTickGap={26} stroke="#a7c6dd" />
                <YAxis stroke="#a7c6dd" unit="%" />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                <Line
                  type="monotone"
                  dataKey="ctr"
                  stroke="#24d1ce"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Model Health" subtitle="Validation snapshot from trained classifiers">
          <div className="space-y-3">
            {Object.entries(metrics?.model_performance || {}).map(([modelName, modelMetrics]) => (
              <div key={modelName} className="rounded-xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-sm font-semibold capitalize text-cyan-100">{modelName.replaceAll("_", " ")}</p>
                <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-slate-300">
                  <span>Accuracy</span>
                  <span className="text-right">{(modelMetrics.accuracy * 100).toFixed(2)}%</span>
                  <span>Precision</span>
                  <span className="text-right">{(modelMetrics.precision * 100).toFixed(2)}%</span>
                  <span>Recall</span>
                  <span className="text-right">{(modelMetrics.recall * 100).toFixed(2)}%</span>
                  <span>ROC AUC</span>
                  <span className="text-right">{(modelMetrics.roc_auc * 100).toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Engagement Volume" subtitle="Clicks versus impressions in the latest period">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="date" minTickGap={24} stroke="#a7c6dd" />
              <YAxis stroke="#a7c6dd" />
              <Tooltip formatter={(value) => Number(value).toLocaleString("en-US")} />
              <Legend />
              <Bar dataKey="clicks" fill="#ffb65c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="impressions" fill="#24d1ce" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
