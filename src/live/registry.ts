import type { Registration } from "./types";

// The three real portfolio apps ship as DEFAULT registrations. This is
// configuration (name + adapter binding + live endpoint), NOT seeded data — the
// data itself is always fetched live from these endpoints. Anything registered
// through the UI is added alongside these (persisted via the backend/localStorage).
export const DEFAULT_REGISTRATIONS: Registration[] = [
  {
    id: "ai-native-diagnostic",
    name: "AI-Native Team Diagnostic",
    businessUnit: "People & Enablement",
    owner: "S. Adeyemi",
    sponsor: "VP, Transformation",
    architecture: "SaaS",
    adapterType: "readiness",
    endpointUrl: "https://ai-native-diagnostic.onrender.com/api/snapshot",
    status: "healthy",
    isDefault: true,
  },
  {
    id: "enterprise-rag",
    name: "Enterprise RAG Assistant",
    businessUnit: "Knowledge & Support",
    owner: "S. Adeyemi",
    sponsor: "Head of Support",
    architecture: "RAG",
    adapterType: "rag-health",
    endpointUrl: "https://rag-assistant-694391756200.us-central1.run.app/snapshot",
    status: "healthy",
    isDefault: true,
  },
  {
    id: "financial-intelligence",
    name: "Financial Intelligence Strategy Agent",
    businessUnit: "Strategy & Finance",
    owner: "S. Adeyemi",
    sponsor: "CFO Office",
    architecture: "Agentic",
    adapterType: "financial",
    endpointUrl: "https://shayeeboy.github.io/Financial-Intelligence-Strategy-Agent/studio-snapshot.json",
    status: "healthy",
    isDefault: true,
  },
];
