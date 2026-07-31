import { create } from "zustand";
import type { Registration, EntityMap, EntityType, EntityRow } from "./types";
import { emptyEntities } from "./types";
import {
  loadState,
  registerProduct,
  advanceWorkflow,
  saveAssessment,
  saveEntity,
  deleteEntity,
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
  entities: EntityMap;
  init: () => Promise<void>;
  addRegistration: (r: Registration) => Promise<void>;
  advance: (w: WorkflowStageRow & { actor?: string }) => Promise<void>;
  addAssessment: (a: AssessmentRow) => Promise<void>;
  saveEntity: (name: EntityType, row: { id?: string; productId?: string | null; data: Record<string, unknown> }) => Promise<EntityRow>;
  removeEntity: (name: EntityType, id: string) => Promise<void>;
  productById: (id: string) => Registration | undefined;
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  loaded: false,
  backend: hasBackend,
  registrations: [],
  workflow: [],
  audit: [],
  assessments: [],
  entities: emptyEntities(),

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

  saveEntity: async (name, row) => {
    const created = await saveEntity(name, row);
    const s = await loadState();
    set({ entities: s.entities });
    return created;
  },

  removeEntity: async (name, id) => {
    await deleteEntity(name, id);
    const s = await loadState();
    set({ entities: s.entities });
  },

  productById: (id) => get().registrations.find((r) => r.id === id),
}));
