import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { Tr2QuadRenderer, TriFrustum } from "../npm/dist/core/index.js";
import * as eve from "../npm/dist/eve/index.js";
import * as generatedEve from "../npm/dist/generated/eve/index.js";
import * as trinity from "../npm/dist/index.js";


function makeEffect(name, hash, events)
{
  const effect = new trinity.Tr2Effect();
  effect.GetHashValue = () => hash;
  effect.StartUpdate = () => events.push([ name, "start" ]);
  effect.SetVariableStore = store =>
  {
    effect.variableStore = store;
    events.push([ name, "store" ]);
  };
  effect.EndUpdate = () => events.push([ name, "end" ]);
  return effect;
}


function makeUpdateContext({ pixelSize = 5, visible = true, time = 4 } = {})
{
  const context = new eve.EveUpdateContext();
  const frustum = new TriFrustum();
  frustum.IsSphereVisible = () => visible;
  frustum.GetPixelSizeAccross = () => pixelSize;
  context.SetTime(time);
  context.SetVisibilityThreshold(1);
  context.SetLowDetailThreshold(10);
  context.SetMediumDetailThreshold(20);
  context.SetHighDetailThreshold(40);
  context.frustum = frustum;
  return context;
}


function assertArrayClose(actual, expected, epsilon = 1e-5)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `lane ${index}: expected ${expected[index]}, got ${actual[index]}`);
  }
}


function getRecordBySize(renderer, size)
{
  return [...renderer.GetEffectRecords().values()].find(record => record.instanceSize === size);
}


function getRecordData(renderer, record)
{
  const bytes = renderer.GetMergedData();
  const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  const start = record.bufferOffset / 4;
  return floats.slice(start, start + record.count * record.instanceSize / 4);
}


test("EveTacticalOverlay is maintained with scalar Carbon range fields", () =>
{
  const overlay = new eve.EveTacticalOverlay();
  assert.equal(trinity.EveTacticalOverlay, eve.EveTacticalOverlay);
  assert.equal("EveTacticalOverlay" in generatedEve, false);
  assert.equal(
    existsSync(new URL("../src/generated/eve/ui/EveTacticalOverlay.js", import.meta.url)),
    false
  );
  assert.deepEqual(
    [ overlay.activeRange, overlay.rangeFadeLength, overlay.rangeMultiplier, overlay.sourceRadius ],
    [ 200000, 50000, 1, 50 ]
  );
  assert.deepEqual(
    [ overlay.segmentsLow, overlay.segmentsMedium, overlay.segmentsHigh ],
    [ 2, 5, 9 ]
  );
  assert.equal(overlay.targetMaxSegments, 25000);
  assert.equal(overlay.arcSegmentMultiplier, 1);
  assert.equal(overlay.segmentCountMultiplier, 2);
  assert.equal(overlay.minRadiusForRange, 150);
  assert.equal(overlay.outsideInterestIntensity, 0.35);
  assert.equal(CjsSchema.getField(eve.EveTacticalOverlay, "activeRange")?.type.kind, "float32");
  assert.equal(CjsSchema.getField(eve.EveTacticalOverlay, "rangeFadeLength")?.type.kind, "float32");
  assert.equal(CjsSchema.getMethod(eve.EveTacticalOverlay, "UpdateVisibility")?.impl?.status, "adapted");
});


