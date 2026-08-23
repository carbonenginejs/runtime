import assert from "node:assert/strict";
import { test } from "node:test";

import { ClassifyIntent, IntentClass, PlanFrame } from "../src/core/framePlan.js";

function segment(...intents)
{
  return { step: null, job: null, phase: "execute", intents };
}

function draw(name = "object")
{
  return { type: "render-object", renderable: name };
}

function kinds(plan)
{
  return plan.regions.map(region => region.kind);
}

test("PlanFrame folds a leading clear into the region's load operations", () =>
{
  const plan = PlanFrame([ segment(
    { type: "clear", clearColor: true, color: [ 0, 0, 0, 1 ], clearDepth: true, depth: 1 },
    draw("a"),
    draw("b")
  ) ]);

  assert.deepEqual(kinds(plan), [ IntentClass.RENDER ]);
  // No explicit clear operation and no fullscreen clear draw: the clear became
  // the attachment's load op, which is what the divergence decision asks for.
  assert.deepEqual(plan.regions[0].clear, { color: [ 0, 0, 0, 1 ], depth: 1 });
  assert.deepEqual(plan.regions[0].intents.map(intent => intent.renderable), [ "a", "b" ]);
  assert.equal(plan.intentCount, 3);
});

test("PlanFrame cuts a region when a clear arrives after work", () =>
{
  // A pass that is already drawing cannot have its load op changed, so the
  // clear lands on a fresh region instead.
  const plan = PlanFrame([ segment(
    draw("a"),
    { type: "clear", clearColor: true, color: [ 1, 0, 0, 1 ] },
    draw("b")
  ) ]);

  assert.deepEqual(kinds(plan), [ IntentClass.RENDER, IntentClass.RENDER ]);
  assert.equal(plan.regions[0].clear, null);
  assert.deepEqual(plan.regions[0].intents.map(intent => intent.renderable), [ "a" ]);
  assert.deepEqual(plan.regions[1].clear, { color: [ 1, 0, 0, 1 ] });
  assert.deepEqual(plan.regions[1].intents.map(intent => intent.renderable), [ "b" ]);
});

test("PlanFrame cuts a region for work that cannot happen inside a pass", () =>
{
  const plan = PlanFrame([ segment(
    draw("a"),
    { type: "run-compute-shader", effect: "cs", groupDimX: 1, groupDimY: 1, groupDimZ: 1 },
    draw("b"),
    { type: "copy-render-target", source: "s", destination: "d" },
    { type: "generate-mipmaps", renderTarget: "d" },
    draw("c")
  ) ]);

  // Compute and transfer are illegal inside a render pass, so each cuts the
  // stream; adjacent transfers share one region because they are legal together.
  assert.deepEqual(kinds(plan), [
    IntentClass.RENDER,
    IntentClass.COMPUTE,
    IntentClass.RENDER,
    IntentClass.TRANSFER,
    IntentClass.RENDER
  ]);
  assert.deepEqual(plan.regions[3].intents.map(intent => intent.type), [
    "copy-render-target",
    "generate-mipmaps"
  ]);
});

test("PlanFrame cuts a region when the attachments change", () =>
{
  const plan = PlanFrame([ segment(
    { type: "set-render-target", slot: 0, renderTarget: "gbuffer" },
    { type: "set-depth-stencil", depthStencil: "depth" },
    draw("a"),
    { type: "set-render-target", slot: 0, renderTarget: "backbuffer" },
    draw("b")
  ) ]);

  assert.deepEqual(kinds(plan), [ IntentClass.RENDER, IntentClass.RENDER ]);
  assert.deepEqual(plan.regions[0].target.colorTargets, [ "gbuffer" ]);
  assert.equal(plan.regions[0].target.depthStencil, "depth");
  assert.deepEqual(plan.regions[1].target.colorTargets, [ "backbuffer" ]);
  assert.equal(plan.regions[1].target.depthStencil, "depth", "depth survives a colour-target change");
});

