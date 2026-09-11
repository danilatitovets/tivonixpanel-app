import { createServerClient } from "@supabase/ssr";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export type MiddlewareSupabase = {
  response: NextResponse;
  supabase: SupabaseClient;
  user: User | null;
};

/**
 * One Supabase client + one getUser() for the whole middleware hop.
 * Callers that only need cookie refresh can use updateSession().
 */
export async function createMiddlewareSupabase(
  request: NextRequest
): Promise<MiddlewareSupabase> {
  let response = NextResponse.next({ request });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return { response, supabase: null as unknown as SupabaseClient, user: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, supabase, user };
}

export async function updateSession(request: NextRequest) {
  const { response } = await createMiddlewareSupabase(request);
  return response;
}
