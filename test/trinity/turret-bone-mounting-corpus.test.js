import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/TriGeometryRes.js";
import { EveSOF } from "../../npm/dist/sof/index.js";
import { EveShip2, EveTurretSet, EveUpdateContext, EveComponentRegistry, Tr2Controller, TriDevice, EveChildMesh, Tr2Mesh, Tr2MeshArea } from "../../npm/dist/trinity/index.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { CjsModel } from "../../npm/dist/global/model/CjsModel.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import "../../npm/dist/audio/index.js";
import { StubResMan } from "../support/stubResMan.js";

const corpus = process.env.TURRET_BLACK_CORPUS_DIR;
const skip = !corpus && "set TURRET_BLACK_CORPUS_DIR for real Svipul/data.black and pulse turret files";
const hullGeometryPath = "res:/dx9/model/ship/minmatar/destroyer/mde3/mde3_t3.gr2";
const turretGeometryPath = "res:/dx9/model/turret/energy/pulse/l/pulse_mega_t1.gr2";
let corpusData;

async function readCorpus()
{
  if (!corpusData) corpusData = (async () =>
  {
    const [black, hullBytes, turretBytes, turretGeometry] = await Promise.all([
      readFile(join(corpus, "data.black")), readFile(join(corpus, "mde3_t3.gr2")),
      readFile(join(corpus, "pulse_mega_t1.black")), readFile(join(corpus, "pulse_mega_t1.gr2"))
    ]);
    assert.equal(black.length, 184126948);
    assert.equal(createHash("sha256").update(black).digest("hex"), "b888ce85f9040a49e2cfff6357e9e7ab89905818562562c7ec06e786b165afec");
    assert.equal(hullBytes.length, 788132);
    assert.equal(createHash("sha256").update(hullBytes).digest("hex"), "5cae1a039c579da77e1276fd084cc74bde8fea45ffd549a332c00be3b5287337");
    assert.equal(createHash("sha256").update(turretBytes).digest("hex"), "dc7be4c9cf75bd167b36f807837488ef04cab90a8c5479f86bbd7e34ae65fdd9");
    assert.equal(createHash("md5").update(turretGeometry).digest("hex"), "e5884e94bf4c8bec0d7998b32c3c2ae5");
    return { catalog: CjsBlackFormat.readPayload(black).object, hullBytes, turretBytes, turretGeometry };
  })();
  return corpusData;
}

async function assets(t, slots = [1, 2, 8])
{
  const data = await readCorpus();
  const files = new Map([["res:/dx9/model/spaceobjectfactory/generic.black", data.catalog.generic]]);
  for (const [kind, directory] of Object.entries({ hull: "hulls", faction: "factions", race: "races", material: "materials", pattern: "patterns", layout: "layouts" }))
  {
    for (const item of data.catalog[kind]) files.set(`res:/dx9/model/spaceobjectfactory/${directory}/${item.name}.black`, item);
  }
  const makeGeometry = bytes =>
  {
    const resource = new TriGeometryRes();
    resource.SetPayload(resource.ReadGrannyFile(bytes));
    resource.MarkPrepared();
    return resource;
  };
  const hullGeometry = makeGeometry(data.hullBytes);
  const turretGeometry = makeGeometry(data.turretGeometry);
  const resources = new Map([[hullGeometryPath, hullGeometry], [turretGeometryPath, turretGeometry]]);
  const previous = blue.resMan;
  blue.resMan = new StubResMan(path => resources.get(path.toLowerCase()));
  t.after(() => { blue.resMan = previous; });
  const sof = new EveSOF().Register({
    lazyData: { source: async path => { assert.ok(files.has(path), path); return files.get(path); } },
    resources: { exists: async path => files.has(path) }
  });
  const ship = EveShip2.from(await sof.BuildValuesFromDNAAsync("mde3_t3:minmatarbase:minmatar"));
  ship.mesh.SetGeometryRes(hullGeometry);
  ship.PrepareForAnimation();
  const sets = slots.map(slot =>
  {
    const set = EveTurretSet.from(CjsBlackFormat.readPayload(data.turretBytes).object);
    set.geometryResPath = turretGeometryPath;
    set.slotNumber = slot;
    set.lodLevel = EveTurretSet.LOD.LOD_HIGHEST;
    set.Initialize();
    ship.turretSets.push(set);
    return set;
  });
  t.after(() =>
  {
    ship.UnRegister(ship.GetComponentRegistry());
    for (const set of sets) { set.ReleaseResources(); TriDevice.UnregisterResource(set); }
    ship.animationUpdater.SetSharedGeometryRes(null);
  });
  ship.Initialize();
  return { ship, sets, hullGeometry };
}

