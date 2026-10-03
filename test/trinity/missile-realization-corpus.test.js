// Real captured light-missile graph, with explicitly labelled owner/placement
// controls. CPU submission proves no GPU rendering or authored client recipe.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/TriGeometryRes.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveSOF } from "../../npm/dist/sof/index.js";
import { EveMissile, EveMissileWarhead, EveSpaceObject2, EveTransform, EveRootTransform, EveUpdateContext,
  ITr2GenericEmitter, TriFrustum, Tr2QuadRenderer, Tr2GpuSharedEmitter,
  Tr2RotationAdapter, Tr2TranslationAdapter } from "../../npm/dist/trinity/index.js";
import "../../npm/dist/audio/index.js";
import { StubResMan } from "../support/stubResMan.js";

const fixturePath = process.env.MISSILE_BLACK_CORPUS_FILE;
const skip = !fixturePath && "set MISSILE_BLACK_CORPUS_FILE to the indexed light_missile.black";
const targetCorpus = process.env.TURRET_BLACK_CORPUS_DIR;
const targetSkip = skip || (!targetCorpus && "set TURRET_BLACK_CORPUS_DIR for the real Svipul data.black and mde3_t3.gr2 target");
const hullGeometryPath = "res:/dx9/model/ship/minmatar/destroyer/mde3/mde3_t3.gr2";
const managers = new WeakMap();

async function realMissile(t)
{
  const bytes = await readFile(fixturePath);
  assert.equal(bytes.length, 1869);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "c87e3a53d250ea4f2a7733de25b4d3c6e117cd5fb12083f920557ab340e5baa6");
  if (!managers.has(t))
  {
    const previous = blue.resMan;
    managers.set(t, new StubResMan());
    blue.resMan = managers.get(t);
    t.after(() => { blue.resMan = previous; managers.delete(t); });
  }
  const missile = CjsSchema.from("EveMissile", CjsBlackFormat.readPayload(bytes).object);
  assert.equal(missile.warheads.length, 1, "one authored warhead, not an authored MIRV recipe");
  const warhead = missile.warheads[0];
  assert.equal(warhead.children.length, 0);
  assert.equal(warhead.spriteSet.sprites.length, 2);
  assert.equal(warhead.particleEmitters.length, 2);
  for (const emitter of warhead.particleEmitters) assert.ok(CjsSchema.cast(emitter, Tr2GpuSharedEmitter));
  for (const sprite of warhead.spriteSet.sprites)
  {
    assert.deepEqual(Array.from(sprite.position), [0, 0, -0.5584071278572083]);
  }
  return missile;
}

function makeView()
{
  const frustum = new TriFrustum();
  frustum.DeriveFrustum(mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, 1, 0]), [0, 0, 0],
    mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100000), {width: 1024, height: 1024});
  const context = new EveUpdateContext();
  context.SetFrustum(frustum);
  context.lodFactor = 1;
  context.invLodFactor = 1;
  return {context, frustum};
}

function onlyRecord(renderer)
{
  const records = [...renderer.GetEffectRecords().values()];
  assert.equal(records.length, 1);
  return records[0];
}

