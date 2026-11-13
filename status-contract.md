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

## Weekly deliveries (D30)

P0–P7 `phase_status` remains historical/long-term acceptance evidence. The current
M1–M12 schedule and its acceptance states live separately in coordinator-owned
`data/delivery.json` on `main`, mirrored from gz-sim-rs's
`planning/delivery-phases.json`. This file uses `execution_state` (`paused` or
`active`), `current_phase`, and `status` with the packet-state vocabulary. Every
phase has `max_working_days` between one and five, scope, acceptance and explicit
exclusions. No acceptance transfers automatically from an old phase or packet.
The forecast schema 2 contains a dated next-delivery target, not months to the
whole rewrite. A planning update does not reactivate execution.

When every scheduled phase is accepted, the dashboard shows that the next
delivery is unselected. The retained working-day budget does not schedule an
additional phase or imply that the full rewrite is complete. A later delivery
needs a named scope in the schedule before the forecast target is shown again.

## Current board (2026-11-13 owner correction)

The main board answers **Now / Done / Next**, followed by one release blocker.
`data/delivery.json` may include a coordinator-owned `board` object with a dated
`current` title and items, `done` and `next` lists, a `blocker` text/link, and a
stable `history_url`. Each list has at most four items of at most 240 characters;
the title is at most 120 characters and the blocker at most 300. Use plain
sentences and distinguish locally verified work from accepted releases.

Replace current summaries when facts change. Never prepend a new checkpoint to
an old summary, scope, detail, quality note or forecast. Put detailed proof in
linked repository records; Git history retains old reports. Keep accepted slices,
other owners' reports and broad compatibility states intact. Historical schedules,
repository evidence and the full backlog stay collapsed on the main page.

For `gz-sim-rs`, keep the summary under 240 characters, at most three active cards
with details under 450 characters, at most three blockers under 300 characters,
at most eight remaining items under 240 characters, and the quality note under
600 characters. These limits apply only to the coordinator's current prose; they
do not delete accepted evidence or rewrite other owners' records. A forecast's
`as_of` is a calendar date (`YYYY-MM-DD`), not a timestamp.
