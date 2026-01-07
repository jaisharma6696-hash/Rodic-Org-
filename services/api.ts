import { StoreData } from "../types";

export const BACKEND_ENABLED = () => !!(window as any).__RODIC_BACKEND_SYNC__;
export const BACKEND_ENDPOINT = () => (window as any).__RODIC_BACKEND_ENDPOINT__ || "/api/org/save";

export interface SyncResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function syncToBackend(store: StoreData): Promise<SyncResult> {
  if (!BACKEND_ENABLED()) return { ok: false, skipped: true };
  const endpoint = BACKEND_ENDPOINT();
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store }),
    });
    if (!res.ok) throw new Error(`Backend save failed: ${res.status}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}