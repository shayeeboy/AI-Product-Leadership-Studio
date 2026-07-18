import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { ExecutiveDashboard } from "./modules/executive-dashboard/ExecutiveDashboard";
import { PortfolioGovernance } from "./modules/portfolio-governance/PortfolioGovernance";
import { ProductDetail } from "./modules/portfolio-governance/ProductDetail";
import { OpportunityAssessment } from "./modules/opportunity-assessment/OpportunityAssessment";
import { BuildVsBuy } from "./modules/build-vs-buy/BuildVsBuy";
import { InvestmentPrioritization } from "./modules/investment-prioritization/InvestmentPrioritization";
import { CrossProductAnalytics } from "./modules/cross-product-analytics/CrossProductAnalytics";
import { HumanApprovalCenter } from "./modules/human-approval-center/HumanApprovalCenter";
import { ResponsibleAiCenter } from "./modules/responsible-ai-center/ResponsibleAiCenter";
import { EvaluationDashboard } from "./modules/evaluation-dashboard/EvaluationDashboard";
import { MaturityAssessment } from "./modules/maturity-assessment/MaturityAssessment";
import { CostAnalyzer } from "./modules/cost-analyzer/CostAnalyzer";
import { RoiSimulator } from "./modules/roi-simulator/RoiSimulator";
import { ProductDiscovery } from "./modules/product-discovery/ProductDiscovery";

export function App() {
  return (
    <AppShell>
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
    </AppShell>
  );
}
