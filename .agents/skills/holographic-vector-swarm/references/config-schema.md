# HVS config schema

The page is driven entirely by one JSON object. Everything except `agents` is optional; defaults are shown.

## Contents
1. Top level
2. Nodes: orchestrator, agents, tools, roles
3. Mode `simulate`
4. Mode `replay` and the event format
5. Mode `live` and the push API
6. Visual defaults and colors
7. Limits and gotchas

## 1. Top level

```json
{
  "title": "Browser tab title (defaults to brand.name)",
  "brand": {
    "name": "HOLOGRAPHIC SWARM",          // big header wordmark; keep under ~18 chars
    "tagline": "",                        // small line under the name
    "operationLabel": "Operation",        // e.g. "Incident", "Run", "Mission", "Pipeline"
    "operation": "",                      // e.g. "GLASS LANTERN"; header block hidden if empty
    "badge": "Simulation · synthetic data" // honesty badge; default depends on mode
  },
  "mode": "simulate",                     // simulate | replay | live
  "boot": ["optional", "startup log lines"],
  "orchestrator": {}, "agents": [], "tools": [], "roles": {},
  "simulation": {}, "replay": {}, "visual": {}, "colors": {}, "legend": {}
}
```

The badge matters: synthetic data must say so. Use the default for `simulate`; for real traces say what it is ("Replay of production trace, 14 Oct").

## 2. Nodes

```json
"orchestrator": { "id": "PRIME", "role": "Orchestrator", "model": "" },
"agents": [
  { "id": "SCOUT", "role": "Recon and retrieval", "model": "HX-7",
    "color": "#3ee8ff",                  // optional; otherwise from role or colors.comm
    "size": 0.85,                        // optional node radius
    "orbit": { "radius": 14, "tilt": [0.25, 0.1], "phase": 0, "speed": 0.1 } }   // all optional
],
"tools": [
  { "id": "LEDGER-X", "role": "Corporate registry API", "verbs": ["fetch filings"], "radius": 23 }
],
"roles": { "memory": "VAULT", "validator": "WARDEN", "toolRunner": "FORGE" }
```

- Ids are display names: short, uppercase reads best (`SCOUT`, `KB`, `payments-svc` also fine). They must be unique across orchestrator, agents and tools.
- `roles` are optional and each must name an agent. They change behavior:
  - `memory`: violet node; memory traffic is routed to it; ambient links touching it are violet.
  - `validator`: green node; in simulate mode, results go through it before reaching the orchestrator, and it can reject.
  - `toolRunner`: amber node; ambient tool links run from it to each tool (otherwise from the orchestrator).
- Agent orbits are generated deterministically; the whole scene scales up when there are more than 7 agents. 3–12 agents look best; up to ~16 works.
- Tools sit on an outer ring as amber octahedra. 0–8 is the comfortable range.

## 3. Mode `simulate`

Synthetic, endless, randomized. Good for demos and pitches.

```json
"simulation": {
  "tasks": [ { "name": "Map vessel anomalies", "lead": "ATLAS", "id": "optional fixed id" } ],
  "autoDispatch": true,       // start tasks automatically
  "maxConcurrent": 3,         // auto-dispatch cap (manual cap is 2×)
  "subagents": [2, 4],        // min/max subagents per task
  "nestedRate": 0.12,         // chance a subagent spawns its own subagents (depth ≤ 2)
  "toolFailRate": 0.1,        // red error + retry on tool calls
  "rejectRate": 0.15,         // validator rejects first attempt → remediation subagent
  "memoryRate": 0.6,          // lead fetches context from memory before delegating
  "chatter": true,            // background agent-to-agent sync traffic (scaled by density)
  "memoryOps": ["semantic recall, k=12", "..."],
  "errors": ["429 rate limited", "..."]
}
```

Task lifecycle: orchestrator command (white) → lead optionally pulls context from memory (violet) → lead spawns subagents (cyan link + shockwave) → each subagent does 1–3 steps: tool call (amber, may fail red and retry), memory query (violet), handoff to a peer agent (cyan), or nested delegation → subagent returns result (green) and retires → validation (cyan to validator, may reject red) → memory commit → green result to the orchestrator.

If `tasks` is empty, one generic task per agent is generated. Leads are random when `lead` is omitted.

