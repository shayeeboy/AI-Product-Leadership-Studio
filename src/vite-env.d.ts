/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set, the Studio persists registry + writes to this Worker API; else localStorage. */
  readonly VITE_PERSISTENCE_API?: string;
  /** "live" (registry-driven live data) or "seeded" (the retained phase-1 demo). */
  readonly VITE_DATA_MODE?: "live" | "seeded";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
