"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** One Supabase client per browser tab; the session lives in localStorage. */
export function supabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
  }
  return browserClient;
}

/**
 * Returns the current session, signing in anonymously on first open.
 * Hoppy never shows a signup screen (prd.md > Onboarding (Drip)).
 */
export async function ensureSession() {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  const { data: signedIn, error } = await sb.auth.signInAnonymously();
  if (error || !signedIn.session) throw error ?? new Error("Could not start a session");
  return signedIn.session;
}

/** fetch() for our own API routes, carrying the user's access token. */
export async function api(path: string, init: RequestInit = {}) {
  const session = await ensureSession();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
}

export async function apiJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await api(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}