function near(actual, expected, label, tolerance = 2e-4)
{
  assert.equal(actual.length, expected.length, label);
  for (let i = 0; i < actual.length; i++)
  {
    assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `${label}[${i}]: ${actual[i]} != ${expected[i]}`);
  }
}

// TriMath.cpp:683 removes each axis length independently, preserving shear.
function normalized(matrix)
{
  const result = Array.from(matrix);
  for (const offset of [0, 4, 8])
  {
    const length = Math.sqrt(matrix[offset] ** 2 + matrix[offset + 1] ** 2 + matrix[offset + 2] ** 2);
    for (let axis = 0; axis < 3; axis++) result[offset + axis] /= length;
  }
  return result;
}

// Carbon row-vector local * parent, represented as transposed flat matrices.
function worldFromLocal(local, parent)
{
  const out = Array(16).fill(0);
  for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++)
  {
    for (let inner = 0; inner < 4; inner++) out[row * 4 + column] += local[row * 4 + inner] * parent[inner * 4 + column];
  }
  return out;
}

function context(time, delta)
{
  const value = new EveUpdateContext();
  value.SetTime((time - delta) * 10_000_000);
  value.SetTime((time) * 10_000_000);
  value.SetLodFactor(1);
  return value;
}

test("real Svipul authored slots resolve exact animated indices before duplicate static locators", { skip }, async t =>
{
  const { ship, sets } = await assets(t);
  assert.equal(ship.locators.filter(value => value.GetName().startsWith("locator_turret_")).length, 23);
  assert.equal(ship.animationUpdater.GetAnimationBoneList().length, 51);
  assert.equal(ship.animationUpdater.GetMeshBoneCount(), 30);
  assert.equal(ship.GetTurretLocatorCount(), 8);
  assert.deepEqual(sets.map(set => set.GetTurrets().length), [3, 3, 2]);
  assert.deepEqual([0, 1, 2].map(index => ship.GetTurretLocatorIndex(0, index)), [18, 28, 9]);
  assert.deepEqual([0, 1, 2].map(index => ship.GetTurretLocatorIndex(1, index)), [23, 29, 10]);
  for (const [setIndex, indices] of [[0, [18, 28, 9]], [1, [23, 29, 10]]])
  {
    for (let index = 0; index < indices.length; index++)
    {
      near(sets[setIndex].GetTurrets()[index].localMatrix, normalized(ship.animationUpdater.GetBoneTransform(indices[index])), "native bone mount");
    }
  }
  const authored = ship.locators.find(value => value.GetName() === "locator_turret_1a");
  assert.notDeepEqual(Array.from(sets[0].GetTurrets()[0].localMatrix), normalized(authored.GetTransform()), "the intact authored static duplicate is a negative control");
});