test("real light missile registers and submits its two authored sprites through both quad owners", {skip}, async t =>
{
  const missile = await realMissile(t), warhead = missile.warheads[0];
  const renderer = new Tr2QuadRenderer(), {frustum} = makeView();
  const baseRegister = t.mock.method(EveSpaceObject2.prototype, "RegisterWithQuadRenderer");
  const baseAdd = t.mock.method(EveSpaceObject2.prototype, "AddQuadsToQuadRenderer");
  missile.RegisterWithQuadRenderer(renderer);
  const record = onlyRecord(renderer);
  assert.equal(record.effect, warhead.spriteSet.effect);
  assert.equal(record.instanceSize, 32);
  assert.equal(record.quadCount, 1);
  missile.AddQuadsToQuadRenderer(frustum, renderer);
  assert.equal(record.addedSize, 0, "registration does not launch the warhead");

  warhead.PrepareLaunch();
  warhead.Launch(mat4.create());
  // A controlled world placement isolates forwarding, without simulating flight.
  const world = new Float32Array([0, 2, 0, 0, -3, 0, 0, 0, 0.4, 0.6, 4, 0, 21, -13, -80, 1]);
  mat4.copy(warhead.worldTransform, world);
  const submit = t.mock.method(warhead.spriteSet, "AddToQuadRenderer");
  missile.AddQuadsToQuadRenderer(frustum, renderer);
  assert.equal(submit.mock.callCount(), 1);
  const expectedArguments = [renderer, warhead.worldTransform, 1, 1, null, 0];
  assert.equal(submit.mock.calls[0].arguments.length, expectedArguments.length);
  expectedArguments.forEach((argument, index) => assert.equal(submit.mock.calls[0].arguments[index], argument));
  assert.equal(record.pending.length, 1);
  assert.equal(record.addedSize, 64);
  const bytes = new DataView(record.pending[0].buffer, record.pending[0].byteOffset, record.pending[0].byteLength);
  const z = -0.5584071278572083;
  const expected = [21 + 0.4 * z, -13 + 0.6 * z, -80 + 4 * z];
  for (let sprite = 0; sprite < 2; sprite++)
  {
    for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(bytes.getFloat32(sprite * 32 + axis * 4, true) - expected[axis]) < 1e-5);
  }
  assert.equal(baseRegister.mock.callCount(), 0, "native missile quad methods do not visit the base");
  assert.equal(baseAdd.mock.callCount(), 0);
});

test("real warhead quad gates differ from mesh visibility and keep EXPLODED sprites", {skip}, async t =>
{
  const warhead = (await realMissile(t)).warheads[0], {frustum} = makeView();
  warhead.PrepareLaunch();
  for (const state of [EveMissileWarhead.State.STATE_DELAYED, EveMissileWarhead.State.STATE_DEAD])
  {
    warhead._state = state; // Controlled state isolates registration from lifecycle.
    const renderer = new Tr2QuadRenderer();
    warhead.RegisterWithQuadRenderer(renderer);
    assert.equal(onlyRecord(renderer).effect, warhead.spriteSet.effect);
    warhead.AddQuadsToQuadRenderer(frustum, renderer);
    assert.equal(onlyRecord(renderer).addedSize, 0);
  }
  warhead.Launch(mat4.create());
  warhead._state = EveMissileWarhead.State.STATE_DEAD;
  const renderer = new Tr2QuadRenderer();
  warhead.RegisterWithQuadRenderer(renderer);
  const record = onlyRecord(renderer);
  warhead.AddQuadsToQuadRenderer(frustum, renderer);
  assert.equal(record.addedSize, 0, "valid launch data does not revive DEAD sprites");
  warhead._state = EveMissileWarhead.State.STATE_EXPLODED;
  warhead.display = false;
  warhead._isVisible = false;
  warhead.lodLevel = EveTransform.Tr2Lod.TR2_LOD_LOW;
  warhead.mesh = null;
  warhead.AddQuadsToQuadRenderer(frustum, renderer);
  assert.equal(record.addedSize, 64, "no mesh/display/LOD gate exists on this owner");
  warhead.spriteSet = null;
  warhead.RegisterWithQuadRenderer(renderer);
  warhead.AddQuadsToQuadRenderer(frustum, renderer);
  assert.equal(record.addedSize, 64);
});

test("controlled composition of two real warheads preserves list order and independent sprite records", {skip}, async t =>
{
  const missile = await realMissile(t), second = (await realMissile(t)).warheads[0];
  missile.warheads.push(second); // Explicit composition; neither captured asset authors this recipe.
  assert.notEqual(missile.warheads[0].spriteSet, second.spriteSet);
  const renderer = new Tr2QuadRenderer(), {frustum} = makeView(), calls = [];
  for (const [index, warhead] of missile.warheads.entries())
  {
    warhead.PrepareLaunch();
    warhead.Launch(mat4.create());
    for (const method of ["RegisterWithQuadRenderer", "AddQuadsToQuadRenderer"])
    {
      const original = warhead[method];
      t.mock.method(warhead, method, function(...args)
      {
        calls.push({index, method, receiver: this, args});
        return original.apply(this, args);
      });
    }
  }
  missile.display = false; // Native missile forwarding has no display gate.
  missile.RegisterWithQuadRenderer(renderer);
  missile.AddQuadsToQuadRenderer(frustum, renderer);
  assert.deepEqual(calls.map(call => [call.method, call.index]), [
    ["RegisterWithQuadRenderer", 0], ["RegisterWithQuadRenderer", 1],
    ["AddQuadsToQuadRenderer", 0], ["AddQuadsToQuadRenderer", 1]
  ]);
  for (const call of calls)
  {
    assert.equal(call.receiver, missile.warheads[call.index]);
    const expectedArguments = call.method === "RegisterWithQuadRenderer" ? [renderer] : [frustum, renderer];
    assert.equal(call.args.length, expectedArguments.length);
    expectedArguments.forEach((argument, index) => assert.equal(call.args[index], argument));
  }
  assert.equal([...renderer.GetEffectRecords().values()].reduce((sum, record) => sum + record.addedSize, 0), 128);
});

