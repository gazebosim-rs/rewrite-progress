"use strict";

const STATUS_ROOT = "https://raw.githubusercontent.com/gazebosim-rs/rewrite-progress/status/data/";
const labels = {active: "Active", idle: "Idle", unknown: "Unreported", in_progress: "In progress", in_review: "In review", not_started: "Not started", blocked: "Blocked", complete: "Accepted", success: "Passed", failure: "Failed", pending: "Pending"};
const reports = new Map();
let catalog;
let fetching = false;
const $ = id => document.getElementById(id);
const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
const tag = state => node("span", labels[state] || state, `tag ${state}`);
function link(text, href) {
  const el = node("a", text);
  if (typeof href === "string" && href.startsWith("https://github.com/gazebosim-rs/")) el.href = href;
  return el;
}
function counts(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && value[1] > 0 ? `${(100 * value[0] / value[1]).toFixed(2)}%` : "Unreported";
}
function packetState(packet) {
  const report = reports.get(packet.owner);
  return !report || report.state === "unknown" ? "unknown" : report.plan_status[packet.id] || "not_started";
}
function timestamp(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"}) : "Unknown time";
}
function renderOverview() {
  const phases = reports.get("gz-sim-rs")?.phase_status || {};
  const states = catalog.packets.map(packetState);
  const complete = states.filter(state => state === "complete").length;
  const active = states.filter(state => ["in_progress", "in_review"].includes(state)).length;
  const doneSystems = catalog.systems.filter(system => reports.get("gz-sim-rs")?.system_status?.[system.name] === "complete").length;
  const values = [
    [Object.values(phases).filter(s => s === "complete").length, `/ ${catalog.phases.length}`, "Phase gates accepted"],
    [complete, `/ ${catalog.packets.length}`, "Plan packets accepted"],
    [active, "", "Plan packets in progress or review"],
    [[...reports.values()].reduce((sum, report) => sum + report.accepted_slices.length, 0), "", "Reviewed increments reported"],
    [doneSystems, `/ ${catalog.systems.length}`, "Simulator systems migrated"]
  ];
  $("metrics").replaceChildren(...values.map(([value, suffix, caption]) => {
    const box = node("div", undefined, "metric"), number = node("strong", String(value));
    number.append(node("span", ` ${suffix}`)); box.append(number, node("p", caption)); return box;
  }));
  $("phases").replaceChildren(...catalog.phases.map(phase => {
    const state = phases[phase.id] || "unknown", el = node("div", undefined, `phase ${state}`);
    el.title = `${phase.scope}\nAcceptance: ${phase.acceptance}`;
    el.append(node("span", phase.id, "code"), node("strong", phase.title), tag(state)); return el;
  }));
  $("system-summary").textContent = `${catalog.systems.length} simulator systems · ${doneSystems} migrated · ${catalog.systems.length - doneSystems} remaining`;
  $("systems").replaceChildren(...catalog.systems.map(system => {
    const box = node("div", undefined, "system"), state = reports.get("gz-sim-rs")?.system_status?.[system.name] || "not_started";
    box.append(link(system.name, `https://github.com/gazebosim-rs/gz-sim-rs/blob/${catalog.source_revision}/planning/system-migration.json`), node("span", system.family, "muted"), tag(state)); return box;
  }));
}
function renderActive() {
  const cards = [];
  for (const name of catalog.repositories) {
    const report = reports.get(name);
    for (const work of report?.active || []) {
      const card = node("article", undefined, "work");
      card.append(node("p", name, "eyebrow"), node("h3", work.title), node("p", work.detail), node("p", work.id, "work-id")); cards.push(card);
    }
  }
  $("active-work").replaceChildren(...(cards.length ? cards : [node("p", "No active work has been reported yet.", "muted")]));
}
function detail(title, items, render) {
  const el = node("details"), list = node("ul");
  el.append(node("summary", `${title} (${items.length})`));
  for (const item of items) { const li = node("li"); li.append(render(item)); list.append(li); }
  el.append(list); return el;
}
function renderRepos() {
  $("repo-grid").replaceChildren(...catalog.repositories.map(name => {
    const report = reports.get(name), card = node("article", undefined, "repo"), top = node("div", undefined, "repo-top"), title = node("h3");
    title.append(link(name, `https://github.com/gazebosim-rs/${name}`)); top.append(title, tag(report?.state || "unknown")); card.append(top);
    if (!report) { card.append(node("p", "Report unavailable. See the status history or refresh to retry.", "summary")); return card; }
    card.append(node("p", report.summary, "summary"));
    const stale = Date.now() - Date.parse(report.updated_at) > 24 * 3600_000;
    card.append(node("div", `Updated ${timestamp(report.updated_at)}${stale ? " · Over 24 hours old" : ""}`, `timestamp${stale ? " stale" : ""}`), node("div", report.model, "owner"));
    const quality = report.quality || {}, metrics = node("div", undefined, "quality");
    for (const [value, label, raw] of [[quality.rust_tests ?? "—", "Rust tests in reported run", null], [counts(quality.coverage?.lines), "Owned line coverage", quality.coverage?.lines], [counts(quality.coverage?.regions), "Owned region coverage", quality.coverage?.regions]]) {
      const cell = node("div"); cell.append(node("strong", String(value)), node("span", label)); if (raw) cell.title = `${raw[0]} / ${raw[1]}`; metrics.append(cell);
    }
    card.append(metrics);
    const evidence = node("div", undefined, "evidence"), ci = quality.ci || {state: "unknown"};
    evidence.append(node("span", "CI:"), tag(ci.state));
    if (ci.url) evidence.append(link("View run ↗", ci.url));
    if (quality.revision_url) evidence.append(link(`Evidence ${quality.revision?.slice(0, 7) || "revision"} ↗`, quality.revision_url));
    else if (/^[a-f0-9]{40}$/.test(quality.revision)) evidence.append(node("span", `Measured ${quality.revision.slice(0, 7)} · publication unconfirmed`, "muted"));
    else if (quality.revision) evidence.append(node("span", quality.revision, "muted"));
    card.append(evidence, node("p", quality.note || "No quality evidence reported.", "quality-note"));
    const upstream = quality.upstream;
    if (upstream?.total !== null && upstream?.total !== undefined) card.append(node("p", `Upstream inventory: ${upstream.total} cases · fully ported: ${upstream.ported ?? "unreported"} · partial: ${upstream.partial ?? "unreported"}. Native reference passes do not imply Rust parity.`, "quality-note"));
    if (report.blockers.length) card.append(node("p", `Blockers: ${report.blockers.join(" · ")}`, "blockers"));
    card.append(detail("Reviewed increments", report.accepted_slices, item => link(item.title, item.url)), detail("Remaining scope", report.remaining, item => node("span", item)));
    return card;
  }));
}
function renderPackets() {
  const search = $("search").value.toLowerCase(), owner = $("repo-filter").value, filter = $("state-filter").value;
  const visible = catalog.packets.filter(packet => {
    const state = packetState(packet);
    return (owner === "all" || owner === packet.owner) && (filter === "all" || (filter === "remaining" ? state !== "complete" : state === filter)) && `${packet.id} ${packet.title} ${packet.acceptance} ${packet.owner}`.toLowerCase().includes(search);
  });
  $("packets").replaceChildren(...visible.map(packet => {
    const row = node("tr"), title = node("td"), owner = node("td"), state = node("td");
    title.append(node("strong", packet.id), node("span", packet.title)); owner.append(node("span", packet.owner), node("small", packet.phase)); state.append(tag(packetState(packet)));
    const acceptance = node("td", packet.acceptance); acceptance.append(node("small", `Depends on: ${packet.depends_on}`)); row.append(title, owner, state, acceptance); return row;
  }));
  $("packet-count").textContent = `${visible.length} of ${catalog.packets.length} packets`;
  $("empty-filter").hidden = visible.length > 0;
}
async function json(url) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15_000);
  try { const response = await fetch(url, {cache: "no-store", signal: controller.signal}); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json(); }
  finally { clearTimeout(timeout); }
}
async function refresh() {
  if (fetching) return;
  fetching = true; $("refresh").disabled = true; $("sync-status").textContent = "Checking public reports…";
  try {
    if (!catalog) {
      catalog = await json("data/catalog.json"); $("catalog-source").href = catalog.source_url;
      for (const name of catalog.repositories) { const option = node("option", name); option.value = name; $("repo-filter").append(option); }
    }
    const failures = [];
    await Promise.all(catalog.repositories.map(async name => {
      try {
        const report = await json(`${STATUS_ROOT}${name}.json?t=${Math.floor(Date.now() / 60_000)}`);
        if (report.schema_version !== 1 || report.repository !== name || !Array.isArray(report.active) || !Array.isArray(report.remaining) || !Array.isArray(report.accepted_slices) || !Array.isArray(report.blockers) || typeof report.plan_status !== "object") throw new Error("Invalid report");
        reports.set(name, report);
      } catch { failures.push(name); }
    }));
    $("notice").hidden = failures.length === 0;
    $("notice").textContent = failures.length ? `Could not refresh ${failures.join(", ")}. Previously loaded reports, if available, are retained with their original timestamps. Refresh to retry.` : "";
    renderOverview(); renderActive(); renderRepos(); renderPackets();
    $("sync-status").textContent = `Checked ${timestamp(new Date().toISOString())} · ${catalog.repositories.length - failures.length}/${catalog.repositories.length} reports fetched`;
  } catch { $("notice").hidden = false; $("notice").textContent = "The plan catalog could not be loaded. Refresh to retry, or open the linked implementation plan."; $("sync-status").textContent = "Refresh failed"; }
  finally { fetching = false; $("refresh").disabled = false; }
}
$("refresh").addEventListener("click", refresh);
for (const id of ["search", "repo-filter", "state-filter"]) $(id).addEventListener("input", () => { if (catalog) renderPackets(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, 60_000);
refresh();
