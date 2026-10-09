import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/lib/supabase-admin.server";

// GET /api/keepalive → touches the database once so the Supabase free-tier
// project never goes to sleep (free projects pause after ~7 days without
// activity). Invoked daily by the Vercel cron in vercel.json; harmless to hit
// by hand. Returns ok:false (still 200) if the DB can't be reached.
export const Route = createFileRoute("/api/keepalive")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const { error } = await supabaseAdmin.from("rsvps").select("id", { head: true, count: "exact" }).limit(1);
        return new Response(
          JSON.stringify({ ok: !error, ms: Date.now() - started, at: new Date().toISOString(), ...(error ? { error: error.message } : {}) }),
          { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
