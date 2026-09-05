import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { Tr2VariableStore, Tr2Effect, Tr2EffectConstant, Tr2EffectDefine, Tr2EffectDescription, Tr2EffectLibrary, Tr2EffectLibraryParameters, Tr2EffectParameterAnnotation, Tr2EffectPassParameters, Tr2EffectResource, Tr2EffectStageInput, Tr2EffectTechnique, Tr2FloatParameter, Tr2GeometryBufferParameter, Tr2Material, Tr2MaterialStageInput, Tr2Matrix4Parameter, Tr2Pass, Tr2RuntimeTextureParameter, Tr2SamplerOverride, Tr2SamplerSetup, Tr2Shader, Tr2ShaderBuffer, Tr2TextureAnimationParameter, Tr2Vector2Parameter, Tr2Vector3Parameter, Tr2Vector4Parameter, TriFloatArrayParameter, TriTextureParameter, TriTransformParameter, TriVariableParameter, TriVector4 } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec2 } from "../../npm/dist/global/math/vec2.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import * as ResourceShader from "../../npm/dist/resource/shader/index.js";
import { Tr2ResourceSetDescriptionAL } from "../../npm/dist/trinity/core/index.js";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}
function assertEquals(actual, expected, message)
{
  if (actual !== expected)
  {
    throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
  }
}
function assertAlmostEquals(actual, expected, epsilon = 1e-6)
{
  if (Math.abs(actual - expected) > epsilon)
  {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
}

function shaderReflection({ constants = [], resources = [] } = {})
{
  const stage = new Tr2EffectStageInput();
  stage.constants = constants.map(value => Object.assign(new Tr2EffectConstant(), value));
  stage.resources = new Map(resources.map((value, index) => [
    index,
    Object.assign(new Tr2EffectResource(), value)
  ]));
  const pass = new Tr2Pass();
  pass.stageInputs = [stage];
  const technique = new Tr2EffectTechnique();
  technique.name = "Main";
  technique.passes = [pass];
  const shader = new Tr2Shader();
  shader.effect.techniques = [technique];
  return shader;
}

test("Trinity shader compatibility exports preserve canonical identity", () =>
{
  assertEquals(Tr2Shader, ResourceShader.Tr2Shader);
  assertEquals(Tr2EffectDescription, ResourceShader.Tr2EffectDescription);
  assertEquals(Tr2EffectTechnique, ResourceShader.Tr2EffectTechnique);
  assertEquals(Tr2Pass, ResourceShader.Tr2Pass);
  assertEquals(Tr2EffectStageInput, ResourceShader.Tr2EffectStageInput);
  assertEquals(Tr2EffectConstant, ResourceShader.Tr2EffectConstant);
  assertEquals(Tr2EffectResource, ResourceShader.Tr2EffectResource);
  assertEquals(Tr2EffectDefine, ResourceShader.Tr2EffectDefine);
  assertEquals(Tr2EffectLibrary, ResourceShader.Tr2EffectLibrary);
  assertEquals(Tr2SamplerSetup, ResourceShader.Tr2SamplerSetup);
  assertEquals(
    Tr2EffectParameterAnnotation,
    ResourceShader.Tr2EffectParameterAnnotation
  );
});

test("sampler overrides preserve Carbon structure and AddSamplerOverride defaults", () =>
{
  const defaults = new Tr2SamplerOverride();
  assertEquals(defaults.addressU, 1);
  assertEquals(defaults.addressV, 1);
  assertEquals(defaults.addressW, 1);
  assertEquals(defaults.filter, 2);
  assertEquals(defaults.mipFilter, 2);
  assertEquals(defaults.lodBias, 0);
  assertEquals(defaults.maxMipLevel, 0);
  assertEquals(defaults.maxAnisotropy, 4);
  assertEquals(CjsSchema.getField(Tr2SamplerOverride, "filter")?.type.kind, "int32");
  assertEquals(CjsSchema.getField(Tr2SamplerOverride, "sampler"), null);

  const effect = new Tr2Effect();
  assertEquals(effect.AddSamplerOverride("DiffuseMap", 3, 4), true);
  assertEquals(effect.AddSamplerOverride("DiffuseMap", 1, 1), false);
  assertEquals(effect.AddSamplerOverride("diffuseMap", 2, 2), true);
  const override = effect.samplerOverrides[0];
  assert(override instanceof Tr2SamplerOverride);
  assertEquals(override.addressU, 3);
  assertEquals(override.addressV, 4);
  assertEquals(override.addressW, 1);
  assertEquals(override.filter, 3);
  assertEquals(override.mipFilter, 2);
  assertEquals(override.maxAnisotropy, 4);
});

test("promoted shader parameters expose source-backed Carbon metadata", () =>
{
  const constructors = [Tr2FloatParameter, Tr2Vector2Parameter, Tr2Vector3Parameter, Tr2Vector4Parameter, Tr2Matrix4Parameter, Tr2RuntimeTextureParameter, TriTextureParameter, TriVector4, TriFloatArrayParameter];
  for (const ctor of constructors)
  {
    new ctor();
  }
  assertEquals(CjsSchema.GetConstructor("Tr2FloatParameter"), Tr2FloatParameter);
  assertEquals(CjsSchema.GetConstructor("Tr2RuntimeTextureParameter"), Tr2RuntimeTextureParameter);
  assertEquals(CjsSchema.GetConstructor("TriTextureParameter"), TriTextureParameter);
  assertEquals(CjsSchema.GetConstructor("TriVector4"), TriVector4);
  assertEquals(CjsSchema.GetConstructor("TriFloatArrayParameter"), TriFloatArrayParameter);
  assertEquals(CjsSchema.GetConstructor("CjsParameter"), null);
  assertEquals(CjsSchema.getField(Tr2FloatParameter, "value")?.type.kind, "float32");
  assertEquals(CjsSchema.getField(Tr2Vector4Parameter, "value")?.type.kind, "vec4");
  assertEquals(CjsSchema.getField(Tr2Matrix4Parameter, "value")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(TriTextureParameter, "resourcePath")?.type.kind, "path");
  assertEquals(CjsSchema.getField(Tr2RuntimeTextureParameter, "texture")?.type.className, "ITr2TextureProvider");
  assertEquals(CjsSchema.getField(TriVector4, "data")?.type.kind, "vec4");
  assertEquals(CjsSchema.getField(TriFloatArrayParameter, "value")?.type.kind, "list");
  const sourceBackedMethods = [[Tr2FloatParameter, "GetParameterName", "implemented"], [Tr2FloatParameter, "GetValue", "implemented"], [Tr2FloatParameter, "SetValue", "implemented"], [Tr2FloatParameter, "IsRerouted", "implemented"], [Tr2FloatParameter, "SetDestination", "adapted"], [Tr2FloatParameter, "GetDestination", "adapted"], [Tr2FloatParameter, "RegisterBinding", "adapted"], [Tr2FloatParameter, "UnregisterBinding", "adapted"], [Tr2FloatParameter, "RebuildEffectHandles", "adapted"], [Tr2FloatParameter, "Initialize", "implemented"], [Tr2FloatParameter, "CopyValueToEffect", "adapted"], [Tr2Vector2Parameter, "GetValue", "adapted"], [Tr2Vector3Parameter, "GetValue", "adapted"], [Tr2Vector4Parameter, "RebuildEffectHandles", "adapted"], [Tr2Matrix4Parameter, "SetDestination", "adapted"], [Tr2RuntimeTextureParameter, "__init__", "adapted"], [Tr2RuntimeTextureParameter, "Create", "implemented"], [Tr2RuntimeTextureParameter, "GetParameterName", "implemented"], [Tr2RuntimeTextureParameter, "OnModified", "adapted"], [Tr2RuntimeTextureParameter, "RebuildEffectHandles", "adapted"], [Tr2RuntimeTextureParameter, "SetTextureProvider", "implemented"], [Tr2RuntimeTextureParameter, "GetTextureProvider", "implemented"], [Tr2RuntimeTextureParameter, "SetUavMipLevel", "implemented"], [TriTextureParameter, "GetResourcePath", "adapted"], [TriTextureParameter, "SetResource", "adapted"], [TriTextureParameter, "SupportsDirtyNotification", "implemented"], [TriTextureParameter, "UsedWithScreenSize", "adapted"], [TriTextureParameter, "OnTextureChanged", "adapted"], [TriFloatArrayParameter, "GetParameterName", "implemented"], [TriFloatArrayParameter, "Initialize", "implemented"], [TriFloatArrayParameter, "OnModified", "adapted"], [TriFloatArrayParameter, "RebuildEffectHandles", "adapted"], [TriFloatArrayParameter, "CopyValueToEffect", "adapted"]];
  for (const [ctor, methodName, status] of sourceBackedMethods)
  {
    assertCarbonMethod(ctor, methodName, status);
  }
});
test("shader TriFloatArrayParameter copies vector4 rows as graph data", () =>
{
  const parameter = new TriFloatArrayParameter();
  parameter.name = "LightProbe";
  parameter.value = [Object.assign(new TriVector4(), {
    data: vec4.fromValues(1, 2, 3, 4)
  }), Object.assign(new TriVector4(), {
    data: vec4.fromValues(5, 6, 7, 8)
  })];
  assertEquals(parameter.GetParameterName(), "LightProbe");
  assert(parameter.Initialize());
  const fullCopy = new Float32Array(8);
  parameter.CopyValueToEffect(null, fullCopy, 32);
  assertAlmostEquals(fullCopy[0], 1);
  assertAlmostEquals(fullCopy[3], 4);
  assertAlmostEquals(fullCopy[4], 5);
  assertAlmostEquals(fullCopy[7], 8);
  const shortCopy = new Float32Array(5);
  parameter.CopyValueToEffect(null, shortCopy, 20);
  assertAlmostEquals(shortCopy[0], 1);
  assertAlmostEquals(shortCopy[4], 5);
  parameter.RebuildEffectHandles(shaderReflection({
    constants: [{ name: "LightProbe" }]
  }));
  assert(parameter.usedByCurrentEffect);
  assert(parameter.usedByCurrentTechnique);
  parameter.name = "Missing";
  parameter.OnModified();
  assert(!parameter.usedByCurrentEffect);
});
test("promoted shader classes are skipped by generated shader barrels", async () =>
{
  const resourceOwnedClassNames = ["Tr2EffectConstant", "Tr2EffectDefine", "Tr2EffectDescription", "Tr2EffectLibrary", "Tr2EffectParameterAnnotation", "Tr2EffectResource", "Tr2EffectStageInput", "Tr2EffectTechnique", "Tr2Pass", "Tr2SamplerSetup", "Tr2Shader"];
  const trinityOwnedClassNames = ["Tr2ConstantEffectParameter", "Tr2DataTextureManager", "Tr2Effect", "Tr2EffectLibraryParameters", "Tr2EffectParam", "Tr2EffectPassParameters", "Tr2EffectStateManager", "Tr2EffectTechniqueInputs", "Tr2FloatParameter", "Tr2GeometryBufferParameter", "Tr2Material", "Tr2MaterialStageInput", "Tr2Matrix4Parameter", "Tr2RuntimeTextureParameter", "Tr2SamplerOverride", "Tr2SamplerOverrideData", "Tr2ShaderBuffer", "Tr2ShaderOption", "Tr2SharedConstantBuffers", "Tr2TextureAnimationParameter", "Tr2Vector2Parameter", "Tr2Vector3Parameter", "Tr2Vector4Parameter", "TriFloatArrayParameter", "TriTextureParameter", "TriTransformParameter", "TriVariableParameter", "TriVector4"];
  const classNames = [...trinityOwnedClassNames, ...resourceOwnedClassNames];
  const summary = JSON.parse(await readFile("src/trinity/generated/summary.json", "utf8"));
  const skipped = new Set((summary.skipped || []).map(item => `${item.family}/${item.className}`));
  const generationSkipped = new Map((summary.generation?.skipped || []).map(item => [`${item.family}/${item.className}`, item]));
  const generatedShaderBarrel = await readFile("src/trinity/generated/shader/index.js", "utf8");
  for (const className of trinityOwnedClassNames)
  {
    assert(skipped.has(`shader/${className}`), `${className} should be skipped by generated output`);
  }
  for (const className of resourceOwnedClassNames)
  {
    const item = generationSkipped.get(`shader/${className}`);
    assert(item, `${className} should be externally owned by runtime-resource`);
    assertEquals(item.schema, `shader/${className}.json`);
    assertEquals(item.reason, "owned by runtime-resource");
  }
  for (const className of classNames)
  {
    assert(!generatedShaderBarrel.includes(`./${className}.js`), `${className} should not be exported from generated shader barrel`);
  }
});
test("shader reflection graph follows Carbon lookup and sort behavior", () =>
{
  const constant = Object.assign(new Tr2EffectConstant(), {
    name: "Tint",
    dimension: 4
  });
  const resource = Object.assign(new Tr2EffectResource(), {
    name: "DiffuseMap",
    type: "TEXTURE_2D"
  });
  const annotation = Object.assign(new Tr2EffectParameterAnnotation(), {
    name: "SasUiVisible",
    boolValue: true
  });
  const vertexStage = Object.assign(new Tr2EffectStageInput(), {
    shader: 5,
    constants: [constant]
  });
  const pixelStage = Object.assign(new Tr2EffectStageInput(), {
    shader: 7,
    resources: new Map([[0, resource]])
  });
  const pass = Object.assign(new Tr2Pass(), {
    renderStates: 9,
    stageInputs: [vertexStage, pixelStage]
  });
  const technique = Object.assign(new Tr2EffectTechnique(), {
    name: "Main",
    shaderTypeMask: 3,
    passes: [pass]
  });
  const shader = new Tr2Shader();
  shader.effect.techniques = [technique];
  shader.effect.annotations = {
    Tint: [annotation],
    DiffuseMap: [annotation]
  };
  assertEquals(shader.GetTechniqueIndex("Main"), 0);
  assertEquals(shader.GetPassCount(0), 1);
  assertEquals(shader.GetConstant("Tint"), constant);
  assertEquals(shader.GetResource("DiffuseMap"), resource);
  assertEquals(shader.GetParameterAnnotations("Tint")[0], annotation);
  shader.ProcessEffect();
  assertEquals(shader.GetSortValue(), (1 << 30) | (7 << 20) | (5 << 10) | 9);
});
test("shader reflection metadata preserves Carbon scalar and container types", () =>
{
  const constant = new Tr2EffectConstant();
  const description = new Tr2EffectDescription();
  const technique = new Tr2EffectTechnique();
  const stage = new Tr2EffectStageInput();
  const define = new Tr2EffectDefine();
  const annotation = new Tr2EffectParameterAnnotation();
  const resource = new Tr2EffectResource();
  assertEquals(CjsSchema.getField(Tr2EffectConstant, "offset")?.type.kind, "uint32");
  assertEquals(CjsSchema.getField(Tr2EffectConstant, "elements")?.type.kind, "uint32");
  assertEquals(CjsSchema.getField(Tr2EffectDescription, "techniques")?.type.kind, "list");
  assertEquals(CjsSchema.getField(Tr2EffectTechnique, "passes")?.type.kind, "list");
  assertEquals(CjsSchema.getField(Tr2EffectStageInput, "shader")?.type.kind, "uint32");
  assertEquals(CjsSchema.getField(Tr2EffectStageInput, "constantValues")?.type.kind, "typedArray");
  assertEquals(CjsSchema.getField(Tr2Pass, "stageInputs")?.type.kind, "list");
  assertEquals(CjsSchema.getField(Tr2EffectDefine, "name")?.type.kind, "string");
  assertEquals(CjsSchema.getField(Tr2EffectParameterAnnotation, "stringValue")?.type.kind, "string");
  assertEquals(CjsSchema.getField(Tr2EffectResource, "BINDLESS_SAMPLER"), null);
  assertEquals(constant.offset, 0);
  assertEquals(description.techniques.length, 0);
  assertEquals(technique.passes.length, 0);
  assertEquals(stage.shader, 0xffffffff);
  assert(stage.constantValues instanceof Uint8Array);
  assertEquals(new Tr2Pass().stageInputs.length, 0);
  assertEquals(define.name, "");
  assertEquals(annotation.stringValue, "");
  assertEquals(resource.BINDLESS_SAMPLER, undefined);
  assertEquals(Tr2EffectResource.BINDLESS_SAMPLER, 100);
});
test("Tr2Effect populates and prunes shader parameters from reflection data", () =>
{
  const shader = new Tr2Shader();
  const stage = new Tr2EffectStageInput();
  stage.constants = [Object.assign(new Tr2EffectConstant(), {
    name: "Tint",
    dimension: 4
  })];
  stage.resources = new Map([[0, Object.assign(new Tr2EffectResource(), {
    name: "DiffuseMap",
    type: "TEXTURE_2D"
  })]]);
  shader.effect.techniques = [Object.assign(new Tr2EffectTechnique(), {
    name: "Main",
    passes: [Object.assign(new Tr2Pass(), {
      stageInputs: [stage]
    })]
  })];
  shader.effect.annotations = {
    Tint: [{ name: "SasUiVisible", boolValue: true }],
    DiffuseMap: [{ name: "SasUiVisible", boolValue: true }]
  };
  const effect = new Tr2Effect();
  effect.shader = shader;
  assert(effect.PopulateParameters());
  assert(effect.GetParameterByName("Tint") instanceof Tr2Vector4Parameter);
  assert(effect.GetResourceByName("DiffuseMap") instanceof TriTextureParameter);
  effect.SetOption("QUALITY", "HIGH");
  assertEquals(effect.GetOption("QUALITY"), "HIGH");
  effect.ResetOption("QUALITY");
  assertEquals(effect.GetOption("QUALITY"), "");
  shader.effect.annotations.Tint[0].boolValue = false;
  effect.PruneParameters();
  assertEquals(effect.FindParameterByName("Tint"), null);
});
test("io.always preserves repeated effect-path updates", () =>
{
  const effect = new Tr2Effect();
  const events = [];
  let initializeCount = 0;
  const initialize = effect.Initialize.bind(effect);
  effect.Initialize = () =>
  {
    initializeCount++;
    return initialize();
  };
  effect.OnEvent("modified", (_subject, data) => events.push(data));

  assertEquals(effect.SetEffectPathName("res:/effect/test.sm_hi"), true);
  assertEquals(effect.SetEffectPathName("res:/effect/test.sm_hi"), true);
  assertEquals(initializeCount, 2);
  assertEquals(events.length, 2);
  assertEquals(CjsSchema.getField(Tr2Effect, "effectFilePath")?.io?.always, true);
  effect.effectFilePath = "res:\\effect\\Ship\\main.sm_hi";
  class TestEffectRes extends ResourceShader.Tr2EffectRes
  {
    AddNotifyTarget()
    {
      throw new Error("Trinity must not own EffectRes notification lifecycle");
    }
  }
  effect.effectResource = new TestEffectRes();
  effect.Initialize();
  // Lowercased, because Carbon's ConvertEffectPath lowercases before it
  // substitutes (Tr2Effect.cpp:309-370) and resource routing is
  // case-insensitive. Already carrying a shader-model suffix, this path needs
  // no platform substitution and so resolves without a committed backend.
  assertEquals(effect.actualEffectFilePath, "res:/effect/ship/main.sm_hi");
});

test("Tr2Effect rejects broken effect-resource shader identities", () =>
{
  class BrokenEffectRes extends ResourceShader.Tr2EffectRes
  {
    GetShader()
    {
      return { GetTechniqueIndex() { return 0; } };
    }
  }
  const effect = new Tr2Effect();
  effect.effectResource = new BrokenEffectRes();
  let error = null;
  try { effect.RebuildCachedData(); }
  catch (caught) { error = caught; }
  assert(error instanceof TypeError);
  assert(/must return a Tr2Shader or null/u.test(error.message));
});
test("promoted shader graph containers track dirty resources", () =>
{
  const material = new Tr2Material();
  const pass = new Tr2EffectPassParameters();
  const library = new Tr2EffectLibraryParameters();
  material.parametersForPasses = [{ passes: [pass], libraries: [library] }];
  // THIS TEST USED TO ASSERT THE OPPOSITE, and the assertion was the bug.
  // It installed a description whose ClearResources threw, under the message
  // "runtime-trinity must not clear backend resource sets", and asserted the
  // realized set SURVIVED InvalidateResourceSets. Carbon drops both. Clearing
  // a description is not touching a backend object - Trinity owns the
  // description, the abstraction layer owns the set built from it - and the
  // old assertion was the engine-means-`engine/webgpu` misreading written down
  // as a guarantee. See /docs/research/graphics-path-review-2026-09-05.md.
  let cleared = 0;
  pass.resourceSet = {};
  pass.resourceSetDesc = {
    ClearResources()
    {
      cleared += 1;
    }
  };
  pass.stageInput[0].shaderParametersWithNotification.push({});
  library.globalInput.shaderParametersWithNotification.push({});
  material.MarkConstantBuffersDirty();
  assert(pass.stageInput[0].constantBufferDirty);
  assert(library.globalInput.constantBufferDirty);
  material.InvalidateResourceSets();
  assertEquals(pass.resourceSet, null, "the realized set is dropped, as Carbon drops it");
  assertEquals(cleared, 1, "and the description it was built from is cleared");

  // ResourceChanged is the WEAKER of the pair on purpose: the bound resources
  // changed, the set layout did not, so it invalidates without clearing.
  material.ResourceChanged();
  assertEquals(cleared, 1, "ResourceChanged does not clear the description");
  assert(pass.resourceSetDirty);
  assert(pass.usedTexturesDirty);
  assert(library.usedTexturesDirty);
  assertEquals(material.GetPassDescription(0, 0), pass);

  const stage = new Tr2MaterialStageInput();
  const backendConstantBuffer = {};
  stage.constantBuffer = backendConstantBuffer;
  stage.AllocateConstants(17);
  assertEquals(stage.constantMirror.byteLength, 32);
  assertEquals(stage.constantBuffer, backendConstantBuffer);
  stage.GetSharedConstantBuffer(new Uint8Array([1, 2, 3]), 3);
  assertEquals(stage.constantMirror[2], 3);
  assertEquals(stage.constantBuffer, backendConstantBuffer);
});
test("promoted shader resource parameters stay graph-only", () =>
{
  const shader = new Tr2Shader();
  shader.effect.techniques = [Object.assign(new Tr2EffectTechnique(), {
    passes: [Object.assign(new Tr2Pass(), {
      stageInputs: [Object.assign(new Tr2EffectStageInput(), {
        resources: new Map([[0, Object.assign(new Tr2EffectResource(), {
          name: "Geometry",
          type: "BUFFER"
        })]])
      })]
    })]
  })];
  const geometry = new Tr2GeometryBufferParameter();
  geometry.name = "Geometry";
  geometry.resourcePath = "res:/geometry/test.cmf";
  geometry.Initialize({
    GetResource()
    {
      throw new Error("runtime-trinity must not resolve GPU buffers");
    }
  });
  geometry.SetGpuBuffer({
    GetGpuBuffer(index)
    {
      return `buffer:${index}`;
    }
  });
  geometry.meshIndex = 3;
  geometry.RebuildEffectHandles(shader);
  assert(geometry.usedByCurrentEffect);
  assert(geometry.IsValid());
  assertEquals(geometry.CopyToResourceSet({
    SetSrv()
    {
      throw new Error("runtime-trinity shader graph must not bind resources");
    }
  }, 1, 2), false);
  assertEquals(geometry.ApplyUav({
    SetUav()
    {
      throw new Error("runtime-trinity shader graph must not bind UAVs");
    }
  }, 1, 2), false);
  const textureAnimation = new Tr2TextureAnimationParameter();
  textureAnimation.animation = {
    GetTexture(channel)
    {
      return `texture:${channel}`;
    }
  };
  textureAnimation.channel = "Main";
  assertEquals(textureAnimation.GetTexture(), "texture:Main");
  assertEquals(textureAnimation.CopyToResourceSet({
    SetSrv()
    {
      throw new Error("runtime-trinity shader graph must not bind textures");
    }
  }, 1, 2), false);
  const invalidations = [];
  textureAnimation.OnAddedToMaterial({
    InvalidateResourceSets()
    {
      invalidations.push("invalidate");
    }
  });
  textureAnimation.OnModified();
  assertEquals(invalidations.join(","), "invalidate");
});
test("promoted variable, transform, and shader buffer classes expose graph behavior", () =>
{
  const previousStore = Tr2VariableStore.GlobalStore();
  const globalStore = Tr2VariableStore.SetGlobalStore(new Tr2VariableStore());
  globalStore.RegisterVariable("EnvMapTransform", {
    GetTexture()
    {
      return null;
    },
    CopyToResourceSet()
    {
      return true;
    }
  });
  const variable = new TriVariableParameter();
  variable.name = "Env";
  variable.variableName = "EnvMapTransform";
  const explicitStore = new Tr2VariableStore();
  explicitStore.RegisterVariable("EnvMapTransform", {
    GetVariable()
    {
      throw new Error("a stored value must not be re-searched as a store");
    },
    GetTexture()
    {
      return null;
    },
    CopyToResourceSet()
    {
      return true;
    }
  });
  variable.Initialize(explicitStore);
  const modifiedOrder = [];
  const initialize = variable.Initialize.bind(variable);
  const rebuildEffectHandles = variable.RebuildEffectHandles.bind(variable);
  variable.Initialize = (...args) =>
  {
    modifiedOrder.push("variableName");
    return initialize(...args);
  };
  variable.RebuildEffectHandles = (...args) =>
  {
    modifiedOrder.push("name");
    return rebuildEffectHandles(...args);
  };
  variable.UpdateValues({ properties: ["name", "variableName"], skipEvents: true });
  assertEquals(modifiedOrder.join(","), "variableName,name");
  const shader = new Tr2Shader();
  shader.effect.techniques = [Object.assign(new Tr2EffectTechnique(), {
    passes: [Object.assign(new Tr2Pass(), {
      stageInputs: [Object.assign(new Tr2EffectStageInput(), {
        resources: new Map([[0, Object.assign(new Tr2EffectResource(), {
          name: "Env",
          type: "TEXTURE_2D"
        })]])
      })]
    })]
  })];
  variable.RebuildEffectHandles(shader);
  assert(variable.usedByCurrentEffect);
  const effect = new Tr2Effect();
  effect.shader = shader;
  effect.parameters = [Object.assign(new TriVariableParameter(), {
    name: "Env",
    variableName: "EnvMapTransform"
  })];
  effect.RebuildCachedDataInternal();
  assert(effect.parameters[0].variable);
  assert(effect.parameters[0].usedByCurrentEffect);
  Tr2VariableStore.SetGlobalStore(previousStore);
  const transform = new TriTransformParameter();
  transform.translation = vec3.fromValues(1, 2, 3);
  const copied = new Float32Array(16);
  transform.CopyValueToEffect(0, copied, 64);
  assertAlmostEquals(copied[3], 1);
  assertAlmostEquals(copied[7], 2);
  assertAlmostEquals(copied[11], 3);

  // Carbon's 6-arg TransformationMatrix (math Matrix.cpp:66-143) scales about
  // the TRUE origin and rotates about m_rotationCenter: translation bytes are
  // t + rc - R*rc with rc UNSCALED. gl's fromRotationTranslationScaleOrigin
  // (which scales the center too: t + rc - R*(S*rc)) must NOT be used. With
  // R = 90deg about Z, rc = (1,0,0), s = (2,3,4), t = 0: Carbon gives
  // (1,-1,0); the wrong helper gives (1,-2,0).
  const pivoted = new TriTransformParameter();
  pivoted.rotationCenter = vec3.fromValues(1, 0, 0);
  pivoted.scaling = vec3.fromValues(2, 3, 4);
  pivoted.rotation[2] = Math.SQRT1_2;
  pivoted.rotation[3] = Math.SQRT1_2;
  const pivotedCopy = new Float32Array(16);
  pivoted.CopyValueToEffect(0, pivotedCopy, 64);
  assertAlmostEquals(pivotedCopy[3], 1);
  assertAlmostEquals(pivotedCopy[7], -1);
  assertAlmostEquals(pivotedCopy[11], 0);
  const buffer = new Tr2ShaderBuffer();
  buffer.SetData(new Uint8Array([1, 2, 3, 4]));
  assertEquals(buffer.size, 4);
  assertEquals(buffer.data[2], 3);
  assertEquals(buffer.ApplyBuffer({
    SetShaderBuffer()
    {
      throw new Error("runtime-trinity shader graph must not bind shader buffers");
    }
  }), false);
});
test("shader Tr2RuntimeTextureParameter stays graph-only", () =>
{
  const parameter = new Tr2RuntimeTextureParameter();
  const texture = {
    label: "reflection"
  };
  parameter.__init__("ReflectionProbe", texture, 3);
  assertEquals(parameter.name, "ReflectionProbe");
  assertEquals(parameter.GetParameterName(), "ReflectionProbe");
  assertEquals(parameter.GetTextureProvider(), texture);
  assertEquals(parameter.uavMipLevel, 3);
  const invalidations = [];
  const material = {
    InvalidateResourceSets()
    {
      invalidations.push("invalidate");
    }
  };
  parameter.OnAddedToMaterial(material);
  parameter.SetTextureProvider({
    label: "replacement"
  });
  parameter.OnModified();
  assertEquals(invalidations.join(","), "invalidate,invalidate");
  parameter.OnRemovedFromMaterial(material);
  parameter.SetTextureProvider(texture);
  assertEquals(invalidations.length, 2);
  parameter.SetUavMipLevel(7);
  assertEquals(parameter.uavMipLevel, 7);
  parameter.RebuildEffectHandles(new Tr2Shader());
});
test("Tr2FloatParameter reroutes values and rebuilds effect usage", () =>
{
  const parameter = new Tr2FloatParameter();
  parameter.name = "Glow";
  parameter.SetValue(2.5);
  const destination = new Float32Array(1);
  const reroutes = [];
  parameter.RegisterBinding({
    RerouteDestination(destination)
    {
      reroutes.push(destination);
    }
  });
  parameter.SetDestination(destination, 4);
  assert(parameter.IsRerouted());
  assertAlmostEquals(destination[0], 2.5);
  assertEquals(reroutes.length, 1);
  destination[0] = 9;
  assertAlmostEquals(parameter.GetValue(), 9);
  parameter.SetValue(4);
  assertAlmostEquals(destination[0], 4);
  const copy = new Float32Array(1);
  parameter.CopyValueToEffect(null, copy);
  assertAlmostEquals(copy[0], 4);
  parameter.RebuildEffectHandles(shaderReflection({
    constants: [{ name: "Glow" }]
  }));
  assert(parameter.usedByCurrentEffect);
  parameter.RebuildEffectHandles(null);
  assert(!parameter.IsRerouted());
  assert(!parameter.usedByCurrentEffect);
});
test("vector and matrix shader parameters mirror rerouted destinations", () =>
{
  const vector2 = new Tr2Vector2Parameter();
  vector2.SetValue(vec2.fromValues(3, 4));
  const destination2 = new Float32Array(2);
  vector2.SetDestination(destination2, 8);
  assertAlmostEquals(destination2[0], 3);
  destination2[1] = 8;
  const out2 = vec2.create();
  vector2.GetValue(out2);
  assertAlmostEquals(out2[1], 8);
  const vector3 = new Tr2Vector3Parameter();
  vector3.SetValue(vec3.fromValues(1, 2, 3));
  const destination3 = new Float32Array(3);
  vector3.SetDestination(destination3, 12);
  vector3.SetValue(vec3.fromValues(4, 5, 6));
  assertAlmostEquals(destination3[2], 6);
  vector3.Initialize();
  assertAlmostEquals(destination3[0], 4);
  const matrix = new Tr2Matrix4Parameter();
  const value = mat4.create();
  value[12] = 7;
  value[13] = 8;
  matrix.SetValue(value);
  const destinationMatrix = new Float32Array(16);
  matrix.SetDestination(destinationMatrix, 64);
  assertAlmostEquals(destinationMatrix[12], 7);
  destinationMatrix[13] = 11;
  const outMatrix = mat4.create();
  matrix.GetValue(outMatrix);
  assertAlmostEquals(outMatrix[13], 11);
  const worldShader = shaderReflection({
    constants: [{ name: "World" }]
  });
  matrix.RebuildEffectHandles(worldShader);
  assert(!matrix.usedByCurrentEffect);
  matrix.name = "World";
  matrix.RebuildEffectHandles(worldShader);
  assert(matrix.usedByCurrentEffect);
  assert(matrix.usedByCurrentTechnique);
});
test("Tr2Vector4Parameter handles Carbon sRGB reroute rules", () =>
{
  const parameter = new Tr2Vector4Parameter();
  parameter.name = "Tint";
  parameter.SetValue(vec4.fromValues(0.5, 0.25, 0.75, 0.8));
  const destination = new Float32Array(4);
  parameter.SetDestination(destination, 16);
  assert(parameter.IsRerouted());
  parameter.RebuildEffectHandles(shaderReflection({
    constants: [{ name: "Tint", isSRGB: true }]
  }));
  assert(parameter.isSrgb);
  assert(!parameter.IsRerouted());
  assert(parameter.usedByCurrentEffect);
  const copied = vec4.create();
  parameter.CopyValueToEffect(null, copied);
  assert(copied[0] < parameter.value[0]);
  assert(copied[1] < parameter.value[1]);
  assert(copied[2] < parameter.value[2]);
  assertAlmostEquals(copied[3], 0.8);
});
test("TriTextureParameter stays graph-owned and backend-free", () =>
{
  const parameter = new TriTextureParameter();
  const modified = [];
  parameter.OnEvent("modified", (_target, payload) => modified.push(payload));
  parameter.name = "DiffuseMap";
  parameter.SetResourcePath("res:/texture/diffuse.dds");
  assertEquals(parameter.resourcePath, "res:/texture/diffuse.dds");
  assertEquals(parameter.GetResourcePath(), "res:/texture/diffuse.dds");
  assert(parameter.SupportsDirtyNotification());
  assertEquals(modified.length, 1);
  assertEquals(modified[0].source, parameter);
  const resourceLods = [];
  parameter.SetResource({
    path: "res:/runtime.dds",
    RequestResolution(lod)
    {
      resourceLods.push(lod);
    },
    GetOriginalResolutionAsFloat()
    {
      return 1024;
    }
  });
  assertEquals(modified.length, 1);
  assertEquals(parameter.GetResourcePath(), "res:/runtime.dds");
  parameter.EnableTextureLoding([2, 4, 0, 0, 0]);
  const lod = parameter.UsedWithScreenSize(512, 64, [2]);
  assertEquals(lod, 4);
  assertEquals(resourceLods[0], 4);
  const materialEvents = [];
  const material = {
    ResourceChanged()
    {
      materialEvents.push("resource");
    },
    MarkConstantBuffersDirty()
    {
      materialEvents.push("dirty");
    }
  };
  parameter.OnAddedToMaterial(material);
  parameter.OnTextureChanged();
  assertEquals(materialEvents.join(","), "resource,dirty");
  parameter.OnRemovedFromMaterial(material);
  parameter.RebuildEffectHandles(shaderReflection({
    resources: [{ name: "DiffuseMap" }]
  }));
  assert(parameter.usedByCurrentEffect);
  assert(parameter.usedByCurrentTechnique);
});
test("promoted shader graph files do not import backend APIs", async () =>
{
  const files = await collectJsFiles("src/trinity/shader");
  for (const file of files)
  {
    const source = await readFile(file, "utf8");
    assert(!/(WebGPU|WebGL|GPUDevice|GPUTexture|GPUBuffer|navigator\.gpu)/.test(source), `${file} should remain runtime graph code, not engine backend code`);
    assert(!/\.(SetSrv|SetUav|SetShaderBuffer|SetConstants|ApplyShaderProgram|SetResourceSet)\b/.test(source), `${file} should not perform shader or resource bindings`);
  }
});
async function collectJsFiles(dir)
{
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries)
  {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory())
    {
      files.push(...await collectJsFiles(path));
    }
    else if (entry.isFile() && entry.name.endsWith(".js"))
    {
      files.push(path);
    }
  }
  return files;
}
function assertCarbonMethod(ctor, methodName, status)
{
  const method = CjsSchema.getMethod(ctor, methodName);
  assertEquals(method?.carbon?.method, true, `${ctor.name}.${methodName} should be decorated as a Carbon method`);
  assertEquals(method?.impl?.status, status, `${ctor.name}.${methodName} should be marked ${status}`);
}