test("real shared emitters obey missile Initialize and Start while generic emitters remain untouched", {skip}, async t =>
{
  const missile = await realMissile(t), warhead = missile.warheads[0];
  const generic = new (class extends ITr2GenericEmitter
  {
    Enable() { assert.fail("native dynamic cast rejects the generic emitter"); }
    Update() {}
  })();
  warhead.particleEmitters.push(generic);
  const emitters = warhead.particleEmitters.slice(0, 2);
  for (const emitter of emitters) emitter.Enable(true);
  missile.Initialize();
  assert.deepEqual(emitters.map(emitter => emitter.IsEnabled()), [false, false]);
  warhead.EnableParticleEmitting(true);
  assert.deepEqual(emitters.map(emitter => emitter.IsEnabled()), [true, true]);
  missile.Start(new Float32Array([1, 2, 3]), 4);
  assert.deepEqual(emitters.map(emitter => emitter.IsEnabled()), [false, false]);
  assert.ok(mappedInterfaces(missile.constructor).has(EveMissile));
  assert.ok(mappedInterfaces(warhead.constructor).has(EveMissileWarhead));
  assert.ok(mappedInterfaces(warhead.constructor).has(EveTransform));
});

test("labelled real-warhead child composition uses native mapped EveTransform and shared-emitter filtering", {skip}, async t =>
{
  const parent = (await realMissile(t)).warheads[0], child = (await realMissile(t)).warheads[0];
  parent.children.push(child); // No authored missile children occur in this captured corpus.
  const ordinary = new EveTransform(), ordinaryEmitter = (await realMissile(t)).warheads[0].particleEmitters[0];
  ordinary.particleEmitters.push(ordinaryEmitter);
  parent.children.push(ordinary); // Labelled ordinary-owner composition qualifies the installed base declaration.
  assert.equal(mappedInterfaces(ordinary.constructor).has(EveTransform), true);
  const rejected = new EveRootTransform(), ignoredEmitter = (await realMissile(t)).warheads[0].particleEmitters[0];
  // RootTransform deliberately skips EveTransform's Blue exposure despite JS inheritance.
  rejected.particleEmitters.push(ignoredEmitter);
  parent.children.push(rejected);
  assert.equal(mappedInterfaces(rejected.constructor).has(EveTransform), false);
  const ignoredEnable = t.mock.method(ignoredEmitter, "Enable");
  child.particleEmitters.push(new (class extends ITr2GenericEmitter
  {
    Enable() { assert.fail("mapped child still rejects a generic emitter"); }
    Update() {}
  })());
  const calls = [];
  const ordinaryEnable = ordinaryEmitter.Enable;
  t.mock.method(ordinaryEmitter, "Enable", function(value)
  {
    calls.push("ordinary");
    return ordinaryEnable.call(this, value);
  });
  for (const [label, owner] of [["child", child], ["parent", parent]])
  {
    for (const emitter of owner.particleEmitters.slice(0, 2))
    {
      const enable = emitter.Enable;
      t.mock.method(emitter, "Enable", function(value) { calls.push(label); return enable.call(this, value); });
    }
  }
  parent.EnableParticleEmitting(true);
  assert.deepEqual(calls, ["child", "child", "ordinary", "parent", "parent"]);
  assert.equal(ordinaryEmitter.IsEnabled(), true);
  for (const owner of [child, parent]) assert.deepEqual(owner.particleEmitters.slice(0, 2).map(emitter => emitter.IsEnabled()), [true, true]);
  assert.equal(ignoredEnable.mock.callCount(), 0);
  assert.equal(ignoredEmitter.IsEnabled(), false);
});

