import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  EveEffectRoot2,
  EveEntity,
  EveImpactOverlay,
  EveLocatorSets,
  EveLocator2,
  EvePlanet,
  EveRootTransform,
  EveSpaceObjectChild,
  EveSpaceObject2,
  Tr2RenderContext,
  Tr2Lod,
  TriObserverLocal
} from "../../npm/dist/trinity/index.js";
import { EveChildInheritProperties } from "../../npm/dist/trinity/eve/child/EveChildInheritProperties.js";
import { withITr2Controller } from "../../npm/dist/trinity/controllers/ITr2Controller.js";
import { IEveInheritPropertiesOwner, withIEveInheritPropertiesOwner } from "../../npm/dist/trinity/eve/IEveInheritPropertiesOwner.js";
import { EveChildMesh } from "../../npm/dist/trinity/eve/child/EveChildMesh.js";


const assertVecNear = (actual, expected, epsilon = 1e-6) =>
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `component ${index}: expected ${expected[index]}, received ${actual[index]}`);
  }
};

test("EveRootTransform returns its authored Carbon bounding radius", () =>
{
  const root = new EveRootTransform();
  assert.equal(root.GetBoundingSphereRadius(), -1);
  root.boundingSphereRadius = 42.5;
  assert.equal(root.GetBoundingSphereRadius(), 42.5);
  assert.equal(CjsSchema.GetConstructor("EveRootTransform"), EveRootTransform);
  assert.equal(existsSync(new URL("../../src/trinity/generated/eve/spaceObject/EveRootTransform.js", import.meta.url)), false);
});

test("EveRootTransform evaluates detached curves and implements Carbon targetable behavior", () =>
{
  const root = new EveRootTransform();
  root.boundingSphereRadius = 4;
  root.translationCurve = {
    Update(time, out)
    {
      assert.equal(time, 3);
      out.set([10, 20, 30]);
    }
  };
  root.modelTranslationCurve = {
    Update(time, out)
    {
      assert.equal(time, 3);
      out.set([1, 0, 0]);
    }
  };

  assert.equal(root.UpdateSyncronous({ currentTime: 3, deltaTime: 0 }), true);
  root.UpdateViewDependentData({
    GetFrustum()
    {
      return null;
    },
    renderContext: new Tr2RenderContext()
  });
  assertVecNear(root.worldTransform.slice(12, 15), [11, 20, 30]);
  assert.equal(root.GetDamageLocatorCount(), 0);
  const target = new Float32Array(3);
  assert.equal(root.GetDamageLocatorPosition(0, true, target), true);
  assertVecNear(target, [11, 20, 30]);
  assert.equal(root.GetDamageLocatorDirection(0, true, target), true);
  assertVecNear(target, [0, 1, 0]);
  assert.equal(root.GetImpactPosition(0, null, [11, 20, 30], 0.1, target), true);
  assert.equal(root.GetRadius(), 4);
  assert.equal(root.CreateImpact(0, [0, 1, 0], 1, 1), -1);
  assert.equal(root.UpdateImpact(target, [0, 1, 0], 0), false);
  assert.equal(root.HasImpactConfigurationShield(), false);
  assertVecNear(root.GetMissPosition([11, 21, 30], [11, 21, 20], target), [11, 24.5, 30]);
});