test("effect collections accept unique-name value maps with class-claimed inference", () =>
{
  const effect = new Tr2Effect();
  const changed = effect.SetValues({
    effectFilePath: "res:/fx/ship.fx",
    parameters: {
      Gloss: 0.5,
      UvOffset: [1, 2],
      Tint: [1, 2, 3],
      DiffuseColor: [0, 0, 0, 1],
      WorldMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      PaintMaskMap: "res:/paint.dds"
    },
    textures: {
      AlbedoMap: "res:/albedo.dds"
    },
    constParameters: {
      Scalar: 2,
      AuthoredColor: [1, 2, 3, 4]
    },
    samplerOverrides: {
      AlbedoMapSampler: { addressU: 4, addressV: 4 }
    }
  });

  assert(changed instanceof Set);
  assert(changed.has("parameters"));
  assert(changed.has("resources"));
  assert(changed.has("constParameters"));
  assert(changed.has("samplerOverrides"));
  assertEquals(effect.effectFilePath, "res:/fx/ship.fx");

  assert(Array.isArray(effect.parameters), "parameters must stay a Carbon list");
  assertEquals(effect.parameters.length, 5);
  const byName = name => effect.parameters.find(parameter => parameter.name === name);
  assert(byName("Gloss") instanceof Tr2FloatParameter);
  assertEquals(byName("Gloss").value, 0.5);
  assert(byName("UvOffset") instanceof Tr2Vector2Parameter);
  assert(byName("Tint") instanceof Tr2Vector3Parameter);
  assert(byName("DiffuseColor") instanceof Tr2Vector4Parameter);
  assert(byName("WorldMatrix") instanceof Tr2Matrix4Parameter);

  assertEquals(effect.resources.length, 2);
  const paint = effect.resources.find(resource => resource.name === "PaintMaskMap");
  const albedo = effect.resources.find(resource => resource.name === "AlbedoMap");
  assert(paint instanceof TriTextureParameter);
  assertEquals(paint.resourcePath, "res:/paint.dds");
  assertEquals(albedo.resourcePath, "res:/albedo.dds");

  assertEquals(effect.constParameters.length, 2);
  const scalar = effect.constParameters.find(parameter => parameter.name === "Scalar");
  assertEquals(scalar.value[0], 2);
  assertEquals(scalar.value[3], 2, "numbers splat to vec4 like Carbon AddParameterFloat");

  assertEquals(effect.samplerOverrides.length, 1);
  assertEquals(effect.samplerOverrides[0].name, "AlbedoMapSampler");
  assertEquals(effect.samplerOverrides[0].addressU, 4);
  assertEquals(effect.samplerOverrides[0].addressW, 1, "unset override fields keep Carbon defaults");

  // unique names update in place instead of duplicating
  effect.SetParameters({ Gloss: 0.75, DiffuseColor: [1, 1, 1, 1] });
  assertEquals(effect.parameters.length, 5);
  assertEquals(byName("Gloss").value, 0.75);
  assertEquals(byName("DiffuseColor").value[0], 1);
  effect.SetTextures({ AlbedoMap: "res:/albedo2.dds" });
  assertEquals(effect.resources.length, 2);
  assertEquals(albedo.resourcePath, "res:/albedo2.dds");
  effect.SetConstParameters({ Scalar: 3 });
  assertEquals(effect.constParameters.length, 2);
  assertEquals(scalar.value[1], 3);
  effect.SetSamplerOverrides({ AlbedoMapSampler: { addressU: 2 } });
  assertEquals(effect.samplerOverrides.length, 1);
  assertEquals(effect.samplerOverrides[0].addressU, 2);

  // null removes by name across the routed collections
  effect.SetParameters({ Gloss: null, PaintMaskMap: null });
  assertEquals(effect.parameters.length, 4);
  assertEquals(effect.resources.length, 1);
  effect.SetSamplerOverrides({ AlbedoMapSampler: null });
  assertEquals(effect.samplerOverrides.length, 0);

  // a value shape change replaces the parameter class in place
  effect.SetParameters({ UvOffset: [1, 2, 3, 4] });
  assert(byName("UvOffset") instanceof Tr2Vector4Parameter);
  assertEquals(effect.parameters.length, 4);

  // explicit descriptors force a class; unknown shapes throw instead of corrupting
  effect.SetParameters({ Forced: { type: "Tr2Vector4Parameter", value: [9, 8, 7, 6] } });
  assert(byName("Forced") instanceof Tr2Vector4Parameter);
  let threw = false;
  try
  {
    effect.SetParameters({ Bad: [1, 2, 3, 4, 5] });
  }
  catch (error)
  {
    threw = error instanceof TypeError;
  }
  assert(threw, "uninferrable values must throw");
  assert(Array.isArray(effect.parameters), "failed input must not corrupt the list");

  // canonical array input still flows through the inherited model path
  const kept = effect.parameters.slice();
  effect.SetValues({ parameters: kept });
  assertEquals(effect.parameters.length, kept.length);
  assert(effect.parameters[0] === kept[0]);
});

