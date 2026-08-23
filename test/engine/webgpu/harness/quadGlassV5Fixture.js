import {
  QUADV5_CLEAR_TARGETS,
  QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT,
  QUADV5_TARGET_HEIGHT,
  QUADV5_TARGET_WIDTH,
  QUADV5_VERTEX_BUFFER_LAYOUT,
  createQuadV5FixtureValues,
  createQuadV5MainBindingValues
} from "./quadV5Fixture.js";

const STATIC_BODY_INDEX = 0;
const SKINNED_BODY_INDEX = 4;

export const QUAD_GLASS_V5_TARGET_WIDTH = QUADV5_TARGET_WIDTH;
export const QUAD_GLASS_V5_TARGET_HEIGHT = QUADV5_TARGET_HEIGHT;
export const QUAD_GLASS_V5_VERTEX_BUFFER_LAYOUT = QUADV5_VERTEX_BUFFER_LAYOUT;
export const QUAD_GLASS_V5_SKINNED_VERTEX_BUFFER_LAYOUT =
  QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT;
export const QUAD_GLASS_V5_CLEAR_TARGETS = QUADV5_CLEAR_TARGETS;

/**
 * Translate the two audited D3D cull states into the explicit WebGPU recipe
 * used by the harness.
 *
 * @param {number} passIndex Main pass index.
 * @returns {{frontFace: string, cullMode: string}} Frozen primitive recipe.
 */
export function getQuadGlassV5PrimitiveRecipe(passIndex)
{
  if (passIndex !== 0 && passIndex !== 1)
  {
    throw new RangeError("QuadGlassV5 primitive recipe requires Main pass 0 or 1");
  }
  return Object.freeze({
    frontFace: "cw",
    cullMode: passIndex === 0 ? "back" : "front"
  });
}

export const QUAD_GLASS_V5_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_DISABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF",
  SPACE_OBJECT_INSTANCED_ATTACHMENT: "SOIA_DISABLED"
});

export const QUAD_GLASS_V5_SKINNED_PPT_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_ENABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF"
});

const SELECTION_PROVENANCE = Object.freeze({
  BINDLESS_RENDERING: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "BINDLESS_RENDERING_DISABLED"
  }),
  SPACE_OBJECT_CLIPPING: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOC_DISABLED"
  }),
  SPACE_OBJECT_PPT_ENABLED: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOPPT_DISABLED"
  }),
  SPACE_OBJECT_TRANSPARENCY: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOT_OPAQUE"
  }),
  V5_DEBUG: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "OFF"
  }),
  SPACE_OBJECT_INSTANCED_ATTACHMENT: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOIA_DISABLED"
  })
});

const SKINNED_SELECTION_PROVENANCE = Object.freeze({
  ...SELECTION_PROVENANCE,
  SPACE_OBJECT_PPT_ENABLED: Object.freeze({
    optionIndex: 1,
    defaultOption: 0,
    defaultValue: "SOPPT_DISABLED"
  })
});

const UNIFORMS = Object.freeze([
  Object.freeze({
    identity: "uniform-buffer:0:0",
    scopeIdentity: "uniform-buffer:0:0@fragment",
    binding: 0,
    visibility: "fragment",
    minBindingSize: 224
  }),
  Object.freeze({
    identity: "uniform-buffer:0:1",
    scopeIdentity: "uniform-buffer:0:1@vertex",
    binding: 1,
    visibility: "vertex",
    minBindingSize: 512
  }),
  Object.freeze({
    identity: "uniform-buffer:0:2",
    scopeIdentity: "uniform-buffer:0:2@fragment",
    binding: 2,
    visibility: "fragment",
    minBindingSize: 384
  }),
  Object.freeze({
    identity: "uniform-buffer:0:3",
    scopeIdentity: "uniform-buffer:0:3@vertex",
    binding: 3,
    visibility: "vertex",
    minBindingSize: 128
  }),
  Object.freeze({
    identity: "uniform-buffer:0:4",
    scopeIdentity: "uniform-buffer:0:4@fragment",
    binding: 4,
    visibility: "fragment",
    minBindingSize: 208
  })
]);

const RESOURCE_NAMES = Object.freeze([
  "EveSpaceSceneEnvMap",
  "EveSceneFogVolumeMap",
  "NormalMap",
  "GlowMap",
  "RoughnessMap",
  "MaterialMap",
  "PaintMaskMap"
]);

