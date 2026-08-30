import test from "node:test";
import nodeAssert from "node:assert/strict";
import {
  Tr2PPBloomEffect,
  Tr2PPDepthOfFieldEffect,
  Tr2PPGenericEffect,
  Tr2PPLutEffect,
  Tr2PPTaaEffect,
  Tr2PPTonemappingEffect,
  Tr2PostProcess,
  Tr2PostProcess2,
  Tr2PostProcessAttributes,
  Tr2PostProcessRenderer,
  Tr2SSAO
} from "../../npm/dist/trinity/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";


function assert(condition, message = "assertion failed")
{
  if (!condition) throw new Error(message);
}
function assertEquals(actual, expected, message)
{
  if (actual !== expected) throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
}
function assertAlmostEquals(actual, expected, epsilon = 1e-6)
{
  if (Math.abs(actual - expected) > epsilon) throw new Error(`expected ${expected}, got ${actual}`);
}
function assertVector(actual, expected, epsilon = 1e-6)
{
  assertEquals(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) assertAlmostEquals(actual[index], expected[index], epsilon);
}

test("Tr2PostProcess owns Carbon's legacy stage graph", () =>
{
  const postProcess = new Tr2PostProcess();
  assertEquals(postProcess.stages.length, 0);
  postProcess.stages.push({ name: "stage" });
  assertEquals(postProcess.Initialize(), true);
  assertEquals(postProcess.stages.length, 1);
  assertEquals(CjsSchema.GetConstructor("Tr2PostProcess"), Tr2PostProcess);
  assertEquals(CjsSchema.getMethod(Tr2PostProcess, "Initialize")?.impl?.status, "implemented");
});

test("post-process attributes expand Carbon's complete 114-field Blue surface", () =>
{
  const attributes = new Tr2PostProcessAttributes();
  const expected = ["priority", "intensity"];
  for (const name of Tr2PostProcessAttributes.AttributeNames) expected.push(`${name}Enabled`, name);
  assertEquals(expected.length, 114);
  for (const name of expected)
  {
    assert(CjsSchema.getField(Tr2PostProcessAttributes, name), `missing schema field ${name}`);
  }
  assertEquals(CjsSchema.getField(Tr2PostProcessAttributes, "#NAME"), null);
  assertEquals(CjsSchema.getField(Tr2PostProcessAttributes, "Enabled"), null);
  assertEquals(attributes.priority, Tr2PostProcessAttributes.MEDIUM_PRIORITY);
  assert(attributes.prioritizedLuts instanceof Set);
  assertEquals(attributes.bloomSizeScale, 4);
  assertVector(attributes.bloomStepTint1, [0.3465, 0.3465, 0.3465, 0.3465]);
  assertVector(attributes.colorGain, [1, 1, 1]);
  assert(Tr2PostProcessAttributes.AttributeNames.every(name => attributes[`${name}Enabled`] === false));
});

test("Reset preserves Carbon's distinct color-correction enable policy", () =>
{
  const attributes = new Tr2PostProcessAttributes();
  attributes.signalLossIntensity = 0.8;
  attributes.signalLossIntensityEnabled = true;
  attributes.depthOfFieldForegroundBlurNeeded = true;
  attributes.Reset();
  assertEquals(attributes.signalLossIntensity, 0);
  assertEquals(attributes.signalLossIntensityEnabled, false);
  for (const name of ["whiteTemperature", "whiteTint", "colorSaturation", "colorContrast", "colorGamma", "colorGain", "colorOffset"])
  {
    assertEquals(attributes[`${name}Enabled`], true, `${name} should be enabled after Reset`);
  }
  // Native Reset does not touch this non-Blue attribute.
  assertEquals(attributes.depthOfFieldForegroundBlurNeeded, true);
});