test("EveEffectRoot2 owns Carbon effect transforms, lifecycle, LOD, and target surface", () =>
{
  const effect = new EveEffectRoot2();
  const calls = [];
  const controller = {
    linked: false,
    IsLinked()
    {
      return this.linked;
    },
    Link(owner)
    {
      this.linked = true;
      calls.push(["link", owner]);
    },
    Update(frequency)
    {
      calls.push(["controller-update", frequency]);
    },
    SetVariable(name, value)
    {
      calls.push(["controller-variable", name, value]);
    },
    HandleEvent(name)
    {
      calls.push(["controller-event", name]);
    },
    Start()
    {
      calls.push(["controller-start"]);
    }
  };
  const curveSet = {
    name: "impact",
    Update(realTime, simTime)
    {
      calls.push(["curve-update", realTime, simTime]);
    },
    Play()
    {
      calls.push(["curve-play"]);
    },
    Stop()
    {
      calls.push(["curve-stop"]);
    },
    ResetTimeRange()
    {
      calls.push(["curve-reset"]);
    },
    PlayTimeRange(name)
    {
      calls.push(["curve-range", name]);
    },
    GetName()
    {
      return this.name;
    },
    GetMaxCurveDuration()
    {
      return 3;
    },
    GetRangeDuration(name)
    {
      return name === "burst" ? 2 : 0;
    }
  };
  const child = {
    name: "visual",
    UpdateSyncronous(context, params)
    {
      calls.push(["child-sync", context, params]);
    },
    UpdateAsyncronous(context, params)
    {
      calls.push(["child-async", context, params]);
    },
    UpdateVisibility(context, parentTransform, lod)
    {
      calls.push(["child-visibility", context, parentTransform, lod]);
    },
    ChangeLOD(lod)
    {
      calls.push(["child-lod", lod]);
    },
    GetRenderables(out)
    {
      out.push("visual");
    },
    SetControllerVariable(name, value)
    {
      calls.push(["child-variable", name, value]);
    },
    HandleControllerEvent(name)
    {
      calls.push(["child-event", name]);
    },
    StartControllers()
    {
      calls.push(["child-start"]);
    },
    SetProceduralContainerVariable(name, value)
    {
      calls.push(["child-procedural", name, value]);
    },
    PlayAllCurveSets()
    {
      calls.push(["child-play"]);
    },
    StopAllCurveSets()
    {
      calls.push(["child-stop"]);
    },
    PlayCurveSet(name, rangeName)
    {
      calls.push(["child-play-set", name, rangeName]);
    },
    StopCurveSet(name)
    {
      calls.push(["child-stop-set", name]);
    },
    UpdateCurveSet(name, time)
    {
      calls.push(["child-update-set", name, time]);
    },
    GetCurveSetDuration(name)
    {
      return name === "impact" ? 5 : 0;
    },
    GetRangeDuration(name, rangeName)
    {
      return name === "impact" && rangeName === "burst" ? 4 : 0;
    }
  };
  effect.controllers.push(controller);
  effect.curveSets.push(curveSet);
  effect.effectChildren.push(child);
  effect.observers.push({
    Update(transform)
    {
      calls.push(["observer", Array.from(transform.slice(12, 15))]);
    }
  });
  effect.translationCurve = {
    Update(time, out)
    {
      assert.equal(time, 4);
      out.set([10, 0, 0]);
    }
  };
  effect.translation.set([0, 2, 0]);
  effect.boundingSphereCenter.set([1, 0, 0]);
  effect.boundingSphereRadius = 5;

  assert.equal(effect.Initialize(), true);
  assert.equal(calls[0][0], "link");
  assert.equal(calls[0][1], effect);
  const context = { currentTime: 4, highDetailThreshold: 100 };
  assert.equal(effect.UpdateSyncronous(context), true);
  const sync = calls.find(call => call[0] === "child-sync");
  assert.equal(sync[1], context);
  assert.equal(sync[2].spaceObjectParent, effect);
  assertVecNear(sync[2].localToWorldTransform.slice(12, 15), [10, 2, 0]);
  assert.equal(effect.UpdateAsyncronous(context), 0.5);
  assert.deepEqual(calls.find(call => call[0] === "controller-update"), ["controller-update", 0.5]);
  assert.deepEqual(calls.find(call => call[0] === "curve-update"), ["curve-update", 4, 4]);

  effect.dynamicLOD = true;
  const visibilityContext = {
    mediumDetailThreshold: 40,
    lowDetailThreshold: 10,
    frustum: {
      IsSphereVisible()
      {
        return true;
      },
      GetPixelSizeAccross()
      {
        return 50;
      }
    }
  };
  assert.equal(effect.UpdateVisibility(visibilityContext), true);
  assert.equal(effect.lodLevel, Tr2Lod.TR2_LOD_HIGH);
  const renderables = effect.GetRenderables([]);
  assert.deepEqual(renderables, ["visual"]);
  assert.deepEqual(calls.find(call => call[0] === "child-lod"), ["child-lod", Tr2Lod.TR2_LOD_HIGH]);

  const sphere = new Float32Array(4);
  assert.equal(effect.GetBoundingSphere(sphere), true);
  assertVecNear(sphere, [1, 0, 0, 5]);
  assertVecNear(effect.GetModelCenterWorldPosition(), [11, 2, 0]);
  assertVecNear(effect.GetWorldPosition(), [10, 0, 0]);
  assert.equal(effect.GetDamageLocatorPosition(0, true, new Float32Array(3)), true);
  assert.equal(effect.GetImpactPosition(0, null, [10, 0, 0], 0.1), true);
  assert.equal(effect.GetRadius(), 5);
  assert.equal(effect.GetCurveSetDuration("impact"), 5);
  assert.equal(effect.GetRangeDuration("impact", "burst"), 4);
  // Carbon memsets both records, then restores only the two neutral lanes, so a
  // dirty record handed back in comes out clean.
  const perObject = effect.GetPerObjectStructs();
  perObject.vs.SetIndex("boneOffsets", 0, [ 9 ]);
  perObject.ps.Set("clipRadiusSq", [ 12 ]);
  perObject.vs.Set("shipData", [ 7, 7, 7, 7 ]);
  effect.GetPerObjectStructs(perObject.vs, perObject.ps);
  assert.equal(perObject.vs.GetIndex("boneOffsets", 0)[0], 0);
  assert.equal(perObject.ps.Get("clipRadiusSq")[0], 0);
  assertVecNear(perObject.vs.Get("shipData"), [0, 1, 0, 1]);
  assertVecNear(perObject.ps.Get("shipData"), [0, 1, 0, 1]);

  effect.Start();
  effect.Stop();
  effect.PlayCurveSet("impact", "burst");
  effect.StopCurveSet("impact");
  effect.UpdateCurveSet("impact", 6);
  effect.SetControllerVariable("Intensity", 0.75);
  effect.HandleControllerEvent("explode");
  effect.StartControllers();
  effect.SetProceduralContainerVariable("seed", 7);
  assert.equal(effect.GetEffectChildByName("visual"), child);
  assert.equal(calls.some(call => call[0] === "child-play"), true);
  assert.equal(calls.some(call => call[0] === "child-variable" && call[1] === "Intensity" && call[2] === 0.75), true);
  assert.equal(calls.some(call => call[0] === "child-event" && call[1] === "explode"), true);
  assert.equal(calls.some(call => call[0] === "child-procedural" && call[1] === "seed" && call[2] === 7), true);

  assert.equal(CjsSchema.GetConstructor("EveEffectRoot2"), EveEffectRoot2);
  assert.equal(CjsSchema.getField(EveEffectRoot2, "boundingSphereCenter")?.type.kind, "vec3");
  assert.equal(CjsSchema.getField(EveEffectRoot2, "boundingSphereRadius")?.type.kind, "float32");
  assert.equal(existsSync(new URL("../../src/trinity/generated/eve/spaceObject/EveEffectRoot2.js", import.meta.url)), false);
  assert.equal(new EvePlanet() instanceof EveEffectRoot2, true);
});