test("real missile visibility resets inherited culling and LOD before warheads and continues after base false", {skip}, async t =>
{
  const missile = await realMissile(t), warhead = missile.warheads[0], {context, frustum} = makeView();
  assert.ok(warhead.mesh);
  assert.ok(warhead.warheadLength > 0);
  missile.Start(new Float32Array(3), 10);
  warhead.PrepareLaunch();
  warhead.Launch(mat4.create());
  missile.RebuildMissileBoundingSphere();
  const placement = new Tr2TranslationAdapter(); // Explicit controlled placement curve.
  missile.translationCurve = placement;
  const distance = 1000 * (1 + missile.boundingSphereRadius);
  const observations = [], original = warhead.UpdateVisibility;
  t.mock.method(warhead, "UpdateVisibility", function(ctx, parent)
  {
    observations.push({visible: missile.isVisible, inFrustum: missile._isInFrustum, lod: missile._lodLevelWithChildren});
    return original.call(this, ctx, parent);
  });
  const high = EveTransform.Tr2Lod.TR2_LOD_HIGH, low = EveTransform.Tr2Lod.TR2_LOD_LOW;
  context.SetVisibilityThreshold(0.001);
  context.SetLowDetailThreshold(0.002);
  context.SetMediumDetailThreshold(0.003);
  const suppliedParent = mat4.fromTranslation(mat4.create(), [7, 8, 9]);
  const base = t.mock.method(EveSpaceObject2.prototype, "UpdateVisibility");
  for (const [time, x] of [[1, 0], [2, 4 * distance]])
  {
    placement.value.set([x, 0, -distance]);
    missile.UpdateWorldTransform(time);
    missile.UpdateWorldBounds();
    missile.UpdateVisibility(context, suppliedParent);
    const visible = time === 1, expectedLOD = visible ? high : low;
    assert.equal(missile.isVisible, visible);
    assert.equal(missile._isInFrustum, visible);
    assert.equal(missile._lodLevelWithChildren, expectedLOD);
    assert.equal(warhead.GetLODLevel(), expectedLOD);
    assert.equal(missile.lodLevel, expectedLOD, "off-axis pass clears previously merged HIGH LOD");
    assert.deepEqual(observations.at(-1), {visible, inFrustum: visible, lod: expectedLOD});
    assert.equal(base.mock.calls.at(-1).arguments[0], context);
    assert.equal(base.mock.calls.at(-1).arguments[1], suppliedParent);
    if (visible)
    {
      const sphere = new Float32Array(4);
      missile.GetBoundingSphere(sphere);
      assert.ok(frustum.GetPixelSizeAccross(sphere) > context.GetMediumDetailThreshold());
    }
  }
  missile.display = false;
  placement.value.set([0, 11, -distance]);
  missile.UpdateWorldTransform(3);
  missile.UpdateWorldBounds();
  missile.UpdateVisibility(context, suppliedParent);
  assert.equal(missile.isVisible, false);
  assert.equal(observations.at(-1).visible, false);
  assert.deepEqual(Array.from(warhead.worldTransform.subarray(12, 15)), [0, 11, Math.fround(-distance)],
    "base false does not stop the real warhead from publishing its new world placement");
});

function nearValues(actual, expected, tolerance = 2e-5)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= tolerance, `value[${index}] ${actual[index]} != ${expected[index]}`);
  }
}