test("PlanFrame keeps state with the work it applies to, and forces no boundary", () =>
{
  const plan = PlanFrame([ segment(
    { type: "set-viewport", x: 0, y: 0 },
    { type: "apply-standard-states", mode: 1 },
    draw("a"),
    { type: "set-render-state", state: 7, value: 1 },
    draw("b")
  ) ]);

  assert.deepEqual(kinds(plan), [ IntentClass.RENDER ], "state alone never cuts a pass");
  assert.deepEqual(plan.regions[0].intents.map(intent => intent.type), [
    "set-viewport",
    "apply-standard-states",
    "render-object",
    "set-render-state",
    "render-object"
  ]);
});

test("PlanFrame emits nothing for a frame that only changed state", () =>
{
  const plan = PlanFrame([ segment(
    { type: "set-viewport", x: 0, y: 0 },
    { type: "set-render-target", slot: 0, renderTarget: "backbuffer" },
    { type: "clear", clearColor: true, color: [ 0, 0, 0, 1 ] }
  ) ]);

  // A clear with nothing drawn after it has no pass to load into. Emitting an
  // empty one would be a pass that exists only to clear a target nothing reads.
  assert.deepEqual(plan.regions, []);
  assert.equal(plan.intentCount, 3);
});

test("PlanFrame preserves order across segments and never merges over a boundary", () =>
{
  const plan = PlanFrame([
    segment(draw("a")),
    segment({ type: "run-compute-shader", effect: "cs", groupDimX: 1, groupDimY: 1, groupDimZ: 1 }),
    segment(draw("b")),
    segment(draw("c"))
  ]);

  assert.deepEqual(kinds(plan), [ IntentClass.RENDER, IntentClass.COMPUTE, IntentClass.RENDER ]);
  // b and c are adjacent render work in different segments, so they share one
  // pass; a is separated from them by compute and cannot join, even though
  // merging would be cheaper. Trinity's observable ordering outranks that.
  assert.deepEqual(plan.regions[2].intents.map(intent => intent.renderable), [ "b", "c" ]);
});

test("PlanFrame treats presentation as the end of encodable work", () =>
{
  const plan = PlanFrame([ segment(
    draw("a"),
    { type: "present-swap-chain", swapChain: "secondary" },
    draw("b")
  ) ]);

  assert.equal(plan.presented, true);
  // Nothing is encoded for presentation on this backend, but it still closes
  // the frame so later work cannot silently join the presented pass.
  assert.deepEqual(kinds(plan), [ IntentClass.RENDER, IntentClass.RENDER ]);
  assert.deepEqual(plan.regions[0].intents.map(intent => intent.renderable), [ "a" ]);
});

test("PlanFrame refuses an intent it has no rule for", () =>
{
  // Treating an unknown intent as harmless state is how something illegal ends
  // up inside a pass, so an unplanned type is a planning gap and says so.
  assert.throws(() => ClassifyIntent("teleport-geometry"), /no planning class/);
  assert.throws(() => PlanFrame([ segment({ type: "teleport-geometry" }) ]), /no planning class/);
  assert.throws(() => PlanFrame([ segment({}) ]), /must carry a type/);
  assert.throws(() => PlanFrame([ {} ]), /intents array/);

  assert.deepEqual(PlanFrame([]).regions, []);
  assert.deepEqual(PlanFrame(undefined).regions, []);
});

test("PlanFrame keeps a UAV clear out of the attachment load path", () =>
{
  const plan = PlanFrame([ segment(
    { type: "clear-uav", buffer: "b", value: [ 0, 0, 0, 0 ], clearWithFloat: false },
    draw("a")
  ) ]);

  // A UAV clear operates on a buffer, not an attachment, so it is real work in
  // its own region rather than something that folds into a load op.
  assert.deepEqual(kinds(plan), [ IntentClass.COMPUTE, IntentClass.RENDER ]);
  assert.equal(plan.regions[1].clear, null);
});
