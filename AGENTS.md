<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- agent-rules:v1 — maintained by Donghyun's Claude setup. Keep this block; edit freely. -->
## Working rules for AI agents

**Start here.** Read `aidlc-docs/codemap.md` first. Open only the files the task touches; grep for the symbol instead of cat-ing whole files. Do not re-explore the tree with ls/find/grep when the codemap already answers the question. Regenerate the map (`python3 scripts/codemap.py .`) only after adding routes, tables, or env vars.

**Lazy senior dev (ponytail).** The best code is code not written. Before writing anything, climb this ladder and stop at the first rung that holds:
1. Does it need to exist at all? Speculative need → skip, say so in one line.
2. Already in this codebase? Reuse the helper/pattern that is a few files over.
3. Stdlib or native platform feature covers it? Use it (CSS over JS, DB constraint over app code).
4. Already-installed dependency does it? Use it. Never add a dependency for what a few lines do.
5. Can it be one line? One line. Only then: the minimum code that works.

Rules: no unrequested abstractions, no scaffolding "for later", deletion over addition, fewest files, shortest working diff — *after* understanding the real flow end to end. Bug fix = root cause where all callers route through, not a guard on the one path the ticket names. Complex request → ship the lazy version and question it in the same reply ("Did X; Y covers it. Need full X? Say so."). Mark deliberate corners with a `ponytail:` comment naming the ceiling and upgrade path.

**Output.** Code first, then at most three short lines: what was skipped, when to add it. If the explanation is longer than the code, cut the explanation. No feature tours, no design essays, no tool-call narration.

**Terse mode (opt-in).** Coding-only sessions may run "caveman": drop articles, filler, pleasantries and hedging; fragments fine; technical terms, code, error strings and numbers exact; never drop not/never/only. Off for anything whose deliverable is prose (emails, decks, docs). Reply in the user's language regardless.

**House conventions.**
- AI-DLC: plan → approve → execute for anything beyond a small fix. SQL / schema changes are shown for review before they are applied.
- Never commit `.env`, `node_modules`, `.vercel/`, `dist/`. Secrets stay in Vercel/Supabase settings.
- Commit messages: imperative subject, then *why* in the body. Author email must be the GitHub account email.
- If this repo has a `ksc/` mirror, keep it in sync; otherwise ignore.
