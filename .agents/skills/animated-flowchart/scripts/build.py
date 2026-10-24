#!/usr/bin/env python3
"""Build an animated flowchart page from a flow file.

Usage:
  python build.py FLOW_FILE OUTPUT_HTML [--no-builder]

FLOW_FILE uses the flow format described in SKILL.md.
--no-builder hides the "Turn any process into a flowchart" editor so the
page shows only the animated chart and its playback controls.

Exits non-zero and prints problems if the flow has errors.
"""
import json, re, sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "template.html"

EDGE = re.compile(r"^([\w-]+)\s*->\s*([\w-]+)\s*(?::\s*(.*))?$")
NODE = re.compile(r"^([\w-]+)\s*:\s*(.+)$")
TITLE = re.compile(r"^title\s*:\s*(.+)$", re.I)
POS = re.compile(r"^@\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)$")


def check(src: str):
    errors, warnings = [], []
    nodes, edges, title = {}, [], None
    for i, raw in enumerate(src.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith(("#", "//", "```")):
            continue
        if m := TITLE.match(line):
            title = m[1]
        elif re.match(r"^legend\s*:", line, re.I):
            continue
        elif m := EDGE.match(line):
            edges.append((m[1], m[2], i))
        elif m := NODE.match(line):
            parts = [p.strip() for p in m[2].split("|") if p.strip()]
            pos = any(POS.match(p) for p in parts[1:])
            nodes[m[1]] = {"label": parts[0] if parts else m[1], "pos": pos, "line": i}
        else:
            errors.append(f"line {i}: not a title, step or link: {line[:60]}")
    if not nodes:
        errors.append("no steps defined")
    for a, b, i in edges:
        for n in (a, b):
            if n not in nodes:
                warnings.append(f"line {i}: '{n}' is used in a link but never defined; it will show its id as the label")
    pinned = [n for n in nodes.values() if n["pos"]]
    if pinned and len(pinned) != len(nodes):
        warnings.append("some steps have @col,row positions and some don't; positions are ignored unless every step has one")
    if not title:
        warnings.append("no 'title:' line; the heading will say 'Untitled process'")
    long = [k for k, v in nodes.items() if len(v["label"].split()) > 7]
    if long:
        warnings.append("long labels (over 7 words) make tall boxes: " + ", ".join(long))
    if len(nodes) > 16:
        warnings.append(f"{len(nodes)} steps; charts over ~14 steps get hard to read on a phone")
    outgoing = {a for a, _, _ in edges}
    first = next(iter(nodes), None)
    if first and first not in outgoing and len(nodes) > 1:
        warnings.append(f"the first step '{first}' has no outgoing link, so the animation will stop immediately")
    return errors, warnings


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        sys.exit(2)
    src = Path(args[0]).read_text(encoding="utf-8")
    src = re.sub(r"```[a-zA-Z]*", "", src).strip()
    errors, warnings = check(src)
    for w in warnings:
        print("warning:", w)
    if errors:
        for e in errors:
            print("error:", e)
        sys.exit(1)
    html = TEMPLATE.read_text(encoding="utf-8")
    # json.dumps gives a safe JS string literal; escape '</' so it can't close the script tag
    literal = json.dumps(src, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace("/*__FLOW__*/null", literal, 1)
    if "--no-builder" in sys.argv:
        html = html.replace("/*__BUILDER__*/true", "false", 1)
    Path(args[1]).write_text(html, encoding="utf-8")
    print(f"wrote {args[1]}")


if __name__ == "__main__":
    main()
