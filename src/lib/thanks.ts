// Post-event thank-you (kind "thanks" in /api/reminders). Plain personal
// note, no schedule card. Two versions: people we know were there (checked
// in, or had 1:1s) vs everyone else. Check-in data can have gaps, so the
// second version reads right whether or not they actually came.
import { EVENT_NAME, SITE_URL as SITE } from "@/data/timeslots";
const EVENT = EVENT_NAME;

export function buildThankYou(fullName: string, attended: boolean) {
  const subject = attended
    ? `Thank you for joining the ${EVENT}`
    : `Thank you from the ${EVENT}`;
  const paras = attended
    ? [
        `Thank you for joining us at the <b>${EVENT}</b> this week. We hope you discovered a few climate tech startups worth keeping an eye on, and perhaps a conversation or two worth continuing.`,
        `The startups' one-pagers remain available on the <a href="${SITE}/#startups">event site</a>, and the contacts you saved in the Virtual Networking Lounge are still there whenever you'd like to follow up.`,
        `If you'd like to be connected with any of the startups, just reply to this email and we'll be happy to make the introduction.`,
      ]
    : [
        `Thank you for registering for the <b>${EVENT}</b>. Whether you joined us in Singapore or weren't able to make it on the day, we're grateful for your interest in Korean climate tech.`,
        `You can still explore the startups through their one-pagers on the <a href="${SITE}/#startups">event site</a>.`,
        `If any of them caught your eye, we'd be glad to connect you at any time. Simply reply to this email and we'll make the introduction.`,
      ];
  const sign = ["Warm regards,", "The LodestarT team"];
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:560px">` +
    `<p>Hi ${esc(fullName)},</p>` +
    paras.map((p) => `<p>${p}</p>`).join("") +
    `<p style="margin-top:24px">${sign.join("<br>")}</p></div>`;
  const text = [`Hi ${fullName},`, "", ...paras.flatMap((p) => [strip(p), ""]), ...sign, "", `${SITE}/#startups`].join("\n");
  return { subject, html, text };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strip = (s: string) => s.replace(/<a [^>]*>([^<]*)<\/a>/g, "$1").replace(/<\/?b>/g, "");
