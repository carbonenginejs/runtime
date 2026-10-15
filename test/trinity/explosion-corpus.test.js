// Real captured ship-death explosion (fisfx/explosion/ecx_generic_explosive_01a.black) played through its effect
// root. Placement, local explosion transforms and the global offset are labelled client inputs: the client sets
// them from the dying ship; the asset authors none of them.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { be } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveChildContainer, EveChildExplosion, EveComponentRegistry, EveUpdateContext, Tr2QuadRenderer } from "../../npm/dist/trinity/index.js";
import "../../npm/dist/sof/index.js";
import "../../npm/dist/audio/index.js";
import { StubResMan } from "../support/stubResMan.js";

const fixturePath = process.env.EXPLOSION_BLACK_CORPUS_FILE;
const skip = !fixturePath && "set EXPLOSION_BLACK_CORPUS_FILE to the indexed fisfx/explosion/ecx_generic_explosive_01a.black";

// Object identity checks never format their operands: a failing assert.equal on a live graph runs util.inspect
// over registries and children without bound.
function same(actual, expected, label = "identity")
{
  assert.ok(actual === expected, label);
}

async function realExplosion(t)
{
  const bytes = await readFile(fixturePath);
  assert.equal(bytes.length, 42231);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "72df28e62ffd4596f4b12eff1fc728ef29f2b5aeb4c276525c8bd0480febb474");
  const previous = be.resMan;
  be.resMan = new StubResMan();
  t.after(() => { be.resMan = previous; });
  const root = CjsSchema.from("EveEffectRoot2", CjsBlackFormat.readPayload(bytes).object);
  assert.equal(root.effectChildren.length, 1);
  const explosion = root.effectChildren[0];
  assert.equal(CjsSchema.getClassName(explosion.constructor), "EveChildExplosion");
  // Authored shape: two local variants, a shared part, one global explosion, 15 s each.
  same(explosion.localExplosion, null, "no singular local explosion");
  assert.equal(explosion.localExplosions.length, 2);
  assert.ok(explosion.localExplosionShared);
  assert.ok(explosion.globalExplosion);
  assert.equal(explosion.globalExplosions.length, 0);
  assert.equal(explosion.localDuration, 15);
  assert.equal(explosion.globalDuration, 15);
  const registry = new EveComponentRegistry();
  root.Register(registry);
  t.after(() => root.UnRegister(registry));
  same(explosion.GetComponentRegistry(), registry, "the root registers its effect child");
  return { root, explosion, registry };
}

/** Client inputs: a scaled, rotated, translated explosion and four local explosion transforms. */
function placeAsClient(explosion)
{
  explosion.scaling.set([3, 3, 3]);
  explosion.translation.set([10, -4, 6]);
  explosion.rotation.set([0, Math.SQRT1_2, 0, Math.SQRT1_2]);
  const transforms = [[40, 0, 0], [-25, 12, 8], [0, -30, 55], [7, 7, -60]].map(position =>
    mat4.fromRotationTranslationScale(mat4.create(), [0, 0, 0, 1], position, [1, 1, 1]));
  explosion.SetLocalExplosionTransforms(transforms);
  explosion.SetGlobalExplosionOffset([6, -9, 12]);
  return transforms;
}

/** Identity comparison: a failing deepEqual on live graphs builds an unbounded diff. */
function sameObjects(actual, expected, label)
{
  assert.equal(actual.length, expected.length, label);
  expected.forEach((object, index) => assert.ok(actual[index] === object, `${label} [${index}]`));
}

function frame(root, context, tick)
{
  context.SetTime(tick);
  root.UpdateSyncronous(context);
  root.UpdateAsyncronous(context);
}

function near(actual, expected, label, tolerance = 1e-4)
{
  assert.equal(actual.length, expected.length, label);
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `${label}[${i}] ${actual[i]} != ${expected[i]}`);
}

