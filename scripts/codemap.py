#!/usr/bin/env python3
"""Generate aidlc-docs/codemap.md — a compact map an AI agent reads instead of
exploring the repo with grep/cat. Deterministic, no deps. Re-run after structural
changes (new routes, tables, env vars); content edits don't need it.
Usage: python3 codemap.py <repo_dir> [<display name>]
"""
import os, re, sys, json, subprocess
from collections import Counter, defaultdict

SKIP_DIRS = {"node_modules", ".git", "dist", ".output", ".vercel", ".vinxi", ".tanstack", ".nitro", ".next",
             "build", "coverage", "__pycache__", ".venv", "venv", ".idea", ".vscode", "assets", "public",
             "shots", "lodestart_v4", "lodestart_oip-main", "lodestart_agent-main", "lodestart-app", "ksc"}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".sql", ".css", ".md", ".json", ".yaml", ".yml", ".toml"}
NOISE_FILES = {"package-lock.json", "pnpm-lock.yaml", "bun.lock", "yarn.lock", "routeTree.gen.ts", "tsconfig.tsbuildinfo"}

def rel_files(root):
    out = []
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS and not x.startswith(".")]
        for f in files:
            if f in NOISE_FILES: continue
            p = os.path.join(d, f)
            if os.path.splitext(f)[1] in CODE_EXT:
                out.append(os.path.relpath(p, root))
    return sorted(out)

def loc(path):
    try:
        with open(path, "rb") as fh: return sum(1 for _ in fh)
    except Exception: return 0

def read(path):
    try:
        return open(path, encoding="utf-8", errors="ignore").read()
    except Exception: return ""

RX = {
    "export_fn": re.compile(r"^export\s+(?:async\s+)?function\s+(\w+)", re.M),
    "export_const": re.compile(r"^export\s+const\s+(\w+)", re.M),
    "export_type": re.compile(r"^export\s+(?:interface|type)\s+(\w+)", re.M),
    "server_fn": re.compile(r"^export\s+const\s+(\w+)\s*=\s*createServerFn", re.M),
    "route": re.compile(r"createFileRoute\(\s*[\"']([^\"']+)[\"']", re.M),
    "py_def": re.compile(r"^(?:async\s+)?def\s+(\w+)", re.M),
    "py_class": re.compile(r"^class\s+(\w+)", re.M),
    "sql_table": re.compile(r"create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)", re.I),
    "sql_alter": re.compile(r"alter\s+table\s+(?:public\.)?(\w+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)", re.I),
    "env": re.compile(r"(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]+)"),
    "py_env": re.compile(r"os\.(?:environ\.get|getenv|environ)\[?\(?[\"']([A-Z][A-Z0-9_]+)[\"']"),
    "next_api": re.compile(r"^export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)", re.M),
    "supabase_from": re.compile(r"\.from\(\s*[\"'](\w+)[\"']\s*\)"),
}

def scan(root):
    files = rel_files(root)
    info = {}
    env = Counter(); tables = {}; alters = defaultdict(set); routes = []; api = []; supa = Counter()
    for f in files:
        p = os.path.join(root, f); ext = os.path.splitext(f)[1]; text = read(p)
        n = loc(p)
        d = {"loc": n, "exports": [], "server_fns": [], "route": None, "defs": [], "api": []}
        if ext in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
            d["exports"] = sorted(set(RX["export_fn"].findall(text) + RX["export_const"].findall(text) + RX["export_type"].findall(text)))
            d["server_fns"] = RX["server_fn"].findall(text)
            m = RX["route"].search(text); d["route"] = m.group(1) if m else None
            d["api"] = RX["next_api"].findall(text)
            for e in RX["env"].findall(text): env[e] += 1
            for t in RX["supabase_from"].findall(text): supa[t] += 1
            if d["route"]: routes.append((d["route"], f))
            if d["api"] and ("/api/" in f or "route." in f): api.append((f, d["api"]))
        elif ext == ".py":
            d["defs"] = RX["py_def"].findall(text) + ["class " + c for c in RX["py_class"].findall(text)]
            for e in RX["py_env"].findall(text): env[e] += 1
            if "/api/" in f or f.startswith("api/"): api.append((f, ["py"]))
        elif ext == ".sql":
            for t in RX["sql_table"].findall(text): tables[t] = f
            for t, col in RX["sql_alter"].findall(text): alters[t].add(col)
        info[f] = d
    return files, info, env, tables, alters, routes, api, supa

