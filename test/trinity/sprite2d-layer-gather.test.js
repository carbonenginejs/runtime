// Tr2Sprite2dLayer gathers through its own GatherSprites (Tr2Sprite2dLayer.h:28,
// Tr2Sprite2dLayer.cpp:39-85): StartLayer into its render target, children only while dirty,
// EndLayer at its rectangle. The container path (PushTranslation, capture caching) must not run.
import assert from "node:assert/strict";
import test from "node:test";
import {
  Tr2RenderContext_GetMainThreadRenderContext, Tr2Sprite2dContainer, Tr2Sprite2dLayer, Tr2Sprite2dScene
} from "../../npm/dist/trinity/index.js";
import { Tr2SpriteObjectBlendMode, Tr2SpriteObjectEffect } from "../../npm/dist/trinity/generated/sprite2d/enums.js";

Tr2RenderContext_GetMainThreadRenderContext().GetRenderContextAL().CreateDevice();

/**
 * A real scene whose StartLayer/EndLayer and container-path entry points are recorded. The layer
 * verbs are recorded rather than run because they bind render targets; what is under test is that
 * the layer calls them, with Carbon's arguments, in Carbon's order.
 */
function recordingScene()
{
  const scene = new Tr2Sprite2dScene();
  const calls = [];
  scene.StartLayer = rt => calls.push({ name: "StartLayer", rt, alpha: scene.GetAccumulatedAlpha() });
  scene.EndLayer = (x, y, width, height, secondary) => calls.push({
    name: "EndLayer", args: [x, y, width, height, secondary],
    color: Array.from(scene._color), effect: scene._spriteEffect, blend: scene._blendMode
  });
  const pushTranslation = scene.PushTranslation.bind(scene);
  scene.PushTranslation = translation => { calls.push({ name: "PushTranslation" }); pushTranslation(translation); };
  const startCapture = scene.StartCapture.bind(scene);
  scene.StartCapture = owner => { calls.push({ name: "StartCapture" }); return startCapture(owner); };
  return { scene, calls };
}

/** A child that records when it is gathered. */
function child(calls, name)
{
  const value = new Tr2Sprite2dContainer();
  value.GatherSprites = renderer => calls.push({ name, alpha: renderer.GetAccumulatedAlpha() });
  return value;
}

test("Layer overrides the container's GatherSprites", () =>
{
  assert.notEqual(Tr2Sprite2dLayer.prototype.GatherSprites, Tr2Sprite2dContainer.prototype.GatherSprites);
});

test("Layer renders its children into its own target between StartLayer and EndLayer", () =>
{
  const { scene, calls } = recordingScene();
  const layer = new Tr2Sprite2dLayer();
  Object.assign(layer, { displayX: 5, displayY: 6, displayWidth: 64, displayHeight: 32, opacity: 0.5 });
  layer.color.set([1, 0.5, 0.25, 1]);
  layer.blendMode = Tr2SpriteObjectBlendMode.TR2_SBM_BLEND;
  layer.children.push(child(calls, "first"), child(calls, "second"));
  layer.background.push(child(calls, "background"));
  scene.SetAccumulatedAlpha(0.8);

  // Carbon constructor defaults (Tr2Sprite2dLayer.cpp:11-19).
  assert.equal(new Tr2Sprite2dLayer().spriteEffect, Tr2SpriteObjectEffect.TR2_SFX_COPY);
  assert.equal(new Tr2Sprite2dLayer().clearBackground, true);

  layer.GatherSprites(scene);

  // cpp:48-84: StartLayer(m_renderTarget); alpha = opacity * old = 0.4; background then
  // children, each reversed; colour, effect and blend set; EndLayer(m_translation.x, .y,
  // m_displayWidth, m_displayHeight, m_textureSecondary); alpha restored.
  assert.deepEqual(calls.map(call => call.name), ["StartLayer", "background", "second", "first", "EndLayer"]);
  assert.equal(calls[0].rt, layer._renderTarget);
  assert.equal(calls[0].rt.IsValid(), true);
  // OnPrepareResources sizes the target to (uint32_t)m_displayWidth x m_displayHeight (cpp:95-99).
  assert.equal(calls[0].rt.GetWidth(), 64);
  assert.equal(calls[0].rt.GetHeight(), 32);
  assert.ok(Math.abs(calls[1].alpha - 0.4) < 1e-7);
  assert.deepEqual(calls[4].args, [5, 6, 64, 32, null]);
  assert.deepEqual(calls[4].color, [1, 0.5, 0.25, 1]);
  assert.equal(calls[4].effect, Tr2SpriteObjectEffect.TR2_SFX_COPY);
  assert.equal(calls[4].blend, Tr2SpriteObjectBlendMode.TR2_SBM_BLEND);
  assert.equal(scene.GetAccumulatedAlpha(), 0.8);
  assert.equal(layer.isDirty, false);

  // A clean layer re-draws its target without re-gathering the children (cpp:60-77).
  calls.length = 0;
  layer.GatherSprites(scene);
  assert.deepEqual(calls.map(call => call.name), ["StartLayer", "EndLayer"]);

  // Resizing recreates the target and marks the layer dirty (cpp:117-129).
  calls.length = 0;
  layer.displayWidth = 16;
  layer.GatherSprites(scene);
  assert.deepEqual(calls.map(call => call.name), ["StartLayer", "background", "second", "first", "EndLayer"]);
  assert.equal(calls[0].rt.GetWidth(), 16);

  layer.Destruct();
});

test("A hidden layer gathers nothing", () =>
{
  const { scene, calls } = recordingScene();
  const layer = new Tr2Sprite2dLayer();
  Object.assign(layer, { displayWidth: 8, displayHeight: 8 });
  layer.children.push(child(calls, "child"));
  layer.display = false;

  layer.GatherSprites(scene);

  assert.deepEqual(calls, []);
  layer.Destruct();
});

test("A child change dirties the layer and its parent (cpp:30-37)", () =>
{
  const outer = new Tr2Sprite2dContainer();
  const layer = new Tr2Sprite2dLayer();
  layer.SetParent(outer);
  outer.isDirty = layer.isDirty = false;

  layer.SetChildDirty(null);

  assert.equal(layer.isDirty, true);
  assert.equal(outer.isDirty, true);
  layer.Destruct();
});
