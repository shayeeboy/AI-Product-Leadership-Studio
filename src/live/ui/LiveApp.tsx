import { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutGrid, BarChart3, ShieldCheck, PlusCircle, Target, ListOrdered,
  Scale, DollarSign, TrendingUp, Radar, Menu, X,
} from "lucide-react";
import { useLiveStore } from "../store";
import { LivePortfolio } from "./LivePortfolio";
import { LiveProductDetail } from "./LiveProductDetail";
import { RegisterProduct } from "./RegisterProduct";
import { CrossProductLive } from "./CrossProductLive";
import { LiveGovernance } from "./LiveGovernance";
import { LiveOpportunityAssessment } from "./LiveOpportunityAssessment";
import { LiveInvestmentPrioritization } from "./LiveInvestmentPrioritization";
import { LiveRoiSimulator } from "./LiveRoiSimulator";
import { LiveCostAnalyzer } from "./LiveCostAnalyzer";
import { LiveMaturityAssessment } from "./LiveMaturityAssessment";
import { BuildVsBuy } from "@/modules/build-vs-buy/BuildVsBuy"; // seed-free calculator — reused as-is

const NAV_GROUPS = [
  {
    layer: "Portfolio",
    items: [
      { to: "/", label: "Portfolio", icon: LayoutGrid, end: true },
      { to: "/cross", label: "Cross-Product", icon: BarChart3, end: false },
    ],
  },
  {
    layer: "Decision",
    items: [
      { to: "/opportunity", label: "Opportunity Assessment", icon: Target, end: false },
      { to: "/prioritization", label: "Investment Prioritization", icon: ListOrdered, end: false },
      { to: "/build-vs-buy", label: "Build vs Buy", icon: Scale, end: false },
      { to: "/cost", label: "Cost Analyzer", icon: DollarSign, end: false },
      { to: "/roi", label: "ROI Simulator", icon: TrendingUp, end: false },
      { to: "/maturity", label: "Maturity Assessment", icon: Radar, end: false },
    ],
  },
  { layer: "Governance", items: [{ to: "/governance", label: "Governance & Approvals", icon: ShieldCheck, end: false }] },
  { layer: "Products", items: [{ to: "/register", label: "Register a product", icon: PlusCircle, end: false }] },
];

export function LiveApp() {
  const init = useLiveStore((s) => s.init);
  const loaded = useLiveStore((s) => s.loaded);
  const backend = useLiveStore((s) => s.backend);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    init();
  }, [init]);

  const seededUrl = `${import.meta.env.BASE_URL}seeded/`;

  return (
    <div className="flex h-full">
      {/* Left rail */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-ink-800 bg-ink-950 text-ink-200 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">AI</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Leadership Studio</div>
            <div className="text-[11px] text-ink-400">Live portfolio</div>
          </div>
        </div>
        <nav className="px-3 pb-8">
          {NAV_GROUPS.map((group) => (
            <div key={group.layer} className="mb-4">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-500">{group.layer}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive ? "bg-brand-600 text-white" : "text-ink-300 hover:bg-ink-800 hover:text-white",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-200 bg-white/90 px-4 py-2.5 backdrop-blur">
          <button className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className={clsx("rounded-full px-2.5 py-0.5 font-medium", backend ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
              {backend ? "Shared persistence" : "Local persistence"}
            </span>
            <a href={seededUrl} className="rounded-full border border-ink-200 px-2.5 py-0.5 text-ink-600 hover:bg-ink-50" title="The retained phase-1 seeded demo">Seeded demo →</a>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {!loaded ? (
              <div className="p-16 text-center text-ink-400">Loading portfolio…</div>
            ) : (
              <Routes>
                <Route path="/" element={<LivePortfolio />} />
                <Route path="/product/:id" element={<LiveProductDetail />} />
                <Route path="/register" element={<RegisterProduct />} />
                <Route path="/cross" element={<CrossProductLive />} />
                <Route path="/governance" element={<LiveGovernance />} />
                <Route path="/opportunity" element={<LiveOpportunityAssessment />} />
                <Route path="/prioritization" element={<LiveInvestmentPrioritization />} />
                <Route path="/build-vs-buy" element={<BuildVsBuy />} />
                <Route path="/cost" element={<LiveCostAnalyzer />} />
                <Route path="/roi" element={<LiveRoiSimulator />} />
                <Route path="/maturity" element={<LiveMaturityAssessment />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
