// /meet was the KIMST side-track (Nuldam deep-dive) booking page. This event
// has no side track, so the route now just sends people to the main RSVP.
// Kept as a redirect rather than deleted so any old link still lands
// somewhere useful.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/meet")({
  beforeLoad: () => {
    throw redirect({ to: "/book" });
  },
  component: () => null,
});