test("EveChildInheritProperties owns Carbon's 44 enum-ordered color copies", () =>
{
  const blueFields = [
    "Primary", "Secondary", "Tertiary", "Black", "White", "Yellow", "Orange", "Red", "Blue", "Green",
    "Cyan", "Fire", "Hull", "Glass", "Reactor", "Darkhull", "Booster", "Killmark", "PrimaryLight",
    "SecondaryLight", "TertiaryLight", "WhiteLight", "PrimarySpotlight", "SecondarySpotlight",
    "TertiarySpotlight", "PrimaryHologram", "SecondaryHologram", "TertiaryHologram", "State0", "State1",
    "State2", "State3", "StateVulnerable", "StateInvulnerable", "PrimaryForcefield", "SecondaryForcefield",
    "PrimaryBanner", "PrimaryBillboard", "PrimaryFx", "SecondaryFx", "PrimaryWarpFx", "PrimaryAttackFx",
    "PrimarySiegeFx", "PrimaryDockedFx"
  ];
  const inheritProperties = new EveChildInheritProperties();
  for (const name of blueFields)
  {
    assert.equal(CjsSchema.getField(EveChildInheritProperties, name)?.type.kind, "color", name);
  }
  assert.equal(CjsSchema.getField(EveChildInheritProperties, "colorSet"), null);

  const stored = inheritProperties.GetProperties();
  assert.equal(stored.length, 44);
  assert.equal(inheritProperties.GetProperties(), stored);
  assert.deepEqual(stored.map(color => Array.from(color)), Array.from({ length: 44 }, () => [0, 0, 0, 0]));

  const source = Array.from({ length: 44 }, (_value, index) => [index, index + 100, index + 200, index + 300]);
  inheritProperties.SetProperties(source);
  assert.equal(inheritProperties.GetProperties(), stored);
  for (let index = 0; index < source.length; index++)
  {
    assert.notEqual(stored[index], source[index]);
    assert.deepEqual(Array.from(stored[index]), source[index]);
  }

  assert.equal(stored[22], inheritProperties.PrimaryHologram);
  assert.equal(stored[25], inheritProperties.State0);
  assert.equal(stored[34], inheritProperties.PrimaryFx);
  assert.equal(stored[36], inheritProperties.PrimarySpotlight);
  assert.equal(stored[39], inheritProperties.PrimaryBillboard);
  assert.equal(stored[41], inheritProperties.PrimaryAttackFx);

  source[22][0] = -1;
  inheritProperties.SetProperties(null);
  assert.equal(stored[22][0], 22);
});

test("EveSpaceObject2 propagates Carbon inherit properties to existing and future owners", () =>
{
  const object = new EveSpaceObject2();
  const existingChildCalls = [];
  const existingLightCalls = [];
  const ordinaryChildCalls = [];
  object.effectChildren.push(new (class extends IEveInheritPropertiesOwner
  {
    SetInheritProperties(properties)
    {
      existingChildCalls.push(properties);
    }
  })());
  object.lights.push(new (class extends IEveInheritPropertiesOwner
  {
    SetInheritProperties(properties)
    {
      existingLightCalls.push(properties);
    }
  })());
  object.children.push({
    SetInheritProperties(properties)
    {
      ordinaryChildCalls.push(properties);
    }
  });

  const source = Array.from({ length: 44 }, (_value, index) => [index, 1, 2, 3]);
  object.SetInheritProperties(source);
  assert.equal(object.inheritProperties instanceof EveChildInheritProperties, true);
  const storage = object.inheritProperties;
  const stored = storage.GetProperties();
  assert.deepEqual(existingChildCalls, [stored]);
  assert.deepEqual(existingLightCalls, [stored]);
  assert.deepEqual(ordinaryChildCalls, []);

  let childWasInserted = null;
  const futureChildCalls = [];
  const futureChild = Object.assign(new (withIEveInheritPropertiesOwner(EveSpaceObjectChild))(), {
    SetInheritProperties(properties)
    {
      childWasInserted = object.effectChildren.includes(futureChild);
      futureChildCalls.push(properties);
    }
  });
  object.AddToEffectChildrenList(futureChild);
  assert.equal(childWasInserted, false);
  assert.equal(object.effectChildren.at(-1), futureChild);
  assert.deepEqual(futureChildCalls, [stored]);

  let lightWasInserted = null;
  const futureLightCalls = [];
  const futureLight = new (class extends IEveInheritPropertiesOwner
  {
    SetInheritProperties(properties)
    {
      lightWasInserted = object.lights.includes(futureLight);
      futureLightCalls.push(properties);
    }
  })();
  object.AddLight(futureLight);
  assert.equal(lightWasInserted, false);
  assert.equal(object.lights.at(-1), futureLight);
  assert.deepEqual(futureLightCalls, [stored]);

  const replacement = Array.from({ length: 44 }, (_value, index) => [43 - index, 4, 5, 6]);
  object.SetInheritProperties(replacement);
  assert.equal(object.inheritProperties, storage);
  assert.equal(object.inheritProperties.GetProperties(), stored);
  assert.deepEqual(Array.from(stored[0]), replacement[0]);
  assert.deepEqual(existingChildCalls, [stored, stored]);
  assert.deepEqual(existingLightCalls, [stored, stored]);
  assert.deepEqual(futureChildCalls, [stored, stored]);
  assert.deepEqual(futureLightCalls, [stored, stored]);
  assert.deepEqual(ordinaryChildCalls, []);

  object.ClearLights();
  assert.deepEqual(object.lights, []);

  const nullObject = new EveSpaceObject2();
  const nullCalls = [];
  nullObject.effectChildren.push(new (class extends IEveInheritPropertiesOwner
  {
    SetInheritProperties(properties)
    {
      nullCalls.push(properties);
    }
  })());
  nullObject.SetInheritProperties(null);
  const zeroStorage = nullObject.inheritProperties.GetProperties();
  assert.equal(zeroStorage.length, 44);
  assert.deepEqual(zeroStorage.map(color => Array.from(color)), Array.from({ length: 44 }, () => [0, 0, 0, 0]));
  assert.deepEqual(nullCalls, [zeroStorage]);
});

