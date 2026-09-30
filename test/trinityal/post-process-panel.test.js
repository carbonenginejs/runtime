import assert from "node:assert/strict";
import test from "node:test";
import { createEffectFields, createPostProcessPanel } from "./webgpu/demo/postProcessPanel.js";
import { Tr2PostProcess2, Tr2PPDynamicExposureEffect, Tr2PPBloomEffect } from "../../npm/dist/trinity/index.js";

// Only the DOM surface used by the real panel; no browser or GPU is started.
class Element
{
  constructor(tag, document) { this.tagName = tag; this.document = document; this.children = []; this.listeners = new Map(); this.parentElement = null; this._text = ""; }
  set textContent(value) { this._text = value; this.replaceChildren(); }
  get textContent() { return this._text + this.children.map(child => typeof child === "string" ? child : child.textContent).join(""); }
  get firstChild() { return this.children[0]; }
  append(...children)
  {
    for (const child of children)
    {
      if (typeof child !== "string") { child.remove(); child.parentElement = this; }
      this.children.push(child);
    }
  }
  replaceChildren(...children)
  {
    for (const child of this.children) if (typeof child !== "string") child.parentElement = null;
    this.children.length = 0;
    this.append(...children);
  }
  remove()
  {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentElement = null;
  }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  change() { this.listeners.get("change")(); }
}

function walk(root, predicate)
{
  if (predicate(root)) return root;
  for (const child of root.children)
    if (typeof child !== "string") { const found = walk(child, predicate); if (found) return found; }
  return null;
}

function documentModel()
{
  const document = { created: 0, activeElement: null };
  document.createElement = tag => { document.created++; return new Element(tag, document); };
  document.head = document.createElement("head");
  document.body = document.createElement("body");
  document.getElementById = id => walk(document.body, element => element.id === id);
  return document;
}

function input(root, name)
{
  const label = walk(root, element => element.tagName === "label" && element.children[0] === name);
  return label?.children[1];
}

function fixture()
{
  const document = documentModel();
  const ship = document.createElement("details"); ship.id = "ship"; document.body.append(ship);
  let source = new Tr2PostProcess2(), graph = source, quality = 2, refresh, cancelled = false;
  const postState = { off: false, autoExposureWhenPostDisabled: true };
  const panel = createPostProcessPanel({ document, postState,
    driver: { scene: { GetPostProcess: () => graph }, postProcess: { GetPostProcessingQuality: () => quality } },
    getDefaultPostProcess: () => source,
    schedule: (fn, interval) => { assert.equal(interval, 250); refresh = fn; return 123; },
    cancel: id => { assert.equal(id, 123); cancelled = true; }
  });
  return { document, ship, panel, postState, refresh,
    setSource: value => source = value, setGraph: value => graph = value, setQuality: value => quality = value,
    get source() { return source; }, get cancelled() { return cancelled; },
    row: name => walk(document.body, element => element.tagName === "h5" && element.textContent === name).parentElement
  };
}

test("panel remains a separate sibling under Ship; absent slots create no effects; disposal clears polling", () =>
{
  const f = fixture();
  const panel = f.document.getElementById("post-processing"), stack = f.document.getElementById("demo-right-panels");
  assert.equal(panel.tagName, "section");
  assert.deepEqual(stack.children, [f.ship, panel]);
  assert.match(f.row("dynamicExposure").textContent, /absent/);
  assert.equal(f.source.dynamicExposure, null);
  f.postState.off = true; f.refresh();
  assert.match(panel.textContent, /Post disabled/);
  assert.equal(panel.parentElement, stack);
  const count = f.document.created; f.refresh(); f.refresh();
  assert.equal(f.document.created, count, "unchanged refresh creates no DOM nodes");
  f.panel.dispose();
  assert.equal(f.cancelled, true); assert.equal(f.ship.parentElement, f.document.body);
  assert.equal(f.document.getElementById("post-processing"), null);
});