test("real Svipul slot eight remains an authored static fallback with animation available", { skip }, async t =>
{
  const { ship, sets: [set] } = await assets(t, [8]);
  assert.equal(ship.animationUpdater.GetAnimationBoneList().includes("locator_turret_8a"), false);
  assert.deepEqual([0, 1].map(index => ship.GetTurretLocatorIndex(0, index)), [21, 22]);
  for (const [index, suffix] of [[0, "a"], [1, "b"]])
  {
    const locator = ship.locators.find(value => value.GetName() === `locator_turret_8${suffix}`);
    near(set.GetTurrets()[index].localMatrix, normalized(locator.GetTransform()), "static fallback");
  }
  const before = set.GetTurrets().map(value => Array.from(value.localMatrix));
  const authoredBefore = ship.locators.map(value => Array.from(value.GetTransform()));
  ship.animationUpdater.PlayAnimation("SniperModeLoop", true, 1, 0, 1);
  ship.UpdateSyncronous(context(1, 0.05));
  assert.deepEqual(set.GetTurrets().map(value => Array.from(value.localMatrix)), before);
  assert.deepEqual(ship.locators.map(value => Array.from(value.GetTransform())), authoredBefore, "scale removal must not mutate borrowed authored matrices");
  assert.ok(Math.abs(Math.hypot(...ship.locators[21].GetTransform().slice(0, 3)) - 2.27) < 1e-4);
});

test("real Svipul stance update publishes current mount pose before turret synchronous work", { skip }, async t =>
{
  const { ship, sets: [set] } = await assets(t, [1]);
  const phases = [];
  for (const method of ["SetLocalTransform", "UpdateTurretTransforms", "UpdateSyncronous"])
  {
    const original = set[method];
    t.mock.method(set, method, function (...args) { phases.push(method); return original.apply(this, args); });
  }
  const samples = [];
  // Raw constant tracks: 1a/1b -> FrontPart(2) -> Front_BigCyl(1) -> root.
  // NormalLoop has identity rotations; SniperModeLoop uses X quaternions
  // [0.537299633,0,0,0.843391419] and [0.233445361,0,0,0.972369909].
  // 1c is a root child. Values are scalar quaternion/translation composition.
  const expected = [
    [[12.233567, 9.346076, 171.504282], [-5.685300, -20.410768, 94.903483], [-12.516000, 18.687668, -5.859455]],
    [[12.233567, -162.791445, 33.373781], [-5.685300, -85.198810, 6.308397], [-12.516000, 18.687668, -5.859455]]
  ];
  for (const [sample, clip] of ["NormalLoop", "SniperModeLoop"].entries())
  {
    ship.animationUpdater.PlayAnimation(clip, true, 1, 0, 1);
    phases.length = 0;
    ship.UpdateSyncronous(context(sample + 1, 0.05));
    assert.deepEqual(phases, ["SetLocalTransform", "UpdateTurretTransforms", "SetLocalTransform", "UpdateTurretTransforms", "SetLocalTransform", "UpdateTurretTransforms", "UpdateSyncronous"], "EveMobile.cpp:183-194 updates each resolved joint before the turret phase");
    for (let index = 0; index < 3; index++)
    {
      near(set.GetTurrets()[index].localMatrix.slice(12, 15), expected[sample][index], "raw constant-track quaternion/translation oracle", 0.002);
      const local = normalized(ship.animationUpdater.GetBoneTransform([18, 28, 9][index]));
      near(set.GetTurrets()[index].worldMatrix, worldFromLocal(local, ship.GetTurretTransform(set.GetSwarmID())), "current pose is published before the direct transform-boundary probe", 0.002);
    }
    samples.push(set.GetTurrets().map(value => Array.from(value.localMatrix)));
  }
  assert.notDeepEqual(samples[0][0], samples[1][0]);
  assert.notDeepEqual(samples[0][1], samples[1][1]);
  near(samples[0][2], samples[1][2], "root-child mount c remains fixed");
  const parent = [0, 2, 0, 0, -3, 0.7, 0, 0, 0.4, 0, 4, 0, 11, -7, 13, 1];
  set.UpdateTurretTransforms(parent);
  for (const [index, boneIndex] of [18, 28, 9].entries())
  {
    const local = normalized(ship.animationUpdater.GetBoneTransform(boneIndex, mat4.create()));
    near(set.GetTurrets()[index].worldMatrix, worldFromLocal(local, parent), "native local then rotated/scaled/sheared/translated parent", 0.002);
    assert.notDeepEqual(worldFromLocal(local, parent), worldFromLocal(parent, local), "reversed multiplication is observably different");
  }
});

