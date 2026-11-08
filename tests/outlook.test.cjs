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
  const element = () => ({
    textContent: "", addEventListener() {}, append() {}, replaceChildren() {},
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
nextFixture.status.NEXT_FIXTURE = "not_started";
assert.match(render(nextFixture, outlook).elements.get("forecast-range").textContent, /^≤5 working days to next delivery$/);

for (const invalid of [{...outlook, target_working_days: 6}, {...outlook, confidence: "Unknown"}]) {
  assert.throws(() => render(unfinished, invalid), /Invalid forecast/);
}
assert.throws(() => render({...schedule, execution_state: "complete"}, outlook), /Invalid delivery plan/);
console.log("Outlook completion, active, paused, missing-data and later-scope controls passed.");