test("GetValues keyed lists round-trip the effect collections as unique-name objects", () =>
{
  const effect = new Tr2Effect();
  effect.SetValues({
    parameters: { DiffuseColor: [0, 0, 0, 1] },
    textures: { AlbedoMap: "res:/albedo.dds" },
    samplerOverrides: { AlbedoMapSampler: { addressU: 4 } }
  });

  const keyed = effect.GetValues({ keyedLists: true });
  assert(!Array.isArray(keyed.parameters));
  assert("DiffuseColor" in keyed.parameters);
  assertEquals(keyed.parameters.DiffuseColor.name, undefined, "keyed items drop the redundant name");
  assertEquals(keyed.resources.AlbedoMap.resourcePath, "res:/albedo.dds");
  assertEquals(keyed.samplerOverrides.AlbedoMapSampler.addressU, 4);

  const clone = new Tr2Effect();
  clone.SetValues({ samplerOverrides: keyed.samplerOverrides });
  assertEquals(clone.samplerOverrides.length, 1);
  assertEquals(clone.samplerOverrides[0].name, "AlbedoMapSampler");
  assertEquals(clone.samplerOverrides[0].addressU, 4);
});

test("vector parameters never hand out their own value array", () =>
{
  // Carbon returns a const reference, which the compiler stops a caller
  // writing through. JavaScript cannot express that, so the value must be
  // copied out: a stray write through a returned array would change the
  // parameter without marking it dirty or reaching a reroute destination.
  for (const [ctor, length] of [[Tr2Vector2Parameter, 2], [Tr2Vector3Parameter, 3], [Tr2Vector4Parameter, 4], [Tr2Matrix4Parameter, 16]])
  {
    const parameter = new ctor();
    const returned = parameter.GetValue();

    assertEquals(returned === parameter.value, false, `${ctor.name}.GetValue returned its own value array`);
    assertEquals(returned.length, length);

    returned[0] = 123.5;
    assertEquals(parameter.value[0] === 123.5, false, `${ctor.name} was mutated through the returned array`);

    const caller = new Array(length).fill(0);
    assertEquals(parameter.GetValue(caller), caller, `${ctor.name} did not write into the caller's buffer`);
  }
});

