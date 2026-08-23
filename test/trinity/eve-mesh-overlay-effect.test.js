import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { EveMeshOverlayEffect } from "../../npm/dist/trinity/index.js";


test("EveMeshOverlayEffect routes batches and owns its OverlayType enum", () =>
{
  const overlay = new EveMeshOverlayEffect();
  const opaque = {};
  const decal = {};
  const transparent = {};
  const additive = {};
  const distortion = {};
  overlay.opaqueEffects.push(opaque);
  overlay.decalEffects.push(decal);
  overlay.transparentEffects.push(transparent);
  overlay.additiveEffects.push(additive);
  overlay.distortionEffects.push(distortion);

  assert.equal(overlay.GetEffects(TriBatchType.TRIBATCHTYPE_OPAQUE), overlay.opaqueEffects);
  assert.equal(overlay.GetEffects(TriBatchType.TRIBATCHTYPE_DECAL), overlay.decalEffects);
  assert.equal(overlay.GetEffects(TriBatchType.TRIBATCHTYPE_TRANSPARENT), overlay.transparentEffects);
  assert.equal(overlay.GetEffects(TriBatchType.TRIBATCHTYPE_ADDITIVE), overlay.additiveEffects);
  assert.equal(overlay.GetEffects(TriBatchType.TRIBATCHTYPE_DISTORTION), overlay.distortionEffects);
  assert.equal(overlay.GetEffects(TriBatchType.TRIBATCHTYPE_DEPTH), null);
  assert.equal(overlay.GetType(TriBatchType.TRIBATCHTYPE_OPAQUE), EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY);
  assert.equal(overlay.GetType(TriBatchType.TRIBATCHTYPE_TRANSPARENT), EveMeshOverlayEffect.OverlayType.TYPE_ALL);
  assert.equal(EveMeshOverlayEffect.OverlayType.TYPE_COUNT, 2);
  assert.equal(Object.isFrozen(EveMeshOverlayEffect.OverlayType), true);
  assert.equal(overlay.HasTransparentArea(), true);

  overlay.display = false;
  assert.equal(overlay.GetEffects(TriBatchType.TRIBATCHTYPE_OPAQUE), null);
  assert.equal(overlay.HasTransparentArea(), true, "transparent predicate is not display-gated");
});

test("EveMeshOverlayEffect forwards shader options and controller ownership", () =>
{
  const calls = [];
  const effect = { SetOption: (name, value) => calls.push(["option", name, value]) };
  const controller = {
    linked: false,
    IsLinked() { return this.linked; },
    Link(owner) { this.linked = true; calls.push(["link", owner]); },
    Unlink() { this.linked = false; calls.push(["unlink"]); },
    SetVariable: (name, value) => calls.push(["variable", name, value]),
    HandleEvent: name => calls.push(["event", name]),
    Start: () => calls.push(["start"]),
    Update: frequency => calls.push(["update", frequency])
  };
  const overlay = new EveMeshOverlayEffect();
  for (const effects of [
    overlay.opaqueEffects,
    overlay.decalEffects,
    overlay.transparentEffects,
    overlay.additiveEffects,
    overlay.distortionEffects
  ])
  {
    effects.push(effect);
  }
  overlay.controllers.push(controller);

  assert.equal(overlay.Initialize(), true);
  assert.deepEqual(calls.shift(), ["link", overlay]);
  assert.equal(overlay.Initialize(), true);
  assert.equal(calls.length, 0, "already-linked controller is not linked again");

  overlay.SetShaderOption("QUALITY", "HIGH");
  overlay.SetControllerVariable("Intensity", 0.75);
  overlay.HandleControllerEvent("Fire");
  overlay.StartControllers();
  assert.deepEqual(calls, [
    ["option", "QUALITY", "HIGH"],
    ["option", "QUALITY", "HIGH"],
    ["option", "QUALITY", "HIGH"],
    ["option", "QUALITY", "HIGH"],
    ["option", "QUALITY", "HIGH"],
    ["variable", "Intensity", 0.75],
    ["event", "Fire"],
    ["start"]
  ]);

  overlay.OnListModified(0x09, 0, 0, controller, overlay.controllers);
  assert.deepEqual(calls.at(-1), ["unlink"]);
  overlay.OnListModified(0x08, 0, 0, controller, overlay.controllers);
  assert.deepEqual(calls.at(-1), ["link", overlay]);
  const beforeSuppressedEvents = calls.length;
  overlay.OnListModified(0x18, 0, 0, controller, overlay.controllers);
  overlay.OnListModified(0x09, 0, 0, controller, []);
  assert.equal(calls.length, beforeSuppressedEvents, "loading and unrelated-list events are ignored");
  overlay.OnListModified(0x07, 0, 0, null, overlay.controllers);
  assert.deepEqual(calls.at(-1), ["unlink"]);
});

test("EveMeshOverlayEffect drives its single named curve set", () =>
{
  const calls = [];
  const overlay = new EveMeshOverlayEffect();
  overlay.curveSet = {
    GetName: () => "Pulse",
    ResetTimeRange: () => calls.push(["reset"]),
    Play: () => calls.push(["play"]),
    PlayTimeRange: name => calls.push(["range", name]),
    Stop: () => calls.push(["stop"]),
    GetMaxCurveDuration: () => 6,
    GetRangeDuration: name => name === "Burst" ? 2.5 : 0,
    Update: (realTime, simTime) => calls.push(["curveUpdate", realTime, simTime])
  };
  overlay.controllers.push({ Update: frequency => calls.push(["controllerUpdate", frequency]) });

  overlay.PlayCurveSet("Pulse");
  overlay.PlayCurveSet("Pulse", "Burst");
  overlay.StopCurveSet("Pulse");
  assert.equal(overlay.GetCurveSetDuration("Pulse"), 6);
  assert.equal(overlay.GetCurveSetDuration("Other"), 0);
  assert.equal(overlay.GetRangeDuration("Pulse", "Burst"), 2.5);
  overlay.Update(10, 4);

  assert.deepEqual(calls, [
    ["reset"],
    ["play"],
    ["range", "Burst"],
    ["stop"],
    ["curveUpdate", 10, 4],
    ["controllerUpdate", 0.5]
  ]);

  calls.length = 0;
  overlay.update = false;
  overlay.Update(11, 5);
  overlay.update = true;
  const curveSet = overlay.curveSet;
  overlay.curveSet = null;
  overlay.Update(12, 6);
  overlay.curveSet = curveSet;
  assert.deepEqual(calls, [], "both update gates also suppress controller updates");
});

test("completed EveMeshOverlayEffect is maintained and source-backed", () =>
{
  assert.equal(
    existsSync(new URL("../../src/trinity/generated/eve/overlays/EveMeshOverlayEffect.js", import.meta.url)),
    false
  );
  assert.equal(CjsSchema.getMethod(EveMeshOverlayEffect, "GetEffects")?.impl?.status, "adapted");
  assert.equal(CjsSchema.getMethod(EveMeshOverlayEffect, "GetType")?.impl?.status, "implemented");

  const summary = JSON.parse(readFileSync(new URL("../../src/trinity/generated/summary.json", import.meta.url), "utf8"));
  assert.equal(
    summary.skipped.some(entry =>
      entry.family === "eve/overlays" &&
      entry.className === "EveMeshOverlayEffect" &&
      entry.reason === "hand-maintained source exists"),
    true
  );
});