const RESOURCE_DIMENSIONS = Object.freeze([
  "cube",
  "2d-array",
  "2d",
  "2d",
  "2d",
  "2d",
  "2d"
]);

const RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6 ]),
  dx12: Object.freeze([ 0, 2, 4, 5, 8, 10, 11 ])
});

const SAMPLERS = Object.freeze([
  Object.freeze({ name: "SurfaceSampler", registerIndex: 0 }),
  Object.freeze({ name: "FogSampler", registerIndex: 1 })
]);

const MATERIAL_CONSTANTS = Object.freeze([
  "GeneralGlowColor",
  "Mtl1DiffuseColor",
  "Mtl2DiffuseColor",
  "Mtl3DiffuseColor",
  "Mtl4DiffuseColor",
  "Mtl1FresnelColor",
  "Mtl2FresnelColor",
  "Mtl3FresnelColor",
  "Mtl4FresnelColor",
  "Mtl1Gloss",
  "Mtl2Gloss",
  "Mtl3Gloss",
  "Mtl4Gloss"
]);

function fail(message)
{
  throw new Error(`QuadGlassV5 fixture: ${message}`);
}

function normalizedPath(value)
{
  return typeof value === "string" ? value.replace(/\\/gu, "/").toLowerCase() : "";
}

function expectedUniforms(skinned)
{
  return UNIFORMS.map((entry) => Object.freeze({
    ...entry,
    ...(skinned && entry.identity === "uniform-buffer:0:3"
      ? { minBindingSize: 432 }
      : {})
  }));
}

function expectedBoneBinding()
{
  return Object.freeze({
    name: "BoneTransforms",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    registerIndex: 0,
    binding: 5
  });
}

function expectedResources(backend, skinned)
{
  const registers = RESOURCE_REGISTERS[backend];
  if (!registers) fail(`unsupported package backend ${String(backend)}`);
  return RESOURCE_NAMES.map((name, index) => Object.freeze({
    name,
    identity: `sampled-resource:0:${registers[index]}`,
    scopeIdentity: `sampled-resource:0:${registers[index]}@fragment`,
    registerIndex: registers[index],
    binding: (skinned ? 6 : 5) + index,
    viewDimension: RESOURCE_DIMENSIONS[index],
    registerType: index === 0 ? 41 : (index === 1 ? 37 : 36),
    carbonType: index === 0 ? 4 : (index === 1 ? 5 : 2),
    isSRGB: index === 0,
    isAutoregister: index === 1
  }));
}

function expectedSamplers(skinned)
{
  return SAMPLERS.map((entry) => Object.freeze({
    ...entry,
    identity: `sampler:0:${entry.registerIndex}`,
    scopeIdentity: `sampler:0:${entry.registerIndex}@fragment`,
    binding: (skinned ? 13 : 12) + entry.registerIndex
  }));
}

function assertSelections(options, owner, skinned)
{
  const selection = skinned
    ? QUAD_GLASS_V5_SKINNED_PPT_SELECTION
    : QUAD_GLASS_V5_SELECTION;
  const provenanceTable = skinned
    ? SKINNED_SELECTION_PROVENANCE
    : SELECTION_PROVENANCE;
  if (!Array.isArray(options) || options.length !== Object.keys(selection).length)
  {
    fail(`${owner} must contain every QuadGlassV5 permutation selection`);
  }
  const selected = new Map();
  for (const entry of options)
  {
    if (typeof entry?.name !== "string" || selected.has(entry.name))
    {
      fail(`${owner} has malformed or duplicate selections`);
    }
    selected.set(entry.name, entry);
  }
  for (const [ name, value ] of Object.entries(selection))
  {
    const entry = selected.get(name);
    const provenance = provenanceTable[name];
    if (!entry || entry.value !== value) fail(`${owner} requires ${name}=${value}`);
    // `source` is build-time policy (who chose the value), not container
    // data; see quadV5Fixture.js. It cannot survive a read back from bytes.
    if (entry.optionIndex !== provenance.optionIndex
      || entry.defaultOption !== provenance.defaultOption
      || entry.defaultValue !== provenance.defaultValue)
    {
      fail(`${owner} has unexpected provenance for ${name}`);
    }
  }
}

