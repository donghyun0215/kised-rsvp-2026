import { createFileRoute } from "@tanstack/react-router";
import { buildInvite } from "@/lib/invite";

// GET → { ok, subject, html, text } for the invite Google Sheet.
// GET ?preview → the HTML itself, to eyeball the email in a browser.
// ?from=support → signed by the LodestarT team instead of Tammy.
// Public on purpose: it is the same marketing copy that goes out by email.
export const Route = createFileRoute("/api/invite")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mail = buildInvite(url.searchParams.get("from") === "support");
        if (url.searchParams.has("preview")) {
          const html = mail.html.replace("{{GREETING}}", "Dear Guest,");
          return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
        return new Response(JSON.stringify({ ok: true, ...mail }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