## 4. Mode `replay`

Plays recorded events on a timeline. Use for real runs, logs, traces, or a scripted storyline you want to land exactly.

```json
"replay": { "loop": true, "speed": 1, "events": [ ... ] }
```

`t` is seconds from the start of the replay (before `speed`). Events at equal `t` keep file order. The slider "Replay speed" multiplies on top.

Event types (`type` defaults to `msg`):

| type | fields | effect |
|---|---|---|
| `msg` | `from`, `to`, `kind` (cmd/comm/mem/tool/ok/err), `note`, `msg`, `dur` (s, default 1.1), `width`, `busy` (true or seconds: mark target busy), `silent` | one traveling energy vector; logs "Kind: A → B" unless `msg` given |
| `spawn` | `parent`, `id`, `role`, `status`, `link` (default true), `note` | subagent appears orbiting parent with shockwave; parent can be orchestrator, agent, or another subagent (nesting) |
| `retire` | `id`, `report` ("ok"/"err": send a final vector to parent first), `note` | subagent (and its children) dissolve |
| `status` | `id`, `status` (text), `busy` (true/false), `error` (flash red, counts a failure), `msg` | sets the label/roster status |
| `task` | `phase`: `start` (`id`, `name`, `lead`, `label`, `dispatch`), `update` (`id`, `label`), `end` (`id`, `ok`, `report`) | drives the Active tasks list and completed/failure counters; start sends a command vector, end sends ok/err to orchestrator |
| `log` | `kind` (cmd/comm/mem/tool/ok/err/spawn/retire/sys/sync), `msg`, `note` | log line only |

Any node referenced must be an orchestrator/agent/tool id or a subagent spawned earlier. `"orchestrator"` and `"PRIME"` always alias the orchestrator. `build.py` checks all of this.

Counters in replay: tool calls count requests whose target is a tool; memory ops count messages to the memory agent (or every `mem` message if there is no memory role); every `err` message, `status.error`, and failed task counts as a failure.

Pacing: keep 0.15–2 s between events for legibility. A 60–120 s replay is the sweet spot for a demo. Use `scripts/trace_to_replay.py --duration 90` to compress long traces.

## 5. Mode `live`

No timeline; the page waits for events. Same event objects as replay (no `t` needed):

```js
HVS.push({ type: 'msg', from: 'SCOUT', to: 'VAULT', kind: 'mem', note: 'recall' });
HVS.push([ ...many events ]);
// from a parent page embedding the visualization in an iframe:
iframe.contentWindow.postMessage({ hvs: { type: 'spawn', parent: 'SCOUT', id: 'SCOUT-1' } }, '*');
```

Also available: `HVS.dispatch(task)` (simulate mode), `HVS.clear()`, `HVS.nodes()`, `HVS.config`. These work in every mode, so a simulate page can also take injected events.

A published claude.ai artifact cannot open network connections to other sites, so live feeds only work when the page is hosted by the user (or embedded in their page that relays events via postMessage).

## 6. Visual defaults and colors

```json
"visual": { "rotation": 0.6, "pulseFrequency": 4, "propagation": 1, "density": 0.5, "glow": 1.3, "opacity": 0.75, "simSpeed": 1 },
"colors": { "cmd": "#dff4ff", "comm": "#3ee8ff", "mem": "#a77bff", "tool": "#ffb547", "ok": "#4dff9a", "err": "#ff4d6a" },
"legend": { "cmd": "Orchestrator commands", "comm": "Delegation and messages", "mem": "Memory and context",
            "tool": "Tool and API calls", "ok": "Validated results", "err": "Errors and alerts" }
```

Rename `legend` entries when the dataset isn't agents (e.g. `"tool": "Database queries"`). Keep the six kinds; they are the color system. Change `colors` only if the user asks; the hologram chrome stays cyan regardless.

## 7. Limits and gotchas

- Hundreds of simultaneous vectors are fine; thousands will drop frames on phones. In replay, avoid more than ~25 events per second.
- Subagent labels are hidden on narrow screens to reduce clutter; ids still show in the inspector.
- Long ids widen labels. Abbreviate (`payments-svc` over `payments-service-prod-eu-west-1`) and put the long form in `role`.
- The page loads three.js r128 from cdn.jsdelivr.net; it needs that host reachable.
