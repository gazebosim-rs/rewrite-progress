# Maintaining the progress tracker

The user requested an online tracker and instructed repository agents to update it.

- The coordinator owns dashboard code, the plan catalog, and gz-sim-rs status.
- License original project code and documentation under Apache-2.0. Preserve
  third-party license and attribution notices when importing material.
- New source files use `Copyright (C) YEAR Open Source Robotics Foundation` and
  `SPDX-License-Identifier: Apache-2.0`, after any shebang. Use the creation year;
  preserve imported notices and years. Include LICENSE and NOTICE in distributions.
- Each repository agent owns only its own status file on branch `status`.
- Update when starting a new bounded task, completing a reviewed slice, discovering
  or clearing a blocker, or materially changing test/coverage/CI evidence.
- Follow status-contract.md. Keep current work, accepted increments, and remaining
  scope distinct. Never use code coverage or commit counts as a completion percentage.
- Broad plan packets remain in progress until all their acceptance criteria pass.
- Preserve other owners' records. Use the updater instead of editing shared Git state.
- Run `python3 scripts/update-status.py <repository> <status-json> --dry-run`, then
  the same command without `--dry-run` to publish. Network permission may be needed.
- Do not modify the Fuel implementation. Its owner reports its own status.
- Write summaries, details and remaining scope as plain sentences that the owner
  and the next agent can read; do not use compressed shorthand or internal IDs.

- The coordinator also owns `data/forecast.json` on `main`. Keep the dated time
  forecast separate from accepted phase counts; reassess after significant
  milestones, scope changes or a material change in delivery rate. Never infer
  an engineering completion percentage from elapsed time.

- D30 replaces the full-rewrite-first forecast with weekly deliveries M1–M12.
  Coordinator owns `data/delivery.json`, mirrored from gz-sim-rs
  `planning/delivery-phases.json`. Each budget is 1–5 working days including
  review and required checks. Keep original P0–P7 status and evidence separate.
  No M1 acceptance without an actual live Rapier/gzweb-rs run.
- Planning updates do not resume paused agents or the continuation automation.
  Forecast schema 2 targets the next runnable MVP after explicit resume; do not
  display the retired 4–8 month whole-rewrite forecast as the next delivery.
