# aidlc-docs

Persistent context memory for the **AI-DLC (AI-Driven Development Lifecycle)**
workflow on this repository, following the AWS methodology
(`github.com/awslabs/aidlc-workflows`).

## Why this folder exists

Prior work on this repo was "vibe coded": context was lost between sessions, no
requirements or design artefacts survived, and there was no traceability from a
request to the change that fulfilled it. One incident traceable to this gap:
application code depending on a new DB column was deployed before the column
existed, breaking every RSVP submission in production.

This folder is the durable memory that closes that gap. Every phase writes its
artefacts here; later sessions (human or AI) read them before touching code.

## Working agreement

1. **Plan → Approve → Execute.** No implementation begins without an explicit
   human approval of the written plan.
2. **Brownfield first.** Existing code is reverse-engineered into static and
   dynamic models before it is modified.
3. **Everything is written down.** Requirements, designs, decisions and plans
   live here, not in chat scrollback.
4. **Depth scales with the task.** A copy tweak does not need a full cycle; a
   new subsystem does.

## Layout

| Path | Contents |
|---|---|
| `reverse-engineering/` | Phase 0 — models of the system as it exists today |
| `decisions/` | ADRs — one file per architectural decision |
| `audit.md` | Chronological log of AI-DLC sessions and their outputs |

## Status

| Phase | State |
|---|---|
| Phase 0 — Reverse engineering | **Complete** (awaiting review) |
| Inception (intent → stories → units) | Not started |
| Construction (design → code) | Not started |
