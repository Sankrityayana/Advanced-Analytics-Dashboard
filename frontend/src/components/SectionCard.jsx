export default function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`glass-card p-5 ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
