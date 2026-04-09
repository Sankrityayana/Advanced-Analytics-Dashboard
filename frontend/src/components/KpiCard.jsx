const toneStyles = {
  cyan: "from-cyan-500/30 to-cyan-700/10 border-cyan-300/25",
  amber: "from-amber-500/30 to-amber-700/10 border-amber-300/25",
  lime: "from-lime-500/30 to-lime-700/10 border-lime-300/25",
};

function formatDelta(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

export default function KpiCard({ title, value, delta = 0, helper, tone = "cyan" }) {
  const deltaPositive = Number(delta) >= 0;

  return (
    <article className={`glass-card overflow-hidden border bg-gradient-to-br p-5 ${toneStyles[tone] || toneStyles.cyan}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{title}</p>
          <p className="metric-value mt-2 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-300">{helper}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            deltaPositive ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"
          }`}
        >
          {formatDelta(delta)}
        </span>
      </div>
    </article>
  );
}
