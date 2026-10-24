# Example flows

Read these when you want a model for pinned layouts, branch labels, or loops.

## Pinned grid layout (recreating an existing infographic)

Every step has `@col,row`. Columns and rows can be fractional (1.5 centers a
step between two columns). Use this when the user shares an image and wants
the same arrangement.

```
title: How Instagram Reels algorithm works
reel: Post a reel | 📱 | @0,0
show100: Show it to 100 people | 📸 | system | @1.5,0
watch1: They watch till end | 📺 | @1,1
skip1: They don’t watch till end | 🙁 | @2,1
more: Show it to more people | 📸 | system | @1,2
reduce: Reduces your reach | 📉 | system | @2,2
watch2: They watch till end | 📺 | @1,3
skip2: They don’t watch till end | 🙁 | @2,3
explore: Put you on Explore page | 🔥 | system | @0,2
grow: You grow | 👏 | @0,1
reel -> show100
show100 -> watch1
show100 -> skip1
watch1 -> more
skip1 -> reduce
more -> watch2
more -> skip2
skip2 -> reduce
watch2 -> explore
explore -> grow
grow -> reel
```

## Auto layout with labelled branches and a retry loop

No positions: steps are arranged top to bottom automatically, and the loop
back (`reject -> apply`) is routed around the outside of the chart.

```
title: How a job application moves
apply: You apply | 📨
ats: Screening software scans it | 🤖 | system
match: Keywords match | ✅
miss: Keywords miss | 🙁
recruiter: Recruiter reviews | 👀 | system
interview: You interview | 🎤
offer: You get an offer | 🎉
reject: Rejection email | 📭 | system
apply -> ats
ats -> match
ats -> miss
match -> recruiter
miss -> reject
recruiter -> interview: Good fit
recruiter -> reject: Not now
interview -> offer
interview -> reject
reject -> apply: Try again
```

## Engineering process

```
title: How a pull request gets merged
open: Open a pull request | 🧑‍💻
ci: Tests run | ⚙️ | system
pass: Tests pass | ✅
fail: Tests fail | ❌
review: Teammate reviews | 👀
approve: Approved | 👍
changes: Changes requested | ✏️
merge: Merged to main | 🚀 | system
open -> ci
ci -> pass
ci -> fail
fail -> open: Fix and push
pass -> review
review -> approve
review -> changes
changes -> open
approve -> merge
```

## Pinned snake layout with an outside loop (Claude Cowork)

Columns spaced 0 / 1.45 / 2.9. The flow snakes right, left, right; the long
"Ask for changes" loop links two steps in the right column, so it is routed
around the outside edge instead of through the chart.

```
title: How Claude Cowork builds a spreadsheet
folder: Pick a working folder | 📁 | @0,0
ask: Describe the spreadsheet | 💬 | @2.9,0
plan: Claude proposes a plan | 🗺️ | system | @2.9,1
review: You review the plan | 👀 | @1.45,1
read: Claude reads your files | 📄 | system | @0,1
build: Builds tabs, formulas, charts | 📊 | system | @0,2
check: Checks its own work | 🔍 | system | @1.45,2
saved: Saves the .xlsx file | 💾 | system | @2.9,2
open: You open and review | 🧐 | @2.9,3
excel: Tweak in Claude in Excel | 🧩 | @1.45,3
done: Ready to share | ✅ | @1.45,4
folder -> ask
ask -> plan
plan -> review
review -> read: Approve
review -> ask: Change it
read -> build
build -> check
check -> saved: Looks right
check -> build: Fix errors
saved -> open
open -> done: Good to go
open -> excel: Small tweaks
open -> ask: Ask for changes
excel -> done
```