test("real warhead flight keeps world and impact position at the previous visibility phase", {skip}, async t =>
{
  const missile = await realMissile(t), warhead = missile.warheads[0], {context} = makeView();
  warhead.id = 4; // Client-assigned identity; the captured template has id=-1.
  warhead.PrepareLaunch();
  warhead.Launch(mat4.fromTranslation(mat4.create(), [3, 4, 5]));
  const parent = [0, 2, 0, 0, -3, 0, 0, 0, 0.4, 0.6, 4, 0, 21, -13, -80, 1];
  mat4.copy(missile.worldTransform, parent); // Controlled non-orthogonal missile placement.
  missile.UpdateVisibility(context, mat4.create());
  nearValues(warhead.worldTransform, parent);
  context.SetTime((1) * 10_000_000);
  warhead.Update(context);
  context.SetTime((1.25) * 10_000_000);
  context.originShift.set([1, 2, 3]);
  warhead.UpdateWarhead(0.25, 10, new Float32Array(3), new Float32Array([4, 8, 12]), mat4.create(), missile.worldTransform, context.GetOriginShift());
  // Still DELAYED: flight fraction=0, no ejection, start+inheritedVelocity*dt.
  const offset = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 6, 8, 1];
  nearValues(warhead.GetCurrentOffsetTransform(), offset);
  nearValues(warhead.worldTransform, parent, 2e-5);
  warhead.Update(context);
  nearValues(warhead._movement, [1, 2, 3]);
  // Controlled final-tracking state isolates CheckImpact's observed world position;
  // this is not a full flight or a fix for the separately held impact algorithm.
  warhead._state = EveMissileWarhead.State.STATE_TRACKING_FINAL;
  assert.equal(warhead.CheckImpact(0.25, 10, null), EveMissileWarhead.StateChangeEvent.EVT_EXPLODE);
  nearValues(warhead.explosionPosition, [21, -13, -80]);
  missile.UpdateVisibility(context, mat4.create());
  const expectedWorld = [...parent];
  expectedWorld.splice(12, 3, 21 - 3 * 6 + 0.4 * 8, -13 + 2 * 4 + 0.6 * 8, -80 + 4 * 8);
  nearValues(warhead.worldTransform, expectedWorld);
  nearValues(warhead.explosionPosition, [21, -13, -80], 2e-5);
});

test("real missile invokes its rotation adapter Update owner and publishes its cached value", {skip}, async t =>
{
  const missile = await realMissile(t), rotation = new Tr2RotationAdapter(), context = new EveUpdateContext();
  // The asset has no client ball curves; this concrete adapter is a labelled owner input.
  rotation.value.set([0, 0, Math.SQRT1_2, Math.SQRT1_2]);
  missile.rotationCurve = rotation;
  context.SetTime(3);
  // Precompute inherited placement at the same time so base sync will not resample.
  missile.UpdateWorldTransform(3);
  rotation.currentValue.set([0, 0, 0, 1]);
  const update = t.mock.method(rotation, "Update");
  missile.UpdateSyncronous(context);
  nearValues(rotation.currentValue, [0, 0, Math.SQRT1_2, Math.SQRT1_2]);
  assert.equal(update.mock.callCount(), 1, "the missile's own update owner must call Update, not GetValueAt");
  assert.equal(update.mock.calls[0].arguments[0], 3);
});

async function realRenderableComposition(t)
{
  const missile = await realMissile(t), inherited = (await realMissile(t)).warheads[0];
  assert.equal(missile.children.length, 0);
  assert.equal(missile.mesh, null);
  // Explicit composition of independently hydrated real assets, not an authored client recipe.
  missile.children.push(inherited);
  const warhead = missile.warheads[0];
  for (const item of [inherited, warhead])
  {
    item.PrepareLaunch();
    item.Launch(mat4.create());
    assert.ok(item.mesh);
  }
  const placement = new Tr2TranslationAdapter();
  placement.value.set([0, 0, -1000]);
  missile.translationCurve = placement;
  missile.RebuildMissileBoundingSphere();
  missile.UpdateWorldTransform(1);
  missile.UpdateWorldBounds();
  const {context} = makeView();
  context.SetVisibilityThreshold(0.001);
  context.SetLowDetailThreshold(0.002);
  context.SetMediumDetailThreshold(0.003);
  missile.UpdateVisibility(context, mat4.create());
  assert.equal(missile.isVisible, true);
  assert.equal(inherited.GetLODLevel(), EveTransform.Tr2Lod.TR2_LOD_HIGH);
  assert.equal(warhead.GetLODLevel(), EveTransform.Tr2Lod.TR2_LOD_HIGH);
  return {missile, inherited, warhead, context, placement};
}

function assertRenderableIdentity(actual, expected)
{
  assert.equal(actual.length, expected.length);
  expected.forEach((renderable, index) => assert.equal(actual[index], renderable));
}

