import {
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Inbox,
  Gauge,
  Target,
  Scale,
  DollarSign,
  TrendingUp,
  ListOrdered,
  Radar,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  layer: string;
  items: NavItem[];
}

// Nav rail grouped by architectural layer (Executive / Governance / Decision /
// Products) — the same three-layer model the README and architecture diagram use.
export const NAV: NavGroup[] = [
  {
    layer: "Executive",
    items: [
      { to: "/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
      { to: "/cross-product", label: "Cross-Product Intelligence", icon: BarChart3 },
    ],
  },
  {
    layer: "Governance",
    items: [
      { to: "/governance", label: "Portfolio Governance", icon: ShieldCheck },
      { to: "/responsible-ai", label: "Responsible AI Center", icon: ClipboardList },
      { to: "/approvals", label: "Human Approval Center", icon: Inbox },
      { to: "/evaluation", label: "AI Evaluation Dashboard", icon: Gauge },
    ],
  },
  {
    layer: "Decision",
    items: [
      { to: "/opportunity", label: "Opportunity Assessment", icon: Target },
      { to: "/build-vs-buy", label: "Build vs Buy Advisor", icon: Scale },
      { to: "/cost", label: "AI Cost Analyzer", icon: DollarSign },
      { to: "/roi", label: "ROI Simulator", icon: TrendingUp },
      { to: "/prioritization", label: "Investment Prioritization", icon: ListOrdered },
      { to: "/maturity", label: "AI Maturity Assessment", icon: Radar },
    ],
  },
  {
    layer: "Products",
    items: [{ to: "/discovery", label: "Product Discovery", icon: Lightbulb }],
  },
];