function mainStage(record, passIndex, stageName)
{
  const matches = record.analysis?.stages?.filter((entry) =>
    entry?.techniqueName === "Main"
      && entry.passIndex === passIndex
      && entry.stageName === stageName);
  if (!Array.isArray(matches) || matches.length !== 1)
  {
    fail(`analysis must contain exactly one Main.pass${passIndex}.${stageName} stage`);
  }
  return matches[0];
}

function assertVertexInputs(record, passIndex, skinned)
{
  const active = (mainStage(record, passIndex, "vertex").pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map(({ registerIndex, usedMask, dimension, type }) => ({
      registerIndex,
      usedMask,
      dimension,
      type
    }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
  const expected = [
    { registerIndex: 0, usedMask: 7, dimension: 3, type: 0 },
    ...(skinned ? [ { registerIndex: 1, usedMask: 1, dimension: 4, type: 2 } ] : []),
    { registerIndex: 2, usedMask: 3, dimension: 2, type: 0 },
    { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 5, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 6, usedMask: 3, dimension: 2, type: 0 }
  ];
  if (JSON.stringify(active) !== JSON.stringify(expected))
  {
    fail(`Main.pass${passIndex}.vertex has an unexpected active input contract`);
  }
}

function assertPixelInputs(record, passIndex, skinned)
{
  const active = (mainStage(record, passIndex, "pixel").pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map(({ registerIndex, usedMask, dimension, type }) => ({
      registerIndex,
      usedMask,
      dimension,
      type
    }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
  const expected = [
    { registerIndex: 1, usedMask: 3, dimension: 4, type: 0 },
    { registerIndex: 2, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 5, usedMask: 15, dimension: 4, type: 0 },
    { registerIndex: skinned ? 9 : 8, usedMask: 11, dimension: 4, type: 0 }
  ];
  if (JSON.stringify(active) !== JSON.stringify(expected))
  {
    fail(`Main.pass${passIndex}.pixel has an unexpected active input contract`);
  }
}

function assertShaderModules(pipeline, passIndex, skinned)
{
  if (!Array.isArray(pipeline.shaderModules) || pipeline.shaderModules.length !== 2)
  {
    fail(`Main.pass${passIndex} requires exactly vertex and pixel modules`);
  }
  for (const stageName of [ "vertex", "pixel" ])
  {
    const matches = pipeline.shaderModules.filter((entry) => entry?.stageName === stageName);
    if (matches.length !== 1 || typeof matches[0].wgsl !== "string" || !matches[0].wgsl
      || matches[0].key !== `Main.pass${passIndex}.${stageName}`
      || matches[0].techniqueName !== "Main" || matches[0].passIndex !== passIndex
      || matches[0].stageType !== (stageName === "vertex" ? 0 : 1)
      || matches[0].entryPoint !== "main")
    {
      fail(`Main.pass${passIndex} requires one complete ${stageName} module`);
    }
    if (stageName === "vertex")
    {
      for (const location of [ 0, ...(skinned ? [ 1 ] : []), 2, 3, 4, 5, 6 ])
      {
        if (!new RegExp(`@location\\(${location}\\)\\s+input${location}:`, "u")
          .test(matches[0].wgsl))
        {
          fail(`vertex WGSL is missing location ${location}`);
        }
      }
      if (skinned
        && !/@location\(1\)\s+input1:\s*vec4<u32>/u.test(matches[0].wgsl))
      {
        fail(`Main.pass${passIndex}.vertex WGSL must use uint4 blend indices`);
      }
    }
    else if (!/@builtin\(position\)\s+position:\s*vec4<f32>/u.test(matches[0].wgsl)
      || !/@builtin\(front_facing\)\s+front_facing:\s*bool/u.test(matches[0].wgsl)
      || !/@location\(0\)\s+output0:/u.test(matches[0].wgsl)
      || !/@location\(1\)\s+output1:/u.test(matches[0].wgsl))
    {
      fail(
        "pixel WGSL must consume position/front_facing and expose both render targets"
      );
    }
  }
}

function assertBindingSlot(binding, expected, kind, visibility)
{
  const [ resourceKind, registerSpace, registerIndex ] = expected.identity.split(":");
  if (!binding || binding.identity !== expected.identity
    || binding.scopeIdentity !== expected.scopeIdentity
    || binding.resourceKind !== resourceKind
    || binding.registerSpace !== Number(registerSpace)
    || binding.registerIndex !== Number(registerIndex)
    || binding.sourceTruth !== "wgsl-layout"
    || binding.group !== 0 || binding.binding !== expected.binding
    || binding.dynamic !== false
    || !Array.isArray(binding.visibility) || binding.visibility.length !== 1
    || binding.visibility[0] !== visibility)
  {
    fail(`${expected.identity} has an unexpected slot, scope, register, or visibility`);
  }
  const kinds = [ "buffer", "texture", "sampler" ].filter((key) => binding.layout?.[key]);
  if (kinds.length !== 1 || kinds[0] !== kind)
  {
    fail(`${expected.identity} has an unexpected layout kind`);
  }
}

function assertMaterialReflection(record, passIndex, skinned)
{
  const material = mainStage(record, passIndex, "pixel").bindings?.filter((entry) =>
    entry?.kind === "constantBuffer"
      && entry.registerSpace === 0
      && entry.registerIndex === 0);
  if (!Array.isArray(material) || material.length !== 1
    || material[0].carbon?.hasLocalConstants !== true
    || material[0].carbon?.constantValueSize !== 224)
  {
    fail("pixel cb0 must expose the exact 224-byte local material layout");
  }
  if (skinned && (material[0].generatedSymbol !== "cb0"
    || material[0].registerType !== 0 || material[0].registerCount !== 1
    || material[0].arrayCount !== 1 || material[0].dynamic !== true
    || material[0].metadataName !== "$LocalConstants"))
  {
    fail("pixel cb0 has unexpected skinned Glass metadata");
  }
  const constants = material[0].carbon.constants;
  if (!Array.isArray(constants) || constants.length !== MATERIAL_CONSTANTS.length)
  {
    fail("pixel cb0 has an unexpected material constant count");
  }
  for (let index = 0; index < MATERIAL_CONSTANTS.length; index += 1)
  {
    const constant = constants[index];
    if (constant?.name !== MATERIAL_CONSTANTS[index]
      || constant.offset !== 16 + index * 16
      || constant.size !== 16 || constant.dimension !== 4
      || constant.type !== 0 || constant.elements !== 0)
    {
      fail(`pixel cb0 has an unexpected ${MATERIAL_CONSTANTS[index]} layout`);
    }
  }
}

function assertSkinnedAnalysisBuffers(record, passIndex)
{
  const vertex = mainStage(record, passIndex, "vertex");
  const pixel = mainStage(record, passIndex, "pixel");
  const vertexBuffers = (vertex.bindings || [])
    .filter((entry) => entry?.kind === "constantBuffer");
  const pixelBuffers = (pixel.bindings || [])
    .filter((entry) => entry?.kind === "constantBuffer");
  if (JSON.stringify(vertexBuffers.map((entry) => entry.registerIndex)) !== "[1,3]"
    || JSON.stringify(pixelBuffers.map((entry) => entry.registerIndex)) !== "[0,2,4]")
  {
    fail(`Main.pass${passIndex} has an unexpected skinned Glass constant-buffer inventory`);
  }
  for (const entry of [ ...vertexBuffers, ...pixelBuffers ])
  {
    const local = entry.registerIndex === 0;
    if (entry.generatedSymbol !== `cb${entry.registerIndex}`
      || entry.registerType !== 0 || entry.registerSpace !== 0
      || entry.registerCount !== 1 || entry.arrayCount !== 1 || entry.dynamic !== true
      || entry.metadataName !== (local ? "$LocalConstants" : null)
      || entry.carbon?.hasLocalConstants !== local
      || (!local && (entry.carbon.constantValueSize !== 0
        || JSON.stringify(entry.carbon.constants) !== "[]")))
    {
      fail(`Main.pass${passIndex} cb${entry.registerIndex} has unexpected skinned Glass metadata`);
    }
  }
}

function assertAnalysisResources(record, passIndex, resources, skinned)
{
  const vertexBindings = mainStage(record, passIndex, "vertex").bindings || [];
  const bones = vertexBindings.filter((entry) => entry?.kind === "resource"
    && entry.registerSpace === 0 && entry.registerIndex === 0);
  if ((skinned && bones.length !== 1) || (!skinned && bones.length !== 0))
  {
    fail(`Main.pass${passIndex}.vertex BoneTransforms reflection does not match the variant`);
  }
  if (skinned)
  {
    const bone = bones[0];
    if (vertexBindings.filter((entry) => entry?.kind === "resource").length !== 1
      || bone.registerType !== 33 || bone.carbon?.name !== "BoneTransforms"
      || bone.carbon?.type !== 7 || bone.carbon?.arrayElements !== 1
      || bone.carbon?.isSRGB !== false || bone.carbon?.isAutoregister !== false)
    {
      fail(`Main.pass${passIndex}.vertex has unexpected BoneTransforms metadata`);
    }
    assertSkinnedAnalysisBuffers(record, passIndex);
  }
  const bindings = mainStage(record, passIndex, "pixel").bindings || [];
  if (skinned
    && bindings.filter((entry) => entry?.kind === "resource").length !== resources.length)
  {
    fail(`Main.pass${passIndex}.pixel has an unexpected skinned Glass resource inventory`);
  }
  for (const expected of resources)
  {
    const matches = bindings.filter((entry) => entry?.kind === "resource"
      && entry.registerSpace === 0
      && entry.registerIndex === expected.registerIndex);
    if (matches.length !== 1 || matches[0].carbon?.name !== expected.name)
    {
      fail(`${expected.identity} must reflect ${expected.name}`);
    }
    if (skinned)
    {
      const reflected = matches[0];
      if (reflected.registerType !== expected.registerType
        || reflected.carbon?.type !== expected.carbonType
        || reflected.carbon?.arrayElements !== 1
        || reflected.carbon?.isSRGB !== expected.isSRGB
        || reflected.carbon?.isAutoregister !== expected.isAutoregister)
      {
        fail(`${expected.identity} has unexpected skinned Glass Carbon metadata`);
      }
    }
  }
  // Both backends run the same assertions; the DX12 early return that claimed
  // no samplers were reflected skipped all of them.
  const samplerBindings = bindings.filter((entry) => entry?.kind === "sampler");
  if (samplerBindings.length !== 2)
  {
    fail("analysis must contain both static samplers");
  }
  const surface = samplerBindings.find((entry) => entry.registerIndex === 0)?.carbon?.sampler;
  const fog = samplerBindings.find((entry) => entry.registerIndex === 1)?.carbon?.sampler;
  if (!surface || surface.comparison !== false
    || surface.minFilter !== 3 || surface.magFilter !== 2 || surface.mipFilter !== 2
    || surface.addressU !== 1 || surface.addressV !== 1 || surface.addressW !== 3
    || surface.mipLODBias !== 0 || surface.maxAnisotropy !== 16
    || surface.isDynamic !== false)
  {
    fail("surface sampler has unexpected static state");
  }
  if (!fog || fog.comparison !== false
    || fog.minFilter !== 2 || fog.magFilter !== 2 || fog.mipFilter !== 2
    || fog.addressU !== 3 || fog.addressV !== 3 || fog.addressW !== 3
    || fog.mipLODBias !== 0 || fog.maxAnisotropy !== 16
    || fog.isDynamic !== false)
  {
    fail("fog sampler has unexpected static state");
  }
}

function assertBindings(record, pipeline, passIndex, skinned)
{
  const groups = pipeline?.bindGroups;
  if (!Array.isArray(groups) || groups.length !== 1 || groups[0]?.group !== 0)
  {
    fail(`Main.pass${passIndex} requires exactly canonical bind group 0`);
  }
  const bindings = groups[0].bindings;
  const uniforms = expectedUniforms(skinned);
  const bone = skinned ? expectedBoneBinding() : null;
  const resources = expectedResources(record.backend, skinned);
  const samplers = expectedSamplers(skinned);
  if (!Array.isArray(bindings)
    || bindings.length
      !== uniforms.length + (bone ? 1 : 0) + resources.length + samplers.length)
  {
    fail(
      `Main.pass${passIndex} requires exactly ${skinned ? 15 : 14} canonical bindings`
    );
  }
  const byScope = new Map(bindings.map((entry) => [ entry.scopeIdentity, entry ]));
  if (byScope.size !== bindings.length)
  {
    fail(`Main.pass${passIndex} contains duplicate binding scopes`);
  }
  for (const expected of uniforms)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "buffer", expected.visibility);
    if (binding.layout.buffer.type !== "uniform"
      || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== expected.minBindingSize)
    {
      fail(`${expected.identity} has an unexpected uniform-buffer layout`);
    }
  }
  if (bone)
  {
    const binding = byScope.get(bone.scopeIdentity);
    assertBindingSlot(binding, bone, "buffer", "vertex");
    if (binding.layout.buffer.type !== "read-only-storage"
      || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== 48
      || binding.structureStride !== 48)
    {
      fail("BoneTransforms has an unexpected read-only storage layout");
    }
  }
  for (const expected of resources)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "texture", "fragment");
    if (binding.layout.texture.sampleType !== "float"
      || binding.layout.texture.viewDimension !== expected.viewDimension
      || binding.layout.texture.multisampled !== false)
    {
      fail(`${expected.identity} has an unexpected texture layout`);
    }
    if (skinned && (binding.layout.type
        !== `texture_${expected.viewDimension.replace("-", "_")}<f32>`
      || binding.textureKind !== expected.viewDimension
      || binding.arrayElements !== 1
      || binding.isSRGB !== expected.isSRGB))
    {
      fail(`${expected.identity} has unexpected skinned Glass texture metadata`);
    }
  }
  for (const expected of samplers)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "sampler", "fragment");
    if (binding.layout.sampler.type !== "filtering")
    {
      fail(`${expected.identity} has an unexpected sampler layout`);
    }
  }
  assertMaterialReflection(record, passIndex, skinned);
  assertAnalysisResources(record, passIndex, resources, skinned);
}