test("real missile collection appends inherited visuals before authored warhead and preserves caller output", {skip}, async t =>
{
  const {missile, inherited, warhead, context} = await realRenderableComposition(t);
  const nested = (await realMissile(t)).warheads[0];
  // A further explicit composition ensures Warhead's own collector remains mesh-only.
  warhead.children.push(nested);
  nested.PrepareLaunch();
  nested.Launch(mat4.create());
  nested.UpdateVisibility(context, warhead.worldTransform);
  assert.equal(nested.GetLODLevel(), EveTransform.Tr2Lod.TR2_LOD_HIGH);
  const nestedGather = t.mock.method(nested, "GetRenderables");
  const baseGather = t.mock.method(EveSpaceObject2.prototype, "GetRenderables");
  const entries = [], original = warhead.GetRenderables;
  t.mock.method(warhead, "GetRenderables", function(out)
  {
    entries.push(out.slice());
    return original.call(this, out);
  });
  const prefix = new EveTransform(), out = [prefix];
  assert.equal(missile.GetRenderables(out), out);
  assert.equal(baseGather.mock.callCount(), 1);
  assert.equal(baseGather.mock.calls[0].this, missile);
  assert.equal(baseGather.mock.calls[0].arguments[0], out);
  assertRenderableIdentity(entries[0], [prefix, inherited]);
  assertRenderableIdentity(out, [prefix, inherited, warhead]);
  assert.equal(nestedGather.mock.callCount(), 0, "Warhead must not gather its base children");
  assertRenderableIdentity(missile.GetRenderables(), [inherited, warhead]);
});

test("real missile base visibility gates inherited collection without suppressing eligible warheads", {skip}, async t =>
{
  const {missile, inherited, warhead, context, placement} = await realRenderableComposition(t);
  const prefix = new EveTransform();
  missile.display = false;
  missile.UpdateVisibility(context, mat4.create());
  assert.equal(missile.isVisible, false);
  assert.equal(warhead.GetLODLevel(), EveTransform.Tr2Lod.TR2_LOD_HIGH);
  const hiddenBase = [prefix];
  assert.equal(missile.GetRenderables(hiddenBase), hiddenBase);
  assertRenderableIdentity(hiddenBase, [prefix, warhead]);

  missile.display = true;
  warhead.display = false;
  missile.UpdateVisibility(context, mat4.create());
  assert.equal(missile.isVisible, true);
  assertRenderableIdentity(missile.GetRenderables(), [inherited]);

  warhead.display = true;
  placement.value.set([100000, 0, -1000]);
  missile.UpdateWorldTransform(2);
  missile.UpdateWorldBounds();
  missile.UpdateVisibility(context, mat4.create());
  assert.equal(missile.isVisible, false);
  assert.equal(warhead.GetLODLevel(), EveTransform.Tr2Lod.TR2_LOD_LOW);
  assertRenderableIdentity(missile.GetRenderables([prefix]), [prefix]);
});

let svipulData;

// Real SOF Svipul as the warhead's ITriTargetable: authored damage locators and impact overlay.
async function realSvipulTarget(t)
{
  svipulData ??= (async () =>
  {
    const [black, hull] = await Promise.all([readFile(join(targetCorpus, "data.black")), readFile(join(targetCorpus, "mde3_t3.gr2"))]);
    assert.equal(createHash("sha256").update(black).digest("hex"), "b888ce85f9040a49e2cfff6357e9e7ab89905818562562c7ec06e786b165afec");
    assert.equal(createHash("sha256").update(hull).digest("hex"), "5cae1a039c579da77e1276fd084cc74bde8fea45ffd549a332c00be3b5287337");
    return { catalog: CjsBlackFormat.readPayload(black).object, hull };
  })();
  const { catalog, hull } = await svipulData;
  const files = new Map([["res:/dx9/model/spaceobjectfactory/generic.black", catalog.generic]]);
  for (const [kind, directory] of Object.entries({ hull: "hulls", faction: "factions", race: "races", material: "materials", pattern: "patterns", layout: "layouts" }))
  {
    for (const item of catalog[kind]) files.set(`res:/dx9/model/spaceobjectfactory/${directory}/${item.name}.black`, item);
  }
  const geometry = new TriGeometryRes();
  geometry.SetPayload(geometry.ReadGrannyFile(hull));
  geometry.MarkPrepared();
  assert.equal(managers.has(t), false, "the target installs the test's resource manager before the missile");
  const previous = blue.resMan;
  managers.set(t, new StubResMan(path => path.toLowerCase() === hullGeometryPath ? geometry : undefined));
  blue.resMan = managers.get(t);
  t.after(() => { blue.resMan = previous; managers.delete(t); });
  const sof = await new EveSOF().Register({
    lazyData: { source: async path => { assert.ok(files.has(path), path); return files.get(path); } },
    resources: { exists: async path => files.has(path) }
  });
  const ship = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNAAsync("mde3_t3:minmatarbase:minmatar"));
  ship.mesh.SetGeometryRes(geometry);
  ship.Initialize();
  t.after(() => ship.UnRegister(ship.GetComponentRegistry()));
  assert.equal(ship.GetDamageLocatorCount(), 42);
  assert.ok(ship.impactOverlay, "the SOF hull authors an impact overlay");
  assert.equal(ship.HasImpactConfigurationShield(), false, "locator impacts, not the shield ellipsoid");
  // Controlled ball placement through real adapters: rotated and translated.
  const translation = new Tr2TranslationAdapter(), rotation = new Tr2RotationAdapter();
  translation.value.set([300, -200, 1500]);
  rotation.value.set([0.2, 0.4, 0.1, Math.sqrt(1 - 0.04 - 0.16 - 0.01)]);
  ship.translationCurve = translation;
  ship.rotationCurve = rotation;
  ship.UpdateWorldTransform(1);
  nearValues(ship.worldTransform.subarray(12, 15), [300, -200, 1500]);
  assert.ok(Math.abs(ship.worldTransform[1]) > 0.1, "the target is rotated");
  return ship;
}

