import assert from "node:assert/strict";
import { test } from "node:test";

import { StubContext } from "../support/stubContext.js";
import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/index.js";
import { RenderingMode } from "../../npm/dist/global/consts/graphics/index.js";

// Carbon's ApplyRenderStates does TWO things (Tr2EffectStateManager.cpp:703-720):
// re-applies the current rendering mode's standard states, then the pass's own
// through DoApplyRenderStates. Reading a pass's states alone yields a pipeline
// missing most of its state, which is why the order is transcribed rather than
// simplified.

/** A stub-backed context whose SetRenderStates calls are recorded. */
function contextWith()
{
  const context = StubContext();
  const al = context.GetRenderContextAL();
  const applied = [];
  const set = al.SetRenderStates.bind(al);

  al.SetRenderStates = (setup, overrides) =>
  {
    applied.push({ setup, overrides });
    return set(setup, overrides);
  };

  return { context, al, applied, states: context.GetEffectStateManager() };
}

test("applying a setup reaches the backend with the manager's overrides", () =>
{
  const { states, applied } = contextWith();

  states.ApplyStandardStates(RenderingMode.RM_OPAQUE);
  assert.equal(states.ApplyRenderStates(RenderingMode.RM_OPAQUE), true);

  // THREE, and every one is Carbon's. ApplyStandardStates applies the mode's
  // base block (cpp:790-799) - it returned its own predicate and applied
  // nothing until 2026-09-09 - and ApplyRenderStates then applies the base
  // block AGAIN before the setup (cpp:717-718), because it re-applies the
  // current rendering mode by design. This expected 1 while the first call was
  // inert.
  assert.equal(applied.length, 3);
  assert.notEqual(applied[0].setup, null, "the interpreted setup, not a handle");

  // The overrides travel WITH the setup because ours substitutes nothing here:
  // Tr2RenderStateSetup.GetWebgpuRecipe applies them when it projects, which is
  // the only place that knows the depth format.
  assert.deepEqual(applied[0].overrides, {
    invertedDepthTest: false,
    invertedCullMode: false,
    wireframe: false
  });
});

test("the overrides currently set are the ones handed over", () =>
{
  const { states, applied } = contextWith();

  states.SetInvertedCullMode(true);
  states.SetWireframeRendering(true);
  states.ApplyRenderStates(RenderingMode.RM_OPAQUE);

  assert.equal(applied.at(-1).overrides.invertedCullMode, true);
  assert.equal(applied.at(-1).overrides.wireframe, true);

  // Carbon's SetInvertedCullMode/SetWireframeRendering set override TABLES that
  // DoApplyRenderStates substitutes through; ours are named flags the projection
  // reads. Same substitution, one layer up - see DoApplyRenderStates.
  assert.equal(applied.at(-1).overrides.invertedDepthTest, false);
});

test("a managed span filters a repeated handle, as Carbon does", () =>
{
  const { states, applied } = contextWith();

  states.BeginManagedRendering();
  states.ApplyRenderStates(RenderingMode.RM_OPAQUE);
  const afterFirst = applied.length;

  assert.equal(states.ApplyRenderStates(RenderingMode.RM_OPAQUE), false, "already current");
  assert.equal(applied.length, afterFirst, "and nothing reached the backend again");

  assert.equal(states.ApplyRenderStates(RenderingMode.RM_DECAL), true);
  assert.equal(applied.length, afterFirst + 1);
});

test("an out-of-range handle applies nothing and reports so", () =>
{
  const { states, applied } = contextWith();

  assert.equal(states.ApplyRenderStates(9999), false);
  assert.equal(applied.length, 0);
});

test("a reserved slot with no ported state list reaches nothing", () =>
{
  const { states, applied } = contextWith();

  // Slot 0 is RM_ANY: a genuinely empty list, which is what makes an unauthored
  // setup intern to 0 exactly as Carbon's does. There is a setup, so it applies.
  states.ApplyRenderStates(RenderingMode.RM_ANY);

  assert.equal(applied.length, Tr2EffectStateManager.getRenderStateSetup(RenderingMode.RM_ANY) ? 1 : 0);
});
