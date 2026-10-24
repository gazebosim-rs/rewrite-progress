# Maintaining the progress tracker

The user requested an online tracker and instructed repository agents to update it.

- The coordinator owns dashboard code, the plan catalog, and gz-sim-rs status.
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
