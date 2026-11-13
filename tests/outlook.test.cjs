// Copyright (C) 2026 Open Source Robotics Foundation
// SPDX-License-Identifier: Apache-2.0
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const schedule = JSON.parse(fs.readFileSync(path.join(root, "data/delivery.json")));
const outlook = JSON.parse(fs.readFileSync(path.join(root, "data/forecast.json")));

function render(plan, forecast) {
  const elements = new Map();
  const element = tagName => ({
    tagName, children: [], textContent: "", addEventListener() {},
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; }
  });
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    createElement: element, addEventListener() {}, hidden: true
  };
  const context = vm.createContext({
    document, AbortController,
    // The production refresh starts, but its fetch and timers never perform IO.
    fetch: () => new Promise(() => {}),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0
  });
  vm.runInContext(source, context, {filename: "app.js", timeout: 1000});
  vm.runInContext(`delivery = validateDelivery(${JSON.stringify(plan)}); forecast = ${forecast ? `validateForecast(${JSON.stringify(forecast)})` : "undefined"}; renderOutlook();`, context, {timeout: 1000});
  return {elements, context};
}

const accepted = JSON.parse(JSON.stringify(schedule));
for (const phase of accepted.phases) accepted.status[phase.id] = "complete";
const total = accepted.phases.length;
const current = render(accepted, outlook);
assert.equal(current.elements.get("phase-count").textContent, `${total} / ${total}`);
assert.equal(current.elements.get("forecast-range").textContent, "Next delivery unselected");
assert.match(current.elements.get("delivery-state").textContent, /All scheduled deliveries accepted/);
assert.match(current.elements.get("forecast-detail").textContent, /does not measure completion of the full rewrite/);

const noForecast = render(accepted, undefined);
assert.equal(noForecast.elements.get("forecast-range").textContent, "Next delivery unselected");

const unfinished = JSON.parse(JSON.stringify(accepted));
unfinished.status.M12 = "in_progress";
unfinished.execution_state = "active";
const active = render(unfinished, outlook);
assert.equal(active.elements.get("phase-count").textContent, `${total - 1} / ${total}`);
assert.match(active.elements.get("forecast-range").textContent, /^≤5 working days to next delivery$/);
assert.match(active.elements.get("delivery-state").textContent, /Implementation active/);

unfinished.execution_state = "paused";
assert.match(render(unfinished, outlook).elements.get("delivery-state").textContent, /Implementation paused/);
assert.equal(render(unfinished, undefined).elements.get("forecast-range").textContent, "Estimate unavailable");

const nextFixture = JSON.parse(JSON.stringify(accepted));
nextFixture.phases.push({...nextFixture.phases[0], id: "NEXT_FIXTURE", title: "Test fixture only"});
nextFixture.current_phase = "NEXT_FIXTURE";
nextFixture.execution_state = "active";
nextFixture.status.NEXT_FIXTURE = "not_started";
assert.match(render(nextFixture, outlook).elements.get("forecast-range").textContent, /^≤5 working days to next delivery$/);

for (const invalid of [{...outlook, target_working_days: 6}, {...outlook, confidence: "Unknown"}]) {
  assert.throws(() => render(unfinished, invalid), /Invalid forecast/);
}
assert.throws(() => render({...schedule, execution_state: "complete"}, outlook), /Invalid delivery plan/);
assert.equal(render(unfinished, outlook).elements.get("forecast-range").textContent, "Development paused");

const boardFixture = JSON.parse(JSON.stringify(schedule));
boardFixture.execution_state = "paused";
boardFixture.board = {
  updated_at: "2026-11-13T00:00:00Z",
  current: {title: "M_TEST · Current capability", items: ["Development paused.", "Existing verification may finish."]},
  done: ["Accepted capabilities shipped.", "Local work not released."],
  next: ["Complete hosted qualification."],
  blocker: {text: "Hosted setup blocked.", url: "https://github.com/gazebosim-rs/gz-sim-rs/actions"},
  history_url: "https://github.com/gazebosim-rs/rewrite-progress/commits/status/"
};
const concise = render(boardFixture, outlook);
vm.runInContext("renderBoard()", concise.context);
const text = element => [element.textContent, ...element.children.map(text)].join(" ");
assert.match(text(concise.elements.get("board-current")), /M_TEST/);
assert.match(text(concise.elements.get("board-current")), /paused/);
assert.match(text(concise.elements.get("board-done")), /Accepted capabilities/);
assert.match(text(concise.elements.get("board-done")), /not released/);
assert.match(text(concise.elements.get("board-next")), /hosted qualification/);
assert.equal(concise.elements.get("deliveries").children.length, schedule.phases.filter(phase => schedule.status[phase.id] !== "complete").length);
assert.equal(concise.elements.get("accepted-deliveries").children.length, schedule.phases.filter(phase => schedule.status[phase.id] === "complete").length);
for (const card of concise.elements.get("deliveries").children) {
  assert.equal(card.children.at(-1).tagName, "details");
  assert.equal(card.children.some(child => child.tagName === "p"), false, "long phase history must stay inside details");
}
const missing = JSON.parse(JSON.stringify(boardFixture)); delete missing.board;
const fallback = render(missing, outlook); vm.runInContext("renderBoard()", fallback.context);
assert.match(text(fallback.elements.get("board-current")), /unavailable/);
assert.equal(fallback.elements.get("board-blocker").hidden, true);
const boundary = JSON.parse(JSON.stringify(boardFixture)); boundary.board.current.items.push("one", "two");
assert.doesNotThrow(() => render(boundary, outlook), "four concise items are allowed");
const overlong = JSON.parse(JSON.stringify(boardFixture)); overlong.board.current.items.push("one", "two", "three");
assert.throws(() => render(overlong, outlook), /Invalid current board/);
const wrongDate = {...outlook, as_of: "2026-11-13T00:00:00Z"};
assert.throws(() => render(unfinished, wrongDate), /Invalid forecast/);
console.log("Outlook states, concise board, separate release status, collapsed history and malformed-current-data controls passed.");