test("post-process graph applies Carbon activity, quality, LUT, and mip-bias rules", () =>
{
  const graph = new Tr2PostProcess2();
  assertEquals(CjsSchema.getField(Tr2PostProcess2, "exposureAdjustment"), null);
  const bloom = new Tr2PPBloomEffect();
  graph.SetBloom(bloom);
  assertEquals(graph.GetBloomIfAvailable(Tr2PostProcess2.LOW), null);
  assertEquals(graph.GetBloomIfAvailable(Tr2PostProcess2.MEDIUM), bloom);
  bloom.display = false;
  assertEquals(graph.GetBloomIfAvailable(Tr2PostProcess2.HIGH), null);

  const generic = new Tr2PPGenericEffect();
  graph.SetGenericEffect(generic);
  assertEquals(generic.quality, Tr2PostProcess2.MEDIUM);
  assertEquals(graph.GetGenericEffectIfAvailable(Tr2PostProcess2.LOW), null);
  assertEquals(graph.GetGenericEffectIfAvailable(Tr2PostProcess2.MEDIUM), generic);

  const taa = new Tr2PPTaaEffect();
  graph.SetTaa(taa);
  assertEquals(graph.GetMipLodBias(), -1);
  taa.display = false;
  assertEquals(graph.GetMipLodBias(), 0);

  graph.lut = Object.assign(new Tr2PPLutEffect(), { influence: 0.7, path: "legacy" });
  graph.AddLut(Object.assign(new Tr2PPLutEffect(), { influence: 0.5, path: "b" }));
  graph.AddLut(Object.assign(new Tr2PPLutEffect(), { influence: 0.2, path: "a" }));
  assertEquals(graph.GetAvilableSortedLuts([]).map(item => item.path).join(","), "a,b,legacy");
  graph.ClearLuts();
  assertEquals(graph.luts.length, 0);
  assertEquals(graph.lut.path, "legacy");
});

test("priority blending rebuilds a device-free post-process graph", () =>
{
  const high = new Tr2PostProcessAttributes();
  high.Reset();
  high.priority = Tr2PostProcessAttributes.HIGH_PRIORITY;
  high.intensity = 0.25;
  high.bloomBrightnessEnabled = true;
  high.bloomBrightness = 4;
  high.grimePathEnabled = true;
  high.grimePath = "high";
  high.lutIntensityEnabled = true;
  high.lutIntensity = 1;
  high.lutPathEnabled = true;
  high.lutPath = "lut-high";

  const medium = new Tr2PostProcessAttributes();
  medium.Reset();
  medium.priority = Tr2PostProcessAttributes.MEDIUM_PRIORITY;
  medium.intensity = 1;
  medium.bloomBrightnessEnabled = true;
  medium.bloomBrightness = 2;
  medium.grimePathEnabled = true;
  medium.grimePath = "medium";
  medium.lutIntensityEnabled = true;
  medium.lutIntensity = 1;
  medium.lutPathEnabled = true;
  medium.lutPath = "lut-medium";

  const sources = [high, medium];
  assertAlmostEquals(Tr2PostProcessAttributes.Accumulate("bloomBrightness", sources), 2.5);
  assertEquals(Tr2PostProcessAttributes.Accumulate("grimePath", sources), "medium");

  const graph = new Tr2PostProcess2();
  Tr2PostProcessAttributes.MergeInto(graph, sources);
  assertAlmostEquals(graph.bloom.brightness, 2.5);
  assertEquals(graph.luts.length, 2);
  assertAlmostEquals(graph.luts.reduce((sum, lut) => sum + lut.influence, 0), 1);
  assert(graph.colorCorrection, "Reset defaults should always rebuild color correction");

  const observer = Tr2PostProcessAttributes.CreateDebugObserver();
  Tr2PostProcessAttributes.MergeInto(new Tr2PostProcess2(), sources, observer);
  const debug = observer.GetDict();
  assertEquals(Object.keys(debug).length, 57);
  assertAlmostEquals(debug.bloomBrightness.value, 2.5);
  assertEquals(debug.bloomBrightness.influencers.length, 2);
  assertAlmostEquals(debug.bloomBrightness.influencers[0].weight, 0.25);
  assertAlmostEquals(debug.bloomBrightness.influencers[1].weight, 0.75);
  assertEquals(debug.lutPath.value.length, 2);
});

test("FromPostProcess follows Carbon's sorted-LUT and extraction quirks", () =>
{
  const graph = new Tr2PostProcess2();
  graph.exposureAdjustment = 3;
  graph.AddLut(Object.assign(new Tr2PPLutEffect(), { influence: 0.8, path: "strong" }));
  graph.AddLut(Object.assign(new Tr2PPLutEffect(), { influence: 0.2, path: "weak" }));
  const attributes = new Tr2PostProcessAttributes();
  attributes.FromPostProcess(graph, Tr2PostProcessAttributes.UI_PRIORITY, 0.75);
  assertEquals(attributes.priority, Tr2PostProcessAttributes.UI_PRIORITY);
  assertEquals(attributes.intensity, 0.75);
  assertEquals(attributes.lutPath, "weak");
  assertEquals(attributes.lutIntensity, 0.2);
  assertEquals(attributes.exposureAdjustment, 0);
  assertEquals(attributes.exposureAdjustmentEnabled, false);
});

