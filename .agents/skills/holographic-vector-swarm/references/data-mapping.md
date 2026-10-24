# Mapping data onto the swarm

The visual grammar is: one hub, a ring of named actors, short-lived helpers that pop out of actors, external endpoints on the rim, and colored traffic between them. Almost any "things sending things to other things over time" dataset fits. Decide the mapping first, show it to the user in a few lines, then build.

## The mapping questions

1. **What is the hub?** The coordinator, router, gateway, scheduler, HQ, or the user. If nothing is central, use a synthetic hub named after the system ("MESH", "BUS").
2. **Who are the agents?** The 3–14 long-lived actors. If the data has more, group them (by team, service family, region) and use `role` for detail.
3. **What spawns?** Anything short-lived that belongs to an actor: subagents, worker threads, jobs, pods, sub-tasks, child spans. These become `spawn`/`retire`.
4. **What is external?** APIs, databases, third-party services, sensors. These become `tools`.
5. **Which traffic kind is which color?** Map each event category onto cmd/comm/mem/tool/ok/err, then rename the legend to the dataset's own words.
6. **Is there memory or review?** A cache, knowledge base, or vector store → `roles.memory`. An approval step, QA, or policy check → `roles.validator`.

## Worked mappings

| Dataset | Hub | Agents | Spawns | Tools | Kinds |
|---|---|---|---|---|---|
| LangGraph / CrewAI / AutoGen run | supervisor node | graph nodes / crew members | sub-graph calls, delegated agents | tool functions | handoff=comm, tool=tool, retrieval=mem, final=ok, exception=err |
| OpenTelemetry trace | API gateway | services | child spans of a service | DBs, queues, external APIs | span to service=comm, DB/HTTP client spans=tool, cache=mem, status error=err |
| Incident response | incident router | responder roles | investigation sub-tasks | monitoring, deploy, ticket APIs | as in examples/support-incident-trace.csv |
| Customer support swarm | intake bot | triage, billing, tech, escalation | per-ticket workers | CRM, payments, KB search | handoff=comm, KB=mem, escalation=cmd |
| CI/CD pipeline | pipeline controller | stages | jobs within a stage | registries, clouds, scanners | trigger=cmd, artifact passing=comm, cache=mem, job pass=ok, job fail=err |
| Security operations | SOAR orchestrator | detection, enrichment, containment, reporting | playbook runs | EDR, threat intel, firewall APIs | alert=err, enrichment lookups=tool, case notes=mem |
| Org / comms network | leadership | teams | working groups | partners, vendors | request=comm, decision=cmd, deliverable=ok |

## From a file

If the user hands over a log or trace:

1. Inspect it (columns, a few rows, row count, time span).
2. Run `scripts/trace_to_replay.py` with the obvious flags (`--orchestrator`, `--tools`, `--memory`, `--validator`, `--duration`). It recognises common column names and maps free-text kinds by keyword.
3. Open the result, rename agents' `role`s, set `brand`, fix any kinds the keyword mapper guessed wrong, and trim noise (heartbeats, duplicate retries) so the replay stays legible.
4. If the source format doesn't fit the converter (nested JSON spans, multiple files), write a short one-off Python transform to the event format in `config-schema.md` instead of forcing it.

## Honesty

If the user's real data is summarized, sampled, compressed in time, or padded with synthetic events, say so in `brand.badge` (e.g. "Replay · time-compressed 40×"). Never label simulated data as live.
