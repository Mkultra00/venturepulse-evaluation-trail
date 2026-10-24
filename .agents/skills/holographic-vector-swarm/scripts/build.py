#!/usr/bin/env python3
"""Build a Holographic Vector Swarm page from a JSON config.

Usage:
    python build.py CONFIG.json OUT.html [--template PATH] [--check-only]

Validates the config (ids, roles, task leads, replay event references) and
injects it into assets/hvs-template.html. Exits non-zero on errors; warnings
are printed but do not block the build.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TEMPLATE = os.path.join(HERE, "..", "assets", "hvs-template.html")
PLACEHOLDER = "/*__HVS_CONFIG__*/"
KINDS = {"cmd", "comm", "mem", "tool", "ok", "err"}
EVENT_TYPES = {"msg", "spawn", "retire", "status", "task", "log"}
ROLE_KEYS = {"memory", "validator", "toolRunner"}


def validate(cfg):
    errors, warnings = [], []
    agents = cfg.get("agents") or []
    tools = cfg.get("tools") or []
    if not agents:
        errors.append('"agents" must list at least one agent.')
    orch = (cfg.get("orchestrator") or {}).get("id", "PRIME")
    ids = [orch]
    for a in agents:
        if "id" not in a:
            errors.append(f"Agent without an id: {a}")
        ids.append(str(a.get("id")))
    for t in tools:
        if "id" not in t:
            errors.append(f"Tool without an id: {t}")
        ids.append(str(t.get("id")))
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        errors.append(f"Duplicate node ids: {sorted(dupes)}")
    agent_ids = {str(a.get("id")) for a in agents}
    if len(agents) > 16:
        warnings.append(f"{len(agents)} agents: above ~16 the orbit shells get crowded; consider grouping.")
    if len(tools) > 8:
        warnings.append(f"{len(tools)} tools: above 8 the outer ring gets crowded.")

    for k, v in (cfg.get("roles") or {}).items():
        if k not in ROLE_KEYS:
            warnings.append(f'Unknown role "{k}" (known: {sorted(ROLE_KEYS)}).')
        elif v not in agent_ids:
            errors.append(f'roles.{k} = "{v}" is not an agent id.')

    for k in (cfg.get("colors") or {}):
        if k not in KINDS:
            warnings.append(f'colors.{k} is not a vector kind ({sorted(KINDS)}).')

    mode = cfg.get("mode", "simulate")
    if mode not in {"simulate", "replay", "live"}:
        errors.append(f'mode must be simulate, replay or live (got "{mode}").')

    sim = cfg.get("simulation") or {}
    for t in sim.get("tasks") or []:
        lead = t.get("lead")
        if lead is not None and str(lead) not in agent_ids:
            errors.append(f'Task "{t.get("name")}" has lead "{lead}", which is not an agent id.')

    if mode == "replay":
        events = (cfg.get("replay") or {}).get("events") or []
        if not events:
            errors.append("Replay mode needs replay.events.")
        known = set(ids) | {"orchestrator", "PRIME"}
        tasks = set()
        for i, ev in enumerate(sorted(events, key=lambda e: e.get("t", 0))):
            where = f"event #{i} (t={ev.get('t', 0)})"
            et = ev.get("type", "msg")
            if et not in EVENT_TYPES:
                errors.append(f"{where}: unknown type {et}")
                continue
            if "t" not in ev:
                warnings.append(f"{where}: no t; treated as 0.")
            if et == "msg":
                for side in ("from", "to"):
                    if str(ev.get(side)) not in known:
                        errors.append(f"{where}: {side} '{ev.get(side)}' is not a known node (spawn it first?).")
                if ev.get("kind", "comm") not in KINDS:
                    warnings.append(f"{where}: kind '{ev.get('kind')}' not in {sorted(KINDS)}; shown as comm.")
            elif et == "spawn":
                if str(ev.get("parent")) not in known:
                    errors.append(f"{where}: parent '{ev.get('parent')}' is not a known node.")
                if ev.get("id") is None:
                    warnings.append(f"{where}: spawn without id gets an auto name; later events cannot reference it.")
                else:
                    known.add(str(ev["id"]))
            elif et in ("retire",):
                if str(ev.get("id")) not in known:
                    errors.append(f"{where}: retire of unknown id '{ev.get('id')}'.")
            elif et == "status":
                if str(ev.get("id")) not in known:
                    errors.append(f"{where}: status for unknown id '{ev.get('id')}'.")
            elif et == "task":
                ph = ev.get("phase", "start")
                if ph == "start":
                    if ev.get("lead") is not None and str(ev["lead"]) not in known:
                        errors.append(f"{where}: task lead '{ev['lead']}' is not a known node.")
                    tasks.add(str(ev.get("id")))
                elif str(ev.get("id")) not in tasks:
                    errors.append(f"{where}: task '{ev.get('id')}' {ph} before it started.")
        span = max((e.get("t", 0) for e in events), default=0) / ((cfg.get("replay") or {}).get("speed") or 1)
        if span > 600:
            warnings.append(f"Replay spans {span:.0f} s; consider replay.speed or trace_to_replay.py --duration.")
    return errors, warnings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--template", default=DEFAULT_TEMPLATE)
    ap.add_argument("--check-only", action="store_true")
    args = ap.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)
    errors, warnings = validate(cfg)
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("error:", e)
    if errors:
        sys.exit(1)
    if args.check_only:
        print("Config OK.")
        return
    if not args.out:
        ap.error("OUT.html is required unless --check-only")

    with open(args.template, encoding="utf-8") as f:
        tpl = f.read()
    if PLACEHOLDER not in tpl:
        sys.exit("error: template has no config placeholder")
    payload = json.dumps(cfg, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = tpl.replace(PLACEHOLDER, payload, 1)
    title = cfg.get("title") or f'{(cfg.get("brand") or {}).get("name", "Holographic Swarm")} · Holographic Vector Swarm'
    html = html.replace("<title>Holographic Vector Swarm</title>", f"<title>{escape(title)}</title>", 1)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Built {args.out} ({len(html)//1024} KB, {len(cfg['agents'])} agents, mode={cfg.get('mode', 'simulate')}).")


def escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


if __name__ == "__main__":
    main()