test("EveSpaceObject2 owns the Carbon controller graph and mesh alias", () =>
{
  const object = new EveSpaceObject2();
  const mesh = {};
  const calls = [];
  const controller = {
    linked: false,
    IsLinked()
    {
      return this.linked;
    },
    Link(owner)
    {
      this.linked = true;
      calls.push(["link", owner]);
    },
    SetVariable(name, value)
    {
      calls.push(["controller-variable", name, value]);
    },
    HandleEvent(name)
    {
      calls.push(["controller-event", name]);
    },
    Start()
    {
      calls.push(["controller-start"]);
    }
  };
  const child = Object.assign(new EveSpaceObjectChild(), {
    name: "child",
    SetVariable(name, value)
    {
      calls.push(["wrong-child-variable", name, value]);
    },
    SetControllerVariable(name, value)
    {
      calls.push(["child-variable", name, value]);
    },
    HandleControllerEvent(name)
    {
      calls.push(["child-event", name]);
    },
    StartControllers()
    {
      calls.push(["child-start"]);
    },
    SetProceduralContainerVariable(name, value)
    {
      calls.push(["procedural", name, value]);
    }
  });
  const overlay = {
    SetControllerVariable(name, value)
    {
      calls.push(["overlay-variable", name, value]);
    },
    HandleControllerEvent(name)
    {
      calls.push(["overlay-event", name]);
    },
    StartControllers()
    {
      calls.push(["overlay-start"]);
    }
  };

  assert.equal(object instanceof EveEntity, true);
  assert.equal(CjsSchema.GetConstructor("EveSpaceObject2"), EveSpaceObject2);
  object.SetMesh(mesh);
  assert.equal(object.GetMesh(), mesh);
  assert.equal(object.meshLod, mesh);
  assert.equal(CjsSchema.getField(EveSpaceObject2, "meshLod")?.io?.persist, true);
  assert.equal(CjsSchema.getDefaults(EveSpaceObject2).meshLod, null);
  object.meshLod = null;
  assert.equal(object.mesh, null);

  assert.deepEqual(object.GetControllerVariables(), {
    DirtLevel: 0,
    ActivationStrength: 1,
    ShieldDamage: 1,
    ArmorDamage: 1,
    HullDamage: 1,
    ClipSphereFactor: 0,
    ClipSphereFactor2: 0
  });

  object.AddController(controller);
  assert.equal(calls[0][0], "link");
  assert.equal(calls[0][1], object);
  assert.deepEqual(calls.slice(1).map(call => call.slice(1)), [
    ["DirtLevel", 0],
    ["ActivationStrength", 1],
    ["ShieldDamage", 1],
    ["ArmorDamage", 1],
    ["HullDamage", 1],
    ["ClipSphereFactor", 0],
    ["ClipSphereFactor2", 0]
  ]);
  const afterAdd = calls.slice();
  object.Initialize();
  assert.deepEqual(calls, afterAdd);

  calls.length = 0;
  object.AddToEffectChildrenList(child);
  assert.equal(calls.some(call => call[0] === "wrong-child-variable"), false);
  object.overlayEffects.push(overlay);
  assert.equal(object.GetEffectChildByName("child"), child);
  calls.length = 0;
  object.SetControllerVariable("DirtLevel", 0.75);
  object.HandleControllerEvent("activate");
  object.StartControllers();
  object.SetProceduralContainerVariable("seed", 42);
  assert.deepEqual(calls, [
    ["controller-variable", "DirtLevel", 0.75],
    ["child-variable", "DirtLevel", 0.75],
    ["overlay-variable", "DirtLevel", 0.75],
    ["controller-event", "activate"],
    ["child-event", "activate"],
    ["overlay-event", "activate"],
    ["controller-start"],
    ["child-start"],
    ["overlay-start"],
    ["procedural", "seed", 42]
  ]);
  assert.equal(object.RemoveFromEffectChildrenList(child), true);
  assert.equal(object.RemoveFromEffectChildrenList(child), false);
});

test("EveSpaceObject2 evaluates Carbon model curves into detached world transforms", () =>
{
  const object = new EveSpaceObject2();
  const halfSqrt = Math.SQRT1_2;
  const translationCurve = {
    Update(time, out)
    {
      assert.equal(time, 5);
      out[0] = 10;
      out[1] = 20;
      out[2] = 30;
    },
    GetValueAt()
    {
      assert.fail("a void-returning Update must not fall through to GetValueAt");
    },
    GetValueDotAt(time, out)
    {
      assert.equal(time, 5);
      out[0] = 1;
      out[1] = 2;
      out[2] = 3;
    }
  };
  const rotationCurve = {
    Update(_time, out)
    {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
    }
  };
  const modelRotationCurve = {
    Update(_time, out)
    {
      out[0] = 0;
      out[1] = 0;
      out[2] = halfSqrt;
      out[3] = halfSqrt;
    }
  };
  const modelTranslationCurve = {
    Update(_time, out)
    {
      out[0] = 1;
      out[1] = 0;
      out[2] = 0;
    }
  };

  object.translationCurve = translationCurve;
  object.rotationCurve = rotationCurve;
  object.SetModelRotationCurve(modelRotationCurve);
  object.SetModelTranslationCurve(modelTranslationCurve);
  object.modelScale = 2;
  assert.equal(object.GetModelRotationCurve(), modelRotationCurve);
  assert.equal(object.GetModelTranslationCurve(), modelTranslationCurve);
  assert.equal(object.UpdateWorldTransform(5), true);
  assert.equal(object.UpdateWorldTransform(5), false);
  assertVecNear(object.worldPosition, [10, 20, 30]);
  assertVecNear(object.worldVelocity, [1, 2, 3]);
  assertVecNear(object.worldTransform.slice(12, 15), [10, 22, 30]);

  const identity = mat4.multiply(mat4.create(), object.worldTransform, object.inverseWorldTransform);
  assertVecNear(identity, mat4.create(), 1e-5);
  assert.notEqual(object.GetLocalToWorldTransform(), object.inverseWorldTransform);
  assert.equal(object.GetObserverTransform(), object.worldTransform);
});