test("real ship-death explosion spawns, registers, wreck-switches and stops in Carbon's order", {skip}, async t =>
{
  const { root, explosion, registry } = await realExplosion(t);
  const transforms = placeAsClient(explosion);
  const context = new EveUpdateContext();
  const step = 333_333;
  let tick = 50_000_000;
  frame(root, context, tick);

  explosion.Play();
  assert.equal(explosion.isPlaying, true);
  sameObjects(explosion.objects, [explosion.localExplosionShared], "Play appends the shared part (cpp:81)");
  same(explosion.localExplosionShared.GetComponentRegistry(), registry, "the appended shared part registers through the list");
  assert.ok(explosion.wreckSwitchTime > 0);
  // cpp:134-138: total = max(localDuration + local schedule, global start + globalDuration); here the global term wins.
  assert.ok(Math.abs(explosion.totalDuration - (explosion.globalExplosionTime + 15)) < 1e-9);

  // Carbon cpp:207-209: each local translation moves into the explosion's local frame.
  const inverseLocal = mat4.invert(mat4.create(), explosion.localTransform);
  const expectedPositions = transforms.map(transform => Array.from(vec3.transformMat4(vec3.create(), mat4.getTranslation(vec3.create(), transform), inverseLocal)));
  const spawned = new Set(), sources = new Set(explosion.localExplosions);
  let globalSeen = null;
  for (let frames = 0; explosion.isPlaying && explosion.playTime < explosion.wreckSwitchTime; frames++)
  {
    assert.ok(frames < 3000, "wreck switch within 100 s");
    frame(root, context, tick += step);
    for (const object of explosion.objects)
    {
      if (object === explosion.localExplosionShared || object === explosion.generatedGlobalExplosions) continue;
      if (spawned.has(object)) continue;
      spawned.add(object);
      assert.equal(sources.has(object), false, "a spawn is a copy, never a source");
      assert.ok(explosion.localExplosions.some(source => source.name === object.name), "copied from one of the two variants");
      same(object.GetComponentRegistry(), registry, "a spawned explosion registers through the list");
    }
    if (explosion.generatedGlobalExplosions && !globalSeen)
    {
      globalSeen = explosion.generatedGlobalExplosions;
      same(globalSeen.GetComponentRegistry(), registry, "cpp:242-248 registers the new container");
      assert.equal(globalSeen.objects.length, 1);
      assert.ok(globalSeen.objects[0] !== explosion.globalExplosion, "the global instance is a copy");
      assert.equal(globalSeen.objects[0].name, explosion.globalExplosion.name);
      near(globalSeen.translation, [2, -3, 4], "global offset divided by scaling (cpp:167-173)");
      assert.equal(globalSeen.useStaticRotation, true, "SetupWithStaticRotation (cpp:233)");
    }
  }
  assert.equal(spawned.size, transforms.length, "every local transform spawns once before the wreck switch");
  const positions = [...spawned].map(object => Array.from(object.translation));
  for (const expected of expectedPositions)
  {
    assert.ok(positions.some(position => position.every((value, i) => Math.abs(value - expected[i]) < 1e-4)), `a spawn sits at ${expected}`);
  }
  assert.ok(globalSeen, "the global explosion spawned before the wreck switch");

  frame(root, context, tick += step);
  assert.ok(explosion.playTime > explosion.wreckSwitchTime);
  sameObjects(explosion.objects, [explosion.localExplosionShared, globalSeen], "cpp:189-203 removes the local spawns");
  for (const object of spawned) same(object.GetComponentRegistry(), null, "removed spawns unregister through the list");

  const unregister = explosion.UnRegisterComponents, atUnregister = [];
  explosion.UnRegisterComponents = function(...args) { atUnregister.push(this.objects.length); return unregister.apply(this, args); };
  for (let frames = 0; explosion.isPlaying; frames++)
  {
    assert.ok(frames < 3000, "stops within 100 s");
    frame(root, context, tick += step);
  }
  assert.ok(explosion.playTime > explosion.totalDuration);
  assert.deepEqual(atUnregister, [2], "cpp:98-102: a registered Stop unregisters before clearing");
  assert.equal(explosion.objects.length, 0);
  same(explosion.generatedGlobalExplosions, null, "Stop drops the global container");
  same(globalSeen.GetComponentRegistry(), null, "Stop unregisters the global container (cpp:98-101)");
  same(explosion.localExplosionShared.GetComponentRegistry(), null, "Stop unregisters the shared part");
  same(explosion.GetComponentRegistry(), registry, "the explosion itself stays registered");
});

test("real explosion runs its base container update every frame, playing or not", {skip}, async t =>
{
  const { root, explosion } = await realExplosion(t);
  placeAsClient(explosion);
  const context = new EveUpdateContext();
  const base = t.mock.method(EveChildContainer.prototype, "UpdateSyncronous");
  const own = () => base.mock.calls.filter(call => call.this === explosion).length;
  frame(root, context, 50_000_000);
  assert.equal(own(), 1, "idle: cpp:291 still runs the base update");
  explosion.Play();
  frame(root, context, 50_333_333);
  assert.equal(own(), 2);
  const params = base.mock.calls.filter(call => call.this === explosion).at(-1).arguments[1];
  assert.ok(params, "the owner's params reach the base update");
});

test("real explosion registers its sources with the quad renderer, not its spawned copies", {skip}, async t =>
{
  const { root, explosion } = await realExplosion(t);
  placeAsClient(explosion);
  explosion.Play();
  const context = new EveUpdateContext();
  for (let tick = 50_000_000, frames = 0; explosion.objects.length < 3; tick += 333_333, frames++)
  {
    assert.ok(frames < 3000, "two spawns within 100 s");
    frame(root, context, tick);
  }
  const calls = [];
  const watch = (object, label) =>
  {
    const original = object.RegisterWithQuadRenderer;
    object.RegisterWithQuadRenderer = function(...args) { calls.push(label); return original.apply(this, args); };
  };
  explosion.localExplosions.forEach((source, index) => watch(source, `local${index}`));
  watch(explosion.localExplosionShared, "shared");
  watch(explosion.globalExplosion, "global");
  for (const object of explosion.objects) if (object !== explosion.localExplosionShared) watch(object, "spawned");
  explosion.RegisterWithQuadRenderer(new Tr2QuadRenderer());
  assert.deepEqual(calls, ["local0", "local1", "shared", "global"], "cpp:294-312 order, no base call");
});
