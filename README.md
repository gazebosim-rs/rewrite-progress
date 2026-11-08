# Gazebo Rust rewrite progress

Live dashboard for the rewrite across gazebosim-rs. The implementation plan is in
[gz-sim-rs](https://github.com/gazebosim-rs/gz-sim-rs/blob/main/docs/PLAN.md).

Open the [live dashboard](https://gazebosim-rs.github.io/rewrite-progress/).
GitHub Pages serves `main` from the repository root. Reports on `main` are initial
snapshots only; the dashboard always reads the current `status` branch.

Dashboard source and the work-packet catalog live on `main`. Repository agents
publish their own `data/<repository>.json` to the separate `status` branch using
`scripts/update-status.py`. The dashboard reads those public files on load and
refreshes once per minute while visible. GitHub's cache can delay propagation;
reported timestamps and stale-state warnings remain visible.

`accepted_slices` records reviewed increments. A slice does not complete its broad
plan packet. `plan_status` may say `complete` only when the packet's documented
acceptance evidence is met. Coverage is a quality measurement, not rewrite progress.
Fuel has an independent owner; unknown status is displayed as unknown.

The top progress bar counts accepted named deliveries from `data/delivery.json`
on `main`. These short deliveries are distinct from historical P0–P7 gates.
Missing schedule data shows an unavailable state. Each phase is budgeted at
most five working days, including review and mandatory checks. No milestone is
accepted from its presence in the plan or from older headless evidence.

The coordinator owns the mirrored weekly plan `data/delivery.json` and the dated
schema-2 `data/forecast.json` on `main`. Canonical scope is in gz-sim-rs
`docs/DELIVERY_PLAN.md` and `planning/delivery-phases.json`. Keep both plan copies
synchronized when accepting a milestone or changing scope. `target_working_days`
is a 1–5 day scope budget after explicit resume, not a guaranteed countdown or a
whole-rewrite estimate. `execution_state` makes a pause explicit. Reassess after
the first day of real browser integration and each significant milestone. A
failed refresh preserves last-good data with an explicit warning. Estimates over
30 days old are flagged. The full rewrite has no scheduled completion date.

See [agent update instructions](AGENTS.md) and [the data contract](status-contract.md).

Copyright (C) 2026 Open Source Robotics Foundation. Licensed under
[Apache License 2.0](LICENSE); see [NOTICE](NOTICE).
