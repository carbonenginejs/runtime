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

test("booster replacement effects reach real quad batches in every owning scene", t =>
{
  const booster = new BehaviorGroupBooster();
  const first = effect(101), replacement = effect(102);
  CjsSchema.setValues(booster, {ambientFlareEffect: first});
  booster.RebuildFlareBuffer(2);
  const a = renderer(t), b = renderer(t);
  booster.RegisterWithQuadRenderer(a);
  booster.RegisterWithQuadRenderer(b);
  for (const scene of [a, b])
  {
    const batches = draw(booster, scene);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].material, first);
    assert.equal(batches[0].instanceCount, 2);
  }
  CjsSchema.setValues(booster, {ambientFlareEffect: replacement});
  for (const scene of [a, b])
  {
    const batches = draw(booster, scene);
    assert.equal(batches.length, 1, "replacement must not disappear at an unregistered hash");
    assert.equal(batches[0].material, replacement);
    assert.equal(batches[0].instanceCount, 2);
    assert.equal(batches[0].indexCountPerInstance, 6);
    assert.equal(scene.GetEffectRecords().get(101).effect, first, "old effect may have other owners");
  }
  // An edit before attachment must also work in a new scene, without a global renderer.
  const c = renderer(t);
  assert.equal(draw(booster, c)[0].material, replacement);
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
    assert.equal(draw(booster, renderer(t))[0].material, replacement);
    // The public explicit-notification entry point supports the same batched removal.
    booster[`${retained}FlareEffect`] = null;
    NotifyModified(booster, ["haloFlareEffect", "ambientFlareEffect"]);
    assert.equal(booster._haloFlares.length, 0);
    assert.equal(booster._ambientFlares.length, 0);
  }
});
