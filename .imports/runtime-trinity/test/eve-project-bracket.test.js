import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { Tr2RenderContext, TriViewport } from "../npm/dist/core/index.js";
import * as eve from "../npm/dist/eve/index.js";
import * as generatedEve from "../npm/dist/generated/eve/index.js";
import * as trinity from "../npm/dist/index.js";


function makeContext({ animationTime = 0, viewport = [ 0, 0, 100, 100 ] } = {})
{
  const context = new Tr2RenderContext();
  context.SetViewTransform(mat4.create());
  context.SetProjection(mat4.create());
  const activeViewport = new TriViewport();
  activeViewport.__init__(...viewport);
  context.SetViewport(activeViewport);
  context.AdvanceFrame(animationTime);
  return context;
}


function makeSprite(width = 0, height = 0)
{
  return {
    display: true,
    x: 0,
    y: 0,
    GetDisplayWidth: () => width,
    GetDisplayHeight: () => height,
    GetDisplayX() { return this.x; },
    GetDisplayY() { return this.y; },
    SetDisplay(value) { this.display = value; },
    SetDisplayX(value) { this.x = value; },
    SetDisplayY(value) { this.y = value; }
  };
}


test("EveProjectBracket is maintained with corrected Carbon defaults", () =>
{
  const bracket = new eve.EveProjectBracket();
  assert.equal(trinity.EveProjectBracket, eve.EveProjectBracket);
  assert.equal("EveProjectBracket" in generatedEve, false);
  assert.equal(
    existsSync(new URL("../src/generated/eve/ui/EveProjectBracket.js", import.meta.url)),
    false
  );
  assert.equal(bracket.ballTrackingScaling, 1);
  assert.equal(bracket.maxDispRange, 3.4028234663852886e38);
  assert.equal(bracket.isVisible, true);
  assert.equal(bracket.isInFront, true);
  assert.equal(bracket.integerCoordinates, true);
  assert.equal(bracket.dock, false);
  assert.equal(CjsSchema.getField(eve.EveProjectBracket, "maxDispRange")?.type.kind, "float32");
  assert.equal(CjsSchema.getMethod(eve.EveProjectBracket, "UpdateValue")?.impl?.status, "adapted");
});


test("EveProjectBracket samples the priority track ball at the active animation time", () =>
{
  const bracket = new eve.EveProjectBracket();
  const context = makeContext({ animationTime: 17.25, viewport: [ 10, 20, 200, 100 ] });
  const calls = [];
  bracket.integerCoordinates = false;
  bracket.ballTrackingScaling = 2;
  bracket.trackBall = {
    GetValueAt(time, out)
    {
      calls.push([ time, out ]);
      vec3.set(out, 0.25, 0.5, -1);
    }
  };
  bracket.trackTransform = {
    GetWorldPosition()
    {
      throw new Error("trackBall must have priority");
    }
  };

  bracket.UpdateValue(99, context);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 17.25);
  assert.deepEqual(Array.from(bracket.rawProjectedPosition), [ 160, 20 ]);
  assert.deepEqual(Array.from(bracket.projectedPosition), [ 160, 20 ]);
  assert.equal(bracket.cameraDistance, Math.hypot(0.5, 1, -2));
  assert.equal(bracket.isInFront, true);
});


test("EveProjectBracket uses transform and fixed-position fallbacks by direct contract", () =>
{
  const bracket = new eve.EveProjectBracket();
  const context = makeContext();
  bracket.integerCoordinates = false;
  bracket.trackTransform = {
    GetWorldPosition()
    {
      return vec3.fromValues(-0.5, 0.5, -1);
    }
  };
  bracket.UpdateValue(0, context);
  assert.deepEqual(Array.from(bracket.projectedPosition), [ 25, 25 ]);

  bracket.trackTransform = null;
  vec3.set(bracket.trackPosition, 0.5, -0.5, -1);
  bracket.UpdateValue(0, context);
  assert.deepEqual(Array.from(bracket.projectedPosition), [ 75, 75 ]);

  bracket.trackTransform = {};
  assert.throws(() => bracket.UpdateValue(0, context), /GetWorldPosition/u);
  assert.throws(() => bracket.UpdateValue(0, null), /active Tr2RenderContext/u);
});


