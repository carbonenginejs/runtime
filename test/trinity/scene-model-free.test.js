import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, BlueList } from "../../npm/dist/global/blue/index.js";
import { addChild, removeChild, clearChildren } from "../../npm/dist/global/blue/children.js";
import { EveSpaceScene, EveEffectRoot2 } from "../../npm/dist/trinity/index.js";
import { ShadowQuality } from "../../npm/dist/trinity/generated/trinityCore/enums.js";
const assets = JSON.parse(readFileSync(new URL("../support/sceneAssets.json", import.meta.url), "utf8"));

test("real nebula scene changes update only the notified texture and release emptied paths", t =>
{
  const requests = [];
  t.mock.method(blue.resMan, "GetResource", path => { const provider = { path }; requests.push(provider); return provider; });
  const scene = new EveSpaceScene();
  for (const key of ["envMapResPath", "envMap1ResPath", "envMap2ResPath"]) scene[key] = assets.a01.object[key];
  scene.Initialize();
  const original = scene.envMap1, unrelated = scene.envMap2;
  const register = t.mock.method(scene.componentRegistry, "Register");
  scene.envMap1ResPath = assets.c07.object.envMap1ResPath;
  assert.equal(scene.envMap1, original, "negative control: raw assignment never refreshes the provider");
  const count = requests.length;
  CjsSchema.setValues(scene, { envMap1ResPath: scene.envMap1ResPath });
  assert.equal(requests.length, count + 1);
  assert.equal(scene.envMap1.path, assets.c07.object.envMap1ResPath);
  assert.notEqual(scene.envMap1, original);
  assert.equal(scene.envMap2, unrelated);
  CjsSchema.setValues(scene, { envMap1ResPath: "" });
  assert.equal(scene.envMap1, null);
  assert.equal(requests.length, count + 1);
  CjsSchema.setValues(scene, { lowQualityNebulaResPath: assets.c07.object.lowQualityNebulaResPath });
  assert.equal(requests.length, count + 1);
  assert.equal(register.mock.callCount(), 0, "property edits must not re-run scene initialization");
  assert.equal("GetValues" in scene, false);
});

test("scene probe and shadow edits retain native property-specific branches", t =>
{
  t.mock.method(blue.resMan, "GetResource", path => ({ path }));
  const scene = new EveSpaceScene(), reflection = {}, calls = [];
  let valid = true;
  scene.reflectionProbe = { IsValid: () => valid, GetReflection: () => reflection,
    SetBackLightColor: value => calls.push(["color", value]), SetBackLightContrast: value => calls.push(["contrast", value]) };
  scene.OnModified("reflectionProbe");
  assert.equal(scene._envMapTextureRes, reflection);
  assert.equal(calls.length, 2);
  valid = false;
  scene.OnModified("reflectionBackLightingColor");
  assert.equal(calls.length, 2);
  scene.envMapResPath = assets.a01.object.envMapResPath;
  scene.OnModified("envMapResPath");
  assert.equal(scene._envMapTextureRes.path, assets.a01.object.envMapResPath);
  const modes = []; scene.cascadedShadowMap = { ShouldUseDenoiser: value => modes.push(value) };
  for (const mode of [ShadowQuality.SHADOW_LOW, ShadowQuality.SHADOW_HIGH, -1])
  { scene.shadowQuality = mode; scene.OnModified("shadowQuality"); }
  assert.deepEqual(modes, [false, true]);
});

test("scene native lists notify once and removing an absent item never clears siblings", t =>
{
  const scene = new EveSpaceScene(), first = new EveEffectRoot2(), absent = new EveEffectRoot2();
  const changed = t.mock.method(scene, "OnListModified");
  assert.ok(scene.objects instanceof BlueList);
  addChild(scene, "objects", first, { listNotify: scene });
  assert.equal(changed.mock.callCount(), 1);
  assert.equal(removeChild(scene, "objects", absent, { listNotify: scene }), false);
  assert.equal(scene.objects[0], first);
  assert.equal(changed.mock.callCount(), 1);
  clearChildren(scene, "objects", { listNotify: scene });
  assert.equal(changed.mock.callCount(), 2);
  assert.equal(scene.objects.length, 0);
  scene.objects.push(first);
  assert.equal(changed.mock.callCount(), 2, "negative control: raw Array mutation bypasses native observation");
});