test("maintained post-process defaults match Carbon constructors", () =>
{
  const bloom = new Tr2PPBloomEffect();
  assertEquals(bloom.steps, 6);
  assertEquals(bloom.step6Size, 64);
  const taa = new Tr2PPTaaEffect();
  assertEquals(taa.quality, Tr2PPTaaEffect.TAA_HIGH);
  assertEquals(taa.IsActive(), true);
  taa.display = false;
  assertEquals(taa.IsActive(), false);
  const tonemapping = new Tr2PPTonemappingEffect();
  assertEquals(tonemapping.method, Tr2PPTonemappingEffect.Aces);
  assertEquals(tonemapping.useSweeteners, true);
  assertAlmostEquals(tonemapping.shoulderStrength, 0.125);
  assertAlmostEquals(tonemapping.whiteScale, 2.5);
  assertEquals(CjsSchema.getField(Tr2PPTonemappingEffect, "method")?.enum?.enumType, "Method");
  const depthOfField = new Tr2PPDepthOfFieldEffect();
  assertEquals(depthOfField.bokehShape, Tr2PPDepthOfFieldEffect.Disk);
  assertEquals(depthOfField.GetBokehShapeString(), "BOKEH_SHAPE_DISK");
  assertEquals(
    Tr2PPDepthOfFieldEffect.BokehShapeStrings[Tr2PPDepthOfFieldEffect.Heart],
    "BOKEH_SHAPE_HEART"
  );
  depthOfField.bokehShape = -1;
  assertEquals(depthOfField.GetBokehShapeString(), "BOKEH_SHAPE_DISK");
  depthOfField.scale = 1;
  assertEquals(depthOfField.IsActive(), false);
  Tr2PostProcess2.PostProcessDofEnabled = true;
  assertEquals(depthOfField.IsActive(), true);
  Tr2PostProcess2.PostProcessDofEnabled = false;
});

test("maintained SSAO owns Carbon quality state and leaves filtering explicit", () =>
{
  const ssao = new Tr2SSAO();
  assertEquals(ssao.enabled, true);
  assertEquals(ssao.quality, Tr2SSAO.SSAOQuality.HIGHEST);
  assertEquals(ssao.downsampled, false);
  assertEquals(ssao.zoomLevel, 5);
  assertEquals(ssao.radius, 6);
  assertEquals(ssao.shadowPower, 2.6);
  assertEquals(ssao.cortaoMipBias, -4);
  assertEquals(CjsSchema.getField(Tr2SSAO, "shadowClamp")?.type.kind, "float32");

  ssao.Enable(false);
  assertEquals(ssao.enabled, false);
  ssao.SetQuality(Tr2SSAO.SSAOQuality.LOW, true);
  assertEquals(ssao.quality, Tr2SSAO.SSAOQuality.LOW);
  assertEquals(ssao.downsampled, true);
  assertEquals(CjsSchema.getMethod(Tr2SSAO, "Enable")?.impl?.status, "implemented");
  assertEquals(CjsSchema.getMethod(Tr2SSAO, "SetQuality")?.impl?.status, "implemented");
  assertEquals(CjsSchema.getMethod(Tr2SSAO, "Filter")?.impl?.status, "notImplemented");
  nodeAssert.throws(() => ssao.Filter(null, null, null, null, false), /engine-owned SSAO realization/u);
});

test("maintained post-process renderer owns quality while execution stays explicit", () =>
{
  const renderer = new Tr2PostProcessRenderer();
  assertEquals(renderer.quality, Tr2PostProcessRenderer.Quality.HIGH);
  assertEquals(renderer.bloomDebugMode, Tr2PostProcessRenderer.BloomDebugMode.BLOOM_DEBUG_NONE);
  assertEquals(renderer.GetPostProcessingQuality(), Tr2PostProcessRenderer.Quality.HIGH);
  renderer.SetPostProcessingQuality(Tr2PostProcessRenderer.Quality.LOW);
  assertEquals(renderer.GetPostProcessingQuality(), Tr2PostProcessRenderer.Quality.LOW);
  assertEquals(CjsSchema.getMethod(Tr2PostProcessRenderer, "GetPostProcessingQuality")?.impl?.status, "implemented");
  assertEquals(CjsSchema.getMethod(Tr2PostProcessRenderer, "SetPostProcessingQuality")?.impl?.status, "implemented");
  assertEquals(CjsSchema.getMethod(Tr2PostProcessRenderer, "Execute")?.impl?.status, "notImplemented");
  nodeAssert.throws(
    () => renderer.Execute(null, null, null, null, null, null, null, null, null),
    /engine-owned post-process realization/u
  );
});
