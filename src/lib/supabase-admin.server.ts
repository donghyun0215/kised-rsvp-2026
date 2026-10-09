import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this file from client code — the `.server.ts`
// suffix keeps TanStack Start from bundling it into the browser output, and
// the service role key must never reach the client.
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables on the server.",
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