/**
 * Drives the real warhead through its native state transitions against the real
 * target, then accrues flying time with one flight step.
 */
async function trackingWarhead(t, ship, estimated, flyingTime)
{
  const missile = await realMissile(t), warhead = missile.warheads[0], S = EveMissileWarhead.State;
  warhead.id = 7; // Client-assigned identity; the captured template has id=-1.
  missile.Start(new Float32Array(3), estimated);
  warhead.PrepareLaunch();
  warhead.Launch(mat4.create());
  const states = [];
  for (const deltaTime of [0, 0, 0.25, 0])
  {
    warhead.UpdateState(deltaTime, estimated, ship);
    states.push(warhead.GetState());
  }
  // Authored durationEjectPhase 0.25 ends ejection; estimated < 5 skips the spread phase.
  assert.deepEqual(states, [S.STATE_LAUNCH, S.STATE_EJECTING, S.STATE_START_TRACKING, S.STATE_TRACKING_FINAL]);
  const locator = warhead.GetTargetLocator();
  assert.ok(locator >= 0 && locator < 42, "the real target chose a damage locator");
  warhead.UpdateWarhead(flyingTime, estimated, new Float32Array(3), new Float32Array(3), mat4.create(), missile.worldTransform);
  const locatorPosition = vec3.create();
  assert.equal(ship.GetDamageLocatorPosition(locator, true, locatorPosition), true);
  return { missile, warhead, locator, locatorPosition };
}

/**
 * Publishes two consecutive warhead world positions through the real missile
 * visibility owner, with a non-orthogonal missile placement, and lets the
 * warhead's own Update derive its movement.
 */
function flyThrough(missile, warhead, positions)
{
  const { context } = makeView();
  const offset = mat4.getTranslation(vec3.create(), warhead.GetCurrentOffsetTransform());
  const placement = new Float32Array([0, 2, 0, 0, -3, 0, 0, 0, 0.4, 0.6, 4, 0, 0, 0, 0, 1]);
  const placed = vec3.transformMat4(vec3.create(), offset, placement);
  positions.forEach((position, frame) =>
  {
    placement.set([position[0] - placed[0], position[1] - placed[1], position[2] - placed[2]], 12);
    mat4.copy(missile.worldTransform, placement);
    missile.UpdateVisibility(context, mat4.create());
    nearValues(warhead.GetWorldPosition(vec3.create()), position, 1e-3);
    context.SetTime((frame + 1) * 10_000_000);
    warhead.Update(context);
  });
  nearValues(warhead._movement, vec3.subtract(vec3.create(), positions[1], positions[0]), 1e-3);
}

function along(origin, distance)
{
  const direction = vec3.normalize(vec3.create(), [1, 2, -2]);
  return vec3.scaleAndAdd(vec3.create(), origin, direction, distance);
}

function observeImpactOwners(t, ship, warhead)
{
  const queries = t.mock.method(ship, "GetImpactPosition");
  const impacts = [], create = ship.CreateImpact;
  t.mock.method(ship, "CreateImpact", function(...args)
  {
    impacts.push({ state: warhead.GetState(), args: args.map(value => ArrayBuffer.isView(value) ? Array.from(value) : value) });
    return create.apply(this, args);
  });
  return { queries, impacts };
}