test("EveTacticalOverlay owns one initialized variable store and direct update order", () =>
{
  const events = [];
  const overlay = new eve.EveTacticalOverlay();
  overlay.anchorEffect = makeEffect("anchor", 7, events);
  overlay.connectorEffect = makeEffect("connector", 7, events);
  overlay.velocityEffect = makeEffect("velocity", 7, events);
  assert.equal(overlay.Initialize(), true);
  assert.deepEqual(events.map(([, action ]) => action), [
    "start", "store", "end",
    "start", "store", "end",
    "start", "store", "end"
  ]);
  assert.equal(overlay.anchorEffect.variableStore, overlay.connectorEffect.variableStore);
  assert.equal(overlay.connectorEffect.variableStore, overlay.velocityEffect.variableStore);
  const initializedStore = overlay.anchorEffect.variableStore;
  assert.deepEqual(Array.from(initializedStore.FindLocalVariable("PlanePosition").GetValue()), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(initializedStore.FindLocalVariable("Fadeout").GetValue()), [ 200000, 50000, 1, 50 ]);
  assert.deepEqual(Array.from(initializedStore.FindLocalVariable("RootVelocity").GetValue()), [ 0, 0, 0 ]);

  const calls = [];
  overlay.translationCurve = {
    GetValueAt(time, out)
    {
      calls.push([ "root-position", time ]);
      vec3.set(out, 0, 0, 0);
    },
    GetValueDotAt(time, out)
    {
      calls.push([ "root-velocity", time ]);
      vec3.set(out, 1, 2, 3);
    }
  };
  const track = new eve.EveTacticalOverlayTrackObject();
  track.translationCurve = {
    GetValueDotAt(time, out)
    {
      calls.push([ "track-velocity", time ]);
      vec3.set(out, 6, 7, 8);
    },
    GetValueAt(time, out)
    {
      calls.push([ "track-position", time ]);
      vec3.set(out, 0, 4, 3);
    }
  };
  overlay.trackObjects.push(track);
  overlay.activeRange = 120;
  overlay.rangeFadeLength = 30;
  overlay.rangeMultiplier = 2;
  overlay.sourceRadius = 5;
  overlay.UpdateSyncronous(makeUpdateContext({ time: 9 }));
  assert.deepEqual(calls, [
    [ "root-position", 9 ],
    [ "root-velocity", 9 ],
    [ "track-velocity", 9 ],
    [ "track-position", 9 ]
  ]);

  const store = overlay.anchorEffect.variableStore;
  assert.deepEqual(Array.from(store.FindLocalVariable("PlanePosition").GetValue()), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(store.FindLocalVariable("Fadeout").GetValue()), [ 120, 30, 2, 5 ]);
  assert.deepEqual(Array.from(store.FindLocalVariable("RootVelocity").GetValue()), [ 1, 2, 3 ]);

  const replacementEvents = [];
  overlay.anchorEffect = makeEffect("replacement", 8, replacementEvents);
  overlay.OnModified();
  assert.deepEqual(replacementEvents.map(([, action ]) => action), [ "start", "store", "end" ]);

  overlay.translationCurve = {};
  assert.throws(() => overlay.UpdateSyncronous(makeUpdateContext()), /GetValueAt/u);
  overlay.translationCurve = null;
  overlay.trackObjects = [ {} ];
  assert.throws(() => overlay.UpdateSyncronous(makeUpdateContext()), /UpdatePosition/u);

  const directTrack = new eve.EveTacticalOverlayTrackObject();
  directTrack.translationCurve = {
    GetValueDotAt() {},
    GetValueAt() {}
  };
  assert.throws(() => directTrack.UpdatePosition({}), /GetTime/u);
  directTrack.translationCurve = { GetValueAt() {} };
  assert.throws(() => directTrack.UpdatePosition(makeUpdateContext()), /GetValueDotAt/u);
  directTrack.translationCurve = { GetValueDotAt() {} };
  assert.throws(() => directTrack.UpdatePosition(makeUpdateContext()), /GetValueAt/u);
});


test("EveTacticalOverlay emits exact anchor, connector and velocity instance records", () =>
{
  const events = [];
  const overlay = new eve.EveTacticalOverlay();
  overlay.anchorEffect = makeEffect("anchor", 11, events);
  overlay.connectorEffect = makeEffect("connector", 11, events);
  overlay.velocityEffect = makeEffect("velocity", 11, events);
  overlay.Initialize();
  overlay.sourceRadius = 1;
  overlay.interestRange = 1;
  overlay.minRadiusForRange = 1;
  overlay.translationCurve = {
    GetValueAt(_time, out) { vec3.set(out, 0, 0, 0); },
    GetValueDotAt(_time, out) { vec3.set(out, 1, 2, 3); }
  };

  const track = new eve.EveTacticalOverlayTrackObject();
  track.radius = 2;
  track.isAggressive = true;
  track.showVelocity = true;
  track.translationCurve = {
    GetValueDotAt(_time, out) { vec3.set(out, 6, 7, 8); },
    GetValueAt(_time, out) { vec3.set(out, 0, 4, 3); }
  };
  overlay.trackObjects.push(track);
  overlay.interestObject = track;

  const context = makeUpdateContext({ pixelSize: 5 });
  overlay.UpdateSyncronous(context);
  overlay.UpdateVisibility(context, mat4.create());
  assert.equal(overlay.requestedSegmentsLast, 3);
  assert.equal(overlay.totalSegmentsLast, 5);

  const renderer = new Tr2QuadRenderer();
  overlay.RegisterWithQuadRenderer(renderer);
  overlay.AddQuadsToQuadRenderer(context.GetFrustum(), renderer);
  renderer.BeginRendering();
  assert.equal(renderer.GetEffectRecords().size, 3,
    "equal content hashes remain distinct by effect identity");

  const anchor = getRecordBySize(renderer, 16);
  const connector = getRecordBySize(renderer, 20);
  const velocity = getRecordBySize(renderer, 32);
  assert.equal(anchor.count, 1);
  assert.equal(connector.count, 5);
  assert.equal(velocity.count, 6);
  assert.equal(anchor.batchType, Tr2QuadRenderer.TriBatchType.TRIBATCHTYPE_ADDITIVE);
  assert.equal(Object.isFrozen(anchor.definition), true);
  assert.deepEqual(anchor.definition.map(({ usage, usageIndex, stream }) =>
    [ usage, usageIndex, stream ]), [ [ "TEXCOORD", 5, 0 ], [ "TEXCOORD", 0, 1 ] ]);
  assert.equal(connector.definition[2].offset, 16);
  assert.equal(velocity.definition[2].type, "FLOAT32_4");

  assertArrayClose(getRecordData(renderer, anchor), [ 0, 4, 3, 0.65 ]);
  const connectorData = getRecordData(renderer, connector);
  assertArrayClose(connectorData.slice(0, 5), [ 0, 4, 3, 1024, 2.65 ]);
  assertArrayClose(connectorData.slice(-5), [ 0, 4, 3, 1028, 2.65 ]);
  const velocityData = getRecordData(renderer, velocity);
  assertArrayClose(velocityData.slice(0, 8), [ 0, 4, 3, 0, 6, 7, 8, 2 ]);
  assertArrayClose(velocityData.slice(8, 16), [ 0, 4, 3, 1, 6, 7, 8, 2.9 ]);
  assertArrayClose(velocityData.slice(24, 32), [ 0, 0, 0, 0, 1, 2, 3, 1 ]);
  assertArrayClose(velocityData.slice(32, 40), [ 0, 4, 3, 0, 1, 2, 3, 2.9 ]);
  assertArrayClose(velocityData.slice(40, 48), [ 0, 0, 0, 0, 6, 7, 8, 1.9 ]);
});