test("a vector parameter still refreshes from its reroute destination on read", () =>
{
  const parameter = new Tr2Vector4Parameter();
  const destination = [ 0, 0, 0, 0 ];

  // SetDestination seeds the destination FROM the parameter; afterwards the
  // destination is the live value and reads pull it back.
  parameter.SetDestination(destination);
  destination[1] = 42;

  assertEquals(parameter.GetValue()[1], 42, "GetValue refreshes from the reroute");
  assertEquals(parameter.y, 42, "and so does a component getter");
});

test("ClearResources drops resources and keeps samplers, as Carbon's does", () =>
{
  // Carbon walks the srv and uav slots and touches nothing else
  // (trinityal/src/Tr2ResourceSetAL.cpp:439-455). The asymmetry matters: a
  // sampler is authored static state arriving with the effect, so clearing it
  // would throw away a binding nothing puts back.
  const desc = new Tr2ResourceSetDescriptionAL();
  const texture = { id: "texture" };
  const buffer = { id: "buffer" };
  const sampler = { id: "sampler" };

  assert(desc.SetSrv(0, 3, texture));
  assert(desc.SetUav(1, 4, buffer));
  assert(desc.SetSampler(0, 2, sampler));
  assert(desc.SetConstantBuffer(0, 1, buffer));

  desc.ClearResources();

  assertEquals(desc.Get("srv", 0, 3), null, "srv cleared");
  assertEquals(desc.Get("uav", 1, 4), null, "uav cleared");
  assertEquals(desc.Get("sampler", 0, 2)?.sampler, sampler, "sampler kept");
});
