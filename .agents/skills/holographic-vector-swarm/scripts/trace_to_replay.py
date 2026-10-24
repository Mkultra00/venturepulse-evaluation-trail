#!/usr/bin/env python3
"""Turn a flat event trace (CSV, JSON array, or JSONL) into an HVS replay config.

Each input row is one event. Recognised columns (case-insensitive, first match wins):
    time:    timestamp | ts | time | t | start_time   (ISO-8601, epoch seconds/ms, or seconds offset)
    source:  source | from | sender | caller | parent | agent
    target:  target | to | receiver | callee | child | tool
    kind:    kind | type | category | event_type      (mapped to cmd/comm/mem/tool/ok/err)
    action:  action | event | op                      (spawn / retire / task_start / task_end / status)
    note:    note | message | detail | summary | content
    task:    task | task_id | run_id
    status:  status | state

Usage:
    python trace_to_replay.py TRACE [--base base.json] [--out config.json]
        [--orchestrator ID] [--tools ID,ID] [--memory ID] [--validator ID]
        [--duration 90] [--max-agents 14]

Nodes never named as tools or orchestrator become agents. Spawned children become
subagents. Timestamps are rebased to 0 and optionally compressed to --duration seconds.
"""
import argparse
import csv
import json
import re
import sys
from datetime import datetime

KIND_MAP = [
    ("err", r"err|fail|exception|alert|denied|timeout|reject"),
    ("ok", r"result|complete|success|done|return|validated|finish|response_ok"),
    ("mem", r"mem|retriev|recall|context|rag|vector|embed|cache|lookup"),
    ("tool", r"tool|api|call|function|exec|http|sql|query|search|fetch"),
    ("cmd", r"command|dispatch|assign|plan|orchestr|route"),
    ("comm", r"."),
]
COLS = {
    "time": ["timestamp", "ts", "time", "t", "start_time", "datetime"],
    "source": ["source", "from", "sender", "caller", "parent", "agent"],
    "target": ["target", "to", "receiver", "callee", "child", "tool"],
    "kind": ["kind", "type", "category", "event_type"],
    "action": ["action", "event", "op"],
    "note": ["note", "message", "detail", "summary", "content"],
    "task": ["task", "task_id", "run_id"],
    "status": ["status", "state"],
}


