import { useEffect } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { clsx } from "clsx";
import { LayoutGrid, BarChart3, ShieldCheck, PlusCircle } from "lucide-react";
import { useLiveStore } from "../store";
import { LivePortfolio } from "./LivePortfolio";
import { LiveProductDetail } from "./LiveProductDetail";
import { RegisterProduct } from "./RegisterProduct";
import { CrossProductLive } from "./CrossProductLive";
import { LiveGovernance } from "./LiveGovernance";

const NAV = [
  { to: "/", label: "Portfolio", icon: LayoutGrid, end: true },
  { to: "/cross", label: "Cross-Product", icon: BarChart3, end: false },
  { to: "/governance", label: "Governance", icon: ShieldCheck, end: false },
  { to: "/register", label: "Register", icon: PlusCircle, end: false },
];

export function LiveApp() {
  const init = useLiveStore((s) => s.init);
  const loaded = useLiveStore((s) => s.loaded);
  const backend = useLiveStore((s) => s.backend);

  useEffect(() => {
    init();
  }, [init]);

  const seededUrl = `${import.meta.env.BASE_URL}seeded/`;

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">AI</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink-900">Leadership Studio</div>
              <div className="text-[11px] text-ink-400">Live portfolio</div>
            </div>
          </div>
          <nav className="ml-2 flex flex-wrap gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => clsx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm", isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")}>
                <n.icon className="h-4 w-4" />{n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className={clsx("rounded-full px-2.5 py-0.5 font-medium", backend ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
              {backend ? "Shared persistence" : "Local persistence"}
            </span>
            <a href={seededUrl} className="rounded-full border border-ink-200 px-2.5 py-0.5 text-ink-600 hover:bg-ink-50" title="The retained phase-1 seeded demo">Seeded demo →</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {!loaded ? (
          <div className="p-16 text-center text-ink-400">Loading portfolio…</div>
        ) : (
          <Routes>
            <Route path="/" element={<LivePortfolio />} />
            <Route path="/product/:id" element={<LiveProductDetail />} />
            <Route path="/register" element={<RegisterProduct />} />
            <Route path="/cross" element={<CrossProductLive />} />
            <Route path="/governance" element={<LiveGovernance />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
