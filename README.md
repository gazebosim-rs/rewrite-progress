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

See [agent update instructions](AGENTS.md) and [the data contract](status-contract.md).

Licensed under [Apache License 2.0](LICENSE).
