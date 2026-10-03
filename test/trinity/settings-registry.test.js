// The renderer's settings point at the engine's own values, as Carbon's
// TRI_REGISTER_SETTING entries do (TriSettings.h:62-76): writing a setting
// changes what the engine reads.
import test from "node:test";
import assert from "node:assert/strict";
import { EveSpaceScene, Tr2PostProcessRenderer, Tr2Renderer, TriFrustum } from "../../npm/dist/trinity/index.js";
import { GetReflectionSetting } from "../../npm/dist/trinity/eve/EveComponentTypes.js";
import { meta } from "../../npm/dist/global/schema/index.js";

// Import the platform owner so its three explicitly approved settings register.
import { Tr2PlatformInfo } from "../../npm/dist/core/platform/Tr2PlatformInfo.js";
const settings = Tr2Renderer.getSettings();

test("the ported settings are registered under Carbon's names", () =>
{
  for (const name of [
    "frustumCullingDisabled",
    "useDynamicLightsShadows",
    "expressionCurveFakeRandom",
    "secondaryLightingRadiusCutoffFactor",
    "eveSpaceSceneVisibilityThreshold",
    "eveSpaceSceneLowDetailThreshold",
    "eveSpaceSceneMediumDetailThreshold",
    "eveSpaceSceneHighDetailThreshold",
    "eveSpaceSceneLODFactor",
    "eveSpaceSceneGammaBrightness",
    "eveSpaceSceneDynamicLighting",
    "enablePostProcessDebugging",
    "eveReflectionSetting",
    "newBloom"
  ])
  {
    assert.notEqual(settings.FindSetting(name), null, name);
  }
});

test("SetValue writes through to the engine's value", () =>
{
  settings.SetValue("frustumCullingDisabled", true);
  assert.equal(TriFrustum.frustumCullingDisabled, true);
  settings.SetValue("frustumCullingDisabled", false);
  assert.equal(TriFrustum.frustumCullingDisabled, false);

  EveSpaceScene.eveSpaceSceneDynamicLighting = true;
  assert.equal(settings.GetValue("eveSpaceSceneDynamicLighting"), true, "reads see the engine's value");
  EveSpaceScene.eveSpaceSceneDynamicLighting = false;

  const reflection = GetReflectionSetting();
  settings.SetValue("eveReflectionSetting", 0);
  assert.equal(GetReflectionSetting(), 0, "a module variable is reached through its accessors");
  settings.SetValue("eveReflectionSetting", reflection);
});

test("the scene stamps its thresholds from the settings, over the upscaling amount", () =>
{
  const scene = new EveSpaceScene();
  settings.SetValue("eveSpaceSceneLODFactor", 2);
  settings.SetValue("eveSpaceSceneVisibilityThreshold", 10);
  try
  {
    scene.StampFrameContext();
    assert.equal(scene.updateContext.GetLodFactor(), 2);
    assert.equal(scene.updateContext.GetVisibilityThreshold(), 10);

    scene.upscalingAmount = 2;
    scene.StampFrameContext();
    assert.equal(scene.updateContext.GetLodFactor(), 1, "Carbon divides by m_upscalingAmount (cpp:459)");
    assert.equal(scene.updateContext.GetVisibilityThreshold(), 5);
  }
  finally
  {
    settings.SetValue("eveSpaceSceneLODFactor", 1);
    settings.SetValue("eveSpaceSceneVisibilityThreshold", 5);
  }
});

test("a new post-process renderer takes the newBloom setting (cpp:525)", () =>
{
  settings.SetValue("newBloom", false);
  try
  {
    assert.equal(new Tr2PostProcessRenderer().useNewBloom, false);
  }
  finally
  {
    settings.SetValue("newBloom", true);
  }
  assert.equal(new Tr2PostProcessRenderer().useNewBloom, true);
});

test("the registry records when a change applies, and a setting's enum", () =>
{
  assert.equal(settings.FindSetting("eveSpaceSceneDynamicLighting").applies, meta.setting.ALWAYS);
  assert.equal(settings.FindSetting("newBloom").applies, meta.setting.CREATE, "copied at construction (cpp:525)");
  assert.equal(settings.FindSetting("eveReflectionSetting").enum.REFLECTION_SETTING_HIGH, GetReflectionSetting());
});

test("only approved extension names are exempt from Carbon setting-name checks", () =>
{
  const approved = [ "webgpuMaxBufferSize", "webgpuTextureCompressionBC", "webgpuTextureCompressionBCSliced3D", "webgpuTextureCompressionUnaligned" ];
  const ours = settings.GetNames().filter(name => !settings.FindSetting(name).carbon);
  assert.deepEqual(ours.slice().sort(), [...approved, "compressUncompressedTextures"].sort());
  assert.equal(settings.FindSetting("compressUncompressedTextures").applies, meta.setting.LOAD);
  assert.equal(settings.GetValue("compressUncompressedTextures"), false);
  for (const name of approved)
  {
    const entry = settings.FindSetting(name);
    assert.equal(entry.owner, Tr2PlatformInfo);
    assert.equal(entry.applies, meta.setting.CREATE);
    assert.equal(entry.carbon, false);
  }
});

test("edit.setting takes any name, on static fields only", () =>
{
  const described = meta.setting("demoOnlySetting");
  assert.equal(typeof described, "function", "a name Carbon lacks is ours, not an error");
  assert.throws(() => meta.setting("newBloom", { applies: "sometimes" }), TypeError);
  assert.throws(() => meta.setting("newBloom", { enum: {}, values: [] }), TypeError);
  // What the decorator receives for an instance field.
  assert.throws(() => meta.setting("debugLODShader")(undefined, { kind: "field", static: false, name: "debugLODShader" }), TypeError);
});

test("a setting keeps the type it was registered with", () =>
{
  assert.throws(() => settings.SetValue("eveSpaceSceneDynamicLighting", 1), TypeError);
  assert.equal(EveSpaceScene.eveSpaceSceneDynamicLighting, false);
});


test("WebGPU settings write through and apply only to the next resolved device", () =>
{
  const names = [ "webgpuMaxBufferSize", "webgpuTextureCompressionBC", "webgpuTextureCompressionBCSliced3D", "webgpuTextureCompressionUnaligned" ];
  const original = names.map(name => settings.GetValue(name));
  const platform = new Tr2PlatformInfo({ backend: "webgpu", adapter: { limits: { maxBufferSize: 2147483648 }, features: [ "texture-compression-bc", "texture-compression-bc-sliced-3d" ] } });
  const first = platform.ResolveDeviceRequirements();
  try
  {
    settings.SetValue("webgpuMaxBufferSize", 268435456);
    settings.SetValue("webgpuTextureCompressionBC", false);
    const dependent = platform.ResolveDeviceRequirements();
    assert.deepEqual(dependent.descriptor, {});
    assert.deepEqual(dependent.unsupportedPreferences.dependencies, [ { feature: "texture-compression-bc-sliced-3d", requires: "webgpuTextureCompressionBC" } ]);
    settings.SetValue("webgpuTextureCompressionBCSliced3D", false);
    assert.deepEqual(platform.ResolveDeviceRequirements().descriptor, {});
    assert.equal(first.descriptor.requiredLimits.maxBufferSize, 536870912);
    assert.equal(first.requestedSettings.webgpuTextureCompressionBC, true);
  }
  finally
  {
    names.forEach((name, index) => settings.SetValue(name, original[index]));
  }
});
