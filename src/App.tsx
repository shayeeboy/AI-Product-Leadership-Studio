import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./app/AppShell";

// Route modules are code-split (R3): each becomes its own chunk so the
// Recharts-heavy modules load on demand rather than in the first bundle.
const lazyNamed = <T extends Record<string, React.ComponentType<any>>>(
  loader: () => Promise<T>,
  name: keyof T,
) => lazy(() => loader().then((m) => ({ default: m[name] })));

const ExecutiveDashboard = lazyNamed(() => import("./modules/executive-dashboard/ExecutiveDashboard"), "ExecutiveDashboard");
const PortfolioGovernance = lazyNamed(() => import("./modules/portfolio-governance/PortfolioGovernance"), "PortfolioGovernance");
const ProductDetail = lazyNamed(() => import("./modules/portfolio-governance/ProductDetail"), "ProductDetail");
const OpportunityAssessment = lazyNamed(() => import("./modules/opportunity-assessment/OpportunityAssessment"), "OpportunityAssessment");
const BuildVsBuy = lazyNamed(() => import("./modules/build-vs-buy/BuildVsBuy"), "BuildVsBuy");
const InvestmentPrioritization = lazyNamed(() => import("./modules/investment-prioritization/InvestmentPrioritization"), "InvestmentPrioritization");
const CrossProductAnalytics = lazyNamed(() => import("./modules/cross-product-analytics/CrossProductAnalytics"), "CrossProductAnalytics");
const HumanApprovalCenter = lazyNamed(() => import("./modules/human-approval-center/HumanApprovalCenter"), "HumanApprovalCenter");
const ResponsibleAiCenter = lazyNamed(() => import("./modules/responsible-ai-center/ResponsibleAiCenter"), "ResponsibleAiCenter");
const EvaluationDashboard = lazyNamed(() => import("./modules/evaluation-dashboard/EvaluationDashboard"), "EvaluationDashboard");
const MaturityAssessment = lazyNamed(() => import("./modules/maturity-assessment/MaturityAssessment"), "MaturityAssessment");
const CostAnalyzer = lazyNamed(() => import("./modules/cost-analyzer/CostAnalyzer"), "CostAnalyzer");
const RoiSimulator = lazyNamed(() => import("./modules/roi-simulator/RoiSimulator"), "RoiSimulator");
const ProductDiscovery = lazyNamed(() => import("./modules/product-discovery/ProductDiscovery"), "ProductDiscovery");

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-16 text-center text-ink-400">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ExecutiveDashboard />} />
          <Route path="/cross-product" element={<CrossProductAnalytics />} />
          <Route path="/governance" element={<PortfolioGovernance />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/responsible-ai" element={<ResponsibleAiCenter />} />
          <Route path="/approvals" element={<HumanApprovalCenter />} />
          <Route path="/evaluation" element={<EvaluationDashboard />} />
          <Route path="/opportunity" element={<OpportunityAssessment />} />
          <Route path="/build-vs-buy" element={<BuildVsBuy />} />
          <Route path="/cost" element={<CostAnalyzer />} />
          <Route path="/roi" element={<RoiSimulator />} />
          <Route path="/prioritization" element={<InvestmentPrioritization />} />
          <Route path="/maturity" element={<MaturityAssessment />} />
          <Route path="/discovery" element={<ProductDiscovery />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
