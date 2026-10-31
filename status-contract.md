# Agent status contract

Each owner updates only `data/<repository>.json` on branch `status`.

```json
{
  "schema_version": 1,
  "repository": "gz-sim-rs",
  "updated_at": "2026-10-24T00:00:00Z",
  "state": "active",
  "summary": "One sentence describing actual current progress.",
  "model": "Coordinator or the assigned model and reasoning effort",
  "active": [{"id": "IO-01", "title": "Clock publication", "detail": "What is being implemented or reviewed."}],
  "accepted_slices": [{"title": "Reviewed clock core", "commit": "full SHA", "url": "https://github.com/.../commit/..."}],
  "remaining": ["Concrete remaining scope"],
  "blockers": ["Only actual impediments; empty if none"],
  "plan_status": {"CORE-01": "in_progress", "IO-01": "not_started"},
  "quality": {
    "revision": "SHA or working tree",
    "rust_tests": 23,
    "coverage": {"lines": [597, 599], "regions": [867, 880]},
    "upstream": {"total": null, "ported": null, "partial": null},
    "ci": {"state": "success", "url": "https://github.com/.../actions/runs/..."},
    "note": "Coverage scope and any native or hosted limitations."
  }
}
```

`state`: active, blocked, idle, complete, unknown.
Packet states: not_started, in_progress, blocked, in_review, complete.
Every list may be empty; unknown numeric measurements are null. Coverage values
are [covered,total], separately for lines and regions; do not infer or round them.
The CI state describes the linked revision only. Use pending, failure or unknown
where appropriate. Working-tree measurements do not prove a pushed commit passed.
Use public GitHub links and concise prose. Do not publish local credentials,
private paths, tokens, raw environment variables, or private user data.

Add `quality.revision_url` only after the measured commit is publicly available.
Otherwise the revision is shown as text with publication unconfirmed. The
coordinator also owns optional `phase_status` (P0–P7) and `system_status` (the
catalog's exact system names). All use the same packet-state vocabulary.
Missing packet reports are not started for a reporting owner, or unreported if
the owner has not reported at all. Missing system entries remain not started.

From any working directory:

```sh
python3 /path/to/rewrite-progress/scripts/update-status.py gz-msgs-rs /path/to/status.json --dry-run
python3 /path/to/rewrite-progress/scripts/update-status.py gz-msgs-rs /path/to/status.json
```

Use the current UTC timestamp. The updater rejects older reports, validates
known packet IDs, retries concurrent branch updates, and changes only the named
owner's file. It uses the existing authenticated `gh` session; no credentials
belong in the data. Keep local reports in your repository's ignored artifacts.

Owner scope decisions may move repositories and packets to catalog
`retired_repositories` and `retired_packets`. Their reports remain valid historical
evidence, but retired packets do not count as completed or active release work.
The dashboard must state when its denominator changes because of scope.
