// Utilitário para chamar a API do video-service
//
// Em produção (HTTPS), o browser NÃO pode fazer fetch para endereços HTTP
// (Mixed Content bloqueado). Por isso usamos /api/vs que o Next.js proxia
// internamente para o video-service HTTP (via rewrites em next.config.ts).
const IS_BROWSER = typeof window !== "undefined";
const BASE = IS_BROWSER
  ? "/api/vs"   // relativo → Next.js proxy (HTTPS safe)
  : (process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL || "http://localhost:8000"); // server-side direto

const KEY = process.env.NEXT_PUBLIC_EDITOR_API_KEY || "c8club-editor-2026";

const headers = () => ({ "Content-Type": "application/json", "x-editor-key": KEY });

export async function apiGet(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: headers(), cache: "no-store" });
  if (!r.ok) throw new Error(`API ${path} → ${r.status}`);
  return r.json();
}

export async function apiPut(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PUT", headers: headers(), body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiPost(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST", headers: headers(), body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type ScriptKey = "score_0_20" | "score_21_40" | "score_41_60" | "score_61_80" | "score_81_100";
export const SCORE_COLORS: Record<string, string> = {
  score_0_20:   "#ef4444",
  score_21_40:  "#f97316",
  score_41_60:  "#f59e0b",
  score_61_80:  "#3b82f6",
  score_81_100: "#10b981",
};