test("EveSpaceObject2 drives observers, controller frequency, mute, and emitter lookup", () =>
{
  const object = new EveSpaceObject2();
  const calls = [];
  const emitter = {
    UpdatePlacement(front, up, position)
    {
      calls.push(["placement", Array.from(front), Array.from(up), Array.from(position)]);
    },
    Mute()
    {
      calls.push(["mute"]);
    },
    Unmute()
    {
      calls.push(["unmute"]);
    }
  };
  const observer = new TriObserverLocal();
  observer.name = "engine";
  observer.SetPosition([1, 2, 3]);
  observer.SetObserver(emitter);
  object.AddObserver(observer);
  object.translationCurve = {
    Update(_time, out)
    {
      out[0] = 10;
      out[1] = 20;
      out[2] = 30;
    }
  };
  // A CONTROLLER FAKE HAS TO BE A CONTROLLER. This was a bare object literal
  // carrying Update alone, and the production code only tolerated it because
  // every call site read `controller?.SetVariable?.()`. The contract supplies
  // Carbon's empty bodies for the verbs this fake does not care about, which is
  // exactly what those hedges were emulating one call site at a time.
  class FrequencyController extends withITr2Controller(Object)
  {
    IsLinked()
    {
      return true;
    }

    Update(frequency)
    {
      calls.push(["frequency", frequency]);
    }
  }

  object.controllers.push(new FrequencyController());
  object.estimatedPixelDiameter = 50;
  const childUpdates = [];
  object.effectChildren.push(Object.assign(new EveSpaceObjectChild(), {
    IsAlwaysOn()
    {
      return false;
    },
    UpdateSyncronous(context, params)
    {
      childUpdates.push(["synchronous", context, params]);
    },
    UpdateAsyncronous(context, params)
    {
      childUpdates.push(["asynchronous", context, params]);
    }
  }));

  const synchronousContext = { currentTime: 4 };
  assert.equal(object.UpdateSyncronous(synchronousContext), true);
  assert.deepEqual(calls[0], ["placement", [0, 0, 1], [0, 1, 0], [11, 22, 33]]);
  assert.equal(childUpdates[0][0], "synchronous");
  assert.equal(childUpdates[0][1], synchronousContext);
  assert.equal(childUpdates[0][2].spaceObjectParent, object);
  assert.equal(childUpdates[0][2].activationStrength, 1);
  assert.equal(childUpdates[0][2].isVisible, true);
  assert.notEqual(childUpdates[0][2].localToWorldTransform, object.worldTransform);

  object.isVisible = true;
  const asynchronousContext = { highDetailThreshold: 100 };
  assert.equal(object.UpdateAsyncronous(asynchronousContext), 0.5);
  object.isVisible = false;
  assert.equal(object.UpdateAsyncronous(asynchronousContext), 0);
  assert.deepEqual(calls.slice(1, 3), [["frequency", 0.5], ["frequency", 0]]);
  assert.equal(childUpdates[1][0], "asynchronous");
  assert.equal(childUpdates[1][1], asynchronousContext);
  assert.equal(childUpdates[1][2].controllerUpdateFrequency, 0.5);
  assert.equal(childUpdates[2][2].controllerUpdateFrequency, 0);
  assert.equal(object.FindSoundEmitter("engine"), emitter);

  object.SetMute(true);
  object.SetMute(false);
  assert.deepEqual(calls.slice(3), [["mute"], ["unmute"]]);

  const nestedEmitter = {};
  object.effectChildren.push({
    FindSoundEmitter(name)
    {
      return name === "nested" ? nestedEmitter : null;
    }
  });
  assert.equal(object.FindSoundEmitter("nested"), nestedEmitter);

  object.observers.unshift({
    name: "silent",
    observer: emitter,
    GetObserver()
    {
      return null;
    }
  });
  assert.equal(object.FindSoundEmitter("silent"), null);
});