test("EveProjectBracket applies a non-identity view and perspective divide in order", () =>
{
  const bracket = new eve.EveProjectBracket();
  const context = new Tr2RenderContext();
  const view = mat4.fromValues(
    1, -1, 2, 0,
    2, 1, -1, 0,
    1, 2, 1, 0,
    4, 3, -1, 1
  );
  const projection = mat4.fromValues(
    2, -1, 0, 0,
    1, 2, 0, 0,
    1, 0, 1, -1,
    0, 0, 0, 0
  );
  const viewport = new TriViewport();
  viewport.__init__(10, 20, 200, 80, 0.25, 0.75);
  context.SetViewTransform(view);
  context.SetProjection(projection);
  context.SetViewport(viewport);
  bracket.integerCoordinates = false;
  vec3.set(bracket.trackPosition, 1, 2, -3);

  bracket.UpdateValue(0, context);
  assert.deepEqual(Array.from(bracket.rawProjectedPosition), [ 260, 160 ]);
  assert.ok(Math.abs(bracket.cameraDistance - Math.hypot(6, -2, -4)) < 1e-5);
  assert.equal(bracket.isInFront, true);
  assert.deepEqual(Array.from(bracket.projectedPosition), Array.from(bracket.rawProjectedPosition));
});


test("EveProjectBracket hides rear positions without docking and requires frame projection state", () =>
{
  const bracket = new eve.EveProjectBracket();
  const context = makeContext();
  vec3.set(bracket.trackPosition, 0, 0, 1);
  bracket.UpdateValue(0, context);
  assert.equal(bracket.isInFront, false);
  assert.equal(bracket.isVisible, false);

  const missingViewport = new Tr2RenderContext();
  missingViewport.SetViewTransform(mat4.create());
  missingViewport.SetProjection(mat4.create());
  assert.throws(() => bracket.UpdateValue(0, missingViewport), /active viewport/u);

  const missingProjection = new Tr2RenderContext();
  const viewport = new TriViewport();
  viewport.__init__(0, 0, 100, 100);
  missingProjection.SetViewTransform(mat4.create());
  missingProjection.SetViewport(viewport);
  assert.throws(() => bracket.UpdateValue(0, missingProjection), /active projection/u);
});


test("EveProjectBracket visibility callbacks observe the first-state latch and early exits", () =>
{
  const bracket = new eve.EveProjectBracket();
  const sprite = makeSprite();
  const icon = new eve.EveSprite2dBracket();
  const states = [];
  let updates = 0;
  bracket.bracket = sprite;
  bracket.bracketIcon = icon;
  bracket.displayChangeCallback = (owner, state) => states.push([ owner, state ]);
  bracket.bracketUpdateCallback = owner =>
  {
    assert.equal(owner, bracket);
    updates++;
  };
  vec3.set(bracket.trackPosition, 0, 0, -2);

  const context = makeContext();
  bracket.UpdateValue(0, context);
  bracket.UpdateValue(0, context);
  assert.deepEqual(states.map(([, state ]) => state), [ true ]);
  assert.equal(updates, 2);

  bracket.maxDispRange = 1;
  bracket.UpdateValue(0, context);
  bracket.UpdateValue(0, context);
  assert.deepEqual(states.map(([, state ]) => state), [ true, false ]);
  assert.equal(sprite.display, false);
  assert.equal(icon.display, false);
  assert.equal(updates, 2, "hidden early exits do not invoke the update callback");

  bracket.maxDispRange = 10;
  bracket.UpdateValue(0, context);
  assert.deepEqual(states.map(([, state ]) => state), [ true, false, true ]);
});