def load_rows(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    s = text.lstrip()
    if path.lower().endswith(".csv") or (s and s[0] not in "[{"):
        return list(csv.DictReader(text.splitlines()))
    if s.startswith("["):
        return json.loads(s)
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def col(row, key):
    low = {str(k).lower(): v for k, v in row.items()}
    for name in COLS[key]:
        if name in low and low[name] not in (None, ""):
            return low[name]
    return None


def to_seconds(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        x = float(v)
    else:
        sv = str(v).strip()
        try:
            x = float(sv)
        except ValueError:
            try:
                return datetime.fromisoformat(sv.replace("Z", "+00:00")).timestamp()
            except ValueError:
                return None
    return x / 1000.0 if x > 1e11 else x  # epoch ms → s


def map_kind(*vals):
    s = " ".join(str(v) for v in vals if v).lower()
    for k, pat in KIND_MAP:
        if re.search(pat, s):
            return k
    return "comm"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("trace")
    ap.add_argument("--base", help="Base config JSON to merge into (brand, roles, colors…)")
    ap.add_argument("--out", default="-")
    ap.add_argument("--orchestrator")
    ap.add_argument("--tools", default="")
    ap.add_argument("--memory")
    ap.add_argument("--validator")
    ap.add_argument("--duration", type=float, default=0, help="Compress the replay to this many seconds")
    ap.add_argument("--min-gap", type=float, default=0.12, help="Minimum spacing between events after compression")
    ap.add_argument("--max-agents", type=int, default=14)
    args = ap.parse_args()

    base = {}
    if args.base:
        with open(args.base, encoding="utf-8") as f:
            base = json.load(f)
    rows = load_rows(args.trace)
    if not rows:
        sys.exit("error: trace is empty")

    orch = args.orchestrator or (base.get("orchestrator") or {}).get("id") or "PRIME"
    tool_ids = {t for t in args.tools.split(",") if t} | {str(t["id"]) for t in base.get("tools", [])}
    parsed = []
    for i, r in enumerate(rows):
        t = to_seconds(col(r, "time"))
        parsed.append({"i": i, "t": t if t is not None else float(i), "src": col(r, "source"), "dst": col(r, "target"),
                       "kind": col(r, "kind"), "action": (col(r, "action") or "").lower(), "note": col(r, "note"),
                       "task": col(r, "task"), "status": col(r, "status")})
    parsed.sort(key=lambda p: (p["t"], p["i"]))
    t0 = parsed[0]["t"]
    span = max(parsed[-1]["t"] - t0, 1e-6)
    scale = (args.duration / span) if args.duration else 1.0

    agent_order, subs, events, last_t = [], set(), [], -1.0
    known_agents = {str(a["id"]) for a in base.get("agents", [])}

    def node(n):
        n = str(n)
        if n in (orch, "orchestrator") or n in tool_ids or n in subs:
            return n
        if n not in known_agents and n not in agent_order:
            agent_order.append(n)
        return n

    started_tasks = set()
    for p in parsed:
        t = round(max((p["t"] - t0) * scale, last_t + args.min_gap if last_t >= 0 else 0), 2)
        last_t = t
        a = p["action"]
        note = (str(p["note"])[:140]) if p["note"] else None
        if "spawn" in a and p["src"] and p["dst"]:
            parent = node(p["src"])
            subs.add(str(p["dst"]))
            events.append({"t": t, "type": "spawn", "parent": parent, "id": str(p["dst"]), "note": note})
        elif ("retire" in a or "exit" in a or "terminate" in a) and (p["dst"] or p["src"]):
            sid = str(p["dst"] or p["src"])
            if sid in subs:
                events.append({"t": t, "type": "retire", "id": sid, "report": "ok", "note": note})
        elif "task" in a and p["task"]:
            tid = str(p["task"])
            if "start" in a or tid not in started_tasks:
                if tid not in started_tasks:
                    started_tasks.add(tid)
                    lead = node(p["dst"] or p["src"]) if (p["dst"] or p["src"]) else None
                    events.append({"t": t, "type": "task", "phase": "start", "id": tid, "lead": lead, "name": note or tid})
            if "end" in a or "complete" in a or "fail" in a:
                ok = "fail" not in a and map_kind(p["kind"], p["status"]) != "err"
                events.append({"t": t, "type": "task", "phase": "end", "id": tid, "ok": ok, "note": note})
        elif "status" in a and (p["src"] or p["dst"]):
            nid = node(p["src"] or p["dst"])
            events.append({"t": t, "type": "status", "id": nid, "status": str(p["status"] or "").upper() or None,
                           "error": map_kind(p["status"]) == "err", "msg": note})
        elif p["src"] and p["dst"]:
            k = map_kind(p["kind"], a, p["status"]) if not (p["kind"] in {"cmd", "comm", "mem", "tool", "ok", "err"}) else p["kind"]
            src, dst = str(p["src"]), str(p["dst"])
            if k != "err":
                if src in tool_ids or dst in tool_ids:
                    k = "tool"  # calls to and answers from tools stay amber
                elif args.memory and args.memory in (src, dst) and k in ("ok", "comm"):
                    k = "mem"   # memory replies stay violet
                elif src in (orch, "orchestrator") and k == "comm":
                    k = "cmd"
            events.append({"t": t, "type": "msg", "from": node(p["src"]), "to": node(p["dst"]), "kind": k,
                           "note": note})
        elif note:
            events.append({"t": t, "type": "log", "kind": "sys", "msg": note})

    for e in events:
        for k in [k for k, v in e.items() if v is None]:
            del e[k]

    cfg = dict(base)
    cfg["mode"] = "replay"
    cfg.setdefault("orchestrator", {"id": orch, "role": "Orchestrator"})
    agents = list(base.get("agents", []))
    if len(agent_order) + len(agents) > args.max_agents:
        print(f"warning: {len(agent_order) + len(agents)} agents found; keeping all, but consider grouping above {args.max_agents}.", file=sys.stderr)
    agents += [{"id": a, "role": "Agent"} for a in agent_order]
    cfg["agents"] = agents
    existing_tools = {str(t["id"]) for t in base.get("tools", [])}
    cfg["tools"] = list(base.get("tools", [])) + [{"id": t, "role": "External tool"} for t in sorted(tool_ids - existing_tools)]
    roles = dict(base.get("roles", {}))
    if args.memory:
        roles["memory"] = args.memory
    if args.validator:
        roles["validator"] = args.validator
    cfg["roles"] = roles
    rp = dict(base.get("replay", {}))
    rp["events"] = events
    rp.setdefault("loop", True)
    cfg["replay"] = rp
    cfg.setdefault("brand", {}).setdefault("badge", "Replay of recorded events")

    out = json.dumps(cfg, indent=2, ensure_ascii=False)
    if args.out == "-":
        print(out)
    else:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"Wrote {args.out}: {len(agents)} agents, {len(cfg['tools'])} tools, {len(subs)} subagents, {len(events)} events, "
              f"{events[-1]['t'] if events else 0:.1f} s.", file=sys.stderr)


if __name__ == "__main__":
    main()
