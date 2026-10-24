---
name: holographic-vector-swarm
description: Build an interactive 3D "Holographic Vector Swarm" (HVS) visualization — a translucent cyan holographic orchestrator sphere with orbiting agents, spawning and retiring subagents, tool endpoints, and continuous pulsing energy-vector beams (not particles) color-coded by traffic type, plus live telemetry, event log, inspector and working controls — from any agent swarm or relationship/event dataset. Use this whenever the user wants to visualize a multi-agent system, AI orchestration, agent swarm, subagents spawning, an agentic workflow, an LLM/agent trace or log (LangGraph, CrewAI, AutoGen, OpenTelemetry spans), or any hub-and-actors event stream (incidents, microservices, pipelines, SOC playbooks) as a futuristic sci-fi command-center or hologram, even if they don't say "HVS", "Three.js" or "holographic". Also use when they want a demo/pitch animation of a fictional AI framework, or to replay or live-stream real agent events into that kind of view.
---

# Holographic Vector Swarm

A reusable, config-driven Three.js page. You never rewrite the 3D engine per request: you write one JSON config, build it into the template, check it, and deliver it.

```
assets/hvs-template.html        the engine (bloom, shader beams, labels, dashboard, controls)
scripts/build.py                validates a config and injects it into the template
scripts/trace_to_replay.py      CSV / JSON / JSONL event trace → replay config
references/config-schema.md     every config field and event type (read before writing a config)
references/data-mapping.md      how to map non-agent datasets onto the swarm
examples/glass-lantern.json     fictional 7-agent framework, simulate mode
examples/support-incident-*     a sample trace and the replay config built from it
```

## Pick a mode

- **simulate**: synthetic, endless and randomized. Use it for demos, pitches, and fictional frameworks, or when the user only describes their swarm in words. Tasks dispatch automatically. The lead agent spawns subagents, and those subagents call tools, query memory, and hand off to peers. Tool calls sometimes fail and retry, a validator can reject work, and results then flow back to the hub.
- **replay**: a timeline of recorded events. Use it when the user has real data (logs, traces, a run transcript), or when the story must play out exactly as scripted.
- **live**: an empty swarm that waits for `HVS.push(event)` or `postMessage`. Use it when the user wants to wire the view to their own system. The browser hosting the page needs network access to their source, which a published claude.ai artifact doesn't have. Say so, and give them the file to host.

## Workflow

1. **Understand the swarm or dataset.** Pin down the hub, the long-lived agents (3–14), what spawns, the external tools, and which traffic maps to which of the six colors. For data that isn't about agents, follow `references/data-mapping.md`. If the user's message already answers these, don't ask. When something essential is missing, ask one question. When only flavor is missing (names, tasks), invent plausible content and label it fictional.
2. **Read `references/config-schema.md`** and write the config to `/home/claude/<slug>.json`. Start from an example when one is close.
   - For a real trace, run the converter first:
     `python scripts/trace_to_replay.py TRACE --orchestrator HUB --tools A,B --memory KB --validator QA --duration 90 --out cfg.json`
     Then edit the result: set the brand, give agents real `role`s, fix any kinds the converter misjudged, and drop noise.
3. **Build:** `python scripts/build.py cfg.json /mnt/user-data/outputs/<slug>.html`. Fix every `error:` and read every `warning:`.
4. **Deliver.** Where the Artifact tool exists, publish the built HTML (favicon 🛰️) and keep the reply short. Say what the mapping is, what the colors mean, and what to try (Dispatch, Spawn burst, tap a node). Otherwise call `present_files`. If the user also wants the raw config, present that too.
5. **Iterate.** For content changes, edit the JSON and rebuild, then republish to the same artifact URL. Don't hand-edit the built page.

Scripts live under this skill's folder. Copy them to `/home/claude` if the skill directory is read-only. They need only Python 3 and the standard library.

## Writing good configs

- **Names do the storytelling.** Short uppercase agent ids (`SCOUT`, `TRIAGE`) read cleanly as hologram labels. Put the detail in `role`. Tool `verbs` and task names show up in the event log, so make them specific to the domain ("pull SAR tiles", "roll back payments-svc").
- **Use `roles`.** They turn on behaviors: `memory` gets violet context traffic, `validator` gets the review and reject loop, and `toolRunner` anchors the amber tool links. Skip any role that doesn't fit the data.
- **Keep the six vector kinds:** cmd (white-blue), comm (cyan), mem (violet), tool (amber), ok (green), err (red). For domains that aren't agents, rename them in `legend` rather than inventing new kinds.
- **Tune the simulation to the story.** For a calm system, lower `toolFailRate` and `rejectRate` and use fewer subagents. For a dramatic one, raise `subagents` and `nestedRate`.
- **Pace replays for a human.** Aim for 60–120 s total and 0.15–2 s between events. Compress long traces with `--duration`, or with `replay.speed`.
- **Be honest about the data.** Keep `brand.badge` accurate: "Simulation · synthetic data" for invented data, or a statement of what the replay is and whether it's time-compressed or sampled.

## When the user wants something the config can't do

Make small visual tweaks, such as a different palette, extra header text, or another dashboard tile, in a copy of the template, and keep the engine's structure intact. Bigger departures are a new build. Examples: a 2D view, a completely different layout, or particles instead of beams. Reuse the beam shader (`BEAM_VS`/`BEAM_FS`: a quadratic bezier tube built in the vertex shader, with a Gaussian crest, a trailing tail, and periodic ambient waves) and the fresnel material, because those carry the look.

Publishing constraints the template already satisfies (keep them if you modify it): scripts only from cdn.jsdelivr.net, fonts from Google Fonts, no other network calls, three.js r128 UMD builds, and safe-area and mobile layout with bottom tabs.
