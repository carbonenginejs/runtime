import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2RenderContext, Tr2RenderContext_GetMainThreadRenderContext, TriViewport } from "../../npm/dist/trinity/core/index.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/index.js";
import { Tr2ProjectBoundingBoxBracket } from "../../npm/dist/trinity/ui/index.js";
import { Tr2SpriteObjectBase } from "../../npm/dist/trinity/index.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";


function almostEqual(actual, expected, epsilon = 1e-4)
{
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}


function makeBounds(min, max, ready = true)
{
  return {
    IsBoundingBoxReady()
    {
      return ready;
    },
    GetWorldBoundingBox(outMin, outMax)
    {
      vec3.copy(outMin, min);
      vec3.copy(outMax, max);
      return true;
    }
  };
}


// The bracket reads the renderer's view state where Carbon reads its
// Tr2Renderer statics; the viewport is the main-thread context's state manager's.
function freshMainContext()
{
  Tr2RenderContext.DestroyMainThreadRenderContext();
  return Tr2RenderContext_GetMainThreadRenderContext();
}


function makeContext(view, projection, viewport)
{
  const context = freshMainContext();
  Tr2Renderer.SetViewTransform(view);
  Tr2Renderer.SetProjectionTransform(projection);
  context.GetEffectStateManager().SetViewport(viewport);
  return context;
}


test("Tr2ProjectBoundingBoxBracket is maintained with the rewritten Carbon defaults", () =>
{
  const bracket = new Tr2ProjectBoundingBoxBracket();
  assert.equal(bracket.screenMargin, 0);
  assert.equal(bracket.integerCoordinates, true);
  assert.equal(bracket.isProjectionValid, false);
  assert.equal(bracket.containsCamera, false);
  assert.equal(bracket.extendsOffscreen, false);
  assert.equal(bracket.coversViewport, false);
  for (const field of [ "isProjectionValid", "containsCamera", "extendsOffscreen", "coversViewport" ])
  {
    assert.equal(CjsSchema.getField(Tr2ProjectBoundingBoxBracket, field)?.edit?.read, true);
    assert.equal(CjsSchema.getField(Tr2ProjectBoundingBoxBracket, field)?.edit?.write, undefined);
  }
  assert.equal(
    existsSync(new URL("../../src/trinity/generated/trinityCore/Tr2ProjectBoundingBoxBracket.js", import.meta.url)),
    false
  );
});


test("TriCurveSet calls its functions with Carbon's one-argument UpdateValue (TriCurveSet.cpp:158)", () =>
{
  const curveSet = new TriCurveSet();
  let received = null;
  curveSet.curves.push({
    UpdateValue(...args)
    {
      received = args;
    }
  });
  curveSet.scaledTime = 7;
  curveSet.Apply();
  assert.deepEqual(received, [ 7 ]);
});


test("Tr2ProjectBoundingBoxBracket reverses Carbon view-projection composition", () =>
{
  const view = mat4.lookAt(mat4.create(), [ 3, 5, -7 ], [ 10, 2, 4 ], [ 0, 1, 0 ]);
  const projection = mat4.perspectiveZO(mat4.create(), 0.9, 1.6, 2, 500);
  const viewport = new TriViewport();
  viewport.__init__(0, 0, 1280, 800, 0, 1);
  makeContext(view, projection, viewport);
  const bracket = new Tr2ProjectBoundingBoxBracket();
  bracket.integerCoordinates = false;
  bracket.object = makeBounds([ 9, -4, 3 ], [ 11, 0, 5 ]);

  bracket.UpdateValue(0);

  assert.equal(bracket.isProjectionValid, true);
  almostEqual(bracket.projectedX, 555.4994971);
  almostEqual(bracket.projectedY, 489.4764746);
  almostEqual(bracket.projectedZ, 0.84314393);
  almostEqual(bracket.projectedWidth, 165.4242865);
  almostEqual(bracket.projectedHeight, 291.5806728);
});


test("camera-inside projection publishes the margin-inset viewport directly", () =>
{
  const viewport = new TriViewport();
  viewport.__init__(10, 20, 100, 50, 0.25, 1);
  makeContext(mat4.create(), mat4.create(), viewport);
  const bracket = new Tr2ProjectBoundingBoxBracket();
  const sprite = new Tr2SpriteObjectBase();
  bracket.object = makeBounds([ -1, -1, -1 ], [ 1, 1, 1 ]);
  bracket.bracket = sprite;
  bracket.screenMargin = 5;

  bracket.UpdateValue(0);

  assert.equal(bracket.isProjectionValid, true);
  assert.equal(bracket.containsCamera, true);
  assert.equal(bracket.extendsOffscreen, true);
  assert.equal(bracket.coversViewport, true);
  assert.deepEqual(
    [ bracket.projectedX, bracket.projectedY, bracket.projectedWidth, bracket.projectedHeight ],
    [ 15, 25, 90, 40 ]
  );
  assert.deepEqual(
    [ sprite.displayX, sprite.displayY, sprite.displayWidth, sprite.displayHeight ],
    [ 15, 25, 90, 40 ]
  );
});


test("projection clipping, sizing, and empty-state behavior match Carbon", () =>
{
  const viewport = new TriViewport();
  viewport.__init__(0, 0, 100, 100, 0, 1);
  makeContext(mat4.create(), mat4.create(), viewport);
  const bracket = new Tr2ProjectBoundingBoxBracket();
  bracket.integerCoordinates = false;
  bracket.object = makeBounds([ -0.5, -0.5, 0.2 ], [ 0.5, 0.5, 0.4 ]);
  bracket.maxProjectedWidth = 20;
  bracket.maxProjectedHeight = 30;
  bracket.UpdateValue(0);
  assert.deepEqual(
    [ bracket.projectedX, bracket.projectedY, bracket.projectedWidth, bracket.projectedHeight ],
    [ 40, 35, 20, 30 ]
  );

  bracket.object = makeBounds([ -0.5, -0.5, -0.2 ], [ 0.5, 0.5, 0.4 ]);
  bracket.maxProjectedWidth = 0;
  bracket.maxProjectedHeight = 0;
  bracket.UpdateValue(0);
  assert.equal(bracket.isProjectionValid, true, "near-plane-straddling bounds survive clipping");

  bracket.object = makeBounds([ 2, -0.5, 0.2 ], [ 3, 0.5, 0.4 ]);
  bracket.UpdateValue(0);
  assert.equal(bracket.isProjectionValid, false, "a box outside one common clip plane is empty");
  assert.deepEqual(
    [ bracket.projectedX, bracket.projectedY, bracket.projectedWidth, bracket.projectedHeight ],
    [ 0, 0, 0, 0 ]
  );
});


test("invalid bounds retain cameraDistance and missing frame state fails loudly", () =>
{
  makeContext(mat4.create(), mat4.create(), new TriViewport());
  const bracket = new Tr2ProjectBoundingBoxBracket();
  bracket.cameraDistance = 17;
  bracket.object = makeBounds([ 0, 0, 0 ], [ 1, 1, 1 ], false);
  bracket.UpdateValue(0);
  assert.equal(bracket.cameraDistance, 17);
  assert.equal(bracket.isProjectionValid, false);

  bracket.object = makeBounds([ 0, 0, 1 ], [ 1, 1, 2 ]);
  // Carbon always has a viewport; ours has none until one is set.
  freshMainContext();
  Tr2Renderer.SetViewTransform(mat4.create());
  Tr2Renderer.SetProjectionTransform(mat4.create());
  assert.throws(() => bracket.UpdateValue(0), TypeError);
});