test("EveProjectBracket applies parent-relative layout, bracket centering, offsets and rounding", () =>
{
  const project = new eve.EveProjectBracket();
  const parent = makeSprite(100, 50);
  const bracket = makeSprite(20, 10);
  const icon = new eve.EveSprite2dBracket();
  parent.x = 10;
  parent.y = 20;
  project.parent = parent;
  project.bracket = bracket;
  project.bracketIcon = icon;
  project.offsetX = 0.4;
  project.offsetY = 0.6;
  vec3.set(project.trackPosition, 0, 0, -1);

  project.UpdateValue(0, makeContext({ viewport: [ 10, 20, 200, 100 ] }));
  assert.deepEqual(Array.from(project.rawProjectedPosition), [ 110, 70 ]);
  assert.deepEqual(Array.from(project.projectedPosition), [ 90, 46 ]);
  assert.equal(bracket.x, 90);
  assert.equal(bracket.y, 46);
  assert.deepEqual(Array.from(icon.translation), [ 90, 46 ]);
});


test("EveProjectBracket docks front and rear positions with Carbon's cylindrical policy", () =>
{
  const project = new eve.EveProjectBracket();
  const context = makeContext();
  project.dock = true;
  project.integerCoordinates = false;

  vec3.set(project.trackPosition, -2, 2, -1);
  project.UpdateValue(0, context);
  assert.deepEqual(Array.from(project.rawProjectedPosition), [ -50, -50 ]);
  assert.deepEqual(Array.from(project.projectedPosition), [ 0, 100 ]);
  assert.equal(project.isInFront, true);

  vec3.set(project.trackPosition, 0, 0, 1);
  project.UpdateValue(0, context);
  assert.deepEqual(Array.from(project.rawProjectedPosition), [ 50, 50 ]);
  assert.deepEqual(Array.from(project.projectedPosition), [ 100, 50 ]);
  assert.equal(project.isInFront, false);
  assert.equal(project.isVisible, true, "docking keeps a behind-camera bracket visible");
});


test("EveProjectBracket callback objects are invoked directly and malformed values fail", () =>
{
  const bracket = new eve.EveProjectBracket();
  const calls = [];
  bracket.displayChangeCallback = {
    CallVoid(owner, state)
    {
      calls.push([ "display", owner, state ]);
    }
  };
  bracket.bracketUpdateCallback = {
    CallVoid(owner)
    {
      calls.push([ "update", owner ]);
    }
  };
  vec3.set(bracket.trackPosition, 0, 0, -1);
  bracket.UpdateValue(0, makeContext());
  assert.deepEqual(calls.map(([ name ]) => name), [ "display", "update" ]);
  assert.ok(calls.every(([, owner ]) => owner === bracket));

  bracket.bracketUpdateCallback = {};
  assert.throws(() => bracket.UpdateValue(0, makeContext()), /CallVoid/u);
  bracket.bracketUpdateCallback = null;
  bracket.bracketIcon = { SetTranslation() {} };
  bracket.bracket = { ...makeSprite(), SetDisplayX: undefined };
  assert.throws(() => bracket.UpdateValue(0, makeContext()), /SetDisplayX/u);
});


test("EveProjectBracket preserves outer projection scratch across a reentrant visibility callback", () =>
{
  const bracket = new eve.EveProjectBracket();
  const context = makeContext();
  let reentered = false;
  bracket.dock = true;
  bracket.integerCoordinates = false;
  vec3.set(bracket.trackPosition, -2, 2, -1);
  bracket.displayChangeCallback = () =>
  {
    if (reentered) return;
    reentered = true;
    vec3.set(bracket.trackPosition, 0, 0, -1);
    bracket.UpdateValue(0, context);
  };

  bracket.UpdateValue(0, context);
  assert.equal(reentered, true);
  assert.deepEqual(Array.from(bracket.projectedPosition), [ 0, 100 ],
    "the outer docking calculation retains its own view-space position");
});