def tree(files, max_depth=3):
    seen = set(); lines = []
    for f in files:
        parts = f.split("/")
        for i in range(min(len(parts), max_depth)):
            key = "/".join(parts[: i + 1])
            if key in seen: continue
            seen.add(key)
            is_file = i == len(parts) - 1
            lines.append("  " * i + ("" if is_file else "") + parts[i] + ("" if is_file else "/"))
    return lines

def main():
    root = os.path.abspath(sys.argv[1]); name = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(root)
    files, info, env, tables, alters, routes, api, supa = scan(root)
    pkg = {}
    if os.path.exists(os.path.join(root, "package.json")):
        try: pkg = json.load(open(os.path.join(root, "package.json")))
        except Exception: pkg = {}
    deps = sorted(list((pkg.get("dependencies") or {}).keys()))
    scripts = pkg.get("scripts") or {}
    total_loc = sum(v["loc"] for v in info.values())
    big = sorted(((v["loc"], f) for f, v in info.items() if os.path.splitext(f)[1] in {".ts", ".tsx", ".js", ".jsx", ".py"}), reverse=True)[:12]
    try:
        head = subprocess.run(["git", "-C", root, "log", "-1", "--format=%h %ad %s", "--date=short"], capture_output=True, text=True).stdout.strip()
    except Exception: head = ""

    L = []
    L.append(f"# Codemap — {name}")
    L.append("")
    L.append("Read this first, then open only the files the task touches. Regenerate with")
    L.append("`python3 scripts/codemap.py .` after adding routes, tables, or env vars.")
    L.append("")
    L.append(f"- Generated at: {head or 'n/a'}")
    L.append(f"- Files mapped: {len(files)} · code LOC: {total_loc:,}")
    if scripts: L.append("- Scripts: " + ", ".join(f"`{k}`" for k in scripts.keys()))
    if deps: L.append("- Deps: " + ", ".join(deps[:40]) + (" …" if len(deps) > 40 else ""))
    L.append("")
    if routes:
        L.append("## Routes (pages)")
        for r, f in sorted(routes): L.append(f"- `{r}` → {f} ({info[f]['loc']} LOC)")
        L.append("")
    if api:
        L.append("## API endpoints")
        for f, methods in sorted(api): L.append(f"- {f} · {', '.join(methods)}")
        L.append("")
    sfn = [(f, v["server_fns"]) for f, v in info.items() if v["server_fns"]]
    if sfn:
        L.append("## Server functions (TanStack createServerFn)")
        for f, fns in sfn:
            L.append(f"- {f}: " + ", ".join(f"`{x}`" for x in fns))
        L.append("")
    if tables or supa:
        L.append("## Data")
        for t, f in sorted(tables.items()):
            cols = f" (+{', '.join(sorted(alters[t]))})" if alters.get(t) else ""
            L.append(f"- table `{t}` — defined in {f}{cols}")
        if supa:
            L.append("- Supabase tables touched in code: " + ", ".join(f"`{t}`×{n}" for t, n in supa.most_common()))
        L.append("")
    if env:
        L.append("## Environment variables")
        L.append("- " + ", ".join(f"`{e}`" for e, _ in env.most_common()))
        L.append("")
    L.append("## Biggest files (open these surgically — grep for the symbol, don't cat)")
    for n, f in big: L.append(f"- {f} — {n} LOC")
    L.append("")
    L.append("## Exports by file")
    for f in files:
        v = info[f]
        ex = v["exports"] or v["defs"]
        if not ex: continue
        shown = ex[:18]
        L.append(f"- **{f}** ({v['loc']}): " + ", ".join(shown) + (" …" if len(ex) > 18 else ""))
    L.append("")
    L.append("## Tree (depth 3)")
    L.append("```")
    L.extend(tree(files))
    L.append("```")
    out_dir = os.path.join(root, "aidlc-docs"); os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "codemap.md")
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print(f"{name}: {len(files)} files, {total_loc:,} LOC → {os.path.relpath(out, root)} ({len(L)} lines)")

if __name__ == "__main__":
    main()
