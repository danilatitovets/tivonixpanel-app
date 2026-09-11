import { NextResponse } from "next/server";
import { clearGateCache } from "@/lib/auth/gate-cache";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ success: true });
  clearGateCache(res);
  return res;
}
