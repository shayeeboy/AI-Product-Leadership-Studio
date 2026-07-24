import { create } from "zustand";
import type { Registration } from "./types";
import {
  loadState,
  registerProduct,
  advanceWorkflow,
  saveAssessment,
  hasBackend,
  type WorkflowStageRow,
  type AuditRow,
  type AssessmentRow,
} from "./persistence";

interface LiveStore {
  loaded: boolean;
  backend: boolean;
  registrations: Registration[];
  workflow: WorkflowStageRow[];
  audit: AuditRow[];
  assessments: AssessmentRow[];
  init: () => Promise<void>;
  addRegistration: (r: Registration) => Promise<void>;
  advance: (w: WorkflowStageRow & { actor?: string }) => Promise<void>;
  addAssessment: (a: AssessmentRow) => Promise<void>;
  productById: (id: string) => Registration | undefined;
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  loaded: false,
  backend: hasBackend,
  registrations: [],
  workflow: [],
  audit: [],
  assessments: [],

  init: async () => {
    const s = await loadState();
    set({ ...s, loaded: true });
  },

  addRegistration: async (r) => {
    const created = await registerProduct(r);
    // Reload so we reflect backend-computed rows (workflow seed, audit).
    const s = await loadState();
    set({ ...s });
    return void created;
  },

  advance: async (w) => {
    await advanceWorkflow(w);
    const s = await loadState();
    set({ ...s });
  },

  addAssessment: async (a) => {
    await saveAssessment(a);
    const s = await loadState();
    set({ assessments: s.assessments });
  },

  productById: (id) => get().registrations.find((r) => r.id === id),
}));
