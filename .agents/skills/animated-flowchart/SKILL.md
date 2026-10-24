---
name: animated-flowchart
description: Turn any process, workflow, algorithm, funnel, decision tree or "how X works" explanation into an animated, branching flowchart page in the style of a social-media explainer infographic (rounded boxes with emoji, blue for what a person does, orange for what a system does, a glowing token that walks the arrows and takes a different branch each run). Use this whenever the user asks to visualize, animate, diagram or "make a flowchart of" a process or operation, shares an image of a flowchart or process infographic and wants it recreated or animated, or asks how something step-by-step works and wants to see it, even if they don't say "flowchart" or "animated".
---

# Animated flowchart

This skill produces a single self-contained HTML page: a heading, the
flowchart, a live caption naming the current step, playback controls
(pause, next step, restart, speed, zoom), an optional editor so the viewer
can change the steps or generate a new chart from a description, and a
"Save as SVG" button. All rendering, layout and animation live in
`assets/template.html`; your job is to write the flow and build the page.

## Workflow

1. **Understand the process.** Identify where it starts, the steps, every
   point where outcomes split, where paths end, and whether anything loops
   back. If the user shared an image, transcribe its boxes and arrows
   faithfully, including their arrangement.
2. **Write the flow file** (format below) to `/home/claude/flow.txt`.
3. **Build the page:**
   ```bash
   python /path/to/animated-flowchart/scripts/build.py /home/claude/flow.txt /mnt/user-data/outputs/<slug>.html
   ```
   Add `--no-builder` when the user wants only the chart (for embedding or
   presenting) rather than a tool they can reuse. Fix any `error:` lines and
   reconsider any `warning:` lines, then rebuild.
4. **Deliver it.** Publish the HTML as a web artifact if an artifact
   publishing tool is available (declare the `sample` capability so the
   "Generate flowchart" button works, and `downloads` for "Save as SVG");
   otherwise present the file. If neither capability is available, the page
   hides those buttons on its own and the hand editor still works.
5. **Summarize briefly**: what the chart shows and how to change it.

## Flow format

One line per item. Lines starting with `#` are ignored.

```
title: How Instagram Reels algorithm works
reel: Post a reel | 📱
show: Show it to 100 people | 📸 | system
watch: They watch till end | 📺
skip: They don’t watch till end | 🙁
reel -> show
show -> watch: Hooked
show -> skip: Scrolled past
```

- `title: …` is the big heading. Keep it under ~8 words.
- `legend: Blue meaning | Orange meaning` (optional) relabels the color key.
  The default is "Something a person does | Something the system does";
  change it whenever blue/orange mean something else, such as a lineage or
  history chart ("Later denomination | Original Reformation stream").
- Charts aren't limited to processes: family trees, lineages and timelines
  work too. Put dates in labels, and use edge labels for the person or
  event that caused each split.
- `id: Label | emoji | system | @col,row` defines a step. Only the label is
  required; the other parts can go in any order.
  - `id`: lowercase letters, digits, hyphens. Never shown.
  - Label: 2–6 words, sentence case (the chart uppercases it). Short labels
    keep boxes compact and legible on phones.
  - Emoji: one that pictures the step. It also appears big in the caption.
  - `system`: orange border, for steps an app, platform, machine or
    organization performs. Leave it off for what the person does (blue).
  - `@col,row`: pin to a grid spot (fractional allowed). Pin every step or
    none; mixed pinning falls back to auto layout.
- `from -> to` draws an arrow; `from -> to: Label` adds a small pill label.
  Label arrows that leave a decision so the branches read clearly.
- **The first step defined is where the animation starts.** Make sure it has
  an outgoing arrow.

## Design choices that make good charts

- **5–12 steps.** Fewer feels trivial; more gets cramped on a phone. For a
  big process, chart the core loop and mention the rest in prose.
- **Show branches.** The animation round-robins through outgoing arrows, so
  every branch gets played eventually. A process with no branches still
  works but loses the most interesting part.
- **Close loops.** If success feeds back into the start ("You grow → Post a
  reel"), add that arrow; the token returns to the start and the caption
  says the loop repeats. Loop-back arrows are routed around the outside.
- **Dead ends are fine** for terminal outcomes (rejection, churn, reduced
  reach). The caption shows "End of this path".
- **Auto layout vs. pinning.** Auto layout (top to bottom, branches side by
  side) suits new charts. Pin positions only when matching an existing
  image or when the user asks for a specific arrangement. With pins, about
  3 columns fits phones well; space columns ~1.45 apart (0, 1.45, 2.9) so
  short pipes and their labels have room. A pinned arrow that would cut
  through another step is routed around the outside automatically, so put
  steps joined by long loops in an outer column (as with "Ask for changes"
  in `references/examples.md`).
- Use typographic apostrophes in labels (don’t, it’s).

See `references/examples.md` for three complete flows: a pinned layout
recreating an infographic, and two auto-layout flows with branch labels and
loops.

## Changing the page itself

Only edit `assets/template.html` (or the built page) when the user asks for
something the flow format can't express, such as different colors, fonts,
or behavior. Colors are CSS variables on `:root` with dark-mode values;
node sizing constants are `W`, `PX` and `LH` in the script. Keep the
`/*__FLOW__*/null` and `/*__BUILDER__*/true` markers intact so `build.py`
keeps working.