test("maintained EveSpaceObject2, inherit properties, and TriObserverLocal replace generated fallbacks", () =>
{
  const generatedSpaceObject = new URL("../../src/trinity/generated/eve/spaceObject/EveSpaceObject2.js", import.meta.url);
  const generatedInheritProperties = new URL("../../src/trinity/generated/eve/child/EveChildInheritProperties.js", import.meta.url);
  const generatedObserver = new URL("../../src/trinity/generated/trinityCore/TriObserverLocal.js", import.meta.url);
  assert.equal(existsSync(generatedSpaceObject), false);
  assert.equal(existsSync(generatedInheritProperties), false);
  assert.equal(existsSync(generatedObserver), false);

  const summary = JSON.parse(readFileSync(new URL("../../src/trinity/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry =>
    ["EveChildInheritProperties", "EveSpaceObject2", "TriObserverLocal"].includes(entry.className)
  );
  assert.deepEqual(skipped.map(entry => entry.className).sort(), [
    "EveChildInheritProperties",
    "EveSpaceObject2",
    "TriObserverLocal"
  ]);
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);
});

function makeLocatorSet(name, records)
{
  const set = new EveLocatorSets();
  set.SetName(name);
  set.Append(records);
  return set;
}

test("EveSpaceObject2 answers Carbon locator set queries in object and world space", () =>
{
  const object = new EveSpaceObject2();
  object.locatorSets.push(makeLocatorSet("damage", [
    { position: [1, 0, 0], direction: [0, 0, 0, 1], boneIndex: 0 },
    { position: [0, 0, 5], direction: [0.7071067811865476, 0, 0, 0.7071067811865476], boneIndex: 0 }
  ]));
  object.locatorSets.push(makeLocatorSet("attach", [
    { position: [0, 9, 0], direction: [0, 0, 0, 1], boneIndex: 0 }
  ]));

  assert.equal(object.GetDamageLocatorCount(), 2);
  assert.equal(object.GetLocatorCount("damage"), 2);
  assert.equal(object.GetLocatorCount("attach"), 1);
  assert.equal(object.GetLocatorCount("missing"), 0);

  assertVecNear(object.GetDamageLocator(0), [1, 0, 0]);
  assertVecNear(object.GetDamageLocator(1), [0, 0, 5]);
  assertVecNear(object.GetDamageLocator(7), [0, 0, 0]);
  // Direction is +Y rotated by the authored quaternion: identity keeps +Y,
  // the second rotates +Y onto +Z (90 degrees around +X).
  assertVecNear(object.GetDamageLocatorDirection(0), [0, 1, 0]);
  assertVecNear(object.GetDamageLocatorDirection(1), [0, 0, 1]);
  assertVecNear(object.GetDamageLocatorDirection(-1), [0, 0, 0]);

  mat4.fromTranslation(object.worldTransform, [10, 20, 30]);
  mat4.invert(object.inverseWorldTransform, object.worldTransform);
  assertVecNear(object.GetTransformedDamageLocator(0), [11, 20, 30]);
  // Out-of-range indices return (0,0,0) untransformed, as Carbon does.
  assertVecNear(object.GetTransformedDamageLocator(9), [0, 0, 0]);

  assertVecNear(object.GetLocatorPositionFromSet(1, false, "damage"), [0, 0, 5]);
  assertVecNear(object.GetLocatorPositionFromSet(1, true, "damage"), [10, 20, 35]);
  assertVecNear(object.GetLocatorPositionFromSet(-1, true, "damage"), [10, 20, 30]);
  assertVecNear(object.GetLocatorPositionFromSet(9, false, "damage"), [0, 0, 0]);
  assertVecNear(object.GetLocatorRotationFromSet(0, false, "damage"), [0, 1, 0]);
  assertVecNear(object.GetLocatorRotationFromSet(1, false, "damage"), [0, 0, 1]);
  assertVecNear(object.GetLocatorRotationFromSet(-1, true, "damage"), [0, 1, 0]);

  // Close locator ignores facing; index 1 sits nearest the queried point.
  assert.equal(object.GetCloseLocatorIndex([10, 20, 34], "damage"), 1);
  assert.equal(object.GetCloseLocatorIndex([11.5, 20, 30], "damage"), 0);
  assert.equal(object.GetCloseLocatorIndex([0, 0, 0], "missing"), -1);
  // The script surface maps GetGoodLocatorIndex onto the same query.
  assert.equal(object.GetGoodLocatorIndex([10, 20, 34], "damage"), 1);
});

test("EveSpaceObject2 locator transforms resolve by name with animated-bone priority", () =>
{
  const object = new EveSpaceObject2();
  const locator = new EveLocator2();
  locator.SetName("locator_attach_a01");
  mat4.fromTranslation(locator.transform, [4, 5, 6]);
  object.locators.push(locator);

  const transform = object.GetLocatorTransform("locator_attach_a01");
  assertVecNear(Array.from(transform).slice(12, 15), [4, 5, 6]);
  // Unknown names answer with the identity, as Carbon does.
  assertVecNear(Array.from(object.GetLocatorTransform("missing")), Array.from(mat4.create()));
  // An animation updater that resolves the name wins over the authored
  // transform; one that does not falls back to it.
  object.animationUpdater = {
    GetBoneWorldTransform(name, out)
    {
      if (name !== "locator_attach_a01") return false;
      mat4.fromTranslation(out, [7, 8, 9]);
      return true;
    }
  };
  assertVecNear(Array.from(object.GetLocatorTransform("locator_attach_a01")).slice(12, 15), [7, 8, 9]);
  object.animationUpdater = {
    GetBoneWorldTransform()
    {
      return false;
    }
  };
  assertVecNear(Array.from(object.GetLocatorTransform("locator_attach_a01")).slice(12, 15), [4, 5, 6]);
});

test("EveSpaceObject2 bounds follow Carbon dynamic-sphere and cached-box rules", () =>
{
  const object = new EveSpaceObject2();
  object.modelScale = 2;
  object.boundingSphereCenter.set([1, 2, 3]);
  object.boundingSphereRadius = 5;
  assertVecNear(object.GetBoundingSphereCenter(), [1, 2, 3]);
  assert.equal(object.GetBoundingSphereRadius(), 10);

  // Without a mesh the local box answers from the (initially empty) cache.
  const empty = object.GetLocalBoundingBox();
  assertVecNear(empty.min, [0, 0, 0]);
  assertVecNear(empty.max, [0, 0, 0]);

  object.mesh = {
    GetBoundingBox(min, max)
    {
      min.set([-1, -2, -3]);
      max.set([4, 5, 6]);
      return true;
    }
  };
  const minBounds = new Float32Array(3);
  const maxBounds = new Float32Array(3);
  assert.equal(object.GetLocalBoundingBox(minBounds, maxBounds), true);
  assertVecNear(minBounds, [-1, -2, -3]);
  assertVecNear(maxBounds, [4, 5, 6]);
  // The cached copy answers again once the mesh disappears (lags one frame).
  object.mesh = null;
  const cached = object.GetLocalBoundingBox();
  assertVecNear(cached.min, [-1, -2, -3]);
  assertVecNear(cached.max, [4, 5, 6]);

  // Skinned bounds report disabled markers until dynamic bounds are enabled.
  assertVecNear(object.CalculateSkinnedBoundingSphere(), [0, 0, 0, -1]);
  const box = object.CalculateSkinnedBoundingBoxFromTransform(mat4.create());
  assert.equal(box.min[0], Infinity);
  assert.equal(box.max[0], -Infinity);

  object.mesh = {
    GetGeometryResource()
    {
      return {
        IsUsingCMF()
        {
          return true;
        }
      };
    },
    GetBoundingBox(min, max)
    {
      min.set([-1, -1, -1]);
      max.set([1, 1, 1]);
      return true;
    }
  };
  object.dynamicBoundingSphereEnabled = true;
  assertVecNear(object.CalculateSkinnedBoundingSphere(), [1, 2, 3, 10]);
  const shifted = object.CalculateSkinnedBoundingBoxFromTransform(mat4.fromTranslation(mat4.create(), [10, 0, 0]));
  assertVecNear(shifted.min, [9, -1, -1]);
  assertVecNear(shifted.max, [11, 1, 1]);
});

test("EveSpaceObject2 restores Carbon world bounds, visibility, renderables, and mesh LOD", () =>
{
  const object = new EveSpaceObject2();
  const calls = [];
  const geometryResource = {
    IsGood()
    {
      return true;
    },
    GetLodIndexForScreenSize(meshIndex, screenSize)
    {
      calls.push(["lod", meshIndex, screenSize]);
      return 2;
    }
  };
  object.mesh = {
    GetMeshIndex()
    {
      return 3;
    },
    GetGeometryResource()
    {
      return geometryResource;
    },
    GetBoundingBox(min, max)
    {
      min.set([-1, -2, -3]);
      max.set([1, 2, 3]);
      return true;
    },
    IsLoading()
    {
      return false;
    },
    UseWithScreenSize(size, radius)
    {
      calls.push(["screen", size, radius]);
    }
  };
  object.modelScale = 2;
  object.translationCurve = {
    Update(_time, out)
    {
      out.set([10, 0, 0]);
    }
  };
  object.SetBoundingSphereInformation(new Float32Array([1, 2, 3, 5]));
  object.UpdateWorldTransform(1);

  const sphere = new Float32Array(4);
  assert.equal(object.GetBoundingSphere(sphere), true);
  assertVecNear(sphere, [12, 4, 6, 10]);
  assertVecNear(object.modelWorldPosition, [12, 4, 6]);
  assert.equal(object.IsBoundingBoxReady(), true);

  object.GetLocalBoundingBox();
  const worldBounds = object.GetWorldBoundingBox();
  assertVecNear(worldBounds.min, [8, -4, -6]);
  assertVecNear(worldBounds.max, [12, 4, 6]);

  const child = {
    GetBoundingSphere(out)
    {
      out.set([20, 0, 0, 2]);
      return true;
    },
    UpdateVisibility()
    {
      calls.push(["child-visibility"]);
    },
    GetRenderables(out)
    {
      out.push("child");
    }
  };
  object.children.push(child);
  assert.equal(object.GetBoundingSphere(sphere, 1), true);
  assert.ok(sphere[3] > 10);

  const frustum = {
    IsSphereVisible()
    {
      return true;
    },
    GetPixelSizeAccross()
    {
      return 80;
    },
    GetPixelSizeAccrossEst()
    {
      return 75;
    }
  };
  assert.equal(object.EstimatePixelDiameter(frustum), 80);
  assert.equal(object.UpdateVisibility({
    frustum,
    visibilityThreshold: 1,
    lowDetailThreshold: 20,
    mediumDetailThreshold: 60,
    lodFactor: 0.5
  }), true);
  assert.equal(object.IsInFrustum(), true);
  assert.equal(object.lodLevel, Tr2Lod.TR2_LOD_HIGH);
  assert.deepEqual(object.GetRenderables([]), [object, "child"]);
  assert.deepEqual(calls.find(call => call[0] === "screen"), ["screen", 37.5, 10]);
  assert.equal(object.GetLastUsedMeshLod(), 2);
  assert.deepEqual(calls.find(call => call[0] === "lod"), ["lod", 3, 37.5]);

  object.FreezeHighDetailMesh();
  assert.equal(object.GetLastUsedMeshLod(), 0);
});

test("EveSpaceObject2 rebuilds the authored bounding sphere from ready geometry", () =>
{
  const object = new EveSpaceObject2();
  assert.equal(object.RebuildBoundingSphereInformation(), false);
  const calls = [];
  object.mesh = {
    GetMeshIndex()
    {
      return 2;
    },
    GetGeometryResource()
    {
      return {
        IsGood()
        {
          return true;
        },
        RecalculateBoundingSphere()
        {
          calls.push("recalculate");
        },
        GetBoundingSphere(meshIndex, out)
        {
          calls.push(`sphere:${meshIndex}`);
          out.set([7, 8, 9, 11]);
        }
      };
    }
  };
  assert.equal(object.RebuildBoundingSphereInformation(), true);
  assert.deepEqual(calls, ["recalculate", "sphere:2"]);
  assertVecNear(object.boundingSphereCenter, [7, 8, 9]);
  assert.equal(object.boundingSphereRadius, 11);
});

test("EveSpaceObject2 delegates animation playback with Carbon wrapper constants", () =>
{
  const object = new EveSpaceObject2();
  // No updater: every playback call is a Carbon-faithful no-op.
  object.PlayAnimation("gate");
  object.EndAnimation();
  object.ClearAnimations();

  const calls = [];
  object.animationUpdater = {
    PlayAnimation(...args)
    {
      calls.push(["play", ...args]);
    },
    EndAnimation()
    {
      calls.push(["end"]);
    },
    ClearAnimations()
    {
      calls.push(["clear"]);
    }
  };
  object.PlayAnimation("open");
  object.PlayAnimationEx("spool", 3, 0.5, 2);
  object.PlayAnimationEx("spool", 3, 0.5, 2, false);
  object.ChainAnimation("close");
  object.ChainAnimationEx("wind", 2, 0.25, 0.5);
  object.EndAnimation();
  object.ClearAnimations();
  assert.deepEqual(calls, [
    ["play", "open", true, 1, 0, 1, true],
    ["play", "spool", true, 3, 0.5, 2, true],
    ["play", "spool", true, 3, 0.5, 2, false],
    ["play", "close", false, 1, 0, 1, true],
    ["play", "wind", false, 2, 0.25, 0.5, true],
    ["end"],
    ["clear"]
  ]);
});

test("EveSpaceObject2 routes impact effects through the impact overlay", () =>
{
  const object = new EveSpaceObject2();
  assert.equal(object.CreateImpact(0, [0, 0, 1], 2, 3), -1);
  object.ClearImpactDamage();
  object.SetImpactAnimation("boosters", true, 1);
  assert.equal(object.IsImpostor(), false);

  object.AddLocatorSet("damage", [
    { position: [0, 0, -5], direction: [1, 0, 0, 0], boneIndex: 0 },
    { position: [0, 0, 5], direction: [0.7071067811865476, 0, 0, 0.7071067811865476], boneIndex: 0 }
  ]);
  const calls = [];
  object.impactOverlay = Object.assign(new EveImpactOverlay(), {
    CreateImpact(...args)
    {
      calls.push(["impact", ...args]);
      return 42;
    },
    Clear()
    {
      calls.push(["clear"]);
    },
    ToggleEffect(name, on, duration)
    {
      calls.push(["toggle", name, on, duration]);
    }
  });
  assert.equal(object.CreateImpact(1, [0, 0, 1], 2, 3), 42);
  // The position sits in front of locator 1 (which faces +Z); the facing
  // gate picks it.
  assert.equal(object.CreateImpactFromPosition([0, 0, 8], [0, 0, -1], 2, 3), 42);
  object.ClearImpactDamage();
  object.SetImpactAnimation("hardener", false, 0.5);
  assert.deepEqual(calls, [
    ["impact", 1, [0, 0, 1], 2, 3, 1, -1, object],
    ["impact", 1, [0, 0, -1], 2, 3, 1, -1, object],
    ["clear"],
    ["toggle", "hardener", false, 0.5]
  ]);
});

test("EveSpaceObject2 transforms locator records and freezes high detail meshes", () =>
{
  const object = new EveSpaceObject2();
  const authored = [
    { position: [1, 0, 0], direction: [0, 0, 0, 1], boneIndex: 0 },
    [[0, 2, 0], [0, 0, 0, 1], 5]
  ];
  // Locator records and (position, rotation, boneIndex) tuples are both
  // accepted; results are always tuples, as the Carbon script surface emits.
  const passthrough = object.TransformLocators(authored);
  assert.equal(passthrough.length, 2);
  assertVecNear(passthrough[0][0], [1, 0, 0]);
  assertVecNear(passthrough[1][0], [0, 2, 0]);
  assertVecNear(passthrough[0][1], [0, 0, 0, 1]);
  assert.equal(passthrough[0][2], 0);
  assert.equal(passthrough[1][2], 5);

  // Model transform: translation adds, then rotation spins position and
  // pre-multiplies the record rotation (sampled at the time origin).
  object.modelTranslationCurve = {
    GetValueAt(_time, out)
    {
      out.set([0, 0, 3]);
    }
  };
  object.modelRotationCurve = {
    GetValueAt(_time, out)
    {
      // 90 degrees around +Y: +Z maps onto +X.
      out.set([0, 0.7071067811865476, 0, 0.7071067811865476]);
    }
  };
  const moved = object.TransformLocators([{ position: [1, 0, 0], direction: [0, 0, 0, 1], boneIndex: 0 }]);
  assertVecNear(moved[0][0], [3, 0, -1], 1e-6);
  assertVecNear(moved[0][1], [0, 0.7071067811865476, 0, 0.7071067811865476], 1e-6);

  const decalStates = [];
  object.decals.push({
    SetHighDetailDecalState(state)
    {
      decalStates.push(state);
    }
  });
  object.FreezeHighDetailMesh();
  assert.deepEqual(decalStates, [true]);
});

test("merged damage locators resolve against the owning child's skeleton, not the parent's", () =>
{
  // A modular part 5 units along +X whose second damage locator rides bone 1;
  // the bone palette moves bone 1 by +2 on Y (Float4x3: rows of [R|t]).
  const child = new EveChildMesh();
  child.translation = [ 5, 0, 0 ];
  child.ownedLocatorSets.push(makeLocatorSet("damage", [
    { position: [ 1, 0, 0 ], direction: [ 0, 0, 0, 1 ], boneIndex: 0 },
    { position: [ 1, 0, 0 ], direction: [ 0, 0, 0, 1 ], boneIndex: 1 }
  ]));
  child.animationUpdater = {
    IsInitialized: () => true,
    GetMeshBoneCount: () => 2,
    GetMeshBoneMatrixList: () => new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
      1, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1, 0
    ])
  };

  const object = new EveSpaceObject2();
  object.locatorSets.push(makeLocatorSet("damage", [
    { position: [ 9, 9, 9 ], direction: [ 0, 0, 0, 1 ], boneIndex: 0 }
  ]));
  object.effectChildren.push(child);

  assert.equal(object.GetDamageLocatorCount(), 3);
  // Bone 0 is assumed unanimated: the merged position is the bind pose
  // lifted by childToObject.
  assertVecNear(object.GetDamageLocator(1), [ 6, 0, 0 ]);
  // Bone 1 poses in the CHILD's skeleton first, then lifts into object
  // space - the parent's own (absent) skeleton never applies.
  assertVecNear(object.GetDamageLocator(2), [ 6, 2, 0 ]);
  assertVecNear(object.GetDamageLocatorDirection(2), [ 0, 1, 0 ]);

  // The bind position ignores the child's animation entirely.
  const bind = new Float32Array(3);
  assert.equal(object.GetDamageLocatorBindPosition(2, bind), true);
  assertVecNear(bind, [ 6, 0, 0 ]);
  assert.equal(object.GetDamageLocatorBindPosition(9, bind), false);
  assertVecNear(bind, [ 0, 0, 0 ]);
});
