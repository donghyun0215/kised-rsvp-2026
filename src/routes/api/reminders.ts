import { createFileRoute } from "@tanstack/react-router";
import { buildReminderBatch, buildThanksBatch, REMINDER_KINDS } from "@/lib/reminders-auto.server";
import type { MailKind } from "@/lib/confirmation";

// POST { token, kind } → { ok, emails: [{ to, subject, html, text }] }
// Called by the Apps Script mailer at each scheduled reminder time. Same
// shared secret as the confirmation webhook.
export const Route = createFileRoute("/api/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (o: unknown, status = 200) =>
          new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
        let body: { token?: string; kind?: string };
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "bad json" }, 400);
        }
        const token = process.env.CONFIRMATION_WEBHOOK_TOKEN;
        if (!token || body.token !== token) return json({ ok: false, error: "unauthorized" }, 401);
        if (body.kind !== "thanks" && !REMINDER_KINDS.includes(body.kind as MailKind)) return json({ ok: false, error: "unknown kind" }, 400);
        try {
          const emails = body.kind === "thanks" ? await buildThanksBatch() : await buildReminderBatch(body.kind as MailKind);
          return json({ ok: true, count: emails.length, emails });
        } catch (err) {
          console.error("reminder batch error:", err);
          return json({ ok: false, error: "server error" }, 500);
        }
      },
    },
  },
});
