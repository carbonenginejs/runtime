// EveSpaceScene CPU visibility/gather drive. Carbon sources: EveSpaceScene.cpp
// Update cpp:434-603, BeginRender cpp:1295-1427 (lighting blend cpp:1333-1363,
// GatherLights cpp:1396-1416), GatherBatches cpp:1433-1525 ([VISIBILITY]
// cpp:1443-1467, [GATHER] cpp:1470-1507), UpdatePostProcessAttributes
// cpp:346-413, ReregisterEntities cpp:4064-4089, ClearComponentRegistry
// cpp:4091-4099; SimplePriorityBlend PriorityBlend.h:371-413.
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import {
  EveComponentType,
  EveEffectRoot2,
  EveEntity,
  EveSpaceObject2,
  EveSpaceScene,
  Tr2PostProcess2,
  Tr2PostProcessAttributes,
  Tr2PPBloomEffect,
  Tr2PPTaaEffect,
  Tr2RenderContext,
  TriFrustum,
  TriViewport
} from "../../npm/dist/trinity/index.js";


const EPSILON = 1e-5;

function assertClose(actual, expected, message)
{
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${message}: expected ${expected}, got ${actual}`
  );
}

function assertVecClose(actual, expected, message)
{
  assert.equal(actual.length, expected.length, `${message}: length`);
  for (let index = 0; index < expected.length; index++)
  {
    assertClose(actual[index], expected[index], `${message}[${index}]`);
  }
}

// Deliberately asymmetric camera (identity-parent fixtures prove nothing).
const EYE = vec3.fromValues(3, 5, -7);
const TARGET = vec3.fromValues(10, 2, 4);
const FORWARD = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), TARGET, EYE));

/** A real derived TriFrustum + a stamped Tr2RenderContext for the same pose. */
function MakeCamera({ eye = EYE, target = TARGET, up = [0, 1, 0] } = {})
{
  const view = mat4.lookAt(mat4.create(), eye, target, up);
  const projection = mat4.perspectiveZO(mat4.create(), 0.9, 1.6, 2, 500);
  const viewport = new TriViewport();
  viewport.__init__(0, 0, 1280, 800);
  const frustum = new TriFrustum();
  frustum.DeriveFrustum(view, eye, projection, viewport);
  const renderContext = new Tr2RenderContext();
  renderContext.SetViewTransform(view);
  return { view, projection, viewport, frustum, renderContext };
}

// --- Fixture 1: drive-order recorder ----------------------------------------

test("scene drive order matches Carbon GatherBatches: visibility then gather, camera parent chained", () =>
{
  const scene = new EveSpaceScene();
  const camera = MakeCamera();
  scene.updateContext.renderContext = camera.renderContext;

  const log = [];
  const MakeObjectStub = name => ({
    UpdateVisibility(updateContext, parentTransform)
    {
      log.push({ name, method: "UpdateVisibility", updateContext, parentTransform });
    },
    GetRenderables(out)
    {
      log.push({ name, method: "GetRenderables" });
      out.push(name);
    }
  });
  scene.objects.push(MakeObjectStub("object0"), MakeObjectStub("object1"));
  scene.staticParticles.push({
    Update(_updateContext)
    {
    },
    UpdateVisibility(...args)
    {
      log.push({ name: "staticParticles", method: "UpdateVisibility", args });
    },
    GetRenderables(frustumArg, out)
    {
      log.push({ name: "staticParticles", method: "GetRenderables", frustumArg });
      out.push("staticParticles");
    }
  });
  scene.planets.push({
    UpdateZOnlyVisibility(updateContext)
    {
      log.push({ name: "planet", method: "UpdateZOnlyVisibility", updateContext });
    }
  });
  scene.lensflares.push({
    UpdateVisibility(updateContext)
    {
      log.push({ name: "lensflare", method: "UpdateVisibility", updateContext });
    }
  });

  // Decision 7: the camera parent default-constructs as a real EveEffectRoot2.
  const cameraParent = scene.cameraAttachmentParent;
  assert.ok(cameraParent instanceof EveEffectRoot2, "cameraAttachmentParent default-constructs");
  for (const method of ["SetTransform", "UpdateSyncronous", "UpdateAsyncronous", "UpdateVisibility", "GetRenderables"])
  {
    const original = cameraParent[method].bind(cameraParent);
    cameraParent[method] = (...args) =>
    {
      log.push({ name: "cameraParent", method, args });
      return original(...args);
    };
  }

  scene.StampFrameContext({ frustum: camera.frustum });
  const inverseView = camera.renderContext.GetInverseViewTransform();
  scene.UpdateVisibility(inverseView);

  const sequence = log.map(entry => `${entry.name}.${entry.method}`);
  assert.deepEqual(sequence, [
    "object0.UpdateVisibility",
    "object1.UpdateVisibility",
    "cameraParent.SetTransform",
    "cameraParent.UpdateSyncronous",
    "cameraParent.UpdateAsyncronous",
    "cameraParent.UpdateVisibility",
    "staticParticles.UpdateVisibility",
    "planet.UpdateZOnlyVisibility",
    "lensflare.UpdateVisibility"
  ], "the cpp:1443-1467 [VISIBILITY] order");

  // Every object receives the scene context and the SAME identity const
  // (Carbon cpp:1441) - held by reference and never mutated.
  const identity = log[0].parentTransform;
  assert.equal(log[1].parentTransform, identity, "identity shared across objects");
  assert.equal(log[5].args[1], identity, "identity shared with the camera parent");
  assert.deepEqual(Array.from(identity), Array.from(mat4.create()), "identity never mutated");
  assert.equal(log[0].updateContext, scene.updateContext);
  // The camera parent receives the frame's inverse view (cpp:1449).
  assert.equal(log[2].args[0], inverseView);
  // staticParticles visibility takes ONE argument, no transform (cpp:1454-1456).
  assert.equal(log[6].args.length, 1);
  assert.equal(log[6].args[0], scene.updateContext);
  assert.equal(log[7].updateContext, scene.updateContext);
  assert.equal(log[8].updateContext, scene.updateContext);

  log.length = 0;
  const out = scene.GetRenderables([]);

  // [GATHER] order (cpp:1470-1507): objects, cameraParent LAST of allObjects,
  // then the staticParticles leg with the stamped frustum.
  assert.deepEqual(log.map(entry => `${entry.name}.${entry.method}`), [
    "object0.GetRenderables",
    "object1.GetRenderables",
    "cameraParent.GetRenderables",
    "staticParticles.GetRenderables"
  ]);
  assert.equal(log[3].frustumArg, camera.frustum, "staticParticles gather receives the stamped frustum");
  assert.deepEqual(out, ["object0", "object1", "staticParticles"]);
  assert.deepEqual(Array.from(identity), Array.from(mat4.create()), "identity still untouched after gather");
});

// --- Fixture 2: StampFrameContext -------------------------------------------

test("StampFrameContext stamps thresholds, LOD invariant, and holds the frustum by reference", () =>
{
  const scene = new EveSpaceScene();

  scene.StampFrameContext({ lodFactor: 4 });
  assert.equal(scene.updateContext.GetLodFactor(), 4);
  assert.equal(scene.updateContext.invLodFactor, 0.25, "SetLodFactor maintains invLodFactor");

  // Carbon console-var defaults (cpp:75-84) when keys are omitted.
  scene.StampFrameContext();
  assert.equal(scene.updateContext.GetVisibilityThreshold(), 5);
  assert.equal(scene.updateContext.GetLowDetailThreshold(), 100);
  assert.equal(scene.updateContext.GetMediumDetailThreshold(), 400);
  assert.equal(scene.updateContext.GetHighDetailThreshold(), 800);
  assert.equal(scene.updateContext.GetLodFactor(), 1);
  assert.equal(scene.updateContext.invLodFactor, 1);
  assert.equal(scene.updateContext.raytracingEnabled, false);
  assert.equal(scene.updateContext.GetFrustum(), null);

  const { frustum } = MakeCamera();
  scene.StampFrameContext({ frustum, raytracingEnabled: 1 });
  assert.equal(scene.updateContext.GetFrustum(), frustum, "frustum held by reference, not copied");
  assert.equal(scene.updateContext.raytracingEnabled, true, "raytracing flag coerced to boolean");
});

// --- Fixture 3: visibility -> gather integration ----------------------------

test("UpdateVisibility + GetRenderables cull real EveSpaceObject2s through a real TriFrustum", () =>
{
  const scene = new EveSpaceScene();
  const camera = MakeCamera();
  scene.updateContext.renderContext = camera.renderContext;

  const MakeObject = position =>
  {
    const object = new EveSpaceObject2();
    object.mesh = {
      GetBoundingBox(min, max)
      {
        min.set([-10, -10, -10]);
        max.set([10, 10, 10]);
        return true;
      },
      IsLoading()
      {
        return false;
      },
      GetGeometryResource()
      {
        return null;
      },
      UseWithScreenSize()
      {
        return true;
      }
    };
    object.SetBoundingSphereInformation(new Float32Array([0, 0, 0, 10]));
    object.translationCurve = {
      Update(_time, out)
      {
        out.set(position);
      }
    };
    return object;
  };

  // Radius-10 sphere 60 units down the view ray: far above the visibility
  // threshold (5 px). The other sits 60 units BEHIND the camera.
  const visible = MakeObject(vec3.scaleAndAdd(vec3.create(), EYE, FORWARD, 60));
  const hidden = MakeObject(vec3.scaleAndAdd(vec3.create(), EYE, FORWARD, -60));
  scene.objects.push(visible, hidden);

  scene.StampFrameContext({ frustum: camera.frustum });
  scene.Update(0, 1);
  scene.UpdateVisibility(camera.renderContext.GetInverseViewTransform());

  assert.equal(visible.isVisible, true, "in-frustum object stamped visible");
  assert.equal(hidden.isVisible, false, "behind-camera object stamped invisible");
  const out = scene.GetRenderables([]);
  assert.deepEqual(out, [visible], "only the visible object's renderables are gathered");

  // Flip the camera to look straight up: both objects leave the frustum and
  // the gather goes empty (the spec's implemented-into-the-void closure test).
  const flipped = MakeCamera({ target: [EYE[0], EYE[1] + 10, EYE[2]], up: [1, 0, 0] });
  scene.updateContext.renderContext = flipped.renderContext;
  scene.StampFrameContext({ frustum: flipped.frustum });
  scene.UpdateVisibility(flipped.renderContext.GetInverseViewTransform());
  assert.equal(visible.isVisible, false);
  assert.deepEqual(scene.GetRenderables([]), []);
});

// --- Fixture 4: UpdatePostProcessAttributes blend ---------------------------

test("UpdatePostProcessAttributes: descending priority-weight blend, copy-through, re-export", () =>
{
  const scene = new EveSpaceScene();
  scene.postprocess = new Tr2PostProcess2();
  const bloom = new Tr2PPBloomEffect();
  bloom.brightness = 0.25;
  scene.postprocess.SetBloom(bloom);
  const taa = new Tr2PPTaaEffect();
  scene.postprocess.SetTaa(taa);

  const MakeOwner = (priority, intensity, bloomBrightness) =>
  {
    const attributes = new Tr2PostProcessAttributes();
    attributes.Reset();
    attributes.priority = priority;
    attributes.intensity = intensity;
    attributes.bloomBrightness = bloomBrightness;
    attributes.bloomBrightnessEnabled = true;
    const owner = new EveEntity();
    owner.GetPostProcessAttributes = () => attributes;
    return owner;
  };
  // Registered MEDIUM before HIGH: the descending sort must reorder them.
  scene.componentRegistry.RegisterComponent(
    EveComponentType.PostProcessOwner, MakeOwner(Tr2PostProcessAttributes.MEDIUM_PRIORITY, 1, 0.5));
  scene.componentRegistry.RegisterComponent(
    EveComponentType.PostProcessOwner, MakeOwner(Tr2PostProcessAttributes.HIGH_PRIORITY, 0.5, 1.0));

  scene.UpdatePostProcessAttributes();

  const combined = scene.GetPostProcess();
  assert.ok(combined instanceof Tr2PostProcess2);
  // HIGH consumes 0.5 weight, MEDIUM the remaining 0.5, the scene default
  // (priority 0) gets 0: bloom = 1.0*0.5 + 0.5*0.5 = 0.75.
  assertClose(combined.GetBloomIfAvailable().brightness, 0.75, "blended bloom brightness");
  // Engine-effect copy-through from the scene default only (cpp:389-406).
  assert.equal(combined.taa, taa, "TAA copied through, not blended");
  // Re-export at MEDIUM_PRIORITY (cpp:407).
  assert.equal(scene.combinedPostProcessAttributes.priority, Tr2PostProcessAttributes.MEDIUM_PRIORITY);
  assertClose(scene.combinedPostProcessAttributes.bloomBrightness, 0.75, "re-exported bloom");
  assert.equal(scene.postProcessDebug, null, "no debug payload while debugging is off");

  scene.enablePostProcessDebugging = true;
  scene.UpdatePostProcessAttributes();
  assert.ok(scene.postProcessDebug && typeof scene.postProcessDebug === "object", "debug dict when enabled");
  assert.ok("bloomBrightness" in scene.postProcessDebug);
  scene.enablePostProcessDebugging = false;

  // display gate (cpp:348): no re-blend, GetPostProcess() answers null.
  scene.display = false;
  scene.componentRegistry.GetComponents(EveComponentType.PostProcessOwner)[0]
    .GetPostProcessAttributes().bloomBrightness = 9;
  scene.UpdatePostProcessAttributes();
  assert.equal(scene.GetPostProcess(), null, "GetPostProcess is null while not displayed");
  scene.display = true;
  assertClose(combined.GetBloomIfAvailable().brightness, 0.75, "combine skipped while not displayed");

  // The scene default is always in the source list: alone it blends through.
  const defaultOnly = new EveSpaceScene();
  defaultOnly.postprocess = new Tr2PostProcess2();
  const defaultBloom = new Tr2PPBloomEffect();
  defaultBloom.brightness = 0.25;
  defaultOnly.postprocess.SetBloom(defaultBloom);
  defaultOnly.UpdatePostProcessAttributes();
  assertClose(defaultOnly.GetPostProcess().GetBloomIfAvailable().brightness, 0.25, "scene default alone");
});

// --- Fixture 5: lighting blend quirks ---------------------------------------

function MakeOverrideOwner(info)
{
  const owner = new EveEntity();
  owner.GetOverrides = () => ({
    priority: info.priority,
    intensity: info.intensity,
    value: {
      sunColor: vec4.clone(info.sunColor),
      sunIntensity: info.sunIntensity,
      backgroundIntensity: info.backgroundIntensity,
      reflectionIntensity: info.reflectionIntensity
    }
  });
  return owner;
}

test("BlendLightingOverrides (a): no components round-trips the baseline exactly", () =>
{
  const scene = new EveSpaceScene();
  vec4.set(scene.sunDiffuseColor, 0.5, 2, 0.25, 1);
  scene.nebulaIntensity = 0.7;
  scene.reflectionIntensity = 0.3;

  scene.BlendLightingOverrides();

  // Normalize by max channel (2) then re-scale by the blended intensity (2):
  // the original color survives, all four components.
  assertVecClose(scene.currentSunColor, [0.5, 2, 0.25, 1], "sun color round trip");
  assertClose(scene.currentNebulaIntensity, 0.7, "nebula pass-through");
  assertClose(scene.currentReflectionIntensity, 0.3, "reflection pass-through");
});

test("BlendLightingOverrides (b): intensity 0.3 blends 0.3*override + 0.7*baseline (unclamped subtraction)", () =>
{
  const scene = new EveSpaceScene();
  vec4.set(scene.sunDiffuseColor, 0.5, 2, 0.25, 1);
  scene.nebulaIntensity = 0.7;
  scene.reflectionIntensity = 0.3;
  scene.componentRegistry.RegisterComponent(EveComponentType.EveLightingOverride, MakeOverrideOwner({
    priority: 2,
    intensity: 0.3,
    sunColor: vec4.fromValues(1, 0, 0, 1),
    sunIntensity: 2,
    backgroundIntensity: 5,
    reflectionIntensity: 7
  }));

  scene.BlendLightingOverrides();

  // Baseline: sunIntensity 2, normalized color (0.25, 1, 0.125, 0.5).
  const blendedColor = [
    0.3 * 1 + 0.7 * 0.25,
    0.3 * 0 + 0.7 * 1,
    0.3 * 0 + 0.7 * 0.125,
    0.3 * 1 + 0.7 * 0.5
  ];
  const blendedIntensity = 0.3 * 2 + 0.7 * 2;
  assertVecClose(
    scene.currentSunColor,
    blendedColor.map(component => component * blendedIntensity),
    "currentSunColor = blended color * blended intensity"
  );
  assertClose(scene.currentNebulaIntensity, 0.3 * 5 + 0.7 * 0.7, "nebula blend");
  assertClose(scene.currentReflectionIntensity, 0.3 * 7 + 0.7 * 0.3, "reflection blend");
});

test("BlendLightingOverrides (c): intensity 2 consumes all weight and terminates the walk", () =>
{
  const scene = new EveSpaceScene();
  vec4.set(scene.sunDiffuseColor, 0.5, 2, 0.25, 1);
  scene.nebulaIntensity = 0.7;
  scene.reflectionIntensity = 0.3;
  scene.componentRegistry.RegisterComponent(EveComponentType.EveLightingOverride, MakeOverrideOwner({
    priority: 2,
    intensity: 2,
    sunColor: vec4.fromValues(0.2, 0.4, 0.6, 0.8),
    sunIntensity: 3,
    backgroundIntensity: 9,
    reflectionIntensity: 11
  }));

  scene.BlendLightingOverrides();

  // weight = 2 * (1/max(2,1)) = 1; remainingWeight goes to -1 and the loop
  // breaks - the baseline contributes NOTHING.
  assertVecClose(scene.currentSunColor, [0.6, 1.2, 1.8, 2.4], "override * its own sunIntensity");
  assertClose(scene.currentNebulaIntensity, 9, "baseline nebula fully displaced");
  assertClose(scene.currentReflectionIntensity, 11, "baseline reflection fully displaced");
});

test("BlendLightingOverrides (d): all-zero sun color produces zeros, never NaN", () =>
{
  const scene = new EveSpaceScene();
  vec4.set(scene.sunDiffuseColor, 0, 0, 0, 0);

  scene.BlendLightingOverrides();

  for (let index = 0; index < 4; index++)
  {
    assert.ok(!Number.isNaN(scene.currentSunColor[index]), `component ${index} not NaN`);
    assert.equal(scene.currentSunColor[index], 0);
  }
});

test("BlendLightingOverrides (e): equal-priority intensities 1 and 3 weigh 0.25/0.75", () =>
{
  const scene = new EveSpaceScene();
  scene.componentRegistry.RegisterComponent(EveComponentType.EveLightingOverride, MakeOverrideOwner({
    priority: 2,
    intensity: 1,
    sunColor: vec4.fromValues(1, 1, 1, 1),
    sunIntensity: 4,
    backgroundIntensity: 1,
    reflectionIntensity: 2
  }));
  scene.componentRegistry.RegisterComponent(EveComponentType.EveLightingOverride, MakeOverrideOwner({
    priority: 2,
    intensity: 3,
    sunColor: vec4.fromValues(1, 1, 1, 1),
    sunIntensity: 8,
    backgroundIntensity: 2,
    reflectionIntensity: 6
  }));

  scene.BlendLightingOverrides();

  // Group total 4 -> normalized weights 0.25 and 0.75; remaining -3 breaks.
  assertClose(scene.currentNebulaIntensity, 0.25 * 1 + 0.75 * 2, "0.25/0.75 nebula mix");
  assertClose(scene.currentReflectionIntensity, 0.25 * 2 + 0.75 * 6, "0.25/0.75 reflection mix");
  assertVecClose(
    scene.currentSunColor,
    [7, 7, 7, 7],
    "unit color * blended intensity 0.25*4 + 0.75*8"
  );
});

test("BlendLightingOverrides picks the dynamic-lights sun color only when both flags agree", () =>
{
  const scene = new EveSpaceScene();
  vec4.set(scene.sunDiffuseColor, 1, 0, 0, 1);
  vec4.set(scene.sunDiffuseColorWithDynamicLights, 0, 1, 0, 1);

  scene.useSunDiffuseColorWithDynamicLights = true;
  scene.dynamicLightingEnabled = false;
  scene.BlendLightingOverrides();
  assertVecClose(scene.currentSunColor, [1, 0, 0, 1], "setting off: plain sun color");

  scene.dynamicLightingEnabled = true;
  scene.BlendLightingOverrides();
  assertVecClose(scene.currentSunColor, [0, 1, 0, 1], "both flags on: dynamic-lights color");
});

// --- Fixture 6: GatherLights contract ---------------------------------------

test("GatherLights drives the manager duck in Carbon's exact order", () =>
{
  const scene = new EveSpaceScene();
  const { frustum } = MakeCamera();
  scene.StampFrameContext({ frustum, lodFactor: 2 });

  const calls = [];
  const manager = {
    SetShadowQuality: quality => calls.push(["SetShadowQuality", quality]),
    Clear: () => calls.push(["Clear"]),
    SetFrustum: frustumArg => calls.push(["SetFrustum", frustumArg]),
    AdjustLightCutoff: lodFactor => calls.push(["AdjustLightCutoff", lodFactor]),
    ResolveLightData: () => calls.push(["ResolveLightData"])
  };
  const MakeLightOwner = name =>
  {
    const owner = new EveEntity();
    owner.GetLights = managerArg => calls.push([name, managerArg]);
    return owner;
  };
  scene.componentRegistry.RegisterComponent(EveComponentType.LightOwner, MakeLightOwner("owner0"));
  scene.componentRegistry.RegisterComponent(EveComponentType.LightOwner, MakeLightOwner("owner1"));
  // A non-LightOwner in another collection must not be visited.
  const bystander = new EveEntity();
  bystander.GetOverrides = () => ({});
  scene.componentRegistry.RegisterComponent(EveComponentType.EveLightingOverride, bystander);

  scene.GatherLights(manager);

  assert.deepEqual(calls, [
    ["SetShadowQuality", 3],
    ["Clear"],
    ["SetFrustum", frustum],
    ["AdjustLightCutoff", 2],
    ["owner0", manager],
    ["owner1", manager],
    ["ResolveLightData"]
  ], "the cpp:1400-1415 sequence");

  // Zero owners: Clear/Resolve still run (stale lights must drop).
  const emptyScene = new EveSpaceScene();
  calls.length = 0;
  emptyScene.GatherLights(manager);
  assert.deepEqual(calls.map(call => call[0]), [
    "SetShadowQuality", "Clear", "SetFrustum", "AdjustLightCutoff", "ResolveLightData"
  ]);

  // Null manager: dynamic lighting off - a silent no-op.
  assert.doesNotThrow(() => scene.GatherLights(null));
  // A partial duck (no manager methods at all) still gets the owner loop.
  calls.length = 0;
  const partialDuck = {};
  scene.GatherLights(partialDuck);
  assert.deepEqual(calls, [["owner0", partialDuck], ["owner1", partialDuck]], "partial duck: owners still visited");
});

// --- Fixture 7: ClearComponentRegistry + one-shot trigger model -------------

test("ReregisterEntities registers the graph once; ClearComponentRegistry detaches destroy-only", () =>
{
  const scene = new EveSpaceScene();
  const registry = scene.componentRegistry;
  const cameraParent = scene.cameraAttachmentParent;
  cameraParent.lights.push({ AddLight() {} });

  const object = new EveSpaceObject2();
  scene.objects.push(object);
  const uiObject = new EveSpaceObject2();
  scene.uiObjects.push(uiObject);

  scene.ReregisterEntities();

  assert.equal(object.registry, registry, "objects entity registered");
  assert.equal(cameraParent.registry, registry, "camera parent registered unconditionally");
  assert.ok(
    registry.GetComponents(EveComponentType.LightOwner).includes(cameraParent),
    "camera parent with lights lands in the LightOwner collection"
  );
  // Decision 9 / cpp:3462: uiObjects are NEVER registered.
  assert.equal(uiObject.registry, null, "uiObjects excluded from registration");

  scene.ClearComponentRegistry();
  assert.equal(scene.componentRegistry, null, "registry nulled (cpp:4098)");
  assert.equal(cameraParent.registry, null, "entities detached");
  assert.equal(object.registry, null);

  // The null guard makes the destroy-only follow-up a no-op, not a throw.
  assert.doesNotThrow(() => scene.ReregisterEntities());
});

// --- Fixture 8: display gates -----------------------------------------------

test("display=false gates every BeginRender-phase method; update=false gates Update but not stamping", () =>
{
  const scene = new EveSpaceScene();
  scene.display = false;

  const calls = [];
  scene.objects.push({
    UpdateVisibility()
    {
      calls.push("visibility");
    },
    GetRenderables(out)
    {
      calls.push("gather");
      out.push("stub");
    }
  });
  const cameraParent = scene.cameraAttachmentParent;
  cameraParent.SetTransform = () => calls.push("camera");

  scene.UpdateVisibility(mat4.create());
  assert.deepEqual(scene.GetRenderables([]), [], "gather returns the untouched out array");

  vec4.set(scene.sunDiffuseColor, 1, 1, 1, 1);
  scene.BlendLightingOverrides();
  assert.deepEqual(Array.from(scene.currentSunColor), [1, 1, 1, 1], "Carbon constructor output untouched");
  assert.equal(scene.currentNebulaIntensity, 1);

  scene.postprocess = new Tr2PostProcess2();
  scene.UpdatePostProcessAttributes();
  assert.equal(scene.GetPostProcess(), null, "no combined post-process while hidden");
  scene.display = true;
  assert.equal(scene.GetPostProcess(), null, "combine never ran while hidden");
  scene.display = false;

  const managerCalls = [];
  scene.GatherLights({
    Clear: () => managerCalls.push("clear"),
    ResolveLightData: () => managerCalls.push("resolve")
  });
  assert.equal(managerCalls.length, 0, "light gather gated");
  assert.equal(calls.length, 0, "no graph method was reached");

  // update=false: Update no-ops (cpp:466-469) but the driver-owned
  // StampFrameContext still stamps (matches Carbon's fast path cpp:444-462).
  const frozen = new EveSpaceScene();
  frozen.update = false;
  frozen.Update(0, 5);
  assert.equal(frozen.updateTime, 0, "Update gated by m_update");
  assert.equal(frozen.updateContext.GetTime(), 0);
  frozen.StampFrameContext({ lodFactor: 2, visibilityThreshold: 9 });
  assert.equal(frozen.updateContext.GetLodFactor(), 2, "stamping is unconditional");
  assert.equal(frozen.updateContext.GetVisibilityThreshold(), 9);
});
