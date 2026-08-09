import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
  EveChildContainer,
  EveChildEffectPropagator,
  EveChildExplosion,
  EveChildInstancedMesh,
  EveChildInstancedMeshArea,
  EveChildInstancedMeshInstance,
  EveChildInstancedMeshes,
  EveChildMesh,
  EveChildParticleSystem,
  EveChildProceduralContainer,
  EveChildQuad,
  EveChildRef,
  EveChildSocket,
  EveChildTransform,
  IEveSpaceObjectChild
} from "../npm/dist/index.js";
import { EveChildLineSet } from "../npm/dist/eve/child/EveChildLineSet.js";


test("generated Eve children inherit maintained local-transform rebuilding", () =>
{
  new EveChildTransform();
  assert.equal(
    CjsSchema.getMethod(EveChildTransform, "RebuildLocalTransform")?.impl?.status,
    "implemented"
  );
  const affected = [
    EveChildRef,
    EveChildParticleSystem,
    EveChildQuad,
    EveChildSocket,
    EveChildEffectPropagator,
    EveChildExplosion,
    EveChildProceduralContainer
  ];

  for (const Child of affected)
  {
    const child = new Child();
    assert.equal(Object.hasOwn(Child.prototype, "RebuildLocalTransform"), false,
      Child.name);
    assert.equal(
      Child.prototype.RebuildLocalTransform,
      EveChildTransform.prototype.RebuildLocalTransform,
      Child.name
    );
    assert.equal(
      CjsSchema.getMethod(Child, "RebuildLocalTransform")?.impl?.status,
      "implemented",
      Child.name
    );
    assert.doesNotThrow(() => child.Setup(
      [2, 3, 4],
      [0, 0, 0, 1],
      [5, 6, 7]
    ), Child.name);
    assert.deepEqual(
      Array.from(child.localTransform),
      Array.from(mat4.fromRotationTranslationScale(
        mat4.create(),
        [0, 0, 0, 1],
        [5, 6, 7],
        [2, 3, 4]
      )),
      Child.name
    );
  }
});


test("EveChildMesh owns Carbon child transforms and detached instance matrices", () =>
{
  const child = new EveChildMesh();
  assert.equal(child instanceof EveChildTransform, true);
  assert.equal(CjsSchema.GetConstructor("EveChildMesh"), EveChildMesh);
  assert.equal(child.reflectionMode, 3);
  assert.equal(child.display, true);
  assert.equal(child.castShadow, false);
  assert.equal(child.lowestLodVisible, 0);
  assert.equal(child.currentScreenSize, -1);
  assert.equal(child.currentInstanceScreenSize, -1);
  assert.deepEqual(Array.from(child.scaling), [1, 1, 1]);

  child.Setup([2, 3, 4], [0, 0, 0, 1], [5, 6, 7], 2);
  assert.deepEqual(Array.from(child.scaling), [2, 3, 4]);
  assert.deepEqual(Array.from(child.translation), [5, 6, 7]);
  assert.equal(child.lowestLodVisible, 2);

  const first = mat4.fromTranslation(mat4.create(), [1, 2, 3]);
  const second = mat4.fromScaling(mat4.create(), [2, 3, 4]);
  child.SetInstanceTransforms([first, second]);
  first[12] = 99;
  second[0] = 99;
  assert.equal(child.instanceTransforms.length, 2);
  assert.equal(child.instanceTransforms[0][12], 1);
  assert.equal(child.instanceTransforms[1][0], 2);
  assert.notEqual(child.instanceTransforms[0], first);
  assert.throws(() => child.SetInstanceTransforms([[1, 2, 3]]), TypeError);
});

test("EveChildContainer owns Carbon quality defaults and effect-child recursion", () =>
{
  const container = new EveChildContainer();
  assert.equal(container instanceof EveChildTransform, true);
  assert.equal(CjsSchema.GetConstructor("EveChildContainer"), EveChildContainer);
  assert.equal(container.displayFilter, EveChildContainer.DisplayQualityModifier.SHADER_ALL);
  assert.equal(EveChildContainer.DisplayQualityModifier.ONLY_REFLECTIONS, 6);
  assert.equal(Object.isFrozen(EveChildContainer.DisplayQualityModifier), true);
  assert.equal(container.Empty(), true);

  const calls = [];
  const child = {
    name: "Instanced Mesh",
    SetControllerVariable(name, value)
    {
      calls.push(["variable", name, value]);
    },
    HandleControllerEvent(name)
    {
      calls.push(["event", name]);
    },
    StartControllers()
    {
      calls.push(["start"]);
    },
    SetProceduralContainerVariable(name, value)
    {
      calls.push(["procedural", name, value]);
    },
    SetMute(value)
    {
      calls.push(["mute", value]);
    }
  };

  container.SetControllerVariable("speed", 4);
  container.AddToEffectChildrenList(child);
  assert.equal(container.GetEffectChildByName("Instanced Mesh"), child);
  assert.deepEqual(calls.slice(0, 1), [["variable", "speed", 4]]);
  container.HandleControllerEvent("fire");
  container.StartControllers();
  container.SetProceduralContainerVariable("seed", 7);
  container.SetMute(true);
  assert.deepEqual(calls.slice(1), [
    ["event", "fire"],
    ["start"],
    ["procedural", "seed", 7],
    ["mute", true]
  ]);
  assert.equal(container.Empty(), false);
  assert.equal(container.RemoveFromEffectChildrenList(child), true);
  assert.equal(container.GetEffectChildByName("Instanced Mesh"), null);
  assert.equal(container.Empty(), true);
});