test("EveTacticalOverlay subdivision bands and prior-frame budget match Carbon", () =>
{
  for (const [ pixelSize, expected ] of [ [ 0.5, 0 ], [ 5, 1 ], [ 15, 3 ], [ 30, 7 ], [ 50, 9 ] ])
  {
    const overlay = new eve.EveTacticalOverlay();
    overlay.arcSegmentMultiplier = 0;
    overlay.segmentCountMultiplier = 1;
    const track = new eve.EveTacticalOverlayTrackObject();
    vec3.set(track.position, 0, 1, 1);
    track.radius = 1;
    overlay.trackObjects.push(track);
    overlay.UpdateVisibility(makeUpdateContext({ pixelSize }), mat4.create());
    assert.equal(overlay.totalSegmentsLast, expected, `pixelSize ${pixelSize}`);
  }

  const capped = new eve.EveTacticalOverlay();
  capped.arcSegmentMultiplier = 0;
  capped.segmentCountMultiplier = 1;
  const track = new eve.EveTacticalOverlayTrackObject();
  vec3.set(track.position, 0, 1, 1);
  track.radius = 1;
  capped.trackObjects.push(track);
  const context = makeUpdateContext({ pixelSize: 50 });
  capped.UpdateVisibility(context, mat4.create());
  assert.equal(capped.totalSegmentsLast, 9);
  capped.targetMaxSegments = 1;
  capped.UpdateVisibility(context, mat4.create());
  assert.equal(capped.totalSegmentsLast, 1);

  capped.UpdateVisibility(makeUpdateContext({ pixelSize: 50, visible: false }), mat4.create());
  assert.equal(capped.totalSegmentsLast, 0);
});


test("EveTacticalOverlay inert IEve surface and required calls are explicit", () =>
{
  const overlay = new eve.EveTacticalOverlay();
  const out = vec3.fromValues(9, 9, 9);
  const transform = mat4.fromScaling(mat4.create(), [ 2, 3, 4 ]);
  const renderables = [];
  overlay.UpdateAsyncronous(makeUpdateContext());
  overlay.GetRenderables(renderables, null);
  assert.deepEqual(renderables, []);
  assert.equal(overlay.GetBoundingSphere(out), false);
  assert.equal(overlay.GetLocalBoundingBox(out, out), false);
  overlay.UpdateModelCenterWorldPosition(out, 0);
  assert.deepEqual(Array.from(out), [ 0, 0, 0 ]);
  vec3.set(out, 9, 9, 9);
  overlay.GetModelCenterWorldPosition(out);
  assert.deepEqual(Array.from(out), [ 0, 0, 0 ]);
  overlay.GetLocalToWorldTransform(transform);
  assert.deepEqual(Array.from(transform), Array.from(mat4.create()));
  assert.throws(() => overlay.UpdateVisibility({}, mat4.create()), /GetFrustum/u);
  overlay.anchorEffect = makeEffect("anchor", 1, []);
  assert.throws(() => overlay.RegisterWithQuadRenderer({}), /RegisterEffect/u);
});