test("real Svipul live turret changes transfer registry ownership and preserve base list callbacks", { skip }, async t =>
{
  const { ship, sets: [first, second] } = await assets(t, [1, 2]);
  const registry = new EveComponentRegistry();
  ship.Register(registry);
  assert.equal(first.GetComponentRegistry(), registry);
  assert.equal(second.GetComponentRegistry(), registry);
  CjsModel.removeChild(ship, "turretSets", first);
  assert.equal(first.IsInRegistry(), false);
  assert.deepEqual([0, 1, 2].map(index => ship.GetTurretLocatorIndex(0, index)), [23, 29, 10]);
  ship.display = false;
  ship.OnModified("display");
  CjsModel.addChild(ship, "turretSets", first);
  assert.equal(first.GetComponentRegistry(), registry, "native live insertion checks hull registration, independently of display");
  ship.OnListModified(BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, ship.turretSets);
  assert.equal(first.IsInRegistry(), false);
  assert.equal(second.IsInRegistry(), false);
  // Controlled real controller augmentation observes the inherited list owner;
  // the authored Svipul controller resources are outside this CPU fixture.
  const controller = new Tr2Controller();
  CjsModel.addChild(ship, "controllers", controller);
  assert.equal(controller.IsLinked(), true, "Mobile must dispatch its base controller-list notification");
  CjsModel.removeChild(ship, "controllers", controller);
  assert.equal(controller.IsLinked(), false);
});

test("real Svipul clipping options reach pulse material and controlled distributed ambient meshes", { skip }, async t =>
{
  const { ship, sets: [set] } = await assets(t, [1]);
  // Controlled augmentation: real classes and a copy of the loaded pulse's
  // material, not a claim that this turret asset authors an ambient mesh.
  const source = new EveChildMesh();
  source.mesh = new Tr2Mesh();
  const area = new Tr2MeshArea();
  area.effect = new Copier().CloneTo(set.turretEffect);
  source.mesh.opaqueAreas.push(area);
  set.ambientEffect = source;
  const generated = set.GetAmbientEffectOrGeneratedEffect();
  assert.equal(generated.instances.length, 3);
  const materials = generated.instances.map(instance => instance.objects[0].mesh.opaqueAreas[0].effect);
  assert.ok(materials.every(material => material !== area.effect));
  for (const material of [set.turretEffect, ...materials, area.effect])
  {
    material.SetOption("SPACE_OBJECT_CLIPPING", "SOC_DISABLED");
    assert.equal(material.GetOption("SPACE_OBJECT_CLIPPING"), "SOC_DISABLED");
  }
  ship.clipSphereFactor = 0.2;
  ship.RebuildTurretPositions();
  for (const material of [set.turretEffect, ...materials]) assert.equal(material.GetOption("SPACE_OBJECT_CLIPPING"), "SOC_ENABLED");
  assert.equal(area.effect.GetOption("SPACE_OBJECT_CLIPPING"), "SOC_DISABLED", "distributed forwarding leaves the authored source unchanged");
  ship.clipSphereFactor = 0;
  ship.RebuildTurretPositions();
  for (const material of [set.turretEffect, ...materials]) assert.equal(material.GetOption("SPACE_OBJECT_CLIPPING"), "SOC_ENABLED", "native rebuild's clipping branch only enables");
  ship.SetShaderOption("SPACE_OBJECT_CLIPPING", "SOC_DISABLED");
  for (const material of [set.turretEffect, ...materials]) assert.equal(material.GetOption("SPACE_OBJECT_CLIPPING"), "SOC_DISABLED");
  set.ambientEffectEditingMode = true;
  set.OnModified("ambientEffectEditingMode");
  ship.SetShaderOption("SPACE_OBJECT_CLIPPING", "SOC_ENABLED");
  assert.equal(area.effect.GetOption("SPACE_OBJECT_CLIPPING"), "SOC_ENABLED", "editing forwards to the selected authored source");
  for (const material of materials) assert.equal(material.GetOption("SPACE_OBJECT_CLIPPING"), "SOC_DISABLED", "editing does not forward to the previous generated content");
});
