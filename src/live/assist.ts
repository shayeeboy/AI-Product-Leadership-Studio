// Optional live LLM assist for Product Discovery. Calls the persistence Worker's
// /api/assist route when configured (VITE_PERSISTENCE_API + a server-side key);
// otherwise — and on any error — returns the caller's template. The key never
// touches the client: the Worker holds it. So the app works keyless out of the
// box (templates) and upgrades to a live LLM by opting in server-side.
const API = import.meta.env.VITE_PERSISTENCE_API?.replace(/\/$/, "");

export interface AssistResult {
  text: string;
  mode: "llm" | "template";
}

export async function assist(prompt: string, fallback: string): Promise<AssistResult> {
  if (API && prompt.trim()) {
    try {
      const res = await fetch(`${API}/api/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = (await res.json()) as { text?: string };
        if (data?.text && data.text.trim()) return { text: data.text.trim(), mode: "llm" };
      }
      // 501 (not configured) / 4xx / 5xx → fall through to template
    } catch {
      // network/CORS error → fall through to template
    }
  }
  return { text: fallback, mode: "template" };
}