/**
 * Fail closed unless the record is either the exact default PPT-disabled
 * static package or the exact PPT-enabled skinned package containing both
 * complementary Main passes.
 *
 * @param {object} record Resource provenance plus a pipeline descriptor.
 * @returns {object} The validated input record.
 */
export function validateQuadGlassV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
  const variant = record.variant ?? "static";
  if (variant !== "static" && variant !== "skinned")
  {
    fail("package variant must be static or skinned");
  }
  const skinned = variant === "skinned";
  if (record.backend !== "dx11" && record.backend !== "dx12")
  {
    fail("package backend must be dx11 or dx12");
  }
  const analysisSource = normalizedPath(record.analysis?.source);
  const metadataSource = normalizedPath(record.metadata?.sourcePath);
  if (!analysisSource || analysisSource !== metadataSource
    || !analysisSource.includes(`/effect.${record.backend}/`))
  {
    fail(`package source provenance must match ${record.backend}`);
  }
  const staticSource = analysisSource.endsWith(
    "/managed/space/spaceobject/v5/quad/unpacked_quadglassv5.sm_hi"
  ) || analysisSource.endsWith(
    "/managed/space/spaceobject/v5/quad/unpacked_quadglassv5.sm_lo"
  );
  const skinnedSource = analysisSource.endsWith(
    "/managed/space/spaceobject/v5/quad/unpackedskinned_quadglassv5.sm_hi"
  );
  if ((skinned && !skinnedSource) || (!skinned && !staticSource))
  {
    fail(
      `package source must be the ${skinned
        ? "unpackedskinned_quadglassv5.sm_hi"
        : "unpacked_quadglassv5 ship shader"}`
    );
  }
  const bodyIndex = skinned ? SKINNED_BODY_INDEX : STATIC_BODY_INDEX;
  if (record.analysis?.bodyIndex !== bodyIndex
    || record.metadata?.bodyIndex !== bodyIndex)
  {
    fail(`package must resolve body index ${bodyIndex}`);
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions", skinned);
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions", skinned);
  const selectedStageKeys = [
    "Main.pass0.vertex",
    "Main.pass0.pixel",
    "Main.pass1.vertex",
    "Main.pass1.pixel"
  ];
  // `wgslSelection` is not consulted at all. The container emits it only for a
  // technique with exactly one pass, so on this two-pass family it is always
  // absent -- and where it does appear it is reconstructed from content rather
  // than carried, so it cannot report the caller's request either (see
  // quadHeatV5Fixture.js). Both passes and their four stage modules are directly
  // observable, which is what this gate actually needs; the runner has already
  // rejected an incomplete pipeline before reaching here.
  const actualStageKeys = (record.pipelines ?? [])
    .flatMap((pipeline) => (pipeline?.shaderModules ?? []).map((module) => module.key));
  if (JSON.stringify(actualStageKeys) !== JSON.stringify(selectedStageKeys))
  {
    fail("package selection must contain both complete Main render passes");
  }
  const analysisPasses = record.analysis?.passes?.filter((entry) =>
    entry?.techniqueName === "Main");
  if (!Array.isArray(analysisPasses) || analysisPasses.length !== 2
    || analysisPasses[0].passIndex !== 0 || analysisPasses[0].renderStates !== 1
    || JSON.stringify(analysisPasses[0].states)
      !== JSON.stringify([ { state: 22, value: 3 } ])
    || analysisPasses[1].passIndex !== 1 || analysisPasses[1].renderStates !== 2
    || JSON.stringify(analysisPasses[1].states)
      !== JSON.stringify([ { state: 22, value: 2 } ]))
  {
    fail("analysis must retain the exact complementary Main cull states");
  }
  if (!Array.isArray(record.pipelines) || record.pipelines.length !== 2)
  {
    fail("package must expose exactly Main.pass0 and Main.pass1");
  }
  const expectedStates = [
    { renderStates: 1, states: [ { state: 22, value: 3 } ] },
    { renderStates: 2, states: [ { state: 22, value: 2 } ] }
  ];
  for (let passIndex = 0; passIndex < 2; passIndex += 1)
  {
    const pipeline = record.pipelines[passIndex];
    if (pipeline?.techniqueName !== "Main" || pipeline.passIndex !== passIndex
      || pipeline.renderStates !== expectedStates[passIndex].renderStates
      || JSON.stringify(pipeline.states) !== JSON.stringify(expectedStates[passIndex].states))
    {
      fail(`pipeline Main.pass${passIndex} has an unexpected complementary cull state`);
    }
    assertVertexInputs(record, passIndex, skinned);
    assertPixelInputs(record, passIndex, skinned);
    assertShaderModules(pipeline, passIndex, skinned);
    assertBindings(record, pipeline, passIndex, skinned);
  }
  for (const stageName of [ "vertex", "pixel" ])
  {
    const stageWgsl = record.pipelines.map((pipeline) =>
      pipeline.shaderModules.find((entry) => entry.stageName === stageName)?.wgsl);
    if (!stageWgsl[0] || stageWgsl[0] !== stageWgsl[1])
    {
      fail(`Main pass ${stageName} WGSL must be identical across complementary cull passes`);
    }
  }
  return record;
}

