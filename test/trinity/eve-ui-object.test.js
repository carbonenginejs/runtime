// EveUiObject's two EveSpaceObject2 overrides (EveUiObject.cpp:21-47): without perspective scaling the world
// transform is scaled by the camera distance, applied first; and every visibility update ends visible, at high LOD,
// with no impostor, whatever the base computed.
import assert from "node:assert/strict";
import test from "node:test";
import { EveSpaceObject2, EveUiObject, Tr2Lod, Tr2TranslationAdapter, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { UpdateContext, FixedFrustum } from "../support/eveUpdateContext.js";

const TICKS_PER_SECOND = 10_000_000;

function near(actual, expected, label, epsilon = 1e-5)
{
  assert.equal(actual.length, expected.length, `${label}: length`);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon, `${label}[${index}]: ${actual[index]} vs ${expected[index]}`);
  }
}

/** A UI object at (3, 4, 5), with the camera at (3, 8, 5): four units away. */
function placed(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = mat4.clone(context.GetViewTransform());
  context.SetViewTransform(mat4.fromTranslation(mat4.create(), [ -3, -8, -5 ]));
  t.after(() => context.SetViewTransform(prior));

  const object = new EveUiObject();
  object.translationCurve = new Tr2TranslationAdapter();
  object.translationCurve.value.set([ 3, 4, 5 ]);
  return object;
}

test("with perspective scaling, the world transform is the space object's", (t) =>
{
  const object = placed(t);
  assert.equal(object.usePerspectiveScale, true, "the constructor's default (cpp:10-14)");
  assert.equal(object.UpdateWorldTransform(TICKS_PER_SECOND), true);
  near(object.worldTransform, [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 3, 4, 5, 1 ], "world transform");
});

test("without perspective scaling, the camera distance scales the object first, leaving its translation", (t) =>
{
  const object = placed(t);
  object.usePerspectiveScale = false;
  assert.equal(object.UpdateWorldTransform(TICKS_PER_SECOND), true);
  // Carbon (row-vector): scaleMatrix * m_worldTransform. Scaling last instead would move the translation to
  // (12, 16, 20).
  near(object.worldTransform, [ 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 3, 4, 5, 1 ], "world transform");
  near(object.worldPosition, [ 3, 4, 5 ], "world position");
});

test("Carbon quirk, reproduced: a second update at the same time scales again, and the inverse stays unscaled", (t) =>
{
  const object = placed(t);
  object.usePerspectiveScale = false;
  object.UpdateWorldTransform(TICKS_PER_SECOND);
  assert.equal(object.UpdateWorldTransform(TICKS_PER_SECOND), false, "the base had already built this time");
  near(object.worldTransform.slice(0, 3), [ 16, 0, 0 ], "scaled twice (EveSpaceObject2.cpp:3055-3058 returns early)");
  near(object.worldTransform.slice(12, 15), [ 3, 4, 5 ], "translation unchanged");
  near(object.inverseWorldTransform.slice(0, 3), [ 1, 0, 0 ], "the base's inverse predates the scale");
  near(object.inverseWorldTransform.slice(12, 15), [ -3, -4, -5 ], "inverse translation");
});

test("a UI object ends every visibility update visible, at high LOD and without an impostor", () =>
{
  const context = UpdateContext({ frustum: FixedFrustum({ visible: false, pixelSize: 0, pixelSizeEst: 0 }) });

  // The base, under the same culling frustum, culls and drops to low detail.
  const plain = new EveSpaceObject2();
  plain.UpdateVisibility(context);
  assert.equal(plain.isVisible, false);
  assert.equal(plain.lodLevel, Tr2Lod.TR2_LOD_LOW);

  const object = new EveUiObject();
  object._impostorMode = true;
  assert.equal(object.UpdateVisibility(context, mat4.create()), true);
  assert.equal(object.isVisible, true);
  assert.equal(object._isMeshVisible, true);
  assert.equal(object.IsInFrustum(), true);
  assert.equal(object.lodLevel, Tr2Lod.TR2_LOD_HIGH);
  assert.equal(object._lodLevelWithChildren, Tr2Lod.TR2_LOD_HIGH);
  assert.equal(object.IsImpostor(), false);
});

test("Carbon quirk, reproduced: a hidden UI object is still forced visible", () =>
{
  const object = new EveUiObject();
  object.display = false;
  object.UpdateVisibility(UpdateContext({ frustum: FixedFrustum() }));
  assert.equal(object.isVisible, true, "the base returned early (EveSpaceObject2.cpp:1596-1599); the override still forces it");
  assert.equal(object.lodLevel, Tr2Lod.TR2_LOD_HIGH);
});

test("both overrides carry their status markers", () =>
{
  assert.equal(CjsSchema.getMethod(EveUiObject, "UpdateWorldTransform")?.impl?.status, "adapted");
  assert.equal(CjsSchema.getMethod(EveUiObject, "UpdateVisibility")?.impl?.status, "adapted");
});
