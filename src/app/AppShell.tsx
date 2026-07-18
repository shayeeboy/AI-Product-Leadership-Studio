import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { Search, Menu, X } from "lucide-react";
import { NAV } from "./nav";
import { PRODUCTS } from "@/seed/products";
import { portfolioHealth } from "@/lib/portfolio";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const health = useMemo(() => portfolioHealth(PRODUCTS), []);
  const location = useLocation();

  return (
    <div className="flex h-full">
      {/* Nav rail */}
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
            <div className="text-[11px] text-ink-400">AI Product Portfolio</div>
          </div>
        </div>
        <nav className="px-3 pb-8">
          {NAV.map((group) => (
            <div key={group.layer} className="mb-4">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-500">{group.layer}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
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
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-200 bg-white/90 px-4 py-2.5 backdrop-blur">
          <button className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              placeholder="Search products, risks, approvals…"
              className="w-full rounded-lg border border-ink-200 bg-ink-50 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: health.color }} />
              <span className="text-xs font-medium text-ink-600">
                Portfolio health <span className="font-semibold text-ink-900">{health.label}</span> · {health.score}%
              </span>
            </div>
            <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-white sm:flex">SA</div>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
