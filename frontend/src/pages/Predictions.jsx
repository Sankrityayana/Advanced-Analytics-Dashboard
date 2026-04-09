import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { predictCTR } from "../api/client";
import SectionCard from "../components/SectionCard";

const initialPayload = {
  age: 34,
  daily_time_spent: 61,
  area_income: 72000,
  daily_internet_usage: 178,
  male: 1,
  previous_clicks: 4,
  ad_quality_score: 74,
  hour: 20,
  device_score: 69,
  campaign_score: 70,
  model_name: "ensemble",
};

const fieldConfig = [
  { name: "age", label: "Age", min: 13, max: 90, step: 1 },
  { name: "daily_time_spent", label: "Daily Time Spent (min)", min: 0, max: 180, step: 1 },
  { name: "area_income", label: "Area Income", min: 5000, max: 300000, step: 1000 },
  { name: "daily_internet_usage", label: "Daily Internet Usage (min)", min: 0, max: 300, step: 1 },
  { name: "male", label: "Male (0/1)", min: 0, max: 1, step: 1 },
  { name: "previous_clicks", label: "Previous Clicks", min: 0, max: 20, step: 1 },
  { name: "ad_quality_score", label: "Ad Quality Score", min: 0, max: 100, step: 1 },
  { name: "hour", label: "Hour of Day", min: 0, max: 23, step: 1 },
  { name: "device_score", label: "Device Score", min: 0, max: 100, step: 1 },
  { name: "campaign_score", label: "Campaign Score", min: 0, max: 100, step: 1 },
];

const fieldMap = Object.fromEntries(fieldConfig.map((field) => [field.name, field]));

const barColors = ["#24d1ce", "#ffb65c", "#7fd85c", "#ff7d7d"];

export default function Predictions() {
  const [payload, setPayload] = useState(initialPayload);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const modelComparison = useMemo(() => {
    if (!result?.model_probabilities) {
      return [];
    }

    return Object.entries(result.model_probabilities).map(([modelName, value]) => ({
      model: modelName.replaceAll("_", " "),
      probability: Number((value * 100).toFixed(2)),
    }));
  }, [result]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const response = await predictCTR(payload);
      setResult(response);
    } catch (err) {
      setError(err?.response?.data?.detail || "Prediction request failed. Check backend status.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleValueChange(event) {
    const { name, value } = event.target;

    if (name === "model_name") {
      setPayload((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    if (value.trim() === "") {
      return;
    }

    const config = fieldMap[name];
    let numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    if (config?.step === 1) {
      numericValue = Math.round(numericValue);
    }
    if (config) {
      numericValue = Math.max(config.min, Math.min(config.max, numericValue));
    }

    setPayload((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
  }

  const probability = result?.click_probability_pct || 0;
  const gaugeAngle = Math.max(0, Math.min(360, probability * 3.6));

  return (
    <div className="page-enter grid grid-cols-1 gap-5 xl:grid-cols-3">
      <SectionCard className="xl:col-span-2" title="Predict Click Probability" subtitle="Run live inference with your ad/user context">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fieldConfig.map((field) => (
              <label key={field.name} className="space-y-1 text-sm">
                <span className="text-slate-200">{field.label}</span>
                <input
                  type="number"
                  name={field.name}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={payload[field.name]}
                  onChange={handleValueChange}
                  className="w-full rounded-lg border border-white/15 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60"
                />
              </label>
            ))}
          </div>

          <label className="block space-y-1 text-sm">
            <span className="text-slate-200">Model Selection</span>
            <select
              name="model_name"
              value={payload.model_name}
              onChange={handleValueChange}
              className="w-full rounded-lg border border-white/15 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60"
            >
              <option value="ensemble">Ensemble</option>
              <option value="logistic_regression">Logistic Regression</option>
              <option value="random_forest">Random Forest</option>
              <option value="xgboost">XGBoost</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-cyan-400/85 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Scoring..." : "Generate Prediction"}
          </button>
        </form>

        {error ? <p className="mt-4 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}

        {result ? (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Intent Band</p>
              <p className="mt-1 text-xl font-semibold text-cyan-100">{result.intent_band}</p>
              <p className="mt-3 text-sm text-slate-300">
                Model used: <span className="font-semibold text-white">{result.selected_model.replaceAll("_", " ")}</span>
              </p>
              <p className="text-sm text-slate-300">
                Confidence window: {(result.confidence_interval.lower * 100).toFixed(2)}% to {(result.confidence_interval.upper * 100).toFixed(2)}%
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/25 p-4">
              <div
                className="mx-auto flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(rgba(36, 209, 206, 0.95) ${gaugeAngle}deg, rgba(49, 65, 82, 0.65) ${gaugeAngle}deg 360deg)`,
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-slate-950 text-center">
                  <p className="metric-value text-2xl font-semibold text-white">{probability.toFixed(2)}%</p>
                  <p className="text-xs text-slate-300">click probability</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Model Comparison" subtitle="Probability score by estimator">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modelComparison}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="model" stroke="#a7c6dd" />
              <YAxis stroke="#a7c6dd" unit="%" />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                {modelComparison.map((item, index) => (
                  <Cell key={`prob-${item.model}`} fill={barColors[index % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
