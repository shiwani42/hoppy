import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * A Supabase client acting as the signed-in user (row level security applies),
 * built from the `Authorization: Bearer <jwt>` header our client sends.
 */
export async function userFromRequest(req: Request): Promise<{ sb: SupabaseClient; user: User }> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Not signed in");
  const sb = createClient(url(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expired");
  return { sb, user: data.user };
}

/** Bypasses row level security. Only for cron jobs and cross-user reads we control. */
export function serviceClient(): SupabaseClient {
  return createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Wraps a route handler so thrown HttpErrors become JSON responses. */
export function route(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return Response.json({ error: "Something went wrong on our side" }, { status: 500 });
    }
  };
}