/**
 * Return backend-local binding identities for the shared semantic fixture.
 *
 * @param {object} record One validated QuadGlassV5 package record.
 * @returns {{storage: object[], textures: object[], samplers: object[]}}
 * Frozen resource plan.
 */
export function getQuadGlassV5ResourcePlan(record)
{
  validateQuadGlassV5PackageRecord(record);
  const skinned = (record.variant ?? "static") === "skinned";
  return Object.freeze({
    storage: Object.freeze(skinned ? [ expectedBoneBinding() ] : []),
    textures: Object.freeze(expectedResources(record.backend, skinned)),
    samplers: Object.freeze(expectedSamplers(skinned))
  });
}

/**
 * Validate ordered and distinct DX11/DX12 records before claiming parity.
 *
 * @param {object[]} records Package records in DX11, DX12 order.
 * @returns {object[]} The validated input array.
 */
export function validateQuadGlassV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  records.forEach(validateQuadGlassV5PackageRecord);
  if ((records[0].variant ?? "static") !== (records[1].variant ?? "static"))
  {
    fail("comparison packages must use the same QuadGlassV5 variant");
  }
  if (records[0].backend !== "dx11" || records[1].backend !== "dx12")
  {
    fail("comparison package order must be DX11 then DX12");
  }
  const physicalPaths = records.map((record) => normalizedPath(record.filePath));
  if (physicalPaths.some((value) => !value) || physicalPaths[0] === physicalPaths[1])
  {
    fail("comparison requires distinct physical package files");
  }
  const resourcePaths = records.map((record) => normalizedPath(record.resourcePath));
  if (resourcePaths.some((value) => !value) || resourcePaths[0] === resourcePaths[1])
  {
    fail("comparison requires distinct logical resource paths");
  }
  const payload = (record) => record.pipelines
    .flatMap((pipeline) => pipeline.shaderModules)
    .slice()
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((entry) => `${entry.key}:${entry.wgsl}`)
    .join("\n");
  if (payload(records[0]) === payload(records[1]))
  {
    fail("DX11 and DX12 packages contain identical WGSL payloads");
  }
  return records;
}

