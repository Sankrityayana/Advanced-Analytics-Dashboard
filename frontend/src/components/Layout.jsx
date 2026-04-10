import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    subtitle: "KPIs and trend pulse",
  },
  {
    label: "Analytics",
    path: "/analytics",
    subtitle: "Feature and correlation insights",
  },
  {
    label: "Predictions",
    path: "/predictions",
    subtitle: "Real-time click probability",
  },
  {
    label: "Forecasting",
    path: "/forecasting",
    subtitle: "Projected CTR trajectory",
  },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="atmosphere-orb absolute -left-24 -top-16 h-96 w-96 rounded-full bg-cyan-400/20 blur-[110px]" />
        <div className="atmosphere-orb absolute -right-24 top-20 h-96 w-96 rounded-full bg-amber-400/20 blur-[120px] [animation-delay:3s]" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:flex-row lg:px-8 lg:py-8">
        <aside className="glass-card hidden w-72 shrink-0 flex-col justify-between p-5 md:flex lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Advanced Analytics</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Growth Command Center</h1>
              <p className="mt-2 text-sm text-slate-300">A product-style intelligence layer for CTR performance, prediction, and forecasting.</p>
            </div>

            <nav className="space-y-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-slate-300">{item.subtitle}</p>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Current route</p>
            <p className="mt-1 text-sm font-medium text-cyan-100">{location.pathname.replace("/", "") || "dashboard"}</p>
          </div>
        </aside>

        <main className="w-full flex-1 space-y-6">
          <header className="glass-card flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Live workspace</p>
              <h2 className="text-xl font-semibold text-white">Campaign Intelligence Dashboard</h2>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Today</p>
              <p className="metric-value text-sm text-cyan-100">{new Date().toLocaleDateString()}</p>
            </div>
          </header>

          <nav className="glass-card flex gap-2 overflow-x-auto p-2 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
                    isActive ? "bg-cyan-400/20 text-cyan-100" : "text-slate-300 hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