test("real warhead timeout detonates at the warhead without querying the real target, EXPLODED before CreateImpact", {skip: targetSkip}, async t =>
{
  const ship = await realSvipulTarget(t), S = EveMissileWarhead.State, E = EveMissileWarhead.StateChangeEvent;
  const { missile, warhead, locator, locatorPosition } = await trackingWarhead(t, ship, 1, 2);
  // Carried 100 m past the locator: outside the authored 25-50 m explosion distance.
  const before = along(locatorPosition, -150), after = along(locatorPosition, 100);
  flyThrough(missile, warhead, [before, after]);
  const { queries, impacts } = observeImpactOwners(t, ship, warhead);
  // (flyingTime 2 - deltaT 0.25) / ((1 + 0.1) * speedModifier <= 1.04) > 1: timed out.
  assert.equal(warhead.CheckImpact(0.25, 1, ship), E.EVT_EXPLODE);
  assert.equal(queries.mock.callCount(), 0, "EveMissileWarhead.cpp:444 short-circuits the target query on timeout");
  nearValues(warhead.explosionPosition, after, 1e-3);
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].state, S.STATE_EXPLODED, "EveMissileWarhead.cpp:448 sets EXPLODED before CreateImpact at :460");
  assert.equal(impacts[0].args[0], locator);
  nearValues(impacts[0].args[1], vec3.subtract(vec3.create(), before, after), 1e-3);
  assert.deepEqual(impacts[0].args.slice(2), [1, 1], "authored impactDuration and impactSize");
  assert.equal(warhead.UpdateState(0, 1, ship), E.EVT_NONE);
  assert.equal(warhead.GetState(), S.STATE_DEAD);
});

test("real warhead in-flight hits query the real locator and resolve passed impacts to it", {skip: targetSkip}, async t =>
{
  const ship = await realSvipulTarget(t), S = EveMissileWarhead.State, E = EveMissileWarhead.StateChangeEvent;
  for (const [label, distance, expectedAtLocator] of [["passed", 10, true], ["approaching", -10, false]])
  {
    const { missile, warhead, locator, locatorPosition } = await trackingWarhead(t, ship, 4, 0.5);
    const before = along(locatorPosition, distance - 150), after = along(locatorPosition, distance);
    flyThrough(missile, warhead, [before, after]);
    const { queries, impacts } = observeImpactOwners(t, ship, warhead);
    assert.equal(warhead.CheckImpact(0.25, 4, ship), E.EVT_EXPLODE, label);
    assert.equal(queries.mock.callCount(), 1, label);
    const [queried, previous, now, epsilon] = queries.mock.calls[0].arguments;
    assert.equal(queried, locator);
    nearValues(previous, before, 1e-3);
    nearValues(now, after, 1e-3);
    assert.ok(epsilon >= 25 * 25 && epsilon <= 50 * 50, "squared authored maxExplosionDistance range");
    nearValues(warhead.explosionPosition, expectedAtLocator ? locatorPosition : after, 1e-3);
    assert.equal(impacts.length, 1, label);
    assert.equal(impacts[0].state, S.STATE_EXPLODED, label);
    t.mock.restoreAll();
  }
});

test("real warhead in-flight miss and negative estimated flight query the target and stay tracking", {skip: targetSkip}, async t =>
{
  const ship = await realSvipulTarget(t), S = EveMissileWarhead.State, E = EveMissileWarhead.StateChangeEvent;
  // estimated -5: Carbon's TriClamp sends the negative flight fraction to 0, not to a timeout.
  for (const estimated of [4, -5])
  {
    const { missile, warhead, locatorPosition } = await trackingWarhead(t, ship, estimated, 0.5);
    flyThrough(missile, warhead, [along(locatorPosition, -50), along(locatorPosition, 100)]);
    const { queries, impacts } = observeImpactOwners(t, ship, warhead);
    assert.equal(warhead.CheckImpact(0.25, estimated, ship), E.EVT_NONE, `estimated ${estimated}`);
    assert.equal(queries.mock.callCount(), 1);
    assert.equal(impacts.length, 0);
    assert.equal(warhead.GetState(), S.STATE_TRACKING_FINAL);
    t.mock.restoreAll();
  }
});