test("EveChildContainer initializes and drives controller CPU lifecycle", () =>
{
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
      calls.push(["variable", name, value]);
    },
    HandleEvent(name)
    {
      calls.push(["event", name]);
    },
    Start()
    {
      calls.push(["start"]);
    }
  };
  const container = new EveChildContainer();
  container.AddController(controller);
  container.SetControllerVariable("strength", 0.5);
  container.HandleControllerEvent("activate");
  container.StartControllers();
  assert.equal(container.Initialize(), true);
  assert.equal(calls[0][0], "link");
  assert.equal(calls[0][1], container);
  assert.deepEqual(calls.slice(1), [
    ["variable", "strength", 0.5],
    ["event", "activate"],
    ["start"]
  ]);
});

test("maintained Eve child classes replace generated fallbacks", () =>
{
  const generatedMesh = new URL("../src/generated/eve/child/EveChildMesh.js", import.meta.url);
  const generatedContainer = new URL("../src/generated/eve/child/EveChildContainer.js", import.meta.url);
  const generatedShared = new URL("../src/generated/eve/child/EveChildInstancedMeshes.js", import.meta.url);
  const generatedInterface = new URL("../src/generated/eve/child/IEveSpaceObjectChild.js", import.meta.url);
  assert.equal(existsSync(generatedMesh), false);
  assert.equal(existsSync(generatedContainer), false);
  assert.equal(existsSync(generatedShared), false);
  assert.equal(existsSync(generatedInterface), false);

  const summary = JSON.parse(readFileSync(new URL("../src/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry =>
    [
      "EveChildContainer",
      "EveChildInstancedMeshes",
      "EveChildMesh"
    ].includes(entry.className)
  );
  assert.deepEqual(skipped.map(entry => entry.className).sort(), [
    "EveChildContainer",
    "EveChildInstancedMeshes",
    "EveChildMesh"
  ]);
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);

  const interfaceFallback = summary.generation.fallbacks.find(entry =>
    entry.className === "IEveSpaceObjectChild"
  );
  assert.equal(interfaceFallback?.reason,
    "schema carries no field or method detail (interface/no-detail class)");
});

test("generated Eve child classes enforce format-carbon inheritance through maintained parents", () =>
{
  assert.equal(new EveChildLineSet() instanceof EveChildTransform, true);
});

test("IEveSpaceObjectChild owns Carbon's canonical Origin statics", () =>
{
  assert.deepEqual(IEveSpaceObjectChild.Origin, { SPACE: 0, SOF: 1 });
  assert.equal(Object.isFrozen(IEveSpaceObjectChild.Origin), true);
  assert.equal(CjsSchema.getField(IEveSpaceObjectChild, "false"), null);
});

test("EveChildInstancedMeshes owns shared SOF mesh records without backend state", () =>
{
  const calls = [];
  const effect = {
    hash: 7,
    SetOption(name, value)
    {
      calls.push([name, value]);
      this.hash++;
    },
    GetHashValue()
    {
      return this.hash;
    }
  };
  const first = mat4.fromTranslation(mat4.create(), [1, 2, 3]);
  const second = mat4.fromScaling(mat4.create(), [2, 3, 4]);
  const child = new EveChildInstancedMeshes();
  child.SetName("SharedInstancedMeshes");
  child.SetOrigin(IEveSpaceObjectChild.Origin.SOF);
  assert.equal(child.GetName(), "SharedInstancedMeshes");
  assert.equal(child.IsAlwaysOn(), false);
  assert.equal(CjsSchema.getField(EveChildInstancedMeshes, "meshes")?.type.itemType, "EveChildInstancedMesh");
  assert.equal(child.AddMesh("res:/empty.gr2", false, 3, 0, [], [first]), false);
  assert.equal(child.AddMesh(
    "res:/extension.gr2",
    true,
    2,
    0,
    [{ effect, batchType: 0, areaIndex: 4, areaCount: 2 }],
    [first, second],
    "hull_alpha",
    "layout_a"
  ), true);
  first[12] = 99;
  second[0] = 99;

  assert.equal(child.GetMeshCount(), 1);
  assert.ok(child.meshes[0] instanceof EveChildInstancedMesh);
  assert.ok(child.meshes[0].areas[0] instanceof EveChildInstancedMeshArea);
  assert.ok(child.meshes[0].instances[0] instanceof EveChildInstancedMeshInstance);
  assert.deepEqual(child.GetMeshInfo(0), ["res:/extension.gr2", null, 0, true, 2, 1, 2]);
  assert.deepEqual(child.GetAreaInfo(0, 0), [effect, 0, 4, 2]);
  assert.deepEqual(child.GetSofSourceLocator(1), ["hull_alpha", "layout_a", 1]);
  assert.equal(child.GetSofSourceLocator(1 << 16), null);
  assert.equal(child.GetMeshDisplay(0), true);

  const revision = child.GetRevision();
  child.SetMeshDisplay(0, false);
  assert.equal(child.GetMeshDisplay(0), false);
  assert.equal(child.GetRevision(), revision + 1);
  child.SetMeshDisplay(0, false);
  assert.equal(child.GetRevision(), revision + 1);

  const geometry = {};
  child.SetGeometryResource(0, geometry);
  assert.equal(child.GetMeshInfo(0)[1], geometry);
  const snapshot = child.GetMeshData(0);
  assert.equal(snapshot.instances[0].transform[12], 1);
  assert.equal(snapshot.instances[1].transform[0], 2);
  snapshot.instances[0].transform[12] = 500;
  assert.equal(child.GetMeshData(0).instances[0].transform[12], 1);

  child.SetShaderOption("SPACE_OBJECT_INSTANCED_ATTACHMENT", "SOIA_SHARED");
  assert.deepEqual(calls, [["SPACE_OBJECT_INSTANCED_ATTACHMENT", "SOIA_SHARED"]]);
  assert.equal(child.GetMeshData(0).areas[0].effectHash, 8);
  assert.throws(() => child.GetMeshInfo(1), RangeError);
  assert.throws(() => child.GetAreaInfo(0, 1), RangeError);

  const values = child.GetValues({ persistOnly: true });
  assert.equal(values.meshes[0].geometryPath, "res:/extension.gr2");
  assert.equal(values.meshes[0].areas[0].areaIndex, 4);
  assert.deepEqual(values.meshes[0].instances[0].transform.slice(12, 15), [1, 2, 3]);

  const restored = EveChildInstancedMeshes.from(values);
  assert.ok(restored.meshes[0] instanceof EveChildInstancedMesh);
  assert.ok(restored.meshes[0].areas[0] instanceof EveChildInstancedMeshArea);
  assert.ok(restored.meshes[0].instances[0] instanceof EveChildInstancedMeshInstance);
  assert.equal(restored.GetMeshCount(), 1);
  assert.deepEqual(Array.from(restored.meshes[0].instances[0].transform.slice(12, 15)), [1, 2, 3]);
});

test("EveChildInstancedMeshes follows Carbon child update semantics", () =>
{
  const child = new EveChildInstancedMeshes();
  const parentTransform = mat4.fromTranslation(mat4.create(), [4, 5, 6]);
  child.UpdateSyncronous({}, { localToWorldTransform: parentTransform });
  parentTransform[12] = 100;
  assert.deepEqual(Array.from(child.GetLocalToWorldTransform().slice(12, 15)), [4, 5, 6]);
  assert.equal(child.hasUpdated, false);
  child.UpdateAsyncronous();
  assert.equal(child.hasUpdated, true);
  assert.equal(child.GetBoundingSphere(), false);
  assert.deepEqual(child.GetRenderables([]), []);
});

const TRIBATCHTYPE_OPAQUE = 1;

test("EveChildMesh passes Carbon's LOD screen size and mirrored-winding flag", () =>
{
  const child = new EveChildMesh();
  const seen = [];
  child.mesh = {
    GetAreas: () => [],
    GetBatches(_batches, _areas, _perObjectData, screenSize, reverseWinding)
    {
      seen.push({ screenSize, reverseWinding });
      return true;
    }
  };

  child.currentScreenSize = 40;
  child.currentInstanceScreenSize = 12;
  child.GetBatches({}, TRIBATCHTYPE_OPAQUE, null);
  assert.deepEqual(seen.at(-1), { screenSize: 12, reverseWinding: false },
    "the smaller of the two screen sizes, unmirrored");

  // A negative-determinant world transform mirrors, which flips triangle facing.
  mat4.scale(child.worldTransform, child.worldTransform, [ -1, 1, 1 ]);
  child.GetBatches({}, TRIBATCHTYPE_OPAQUE, null);
  assert.equal(seen.at(-1).reverseWinding, true, "mirrored transform reverses winding");

  assert.equal(child.GetShadowBatches({}, null, 256), false,
    "a child that has never updated casts no shadow batches");

  child.UpdateAsyncronous(null, {});
  child.GetShadowBatches({}, null, 256);
  assert.equal(seen.at(-1).screenSize, 256,
    "shadow batches use the caller's shadow pixel size, not the child's own");
});