/**
 * Create deterministic synthetic geometry, semantic buffers, and textures for
 * the exact QuadGlassV5 active binding contract.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @param {"static"|"skinned"} [variant="static"] Fixture shader variant.
 * @returns {object} Typed-array fixture values.
 */
export function createQuadGlassV5FixtureValues(width, height, variant = "static")
{
  if (variant !== "static" && variant !== "skinned")
  {
    throw new RangeError("QuadGlassV5 fixture variant must be static or skinned");
  }
  const base = createQuadV5FixtureValues(width, height);
  const sourceVertexCount = base.vertices.length / 16;
  const vertices = new Float32Array(base.vertices.length * 2);
  for (let copy = 0; copy < 2; copy += 1)
  {
    const xOffset = copy === 0 ? -0.48 : 0.48;
    for (let index = 0; index < sourceVertexCount; index += 1)
    {
      const sourceOffset = index * 16;
      const targetOffset = (copy * sourceVertexCount + index) * 16;
      vertices.set(base.vertices.subarray(sourceOffset, sourceOffset + 16), targetOffset);
      vertices[targetOffset] = base.vertices[sourceOffset] * 0.45 + xOffset;
      vertices[targetOffset + 1] = base.vertices[sourceOffset + 1] * 0.8;
    }
  }
  const boneIndices = new Uint16Array(base.boneIndices.length * 2);
  boneIndices.set(base.boneIndices);
  boneIndices.set(base.boneIndices, base.boneIndices.length);
  const indices = new Uint16Array(base.indices.length * 2);
  indices.set(base.indices);
  for (let index = 0; index < base.indices.length; index += 3)
  {
    indices[base.indices.length + index] = base.indices[index] + sourceVertexCount;
    indices[base.indices.length + index + 1] = base.indices[index + 2] + sourceVertexCount;
    indices[base.indices.length + index + 2] = base.indices[index + 1] + sourceVertexCount;
  }
  const bindingValues = createQuadV5MainBindingValues(width, height);
  const surfaceNames = new Set([
    "EveSpaceSceneEnvMap",
    "NormalMap",
    "GlowMap",
    "RoughnessMap",
    "MaterialMap"
  ]);
  const textures = base.textures.filter((entry) => surfaceNames.has(entry.name));
  const environment = textures.find((entry) => entry.name === "EveSpaceSceneEnvMap");
  if (!environment) fail("shared QuadV5 fixture has no environment cube");
  const paintMask = (name, red) => Object.freeze({
    name,
    dimension: "2d",
    width: 1,
    height: 1,
    format: "rgba8unorm",
    bytesPerRow: 4,
    data: new Uint8Array([ red, 0, 0, 255 ])
  });
  const opaquePaintMask = paintMask("OpaquePaintMaskMap", 0);
  const transparentPaintMask = paintMask("TransparentPaintMaskMap", 255);
  const fogVolume = Object.freeze({
    name: "EveSceneFogVolumeMap",
    dimension: "2d-array",
    width: 1,
    height: 1,
    depthOrArrayLayers: 4,
    format: "rgba8unorm",
    data: new Uint8Array([
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0
    ])
  });
  return Object.freeze({
    vertices,
    boneIndices,
    indices,
    bindingValues: Object.freeze({
      ...bindingValues,
      perFramePS: Object.freeze({
        ...bindingValues.perFramePS,
        VolumetricSlices: [ 1, 2, 3, 4 ]
      })
    }),
    textures: Object.freeze([
      ...textures,
      opaquePaintMask,
      transparentPaintMask,
      fogVolume
    ]),
    samplers: Object.freeze([
      Object.freeze({
        name: "SurfaceSampler",
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "clamp-to-edge",
        maxAnisotropy: 16
      }),
      Object.freeze({
        name: "FogSampler",
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        addressModeW: "clamp-to-edge",
        maxAnisotropy: 16
      })
    ]),
    textureResourceVariants: Object.freeze({
      base: Object.freeze({
        PaintMaskMap: "OpaquePaintMaskMap"
      }),
      transparentPaint: Object.freeze({
        PaintMaskMap: "TransparentPaintMaskMap"
      })
    })
  });
}