test("exposure fields edit the actual owner; quality/display gates use production post-process methods", () =>
{
  const f = fixture(), effect = new Tr2PPDynamicExposureEffect();
  f.source.dynamicExposure = effect; f.refresh();
  const row = f.row("dynamicExposure");
  for (const name of ["influence", "adjustment", "middleValue", "increaseSpeed", "decreaseSpeed", "minBrightness", "maxBrightness", "minLuminance", "maxLuminance", "minExposure", "maxExposure"])
    assert.ok(input(row, name), name);
  const influence = input(row, "influence"); influence.value = "0.45"; influence.change();
  assert.equal(effect.influence, 0.45);
  assert.equal(input(row, "debug").disabled, true, "unimplemented debug overlay is not enabled by this UI");
  f.setQuality(0); f.refresh(); assert.match(row.textContent, /quality gated/);
  f.setQuality(2); effect.display = false; f.refresh(); assert.match(row.textContent, /disabled/);
  input(row, "display").checked = true; input(row, "display").change(); f.refresh();
  assert.match(row.textContent, /available/);
  f.postState.off = true; f.refresh(); assert.match(row.textContent, /available/, "post switch alone does not invent an exposure policy");
  f.panel.dispose();
});

test("new scene/location owner replaces editor target without writing the old template or rebuilding same-shaped fields", () =>
{
  const f = fixture(), previous = new Tr2PPDynamicExposureEffect();
  f.source.dynamicExposure = previous; f.refresh();
  const field = input(f.row("dynamicExposure"), "adjustment"), count = f.document.created;
  const replacement = new Tr2PostProcess2(); replacement.dynamicExposure = new Tr2PPDynamicExposureEffect();
  replacement.dynamicExposure.adjustment = 2;
  f.setSource(replacement); f.setGraph(replacement); f.refresh();
  assert.equal(input(f.row("dynamicExposure"), "adjustment"), field);
  assert.equal(f.document.created, count);
  assert.equal(field.value, "2"); field.value = "3"; field.change();
  assert.equal(replacement.dynamicExposure.adjustment, 3); assert.equal(previous.adjustment, 0);
  f.setGraph(null); f.refresh(); assert.match(f.row("dynamicExposure").textContent, /not in effective graph/);
  f.setSource(null); f.refresh(); assert.match(f.row("dynamicExposure").textContent, /absent/);
  assert.equal(input(f.row("dynamicExposure"), "adjustment"), undefined);
  f.panel.dispose();
});

test("merged values stay read-only; separately labelled source edits survive on the actual owning object", () =>
{
  const f = fixture();
  const graph = new Tr2PostProcess2(); graph.bloom = new Tr2PPBloomEffect();
  f.source.bloom = new Tr2PPBloomEffect();
  f.setGraph(graph); f.refresh();
  const row = f.row("bloom"), liveFields = row.children[2], sourceFields = row.children[3];
  assert.match(row.textContent, /merged values \(read-only\)/);
  assert.match(sourceFields.textContent, /scene default contribution/);
  assert.equal(input(liveFields, "display").disabled, true);
  input(liveFields, "display").checked = false; input(liveFields, "display").change();
  assert.equal(graph.bloom.display, true);
  input(sourceFields, "display").checked = false; input(sourceFields, "display").change();
  assert.equal(f.source.bloom.display, false);
  f.panel.dispose();
});

test("shared editor preserves vectors, rejects invalid numbers and refreshes values without interrupting focused input", () =>
{
  const document = documentModel(), effect = { amount: 1, color: [1, 2, 3], display: true };
  const fields = createEffectFields(effect, { document });
  assert.equal(input(fields.element, "display"), undefined, "existing settings editor defaults preserved");
  const amount = input(fields.element, "amount"); amount.value = "NaN"; amount.change(); assert.equal(effect.amount, 1);
  const color = input(fields.element, "color"); color.value = "3, 4, 5"; color.change(); assert.deepEqual(effect.color, [3, 4, 5]);
  document.activeElement = amount; amount.value = "12."; effect.amount = 8; fields.update(); assert.equal(amount.value, "12.");
  document.activeElement = null; fields.update(); assert.equal(amount.value, "8");
});
