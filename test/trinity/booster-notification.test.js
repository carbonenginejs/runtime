import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { NotifyModified } from "../../npm/dist/global/blue/index.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import {
  BehaviorGroupBooster, Tr2Effect, Tr2QuadRenderer, Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { FixtureEffect } from "../support/fixtureEffect.js";

const context = Tr2RenderContext_GetMainThreadRenderContext();
context.GetRenderContextAL().CreateDevice();

function effect(key)
{
  return Object.assign(new Tr2Effect(), FixtureEffect({GetHashValue: () => key}));
}

function renderer(t)
{
  const value = new Tr2QuadRenderer();
  t.after(() =>
  {
    value._vertexBuffer.ReleaseResources();
    value._quad?.Destroy();
    value._quadIB?.Destroy();
  });
  return value;
}

function draw(booster, renderer)
{
  booster.AddQuadsToQuadRenderer(null, renderer);
  renderer.BeginRendering(context);
  const batches = [];
  renderer.GetBatches(TriBatchType.TRIBATCHTYPE_ADDITIVE, {
    Allocate: Type => new Type(), Commit: batch => batches.push(batch)
  });
  renderer.DoneRendering(context);
  return batches;
}

test("booster flares reach only renderers their stored hash was registered with (BehaviorGroupBooster.cpp:365-396)", t =>
{
  const booster = new BehaviorGroupBooster();
  const first = effect(101), replacement = effect(102);
  CjsSchema.setValues(booster, {ambientFlareEffect: first});
  booster.RebuildFlareBuffer(2);
  const a = renderer(t), b = renderer(t);

  // AddQuadsToQuadRenderer registers nothing; AddQuads at an unknown hash adds nothing.
  assert.equal(draw(booster, a).length, 0);
  assert.equal(a.GetEffectRecords().has(101), false, "AddQuadsToQuadRenderer must not register");

  booster.RegisterWithQuadRenderer(a);
  booster.RegisterWithQuadRenderer(b);
  for (const scene of [a, b])
  {
    const batches = draw(booster, scene);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].material, first);
    assert.equal(batches[0].instanceCount, 2);
  }

  // OnModified registers the replacement with the global renderer only (cpp:157-163, 137-141), so
  // renderers registered earlier drop its quads: Carbon's multi-view limitation, kept.
  CjsSchema.setValues(booster, {ambientFlareEffect: replacement});
  assert.equal(Tr2QuadRenderer.Instance().GetEffectRecords().get(102).effect, replacement);
  for (const scene of [a, b])
  {
    assert.equal(draw(booster, scene).length, 0, "the replacement hash is not registered with this renderer");
    assert.equal(scene.GetEffectRecords().has(102), false);
  }

  // Registering again picks up the replacement; the old record stays, as it may have other owners.
  booster.RegisterWithQuadRenderer(a);
  const batches = draw(booster, a);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].material, replacement);
  assert.equal(batches[0].instanceCount, 2);
  assert.equal(batches[0].indexCountPerInstance, 6);
  assert.equal(a.GetEffectRecords().get(101).effect, first);

  booster.displayAmbientFlare = false;
  assert.equal(draw(booster, a).length, 0);
});

test("booster coalesced removal clears both lists through one values notification", t =>
{
  const booster = new BehaviorGroupBooster();
  CjsSchema.setValues(booster, {haloFlareEffect: effect(201), ambientFlareEffect: effect(202)});
  booster.RebuildFlareBuffer(2);
  assert.equal(booster._haloFlares.length, 2);
  assert.equal(booster._ambientFlares.length, 2);
  const modified = t.mock.method(booster, "OnModified");
  CjsSchema.setValues(booster, {haloFlareEffect: null, ambientFlareEffect: null});
  assert.equal(modified.mock.callCount(), 1);
  assert.deepEqual(modified.mock.calls[0].arguments[0], ["haloFlareEffect", "ambientFlareEffect"]);
  assert.equal(booster._haloFlares.length, 0);
  assert.equal(booster._ambientFlares.length, 0);
  assert.equal(draw(booster, renderer(t)).length, 0);
});

test("booster mixed replacements and removals rebuild once and keep detached lists empty", t =>
{
  for (const detached of ["halo", "ambient"])
  {
    const retained = detached === "halo" ? "ambient" : "halo";
    const booster = new BehaviorGroupBooster();
    CjsSchema.setValues(booster, {haloFlareEffect: effect(301), ambientFlareEffect: effect(302)});
    booster.RebuildFlareBuffer(1);
    const setup = t.mock.method(booster, "SetupQuads");
    const replacement = effect(303);
    CjsSchema.setValues(booster, {
      [`${detached}FlareEffect`]: null,
      [`${retained}FlareEffect`]: replacement,
      [`${retained}FlareBrightness`]: 3
    });
    assert.equal(setup.mock.callCount(), 1);
    assert.equal(booster[`_${detached}Flares`].length, 0);
    assert.equal(booster[`_${retained}Flares`].length, 1);
    const scene = renderer(t);
    booster.RegisterWithQuadRenderer(scene);
    assert.equal(draw(booster, scene)[0].material, replacement);
    // The public explicit-notification entry point supports the same batched removal.
    booster[`${retained}FlareEffect`] = null;
    NotifyModified(booster, ["haloFlareEffect", "ambientFlareEffect"]);
    assert.equal(booster._haloFlares.length, 0);
    assert.equal(booster._ambientFlares.length, 0);
  }
});


test("booster owns flare records before initialization and preserves native resize semantics", () =>
{
  const booster = new BehaviorGroupBooster();
  // Reproduce an effect assignment followed by a parent count callback before
  // this nested object's Initialize, without disguising it as normal load order.
  booster.ambientFlareEffect = effect(401);
  assert.doesNotThrow(() => booster.RebuildFlareBuffer(2),
    "BehaviorGroupBooster.cpp:75-76 constructs both Quad members before callbacks");
  assert.equal(booster._ambientFlares.length, 2);
  assert.equal(booster._haloFlares.length, 2,
    "BehaviorGroupBooster.cpp:213-214 resizes both lists when either effect exists");
  assert.notEqual(booster._haloFlare, booster._ambientFlare);
  assert.notEqual(booster._ambientFlares[0].parentTransform0, booster._ambientFlare.parentTransform0);
  assert.notEqual(booster._ambientFlares[0].color, booster._ambientFlares[1].color);
  const retained = booster._ambientFlares[0];
  retained.color[0] = 0.25;
  booster.Initialize();
  assert.equal(booster._ambientFlares[0], retained, "native resize retains existing records");
  assert.equal(retained.color[0], 0.25, "SetupQuads does not rewrite retained copies");
  booster.RebuildFlareBuffer(3);
  assert.deepEqual([...booster._ambientFlares[2].parentTransform0], [1, 0, 0, 0]);
  assert.deepEqual([...booster._ambientFlares[2].color], [...booster.ambientFlareColor]);
});
