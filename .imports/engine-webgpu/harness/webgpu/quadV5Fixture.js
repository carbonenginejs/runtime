const TARGET_BODY_INDEX = 4;

export const QUADV5_TARGET_WIDTH = 64;
export const QUADV5_TARGET_HEIGHT = 64;

export const QUADV5_PPT_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_ENABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF",
  SPACE_OBJECT_INSTANCED_ATTACHMENT: "SOIA_DISABLED",
  BLEND_MODE: "BLEND_MODE_OVERLAY"
});

export const QUADV5_SKINNED_PPT_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_ENABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF",
  BLEND_MODE: "BLEND_MODE_OVERLAY"
});

export const QUADV5_SKINNED_HEAT_PPT_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_ENABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF"
});

export const QUADV5_SKINNED_HEAT_DETAIL_PPT_SELECTION =
  QUADV5_SKINNED_HEAT_PPT_SELECTION;

const SELECTION_PROVENANCE = Object.freeze({
  BINDLESS_RENDERING: Object.freeze({ optionIndex: 0, defaultOption: 0, defaultValue: "BINDLESS_RENDERING_DISABLED" }),
  SPACE_OBJECT_CLIPPING: Object.freeze({ optionIndex: 0, defaultOption: 0, defaultValue: "SOC_DISABLED" }),
  SPACE_OBJECT_PPT_ENABLED: Object.freeze({ optionIndex: 1, defaultOption: 0, defaultValue: "SOPPT_DISABLED" }),
  SPACE_OBJECT_TRANSPARENCY: Object.freeze({ optionIndex: 0, defaultOption: 0, defaultValue: "SOT_OPAQUE" }),
  V5_DEBUG: Object.freeze({ optionIndex: 0, defaultOption: 0, defaultValue: "OFF" }),
  SPACE_OBJECT_INSTANCED_ATTACHMENT: Object.freeze({ optionIndex: 0, defaultOption: 0, defaultValue: "SOIA_DISABLED" }),
  BLEND_MODE: Object.freeze({ optionIndex: 0, defaultOption: 0, defaultValue: "BLEND_MODE_OVERLAY" })
});

const BASE_UNIFORMS = Object.freeze([
  Object.freeze({ identity: "uniform-buffer:0:0", binding: 0, visibility: "fragment", minBindingSize: 384 }),
  Object.freeze({ identity: "uniform-buffer:0:1", binding: 1, visibility: "vertex", minBindingSize: 512 }),
  Object.freeze({ identity: "uniform-buffer:0:2", binding: 2, visibility: "fragment", minBindingSize: 352 }),
  Object.freeze({ identity: "uniform-buffer:0:3", binding: 3, visibility: "vertex", minBindingSize: 416 }),
  Object.freeze({ identity: "uniform-buffer:0:4", binding: 4, visibility: "fragment", minBindingSize: 432 })
]);

const RESOURCE_NAMES = Object.freeze([
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "GlowMap",
  "AlbedoMap",
  "RoughnessMap",
  "MaterialMap",
  "PaintMaskMap",
  "PatternMask1Map",
  "PatternMask2Map"
]);

const RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12 ])
});

// The High (.sm_depth) tier of the same static body. Not a superset of Medium by
// appending: DustNoiseMap and DirtMap land mid-sequence.
//
// Two independent gates decide this inventory, and they are easy to conflate:
//
//   - DustNoiseMap, DirtMap and the four Mtl*DustDiffuseColor constants are
//     gated by the BODY, not the tier. Medium reaches them too at
//     V5_DEBUG=ON, which resolves body 28 instead of body 4.
//   - The forward-light set - LightIndexBuffer, LightBuffer, LightProfileArray
//     and s3 - is genuinely tier-gated. Medium never binds it at any V5_DEBUG.
//
// This fixture pins body 4 at V5_DEBUG=OFF, so within that pin the tier alone
// determines the inventory. The register runs below are that body's, not a
// property of the tier: body 28 is contiguous on DX12 at Medium as well.
// Registers stay the producer's physical ones and are never reassigned.
const HIGH_RESOURCE_NAMES = Object.freeze([
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "GlowMap",
  "DustNoiseMap",
  "AlbedoMap",
  "RoughnessMap",
  "DirtMap",
  "MaterialMap",
  "PaintMaskMap",
  "PatternMask1Map",
  "PatternMask2Map"
]);

const HIGH_RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ])
});

// High binds the forward-light set. These are read-only storage buffers rather
// than textures, so they share the sampled-resource register file with the
// textures above but need a buffer layout.
const HIGH_STORAGE_RESOURCES = Object.freeze([
  Object.freeze({
    name: "LightIndexBuffer",
    structureStride: 4,
    minBindingSize: 4,
    registers: Object.freeze({ dx11: 13, dx12: 14 })
  }),
  Object.freeze({
    name: "LightBuffer",
    structureStride: 48,
    minBindingSize: 48,
    registers: Object.freeze({ dx11: 14, dx12: 15 })
  })
]);

// A plain layered texture with a 2d-array view and no resource transform, which
// is why realizing 2d-array textures is a prerequisite for a High draw rather
// than a follow-on to transform support.
const HIGH_ARRAY_RESOURCES = Object.freeze([
  Object.freeze({
    name: "LightProfileArray",
    viewDimension: "2d-array",
    layers: 2,
    registers: Object.freeze({ dx11: 15, dx12: 16 })
  })
]);

const HEAT_DETAIL_RESOURCE_NAMES = Object.freeze([
  ...RESOURCE_NAMES,
  "HeatGlowNoiseMap",
  "Detail1Map",
  "Detail2Map"
]);

const HEAT_RESOURCE_NAMES = Object.freeze([
  ...RESOURCE_NAMES,
  "HeatGlowNoiseMap"
]);

// The producer merges the two detail maps into one 2d-array binding that sits in
// Detail1Map's slot, and removes Detail2Map's binding entirely. So the analysis
// reflects fourteen fragment resources while the layout exposes thirteen: the
// reflection is pre-transform and the layout is post-transform, and a consumer
// that conflates them either over-binds or fails to fill the array.
const HEAT_DETAIL_MERGE = Object.freeze({
  // Renamed by runtime-resource 866c5c8 (2026-08-02); this pin predated it. The
  // name is a read-side default restored from the transform family table, never
  // carried on the wire, so it moves whenever that table does.
  outputName: "DetailArrayMap",
  inputParameters: Object.freeze([ "Detail1Map", "Detail2Map" ]),
  viewDimension: "2d-array",
  layerCount: 2,
  representation: "native-or-rgba8",
  missingLayer: "reject",
  stage: "fragment",
  kind: "texture-2d-array",
  version: 1
});

const HEAT_DETAIL_RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15 ])
});

const HEAT_RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13 ])
});

const HEAT_DETAIL_VERTEX_INPUTS = Object.freeze([
  Object.freeze({ usageName: "POSITION", usageIndex: 0, registerIndex: 0, usedMask: 7, type: 0, dimension: 3 }),
  Object.freeze({ usageName: "BLENDINDICES", usageIndex: 0, registerIndex: 1, usedMask: 1, type: 2, dimension: 4 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 0, registerIndex: 2, usedMask: 3, type: 0, dimension: 2 }),
  Object.freeze({ usageName: "NORMAL", usageIndex: 0, registerIndex: 3, usedMask: 7, type: 0, dimension: 3 }),
  Object.freeze({ usageName: "TANGENT", usageIndex: 0, registerIndex: 4, usedMask: 7, type: 0, dimension: 3 }),
  Object.freeze({ usageName: "BITANGENT", usageIndex: 0, registerIndex: 5, usedMask: 7, type: 0, dimension: 3 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 1, registerIndex: 6, usedMask: 3, type: 0, dimension: 2 })
]);

const HEAT_DETAIL_PIXEL_INPUTS = Object.freeze([
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 0, registerIndex: 1, usedMask: 3, type: 0, dimension: 4 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 1, registerIndex: 2, usedMask: 7, type: 0, dimension: 3 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 2, registerIndex: 3, usedMask: 7, type: 0, dimension: 3 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 3, registerIndex: 4, usedMask: 7, type: 0, dimension: 3 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 4, registerIndex: 5, usedMask: 15, type: 0, dimension: 4 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 5, registerIndex: 6, usedMask: 0, type: 0, dimension: 4 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 6, registerIndex: 7, usedMask: 15, type: 0, dimension: 4 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 8, registerIndex: 8, usedMask: 0, type: 0, dimension: 4 }),
  Object.freeze({ usageName: "TEXCOORD", usageIndex: 9, registerIndex: 9, usedMask: 11, type: 0, dimension: 4 })
]);

const HEAT_DETAIL_WGSL_STRUCTS = Object.freeze({
  VertexInput: Object.freeze([
    "@location(0) input0: vec3<f32>",
    "@location(1) input1: vec4<u32>",
    "@location(2) input2: vec2<f32>",
    "@location(3) input3: vec3<f32>",
    "@location(4) input4: vec3<f32>",
    "@location(5) input5: vec3<f32>",
    "@location(6) input6: vec2<f32>"
  ]),
  VertexOutput: Object.freeze([
    "@invariant @builtin(position) position: vec4<f32>",
    "@location(1) output1: vec4<f32>",
    "@location(2) output2: vec3<f32>",
    "@location(3) output3: vec3<f32>",
    "@location(4) output4: vec3<f32>",
    "@location(5) output5: vec4<f32>",
    "@location(6) output6: vec4<f32>",
    "@location(7) output7: vec4<f32>",
    "@location(8) output8: vec4<f32>",
    "@location(9) output9: vec4<f32>"
  ]),
  FragmentInput: Object.freeze([
    "@builtin(position) position: vec4<f32>",
    "@location(1) input1: vec4<f32>",
    "@location(2) input2: vec3<f32>",
    "@location(3) input3: vec3<f32>",
    "@location(4) input4: vec3<f32>",
    "@location(5) input5: vec4<f32>",
    "@location(7) input7: vec4<f32>",
    "@location(9) input9: vec4<f32>"
  ]),
  FragmentOutput: Object.freeze([
    "@location(0) output0: vec4<f32>",
    "@location(1) output1: vec4<f32>"
  ])
});

// Carbon reflects s0 and s3 without a name. That absence is the contract: an
// unnamed sampler is declared in the effect signature rather than as a named
// stage register, which is also why DX12 lowers exactly those two to immutable
// root-signature samplers. `named` therefore drives both expectations.
const ANISOTROPIC_REPEAT_STATE = Object.freeze({
  minFilter: 3, magFilter: 2, mipFilter: 2,
  addressU: 1, addressV: 1, addressW: 3
});

// s3 is not a copy of s0: it samples the light profile array with linear
// filtering, no mip filter, and clamped addressing on every axis.
const LINEAR_CLAMP_STATE = Object.freeze({
  minFilter: 2, magFilter: 2, mipFilter: 0,
  addressU: 3, addressV: 3, addressW: 3
});

const FILTERING_REPEAT_SAMPLER = Object.freeze({
  minFilter: "linear",
  magFilter: "linear",
  mipmapFilter: "linear",
  addressModeU: "repeat",
  addressModeV: "repeat",
  addressModeW: "clamp-to-edge",
  maxAnisotropy: 16
});

const FILTERING_CLAMP_SAMPLER = Object.freeze({
  minFilter: "linear",
  magFilter: "linear",
  mipmapFilter: "nearest",
  addressModeU: "clamp-to-edge",
  addressModeV: "clamp-to-edge",
  addressModeW: "clamp-to-edge",
  maxAnisotropy: 1
});

const SAMPLER_DESCRIPTORS = Object.freeze([
  Object.freeze({ name: "Sampler0", named: false, state: ANISOTROPIC_REPEAT_STATE, gpu: FILTERING_REPEAT_SAMPLER }),
  Object.freeze({ name: "PatternMask1MapSampler", named: true, state: ANISOTROPIC_REPEAT_STATE, gpu: FILTERING_REPEAT_SAMPLER }),
  Object.freeze({ name: "PatternMask2MapSampler", named: true, state: ANISOTROPIC_REPEAT_STATE, gpu: FILTERING_REPEAT_SAMPLER })
]);

const HIGH_SAMPLER_DESCRIPTORS = Object.freeze([
  ...SAMPLER_DESCRIPTORS,
  Object.freeze({ name: "Sampler3", named: false, state: LINEAR_CLAMP_STATE, gpu: FILTERING_CLAMP_SAMPLER })
]);

const SAMPLER_NAMES = Object.freeze(SAMPLER_DESCRIPTORS.map((entry) => entry.name));

export const QUADV5_VERTEX_BUFFER_LAYOUT = Object.freeze({
  arrayStride: 64,
  attributes: Object.freeze([
    Object.freeze({ shaderLocation: 0, offset: 0, format: "float32x3" }),
    Object.freeze({ shaderLocation: 2, offset: 12, format: "float32x2" }),
    Object.freeze({ shaderLocation: 3, offset: 20, format: "float32x3" }),
    Object.freeze({ shaderLocation: 4, offset: 32, format: "float32x3" }),
    Object.freeze({ shaderLocation: 5, offset: 44, format: "float32x3" }),
    Object.freeze({ shaderLocation: 6, offset: 56, format: "float32x2" })
  ])
});

export const QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT = Object.freeze({
  arrayStride: 8,
  attributes: Object.freeze([
    Object.freeze({ shaderLocation: 1, offset: 0, format: "uint16x4" })
  ])
});

export const QUADV5_CLEAR_TARGETS = Object.freeze([
  Object.freeze([ 0, 255, 0, 255 ]),
  Object.freeze([ 255, 0, 255, 255 ])
]);

function fail(message)
{
  throw new Error(`QuadV5 PPT fixture: ${message}`);
}

function assertSelections(options, owner, expectedSelection)
{
  if (!Array.isArray(options) || options.length !== Object.keys(expectedSelection).length)
  {
    fail(`${owner} must contain every permutation selection for this QuadV5 variant`);
  }
  const selected = new Map();
  for (const entry of options)
  {
    if (typeof entry?.name !== "string" || selected.has(entry.name))
    {
      fail(`${owner} has malformed or duplicate selections`);
    }
    selected.set(entry.name, entry.value);
  }
  for (const [ name, value ] of Object.entries(expectedSelection))
  {
    if (!selected.has(name)) fail(`${owner} is missing ${name}`);
    const entry = options.find((candidate) => candidate.name === name);
    const provenance = SELECTION_PROVENANCE[name];
    if (entry.value !== value) fail(`${owner} requires ${name}=${value}`);
    // `source` is deliberately not asserted. Carbon's build-time resolver
    // records whether a value arrived as "default", "local" or "global" -- who
    // CHOSE it, not what it is -- and the container stores only which
    // permutation was translated. A permutation that happens to equal the axis
    // default is indistinguishable from one explicitly requested, so a package
    // read back from bytes cannot carry it and must not invent it. The three
    // fields below are derived from the axes and the resolved variant, so they
    // do survive the round trip and are worth pinning.
    if (entry.optionIndex !== provenance.optionIndex || entry.defaultOption !== provenance.defaultOption
      || entry.defaultValue !== provenance.defaultValue)
    {
      fail(`${owner} has unexpected provenance for ${name}`);
    }
  }
}

function normalizedPath(value)
{
  return typeof value === "string" ? value.replace(/\\/gu, "/").toLowerCase() : "";
}

function interfaceInput(entry)
{
  return {
    usageName: entry?.usageName,
    usageIndex: entry?.usageIndex,
    registerIndex: entry?.registerIndex,
    usedMask: entry?.usedMask,
    type: entry?.type,
    dimension: entry?.dimension
  };
}

function assertVertexInputs(analysis, skinned, strictHeat)
{
  const stage = analysis.stages?.find((entry) =>
    entry?.techniqueName === "Main" && entry.passIndex === 0 && entry.stageName === "vertex");
  if (!stage) fail("analysis has no Main.pass0.vertex stage");
  if (strictHeat)
  {
    const inputs = (stage.pipelineInputs || []).map(interfaceInput);
    if (JSON.stringify(inputs) !== JSON.stringify(HEAT_DETAIL_VERTEX_INPUTS))
    {
      fail("Main.pass0.vertex has an unexpected skinned-heat used-mask interface");
    }
    return;
  }
  const active = (stage.pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map(({ registerIndex, dimension, type }) => ({ registerIndex, dimension, type }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
  const expected = [
    { registerIndex: 0, dimension: 3, type: 0 },
    ...(skinned ? [ { registerIndex: 1, dimension: 4, type: 2 } ] : []),
    { registerIndex: 2, dimension: 2, type: 0 },
    { registerIndex: 3, dimension: 3, type: 0 },
    { registerIndex: 4, dimension: 3, type: 0 },
    { registerIndex: 5, dimension: 3, type: 0 },
    { registerIndex: 6, dimension: 2, type: 0 }
  ];
  if (JSON.stringify(active) !== JSON.stringify(expected))
  {
    fail("Main.pass0.vertex has an unexpected active input contract");
  }
}

function assertHeatDetailWgslStruct(wgsl, name)
{
  const match = new RegExp(`struct\\s+${name}\\s*\\{([\\s\\S]*?)\\};`, "u").exec(wgsl);
  if (!match) fail(`WGSL is missing exact ${name}`);
  const fields = match[1].split(/\r?\n/u)
    .map((line) => line.trim().replace(/,$/u, ""))
    .filter(Boolean);
  if (JSON.stringify(fields) !== JSON.stringify(HEAT_DETAIL_WGSL_STRUCTS[name]))
  {
    fail(`WGSL has an unexpected ${name} contract`);
  }
}

function assertShaderModules(pipeline, skinned, strictHeat)
{
  if (!Array.isArray(pipeline.shaderModules) || pipeline.shaderModules.length !== 2)
  {
    fail("Main.pass0 requires exactly vertex and pixel modules");
  }
  for (const stageName of [ "vertex", "pixel" ])
  {
    const matches = pipeline.shaderModules.filter((entry) => entry?.stageName === stageName);
    if (matches.length !== 1 || typeof matches[0].wgsl !== "string" || !matches[0].wgsl
      || matches[0].key !== `Main.pass0.${stageName}`
      || matches[0].techniqueName !== "Main" || matches[0].passIndex !== 0
      || matches[0].stageType !== (stageName === "vertex" ? 0 : 1)
      || matches[0].entryPoint !== "main")
    {
      fail(`Main.pass0 requires one complete ${stageName} module`);
    }
    if (stageName === "vertex")
    {
      for (const location of [ 0, ...(skinned ? [ 1 ] : []), 2, 3, 4, 5, 6 ])
      {
        if (!new RegExp(`@location\\(${location}\\)\\s+input${location}:`, "u").test(matches[0].wgsl))
        {
          fail(`vertex WGSL is missing location ${location}`);
        }
      }
    }
    else if (!/@location\(0\)\s+output0:/u.test(matches[0].wgsl)
      || !/@location\(1\)\s+output1:/u.test(matches[0].wgsl))
    {
      fail("pixel WGSL must expose both QuadV5 render targets");
    }
    if (strictHeat)
    {
      for (const name of stageName === "vertex"
        ? [ "VertexInput", "VertexOutput" ]
        : [ "FragmentInput", "FragmentOutput" ])
      {
        assertHeatDetailWgslStruct(matches[0].wgsl, name);
      }
    }
  }
}

function assertHeatMainInventory(record)
{
  const stages = record.analysis?.stages?.filter((entry) => entry?.techniqueName === "Main");
  const expectedStages = [
    { key: "Main.pass0.vertex", passIndex: 0, stageName: "vertex", stageType: 0 },
    { key: "Main.pass0.pixel", passIndex: 0, stageName: "pixel", stageType: 1 }
  ];
  if (!Array.isArray(stages) || stages.length !== expectedStages.length)
  {
    fail("analysis must expose exactly the skinned-heat Main.pass0 stage pair");
  }
  for (let index = 0; index < expectedStages.length; index += 1)
  {
    const stage = stages[index];
    const expected = expectedStages[index];
    if (stage?.key !== expected.key || stage.passIndex !== expected.passIndex
      || stage.stageName !== expected.stageName || stage.stageType !== expected.stageType)
    {
      fail("analysis has an unexpected skinned-heat Main stage inventory");
    }
  }
  const passes = record.analysis?.passes?.filter((entry) => entry?.techniqueName === "Main");
  if (!Array.isArray(passes) || passes.length !== 1 || passes[0].passIndex !== 0
    || passes[0].renderStates !== 1 || JSON.stringify(passes[0].states) !== "[]")
  {
    fail("analysis must expose the exact skinned-heat Main.pass0 render state");
  }
  if (record.pipeline?.renderStates !== 1 || JSON.stringify(record.pipeline.states) !== "[]")
  {
    fail("pipeline must expose the exact skinned-heat Main.pass0 render state");
  }
  const pixel = stages[1];
  const pixelInputs = (pixel.pipelineInputs || []).map(interfaceInput);
  if (JSON.stringify(pixelInputs) !== JSON.stringify(HEAT_DETAIL_PIXEL_INPUTS))
  {
    fail("Main.pass0.pixel has an unexpected skinned-heat used-mask interface");
  }
}

function requiredUniforms(skinned, heat, heatDetail)
{
  return BASE_UNIFORMS.map((entry) => Object.freeze({
    ...entry,
    scopeIdentity: `${entry.identity}@${entry.visibility}`,
    ...(heatDetail && entry.identity === "uniform-buffer:0:0" ? { minBindingSize: 640 } : {}),
    ...(heat && entry.identity === "uniform-buffer:0:0" ? { minBindingSize: 464 } : {}),
    ...(skinned && entry.identity === "uniform-buffer:0:3" ? { minBindingSize: 432 } : {})
  }));
}

const TIER_BY_SUFFIX = Object.freeze({
  sm_depth: "high",
  sm_hi: "medium",
  sm_lo: "low"
});

// The tier is a property of the compiled source, so it is read from the source
// path the package carries rather than passed in beside it. A caller cannot
// declare a tier the bytes disagree with.
function tierFromSource(analysisSource, expectedStem)
{
  const match = new RegExp(`/${expectedStem}\\.([a-z_0-9]+)$`, "u").exec(analysisSource ?? "");
  const tier = match ? TIER_BY_SUFFIX[match[1]] : undefined;
  if (!tier)
  {
    fail(`package source must name a known quality tier, not ${String(analysisSource)}`);
  }
  return tier;
}

function sampledResource(name, registerIndex, binding, scope, extra)
{
  return Object.freeze({
    name,
    identity: `sampled-resource:0:${registerIndex}`,
    scopeIdentity: `sampled-resource:0:${registerIndex}@${scope}`,
    registerIndex,
    binding,
    scope,
    arrayElements: 1,
    ...extra
  });
}

/**
 * Resolve the exact canonical bind-group layout for one variant at one tier.
 *
 * Slots are computed from the inventory rather than tabulated, so a tier that
 * adds bindings cannot silently disagree with itself about where the samplers
 * start. Registers stay the producer's physical ones.
 *
 * @param {"dx11"|"dx12"} backend Package backend.
 * @param {string} variant Fixture variant.
 * @param {"high"|"medium"|"low"} tier Compiled quality tier.
 * @returns {{uniforms: object[], storage: object[], textures: object[], samplers: object[]}} Layout.
 */
function expectedLayout(backend, variant, tier)
{
  const skinned = variant !== "static";
  const heat = variant === "skinnedHeat";
  const heatDetail = variant === "skinnedHeatDetail";
  const high = tier === "high";
  if (high && variant !== "static")
  {
    fail(`the High tier is only encoded for the static variant, not ${variant}`);
  }
  const registerTable = high
    ? HIGH_RESOURCE_REGISTERS
    : (heatDetail
      ? HEAT_DETAIL_RESOURCE_REGISTERS
      : (heat ? HEAT_RESOURCE_REGISTERS : RESOURCE_REGISTERS));
  const registers = registerTable[backend];
  if (!registers) fail(`unsupported package backend ${String(backend)}`);
  const names = high
    ? HIGH_RESOURCE_NAMES
    : (heatDetail
      ? HEAT_DETAIL_RESOURCE_NAMES
      : (heat ? HEAT_RESOURCE_NAMES : RESOURCE_NAMES));

  const uniforms = requiredUniforms(skinned, heat, heatDetail);
  let slot = uniforms.length;
  const storage = [];
  if (skinned)
  {
    storage.push(sampledResource("BoneTransforms", 0, slot, "vertex", {
      registerType: 33,
      carbonType: 7,
      isSRGB: false,
      isAutoregister: false,
      minBindingSize: 48,
      structureStride: 48
    }));
    slot += 1;
  }
  const fragmentResource = (name, registerIndex, binding) => sampledResource(
    name, registerIndex, binding, "fragment", {
      viewDimension: name === "EveSpaceSceneEnvMap" ? "cube" : "2d",
      registerType: name === "EveSpaceSceneEnvMap" ? 41 : 36,
      carbonType: name === "EveSpaceSceneEnvMap" ? 4 : 2,
      isSRGB: name === "EveSpaceSceneEnvMap" || name === "AlbedoMap",
      isAutoregister: name === "EveSpaceSceneShadowMap"
    }
  );
  const merge = heatDetail ? HEAT_DETAIL_MERGE : null;
  const transforms = [];
  const textures = [];
  for (let index = 0; index < names.length; index += 1)
  {
    const name = names[index];
    const mergeLayer = merge ? merge.inputParameters.indexOf(name) : -1;
    if (mergeLayer > 0) continue;
    if (mergeLayer === 0)
    {
      const inputs = merge.inputParameters.map((parameter, layer) => Object.freeze({
        parameter,
        layer,
        identity: `sampled-resource:0:${registers[names.indexOf(parameter)]}`,
        scopeIdentity: `sampled-resource:0:${registers[names.indexOf(parameter)]}@fragment`
      }));
      const output = sampledResource(merge.outputName, registers[index], slot, "fragment", {
        viewDimension: merge.viewDimension,
        registerType: 36,
        carbonType: 2,
        isSRGB: false,
        isAutoregister: false,
        arrayLayerCount: merge.layerCount
      });
      textures.push(output);
      transforms.push(Object.freeze({
        id: `Main.pass0:detail-map-array:${output.identity}`,
        kind: merge.kind,
        version: merge.version,
        layoutKey: "Main.pass0",
        stage: merge.stage,
        representation: merge.representation,
        missingLayer: merge.missingLayer,
        group: 0,
        binding: slot,
        output: Object.freeze({
          name: merge.outputName,
          identity: output.identity,
          scopeIdentity: output.scopeIdentity,
          viewDimension: merge.viewDimension,
          layerCount: merge.layerCount
        }),
        inputs: Object.freeze(inputs)
      }));
      slot += 1;
      continue;
    }
    textures.push(fragmentResource(name, registers[index], slot));
    slot += 1;
  }
  const highStorage = [];
  const highArrays = [];
  if (high)
  {
    for (const entry of HIGH_STORAGE_RESOURCES)
    {
      highStorage.push(sampledResource(entry.name, entry.registers[backend], slot, "fragment", {
        registerType: 33,
        carbonType: 7,
        isSRGB: false,
        isAutoregister: true,
        minBindingSize: entry.minBindingSize,
        structureStride: entry.structureStride
      }));
      slot += 1;
    }
    for (const entry of HIGH_ARRAY_RESOURCES)
    {
      highArrays.push(sampledResource(entry.name, entry.registers[backend], slot, "fragment", {
        viewDimension: entry.viewDimension,
        registerType: 37,
        carbonType: 5,
        isSRGB: false,
        isAutoregister: true
      }));
      slot += 1;
    }
    storage.push(...highStorage);
    textures.push(...highArrays);
  }
  // The reflection is pre-transform: every declared fragment resource, including
  // the inputs a transform merged away. The layout above is post-transform. For
  // an untransformed pass the two sets are the same; for a transformed one the
  // analysis is longer, which is exactly the asymmetry a consumer must respect.
  const analysisResources = [
    ...names.map((name, index) => fragmentResource(name, registers[index], null)),
    ...highStorage,
    ...highArrays
  ];
  const samplers = (high ? HIGH_SAMPLER_DESCRIPTORS : SAMPLER_DESCRIPTORS)
    .map((descriptor, registerIndex) => Object.freeze({
      name: descriptor.name,
      named: descriptor.named,
      state: descriptor.state,
      gpu: descriptor.gpu,
      identity: `sampler:0:${registerIndex}`,
      scopeIdentity: `sampler:0:${registerIndex}@fragment`,
      registerIndex,
      binding: slot + registerIndex
    }));
  return { uniforms, storage, textures, samplers, analysisResources, transforms };
}

const HEAT_DETAIL_MATERIAL_CONSTANTS = Object.freeze([
  [ "GeneralData", 0 ],
  [ "Mtl1DiffuseColor", 32 ],
  [ "Mtl2DiffuseColor", 48 ],
  [ "Mtl3DiffuseColor", 64 ],
  [ "Mtl4DiffuseColor", 80 ],
  [ "Mtl1FresnelColor", 96 ],
  [ "Mtl2FresnelColor", 112 ],
  [ "Mtl3FresnelColor", 128 ],
  [ "Mtl4FresnelColor", 144 ],
  [ "Mtl1Gloss", 160 ],
  [ "Mtl2Gloss", 176 ],
  [ "Mtl3Gloss", 192 ],
  [ "Mtl4Gloss", 208 ],
  [ "PMtl1DiffuseColor", 288 ],
  [ "PMtl1FresnelColor", 304 ],
  [ "PMtl1Gloss", 320 ],
  [ "PMtl2DiffuseColor", 336 ],
  [ "PMtl2FresnelColor", 352 ],
  [ "PMtl2Gloss", 368 ],
  [ "Mtl1HeatGlowData", 384 ],
  [ "Mtl2HeatGlowData", 400 ],
  [ "Mtl3HeatGlowData", 416 ],
  [ "Mtl4HeatGlowData", 432 ],
  [ "GeneralHeatGlowColor", 448 ],
  [ "Detail1Data", 464 ],
  [ "Detail2Data", 480 ],
  [ "SecondaryDetail2Data", 496 ],
  [ "Detail3Data", 512 ],
  [ "DetailAlbedoColor", 528 ],
  [ "DetailFresnelColor", 544 ],
  [ "DetailSelector", 624 ]
]);

const HEAT_MATERIAL_CONSTANTS = Object.freeze(
  HEAT_DETAIL_MATERIAL_CONSTANTS.slice(0, 24)
);

function assertHeatMaterial(record, heatDetail)
{
  const vertex = record.analysis.stages.find((entry) =>
    entry?.techniqueName === "Main"
      && entry.passIndex === 0
      && entry.stageName === "vertex");
  const pixel = record.analysis.stages.find((entry) =>
    entry?.techniqueName === "Main"
      && entry.passIndex === 0
      && entry.stageName === "pixel");
  const vertexBuffers = vertex?.bindings?.filter((entry) => entry?.kind === "constantBuffer");
  const pixelBuffers = pixel?.bindings?.filter((entry) => entry?.kind === "constantBuffer");
  if (JSON.stringify(vertexBuffers?.map((entry) => entry.registerIndex)) !== "[1,3]"
    || JSON.stringify(pixelBuffers?.map((entry) => entry.registerIndex)) !== "[0,2,4]")
  {
    fail("Main.pass0 must expose the exact skinned-heat constant-buffer inventory");
  }
  for (const entry of [ ...vertexBuffers, ...pixelBuffers ])
  {
    const local = entry.registerIndex === 0;
    if (entry.registerType !== 0 || entry.registerSpace !== 0
      || entry.generatedSymbol !== `cb${entry.registerIndex}`
      || entry.registerCount !== 1 || entry.arrayCount !== 1 || entry.dynamic !== true
      || entry.metadataName !== (local ? "$LocalConstants" : null)
      || entry.carbon?.hasLocalConstants !== local
      || (!local && (entry.carbon.constantValueSize !== 0
        || JSON.stringify(entry.carbon.constants) !== "[]")))
    {
      fail(`Main.pass0 cb${entry.registerIndex} has unexpected skinned-heat metadata`);
    }
  }
  const material = pixelBuffers.filter((entry) => entry.registerIndex === 0);
  const size = heatDetail ? 640 : 464;
  const expectedConstants = heatDetail
    ? HEAT_DETAIL_MATERIAL_CONSTANTS
    : HEAT_MATERIAL_CONSTANTS;
  if (!Array.isArray(material) || material.length !== 1
    || material[0].carbon?.hasLocalConstants !== true
    || material[0].carbon?.constantValueSize !== size)
  {
    fail(`pixel cb0 must expose the exact ${size}-byte skinned-heat material layout`);
  }
  const constants = material[0].carbon.constants;
  if (!Array.isArray(constants) || constants.length !== expectedConstants.length)
  {
    fail("pixel cb0 has an unexpected skinned-heat constant count");
  }
  for (let index = 0; index < expectedConstants.length; index += 1)
  {
    const [ name, offset ] = expectedConstants[index];
    const constant = constants[index];
    if (constant?.name !== name || constant.offset !== offset || constant.size !== 16
      || constant.dimension !== 4 || constant.type !== 0 || constant.elements !== 0)
    {
      fail(`pixel cb0 has an unexpected ${name} layout`);
    }
  }
}

// Body 4's High material block. It keeps the same 384-byte footprint body 4
// carries at Medium and fills the 64-byte hole at 224 with the four dust colors,
// so the size alone cannot tell the tiers apart - the constant inventory can.
//
// The dust colors are body-gated rather than tier-gated: Medium's body 28
// (V5_DEBUG=ON) also carries them, at a different 452-byte footprint with 29
// constants. This list is body 4 at High specifically.
const HIGH_MATERIAL_CONSTANTS = Object.freeze([
  [ "GeneralData", 0 ],
  [ "GeneralGlowColor", 16 ],
  [ "Mtl1DiffuseColor", 32 ],
  [ "Mtl2DiffuseColor", 48 ],
  [ "Mtl3DiffuseColor", 64 ],
  [ "Mtl4DiffuseColor", 80 ],
  [ "Mtl1FresnelColor", 96 ],
  [ "Mtl2FresnelColor", 112 ],
  [ "Mtl3FresnelColor", 128 ],
  [ "Mtl4FresnelColor", 144 ],
  [ "Mtl1Gloss", 160 ],
  [ "Mtl2Gloss", 176 ],
  [ "Mtl3Gloss", 192 ],
  [ "Mtl4Gloss", 208 ],
  [ "Mtl1DustDiffuseColor", 224 ],
  [ "Mtl2DustDiffuseColor", 240 ],
  [ "Mtl3DustDiffuseColor", 256 ],
  [ "Mtl4DustDiffuseColor", 272 ],
  [ "PMtl1DiffuseColor", 288 ],
  [ "PMtl1FresnelColor", 304 ],
  [ "PMtl1Gloss", 320 ],
  [ "PMtl2DiffuseColor", 336 ],
  [ "PMtl2FresnelColor", 352 ],
  [ "PMtl2Gloss", 368 ]
]);

function assertHighMaterial(record)
{
  const pixel = record.analysis.stages.find((entry) =>
    entry?.techniqueName === "Main"
      && entry.passIndex === 0
      && entry.stageName === "pixel");
  const material = pixel?.bindings?.filter((entry) =>
    entry?.kind === "constantBuffer" && entry.registerIndex === 0);
  if (!Array.isArray(material) || material.length !== 1
    || material[0].carbon?.hasLocalConstants !== true
    || material[0].carbon?.constantValueSize !== 384)
  {
    fail("pixel cb0 must expose the exact 384-byte High material layout");
  }
  const constants = material[0].carbon.constants;
  if (!Array.isArray(constants) || constants.length !== HIGH_MATERIAL_CONSTANTS.length)
  {
    fail(`pixel cb0 must expose exactly ${HIGH_MATERIAL_CONSTANTS.length} High constants`);
  }
  for (let index = 0; index < HIGH_MATERIAL_CONSTANTS.length; index += 1)
  {
    const [ name, offset ] = HIGH_MATERIAL_CONSTANTS[index];
    const constant = constants[index];
    if (constant?.name !== name || constant.offset !== offset || constant.size !== 16
      || constant.dimension !== 4 || constant.type !== 0 || constant.elements !== 0)
    {
      fail(`pixel cb0 has an unexpected ${name} layout`);
    }
  }
}

function hasFilterState(state, expected)
{
  return state?.comparison === false
    && state.minFilter === expected.minFilter
    && state.magFilter === expected.magFilter
    && state.mipFilter === expected.mipFilter
    && state.addressU === expected.addressU
    && state.addressV === expected.addressV
    && state.addressW === expected.addressW
    && state.mipLODBias === 0 && state.maxAnisotropy === 16;
}

function hasExactSamplerState(state, expected, isDynamic)
{
  return hasFilterState(state, expected) && state.isDynamic === isDynamic;
}

// A DX12 immutable root-signature sampler is a D3D12_STATIC_SAMPLER_DESC, whose
// wire record stores a one-byte border-colour enum and no dynamic flag at all.
// Neither survives to here any more: the reader expands the enum to the same
// four floats a stage sampler carries and restores `isDynamic` as false, both
// exactly as Carbon's own reader does. So the reflected state is identical
// across backends and only `sourceTruth` records which record type declared it.
//
// `isDynamic` in particular must be present rather than absent, because it is
// the override authorisation: a consumer that treats a missing flag as dynamic
// would offer an override on a sampler Carbon forbids overriding.
function hasStaticSamplerState(state, expected)
{
  return hasFilterState(state, expected)
    && Array.isArray(state.borderColor)
    && JSON.stringify(state.borderColor) === JSON.stringify([ 0, 0, 0, 0 ])
    && state.isDynamic === false;
}

function assertAnalysisResources(record, layout, strict)
{
  const pixel = record.analysis?.stages?.filter((entry) =>
    entry?.techniqueName === "Main" && entry.passIndex === 0 && entry.stageName === "pixel");
  if (!Array.isArray(pixel) || pixel.length !== 1)
  {
    fail("analysis must contain exactly one Main.pass0.pixel stage");
  }
  const vertex = record.analysis?.stages?.filter((entry) =>
    entry?.techniqueName === "Main" && entry.passIndex === 0 && entry.stageName === "vertex");
  if (!Array.isArray(vertex) || vertex.length !== 1)
  {
    fail("analysis must contain exactly one Main.pass0.vertex stage");
  }
  const samplers = layout.samplers;
  const vertexStorage = layout.storage.filter((entry) => entry.scope === "vertex");
  // Deliberately the pre-transform list: the analysis still reflects a merged
  // input under its own register, so checking it against the post-transform
  // layout would report drift that is really just the merge.
  const resources = layout.analysisResources;
  const vertexBindings = Array.isArray(vertex[0].bindings) ? vertex[0].bindings : [];
  const vertexResources = vertexBindings.filter((entry) => entry?.kind === "resource");
  if (vertexResources.length !== vertexStorage.length)
  {
    fail("vertex resource reflection does not match the QuadV5 variant");
  }
  for (const expected of vertexStorage)
  {
    const matches = vertexBindings.filter((entry) => entry?.kind === "resource"
      && entry.registerSpace === 0 && entry.registerIndex === expected.registerIndex
      && entry.carbon?.name === expected.name);
    if (matches.length !== 1)
    {
      fail(`vertex t${expected.registerIndex} must reflect ${expected.name}`);
    }
    if (strict)
    {
      const reflected = matches[0];
      if (reflected.registerType !== expected.registerType
        || reflected.carbon?.type !== expected.carbonType
        || reflected.carbon?.arrayElements !== expected.arrayElements
        || reflected.carbon?.isSRGB !== expected.isSRGB
        || reflected.carbon?.isAutoregister !== expected.isAutoregister)
      {
        fail(`vertex t${expected.registerIndex} has unexpected ${expected.name} Carbon metadata`);
      }
    }
  }
  const bindings = Array.isArray(pixel[0].bindings) ? pixel[0].bindings : [];
  if (strict
    && bindings.filter((entry) => entry?.kind === "resource").length !== resources.length)
  {
    fail("pixel resources must match the exact declared inventory");
  }
  for (const expected of resources)
  {
    const matches = bindings.filter((entry) => entry?.kind === "resource"
      && entry.registerSpace === 0 && entry.registerIndex === expected.registerIndex);
    if (matches.length !== 1 || matches[0].carbon?.name !== expected.name)
    {
      fail(`${expected.identity} must reflect ${expected.name}`);
    }
    if (strict)
    {
      const reflected = matches[0];
      if (reflected.registerType !== expected.registerType
        || reflected.carbon?.type !== expected.carbonType
        || reflected.carbon?.arrayElements !== expected.arrayElements
        || reflected.carbon?.isSRGB !== expected.isSRGB
        || reflected.carbon?.isAutoregister !== expected.isAutoregister)
      {
        fail(`${expected.identity} has unexpected Carbon metadata`);
      }
    }
  }
  const reflectedSamplers = bindings.filter((entry) => entry?.kind === "sampler");
  if (strict && reflectedSamplers.length !== samplers.length)
  {
    fail("pixel samplers must match the exact declared inventory");
  }
  for (const expected of samplers)
  {
    const matches = bindings.filter((entry) => entry?.kind === "sampler"
      && entry.registerSpace === 0 && entry.registerIndex === expected.registerIndex);
    if (!expected.named && record.backend === "dx12")
    {
      // DX12 declares every unnamed sampler as an immutable root-signature
      // sampler, so it reflects through the signature rather than a stage
      // register. That is the real backend difference, and it is a difference
      // in WHERE the sampler is declared, not in what it reflects as - see
      // hasStaticSamplerState above for why the state itself is identical.
      const signature = matches[0];
      const state = signature?.carbon?.sampler;
      if (matches.length !== 1
        || (signature.carbon?.name ?? null) !== null
        || signature.dynamic !== false
        || signature.sourceTruth !== "carbon-signature-sampler"
        || !hasStaticSamplerState(state, expected.state))
      {
        fail(`${expected.identity} has unexpected DX12 signature-sampler reflection`);
      }
      continue;
    }
    const reflectedName = matches[0]?.carbon?.name ?? null;
    const expectedName = expected.named ? expected.name : null;
    if (matches.length !== 1 || reflectedName !== expectedName)
    {
      fail(`${expected.identity} has unexpected sampler reflection`);
    }
    if (!expected.named || strict)
    {
      const state = matches[0].carbon?.sampler;
      if (!hasExactSamplerState(state, expected.state, expected.named))
      {
        fail(`${expected.identity} has unexpected ${expected.named ? "dynamic" : "static"} sampler state`);
      }
    }
  }
}

function assertBindingSlot(binding, expected, kind, visibility)
{
  const [ expectedResourceKind, expectedRegisterSpace, expectedRegisterIndex ] = expected.identity.split(":");
  if (!binding || binding.identity !== expected.identity
    || binding.scopeIdentity !== expected.scopeIdentity
    || binding.resourceKind !== expectedResourceKind
    || binding.registerSpace !== Number(expectedRegisterSpace)
    || binding.registerIndex !== Number(expectedRegisterIndex)
    || binding.sourceTruth !== "wgsl-layout" || binding.group !== 0
    || binding.binding !== expected.binding || binding.dynamic !== false
    || !Array.isArray(binding.visibility) || binding.visibility.length !== 1
    || binding.visibility[0] !== visibility)
  {
    fail(`${expected.identity} has an unexpected slot, scope, register, or visibility`);
  }
  const layout = binding.layout || {};
  const kinds = [ "buffer", "texture", "sampler" ].filter((key) => layout[key]);
  if (kinds.length !== 1 || kinds[0] !== kind)
  {
    fail(`${expected.identity} has an unexpected layout kind`);
  }
}

function assertBindings(record, tier)
{
  const pipeline = record.pipeline;
  if (!Array.isArray(pipeline.bindGroups) || pipeline.bindGroups.length !== 1
    || pipeline.bindGroups[0]?.group !== 0)
  {
    fail("Main.pass0 requires exactly canonical bind group 0");
  }
  const variant = record.variant ?? "static";
  const heat = variant === "skinnedHeat";
  const heatDetail = variant === "skinnedHeatDetail";
  const strictHeat = heat || heatDetail;
  // High is a newly pinned contract read straight from its own reflection, so
  // it is asserted as strictly as the heat pair rather than by name alone.
  const strict = strictHeat || tier === "high";
  const layout = expectedLayout(record.backend, variant, tier);
  const { uniforms, storage, textures, samplers } = layout;
  const expectedCount = uniforms.length + storage.length + textures.length + samplers.length;
  const bindings = pipeline.bindGroups[0].bindings;
  if (!Array.isArray(bindings) || bindings.length !== expectedCount)
  {
    fail(`Main.pass0 requires exactly ${expectedCount} canonical bindings`);
  }
  const byScope = new Map(bindings.map((entry) => [ entry.scopeIdentity, entry ]));
  if (byScope.size !== bindings.length) fail("Main.pass0 contains duplicate binding scopes");

  for (const expected of uniforms)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "buffer", expected.visibility);
    if (binding.layout.buffer.type !== "uniform" || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== expected.minBindingSize)
    {
      fail(`${expected.identity} has an unexpected uniform-buffer layout`);
    }
  }
  for (const expected of storage)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "buffer", expected.scope);
    if (binding.resourceKind !== "sampled-resource"
      || binding.layout.buffer.type !== "read-only-storage"
      || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== expected.minBindingSize
      || binding.structureStride !== expected.structureStride)
    {
      fail(`${expected.name} has an unexpected read-only storage layout`);
    }
  }
  for (const expected of textures)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "texture", "fragment");
    // The WGSL type spells the view dimension with an underscore where the
    // WebGPU enum uses a hyphen: texture_2d_array<f32> against "2d-array".
    const expectedType = `texture_${expected.viewDimension.replace("-", "_")}<f32>`;
    if (binding.layout.texture.sampleType !== "float"
      || binding.layout.texture.viewDimension !== expected.viewDimension
      || binding.layout.texture.multisampled !== false
      || binding.layout.type !== expectedType
      || binding.textureKind !== expected.viewDimension
      || binding.arrayElements !== 1
      || binding.isSRGB !== expected.isSRGB)
    {
      fail(`${expected.identity} has an unexpected texture layout`);
    }
    // A merged binding must say so on the binding itself, and a direct one must
    // not: that is the only local signal that layers need assembling.
    const expectedLayers = expected.arrayLayerCount ?? null;
    if ((binding.arrayLayerCount ?? null) !== expectedLayers)
    {
      fail(`${expected.identity} must declare ${expectedLayers === null ? "no" : expectedLayers}`
        + " merged array layers");
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
  assertResourceTransforms(record, layout);
  assertAnalysisResources(record, layout, strict);
  if (strictHeat) assertHeatMaterial(record, heatDetail);
  if (tier === "high") assertHighMaterial(record);
}

// A transformed binding cannot be filled from one source texture, so the
// requirement has to reach the consumer through the pipeline rather than being
// inferred from the binding. Assert the projection exactly, both ways: a pass
// that declares a merge the fixture does not expect is as wrong as the reverse.
function assertResourceTransforms(record, layout)
{
  const declared = record.pipeline?.resourceTransforms ?? [];
  const expected = layout.transforms;
  if (!Array.isArray(declared) || declared.length !== expected.length)
  {
    fail(`Main.pass0 must declare exactly ${expected.length} resource transform`
      + `${expected.length === 1 ? "" : "s"}`);
  }
  for (const want of expected)
  {
    const matches = declared.filter((entry) =>
      entry?.output?.scopeIdentity === want.output.scopeIdentity);
    if (matches.length !== 1)
    {
      fail(`Main.pass0 must declare one transform merging into ${want.output.scopeIdentity}`);
    }
    const got = matches[0];
    if (got.id !== want.id || got.kind !== want.kind || got.version !== want.version
      || got.layoutKey !== want.layoutKey || got.stage !== want.stage
      || got.representation !== want.representation || got.missingLayer !== want.missingLayer
      || got.group !== want.group || got.binding !== want.binding
      || got.output.name !== want.output.name
      || got.output.identity !== want.output.identity
      || got.output.viewDimension !== want.output.viewDimension
      || got.output.layerCount !== want.output.layerCount)
    {
      fail(`${want.id} has unexpected transform metadata`);
    }
    if (!Array.isArray(got.inputs) || got.inputs.length !== want.inputs.length)
    {
      fail(`${want.id} must merge exactly ${want.inputs.length} inputs`);
    }
    for (let index = 0; index < want.inputs.length; index += 1)
    {
      const wantInput = want.inputs[index];
      const gotInput = got.inputs[index];
      if (gotInput?.parameter !== wantInput.parameter || gotInput.layer !== wantInput.layer
        || gotInput.identity !== wantInput.identity
        || gotInput.scopeIdentity !== wantInput.scopeIdentity)
      {
        fail(`${want.id} layer ${wantInput.layer} must come from ${wantInput.parameter}`);
      }
    }
    // The merged-away inputs must not also be bound directly.
    const bindings = record.pipeline.bindGroups[0].bindings;
    for (const input of want.inputs.slice(1))
    {
      if (bindings.some((entry) => entry.scopeIdentity === input.scopeIdentity))
      {
        fail(`${input.parameter} was merged into ${want.output.scopeIdentity}`
          + ` but is still bound at ${input.scopeIdentity}`);
      }
    }
  }
}

/**
 * Fail closed unless a resource-loaded package is the exact PPT-on unpacked
 * QuadV5 body and exposes the current full Main.pass0 contract.
 *
 * @param {object} record Resource provenance plus a pipeline descriptor.
 * @returns {object} The validated input record.
 */
export function validateQuadV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
  if (record.backend !== "dx11" && record.backend !== "dx12") fail("package backend must be dx11 or dx12");
  const variant = record.variant ?? "static";
  if (variant !== "static" && variant !== "skinned"
    && variant !== "skinnedHeat" && variant !== "skinnedHeatDetail")
  {
    fail("package variant must be static, skinned, skinnedHeat, or skinnedHeatDetail");
  }
  const skinned = variant !== "static";
  const heat = variant === "skinnedHeat";
  const heatDetail = variant === "skinnedHeatDetail";
  const strictHeat = heat || heatDetail;
  const expectedSelection = heat
    ? QUADV5_SKINNED_HEAT_PPT_SELECTION
    : (heatDetail
      ? QUADV5_SKINNED_HEAT_DETAIL_PPT_SELECTION
      : (skinned ? QUADV5_SKINNED_PPT_SELECTION : QUADV5_PPT_SELECTION));
  const analysisSource = normalizedPath(record.analysis?.source);
  const metadataSource = normalizedPath(record.metadata?.sourcePath);
  const backendMarker = `/effect.${record.backend}/`;
  if (!analysisSource || analysisSource !== metadataSource || !analysisSource.includes(backendMarker))
  {
    fail(`package source provenance must match ${record.backend}`);
  }
  const expectedStem = heatDetail
    ? "unpackedskinned_quadheatdetailv5"
    : (heat
      ? "unpackedskinned_quadheatv5"
      : (skinned ? "unpackedskinned_quadv5" : "unpacked_quadv5"));
  if (!analysisSource.includes(`/managed/space/spaceobject/v5/quad/${expectedStem}.`))
  {
    fail(`package source must be the ${expectedStem} ship shader`);
  }
  const tier = tierFromSource(analysisSource, expectedStem);
  const allowedTiers = strictHeat
    ? [ "medium" ]
    : (variant === "static" ? [ "high", "medium", "low" ] : [ "medium", "low" ]);
  if (!allowedTiers.includes(tier))
  {
    fail(`the ${tier} tier is not encoded for the ${variant} variant`);
  }
  if (record.analysis?.bodyIndex !== TARGET_BODY_INDEX || record.metadata?.bodyIndex !== TARGET_BODY_INDEX)
  {
    fail(`package must resolve body index ${TARGET_BODY_INDEX}`);
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions", expectedSelection);
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions", expectedSelection);
  const selection = record.metadata.wgslSelection;
  if (selection?.mode !== "explicit"
    || selection.techniqueName !== "Main" || selection.passIndex !== 0
    || selection.completePasses !== true
    || !Array.isArray(selection.requestedStageNames)
    || selection.requestedStageNames.length !== 2
    || selection.requestedStageNames[0] !== "vertex"
    || selection.requestedStageNames[1] !== "pixel"
    || !Array.isArray(selection.selectedStageKeys)
    || selection.selectedStageKeys.length !== 2
    || selection.selectedStageKeys[0] !== "Main.pass0.vertex"
    || selection.selectedStageKeys[1] !== "Main.pass0.pixel")
  {
    fail("package selection must be the complete Main.pass0 vertex/pixel pair");
  }
  if (record.pipeline?.techniqueName !== "Main" || record.pipeline.passIndex !== 0)
  {
    fail("pipeline must be Main.pass0");
  }
  if (strictHeat) assertHeatMainInventory(record);
  assertVertexInputs(record.analysis, skinned, strictHeat);
  assertShaderModules(record.pipeline, skinned, strictHeat);
  assertBindings(record, tier);
  return record;
}

/**
 * Read the compiled quality tier a validated package record was built from.
 *
 * @param {object} record One exact unpacked QuadV5 package record.
 * @returns {"high"|"medium"|"low"} The tier named by the package source path.
 */
export function getQuadV5PackageTier(record)
{
  validateQuadV5PackageRecord(record);
  const variant = record.variant ?? "static";
  const expectedStem = variant === "skinnedHeatDetail"
    ? "unpackedskinned_quadheatdetailv5"
    : (variant === "skinnedHeat"
      ? "unpackedskinned_quadheatv5"
      : (variant === "skinned" ? "unpackedskinned_quadv5" : "unpacked_quadv5"));
  return tierFromSource(normalizedPath(record.analysis?.source), expectedStem);
}

/**
 * Return the validated backend-local binding identities for the shared
 * semantic fixture resources.
 *
 * @param {object} record One exact unpacked QuadV5 package record.
 * @returns {{storage: object[], textures: object[], samplers: object[]}} Frozen resource plan.
 */
export function getQuadV5ResourcePlan(record)
{
  const tier = getQuadV5PackageTier(record);
  const layout = expectedLayout(record.backend, record.variant ?? "static", tier);
  return Object.freeze({
    tier,
    storage: Object.freeze(layout.storage),
    // Post-transform: what the bind group actually has slots for.
    textures: Object.freeze(layout.textures),
    samplers: Object.freeze(layout.samplers),
    // Pre-transform: what the reflection lists, including merged-away inputs.
    analysisResources: Object.freeze(layout.analysisResources),
    // The merges a caller must assemble before it can fill the bind group.
    transforms: Object.freeze(layout.transforms)
  });
}

/**
 * Validate the ordered, distinct DX11/DX12 records before claiming parity.
 *
 * @param {object[]} records Package records in DX11, DX12 order.
 * @returns {object[]} The validated input array.
 */
export function validateQuadV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  records.forEach(validateQuadV5PackageRecord);
  if (records[0].backend !== "dx11" || records[1].backend !== "dx12")
  {
    fail("comparison package order must be DX11 then DX12");
  }
  if ((records[0].variant ?? "static") !== (records[1].variant ?? "static"))
  {
    fail("comparison package variants must match");
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
  const shaderPayload = (record) => record.pipeline.shaderModules
    .slice()
    .sort((left, right) => left.stageName.localeCompare(right.stageName))
    .map((entry) => `${entry.stageName}:${entry.wgsl}`)
    .join("\n");
  if (shaderPayload(records[0]) === shaderPayload(records[1]))
  {
    fail("DX11 and DX12 packages contain identical WGSL payloads");
  }
  return records;
}

function identityMatrix()
{
  const result = new Float32Array(16);
  result[0] = 1;
  result[5] = 1;
  result[10] = 1;
  result[15] = 1;
  return result;
}

function identityMatrices(count)
{
  const result = new Float32Array(count * 16);
  for (let index = 0; index < count; index += 1)
  {
    result[index * 16] = 1;
    result[index * 16 + 5] = 1;
    result[index * 16 + 10] = 1;
    result[index * 16 + 15] = 1;
  }
  return result;
}

function zeros(count)
{
  return new Float32Array(count);
}

/**
 * Create explicit authored values for every field in the bounded Carbon
 * space-object Main ABI. They are not sourced from SOF, and no production
 * defaults are inferred.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @param {"high"|"medium"|"low"} [tier="medium"] Compiled quality tier.
 * @returns {object} Plain semantic fixture values.
 */
export function createQuadV5MainBindingValues(width, height, tier = "medium")
{
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)
  {
    throw new TypeError("QuadV5 fixture dimensions must be positive integers");
  }
  const viewInverseTranspose = identityMatrix();
  viewInverseTranspose[11] = 5;
  const sun = Object.freeze({
    DirWorld: [ 0.25, -0.35, 0.9027735 ],
    unused_pad0: 0,
    DiffuseColor: [ 1, 0.92, 0.78, 1 ]
  });
  // packMaterial is driven by the package's own reflected constant list and
  // requires a value for every entry, so the dust colors are authored only for
  // the tier that reflects them. A tier mismatch fails closed rather than
  // packing a hole.
  // White, to pair with the zero DustNoiseMap: whether the shader lerps toward
  // the dust color or scales by it, a zero mask over white leaves the surface
  // untouched, so the PPT and detail controls keep measuring what they name.
  const dust = tier === "high"
    ? {
      Mtl1DustDiffuseColor: [ 1, 1, 1, 1 ],
      Mtl2DustDiffuseColor: [ 1, 1, 1, 1 ],
      Mtl3DustDiffuseColor: [ 1, 1, 1, 1 ],
      Mtl4DustDiffuseColor: [ 1, 1, 1, 1 ]
    }
    : {};
  const material = Object.freeze({
    GeneralData: [ 1, 0, 0, 0 ],
    GeneralGlowColor: [ 0.08, 0.22, 0.7, 0 ],
    ...dust,
    Mtl1DiffuseColor: [ 0.15, 0.36, 0.72, 1 ],
    Mtl2DiffuseColor: [ 0.52, 0.16, 0.1, 1 ],
    Mtl3DiffuseColor: [ 0.12, 0.48, 0.34, 1 ],
    Mtl4DiffuseColor: [ 0.58, 0.52, 0.18, 1 ],
    Mtl1FresnelColor: [ 0.18, 0.3, 0.52, 1 ],
    Mtl2FresnelColor: [ 0.42, 0.18, 0.12, 1 ],
    Mtl3FresnelColor: [ 0.12, 0.36, 0.28, 1 ],
    Mtl4FresnelColor: [ 0.48, 0.42, 0.16, 1 ],
    Mtl1Gloss: [ 0.32, 0.58, 0, 0 ],
    Mtl2Gloss: [ 0.48, 0.72, 0, 0 ],
    Mtl3Gloss: [ 0.22, 0.46, 0, 0 ],
    Mtl4Gloss: [ 0.4, 0.64, 0, 0 ],
    PMtl1DiffuseColor: [ 0.34, 0.12, 0.5, 1 ],
    PMtl1FresnelColor: [ 0.3, 0.16, 0.44, 1 ],
    PMtl1Gloss: [ 0.36, 0.62, 0, 0 ],
    PMtl2DiffuseColor: [ 0.1, 0.44, 0.56, 1 ],
    PMtl2FresnelColor: [ 0.12, 0.34, 0.48, 1 ],
    PMtl2Gloss: [ 0.28, 0.54, 0, 0 ]
  });
  const perFrameVS = Object.freeze({
    ViewInverseTransposeMat: viewInverseTranspose,
    ViewProjectionMat: identityMatrix(),
    ViewMat: identityMatrix(),
    ProjectionMat: identityMatrix(),
    ShadowViewMat: identityMatrix(),
    ShadowViewProjectionMat: identityMatrix(),
    EnvMapRotationMat: identityMatrix(),
    ViewProjectionLast: identityMatrix(),
    ViewLast: identityMatrix(),
    ProjLast: identityMatrix(),
    Sun: sun,
    FogFactors: [ 0, 1, 0 ],
    pad: 0,
    TargetResolution: [ width, height ],
    FovXY: [ 1, 1 ],
    ViewportAdjustment: [ 1, 1, 0, 0 ],
    Time: 0,
    Upscaling: 1,
    ViewportSize: [ width, height ]
  });
  const perFramePS = Object.freeze({
    ViewInverseTransposeMat: viewInverseTranspose,
    ViewMat: identityMatrix(),
    EnvMapRotationMat: identityMatrix(),
    Sun: sun,
    AmbientColor: [ 0.12, 0.15, 0.22 ],
    ReflectionIntensity: 0.28,
    FogColor: [ 0, 0, 0, 0 ],
    ViewportOffset: [ 0, 0 ],
    ViewportSize: [ width, height ],
    TargetResolution: [ width, height ],
    DepthMapSampleCount: 1,
    Debug: 0,
    ShadowMapSettings: [ 1, 1, 0, 0 ],
    ShadowCameraRange: [ 0, 1 ],
    ShadowLightness: 1,
    ShadowQuality: 0,
    ProjectionToView: [ 1, 1 ],
    FovXY: [ 1, 1 ],
    Time: 0,
    SceneMipLodBias: 0,
    Upscaling: 1,
    GammaBrightness: 2,
    FrameIndex: 0,
    Jittering: 0,
    InverseShadowMapAtlasSize: 1,
    ShadowMapAtlasEntryMinSizeLog2: 0,
    VolumetricSlices: [ 0, 0, 0, 0 ],
    ShadowMapValues: identityMatrix(),
    ShadowMatrixVal: identityMatrices(16),
    SplitInfo: [ 0, 0, 0, 0 ],
    ProjectionInverseMat: identityMatrix(),
    CascadeRanges: zeros(64),
    FroxelFogData: Object.freeze({
      FogColor: [ 0, 0, 0 ],
      BackgroundVisibility: 1,
      BaseDensity: 0,
      MaxDistance: 0,
      MaxDistanceVisibility: 1,
      EnvironmentIntensity: 0,
      EnvironmentG: 0,
      _pad0: 0,
      _pad1: 0,
      _pad2: 0,
      planets: zeros(8)
    })
  });
  const perObjectVS = Object.freeze({
    worldTransform: identityMatrix(),
    worldTransformLast: identityMatrix(),
    invWorldTransform: identityMatrix(),
    shipData: [ 0, 1, 0, 0 ],
    clipData: [ 0, 0, 0, 0 ],
    ellpsoidRadii: [ 1, 1, 1, 0 ],
    ellpsoidCenter: [ 0, 0, 0, 0 ],
    customMaskMatrix: identityMatrices(2),
    customMaskData: zeros(8),
    boneOffsets: [ 0, 0, 1, 0 ],
    morphTargetVertexDataOffset: 0,
    morphTargetAnimationDataOffset: 0,
    activeMorphTargetsCount: 0,
    bakedMorphTargetVertexDataOffset: 0,
    customData: [ 0, 0, 0, 0 ]
  });
  const shLightingCoefficients = zeros(28);
  shLightingCoefficients[0] = 0.18;
  shLightingCoefficients[1] = 0.2;
  shLightingCoefficients[2] = 0.24;
  const perObjectPS = Object.freeze({
    worldTransform: identityMatrix(),
    worldTransformLast: identityMatrix(),
    invWorldTransform: identityMatrix(),
    shipData: [ 0, 1, 0, 0 ],
    clipSphereCenter: [ 0, 0, 0 ],
    clipRadiusSq: 0,
    clipRadius2Sq: 0,
    impactDataOffset: 0,
    clipSphereFactor2: 0,
    clipSphereFactor: 0,
    shLightingCoefficients,
    customMaskMaterialIDs: zeros(8),
    customMaskTargets: zeros(8),
    customMaskClamps: [ 0, 1, 0, 1 ],
    screenSize: [ width, height, 1 / width, 1 / height ],
    customData: [ 0, 0, 0, 0 ]
  });
  return Object.freeze({ material, perFrameVS, perFramePS, perObjectVS, perObjectPS });
}

function createHeatMaterial()
{
  return Object.freeze({
    GeneralData: [ 1, 0, 0, 0 ],
    Mtl1DiffuseColor: [ 0.15, 0.36, 0.72, 1 ],
    Mtl2DiffuseColor: [ 0.52, 0.16, 0.1, 1 ],
    Mtl3DiffuseColor: [ 0.12, 0.48, 0.34, 1 ],
    Mtl4DiffuseColor: [ 0.58, 0.52, 0.18, 1 ],
    Mtl1FresnelColor: [ 0.18, 0.3, 0.52, 1 ],
    Mtl2FresnelColor: [ 0.42, 0.18, 0.12, 1 ],
    Mtl3FresnelColor: [ 0.12, 0.36, 0.28, 1 ],
    Mtl4FresnelColor: [ 0.48, 0.42, 0.16, 1 ],
    Mtl1Gloss: [ 0.32, 0.58, 0, 0 ],
    Mtl2Gloss: [ 0.48, 0.72, 0, 0 ],
    Mtl3Gloss: [ 0.22, 0.46, 0, 0 ],
    Mtl4Gloss: [ 0.4, 0.64, 0, 0 ],
    PMtl1DiffuseColor: [ 0.34, 0.12, 0.5, 1 ],
    PMtl1FresnelColor: [ 0.3, 0.16, 0.44, 1 ],
    PMtl1Gloss: [ 0.36, 0.62, 0, 0 ],
    PMtl2DiffuseColor: [ 0.1, 0.44, 0.56, 1 ],
    PMtl2FresnelColor: [ 0.12, 0.34, 0.48, 1 ],
    PMtl2Gloss: [ 0.28, 0.54, 0, 0 ],
    Mtl1HeatGlowData: [ 1, 0.025, 4, 0.002 ],
    Mtl2HeatGlowData: [ 1, 0.005, 8, 0.0005 ],
    Mtl3HeatGlowData: [ 1, 0.025, 4, 0.002 ],
    Mtl4HeatGlowData: [ 1, 0.025, 4, 0.002 ],
    GeneralHeatGlowColor: [ 0.85, 0, 0, 1 ]
  });
}

function createHeatDetailMaterial(detailSelector)
{
  return Object.freeze({
    ...createHeatMaterial(),
    Detail1Data: [ 1, 1, 0.5, 0.2 ],
    Detail2Data: [ 1, 1, 0.5, 0.2 ],
    SecondaryDetail2Data: [ 1, 1, 0.5, 0.2 ],
    Detail3Data: [ 1, 1, 0.5, 0.2 ],
    DetailAlbedoColor: [ 0.32, 0.18, 0.08, 1 ],
    DetailFresnelColor: [ 0.24, 0.2, 0.16, 1 ],
    DetailSelector: detailSelector
  });
}

function createHeatBindingCase(base, heat)
{
  const shipData = Object.freeze([ heat, 1, 0, 0 ]);
  return Object.freeze({
    ...base,
    material: createHeatMaterial(),
    perObjectVS: Object.freeze({ ...base.perObjectVS, shipData }),
    perObjectPS: Object.freeze({ ...base.perObjectPS, shipData })
  });
}

function createHeatDetailBindingCase(base, heat, detailSelector)
{
  const shipData = Object.freeze([ heat, 1, 0, 0 ]);
  return Object.freeze({
    ...base,
    material: createHeatDetailMaterial(Object.freeze(detailSelector)),
    perObjectVS: Object.freeze({ ...base.perObjectVS, shipData }),
    perObjectPS: Object.freeze({ ...base.perObjectPS, shipData })
  });
}

/**
 * Create the ordered cold/hot cases used to isolate authored heat behavior in
 * the common PPT-on skinned QuadHeatV5 shader.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @returns {{caseNames: readonly string[], bindingValuesByCase: Readonly<Record<string, object>>}}
 * Frozen case names and exact reflected binding values keyed by case name.
 */
export function createQuadV5HeatBindingCases(width, height)
{
  const base = createQuadV5MainBindingValues(width, height);
  const caseNames = Object.freeze([ "cold", "hot" ]);
  const bindingValuesByCase = Object.freeze({
    cold: createHeatBindingCase(base, 0),
    hot: createHeatBindingCase(base, 1)
  });
  return Object.freeze({ caseNames, bindingValuesByCase });
}

/**
 * Create the three ordered authored material cases used to isolate surface,
 * detail, and heat-detail behavior in the skinned QuadHeatDetailV5 shader.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @returns {{caseNames: readonly string[], bindingValuesByCase: Readonly<Record<string, object>>}}
 * Frozen case names and exact reflected binding values keyed by case name.
 */
export function createQuadV5HeatDetailBindingCases(width, height)
{
  const base = createQuadV5MainBindingValues(width, height);
  const caseNames = Object.freeze([ "surface", "detail", "hotDetail" ]);
  const bindingValuesByCase = Object.freeze({
    surface: createHeatDetailBindingCase(base, 0, [ 0, 0, 0, 0 ]),
    detail: createHeatDetailBindingCase(base, 0, [ 1, 1, 0, 0 ]),
    hotDetail: createHeatDetailBindingCase(base, 1, [ 1, 1, 0, 0 ])
  });
  return Object.freeze({ caseNames, bindingValuesByCase });
}

function rgbaTexture(name, format, pixel)
{
  const width = 8;
  const height = 8;
  const bytesPerRow = width * 4;
  const data = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y += 1)
  {
    for (let x = 0; x < width; x += 1)
    {
      data.set(pixel(x, y), y * bytesPerRow + x * 4);
    }
  }
  return Object.freeze({ name, dimension: "2d", width, height, format, bytesPerRow, data });
}

function fixtureTextures(variant, tier)
{
  const heat = variant === "skinnedHeat";
  const heatDetail = variant === "skinnedHeatDetail";
  const strictHeat = heat || heatDetail;
  return Object.freeze([
    Object.freeze({
      name: "EveSpaceSceneEnvMap",
      dimension: "cube",
      width: 1,
      height: 1,
      depthOrArrayLayers: 6,
      format: "rgba8unorm-srgb",
      data: new Uint8Array([
        28, 45, 78, 255,
        36, 54, 88, 255,
        48, 66, 98, 255,
        18, 32, 62, 255,
        56, 72, 104, 255,
        22, 38, 70, 255
      ])
    }),
    rgbaTexture("SSAOMap", "rgba8unorm", () => [ 255, 255, 255, 255 ]),
    rgbaTexture("EveSpaceSceneShadowMap", "rgba8unorm", () => [ 255, 255, 255, 255 ]),
    rgbaTexture("NormalMap", "rgba8unorm", (x, y) => [
      112 + x * 4,
      112 + y * 4,
      248,
      255
    ]),
    rgbaTexture("GlowMap", "rgba8unorm", (x, y) => {
      const glow = (x === y || x + y === 7) ? 220 : ((x + y) % 3 === 0 ? 72 : 8);
      return [ glow, Math.floor(glow * 0.72), 255, 255 ];
    }),
    rgbaTexture("AlbedoMap", "rgba8unorm-srgb", (x, y) => [
      48 + x * 21,
      42 + y * 18,
      92 + ((x + y) % 4) * 26,
      255
    ]),
    rgbaTexture("RoughnessMap", "rgba8unorm", (x, y) => {
      const roughness = 56 + ((x * 3 + y * 5) % 8) * 22;
      return [ roughness, roughness, roughness, 255 ];
    }),
    rgbaTexture("MaterialMap", "rgba8unorm", (x, y) => [
      x < 4 ? 255 : 0,
      x >= 4 ? 255 : 0,
      y < 4 ? 128 : 32,
      255
    ]),
    rgbaTexture("PaintMaskMap", "rgba8unorm", (x, y) => [
      (x + y) % 4 === 0 ? 220 : 16,
      x > y ? 180 : 24,
      y > x ? 140 : 20,
      255
    ]),
    rgbaTexture("PatternMask1Map", "rgba8unorm", (x) => {
      const value = x % 2 === 0 ? 255 : 0;
      return [ value, value, value, 255 ];
    }),
    rgbaTexture("PatternMask2Map", "rgba8unorm", (_x, y) => {
      const value = y % 2 === 0 ? 0 : 255;
      return [ value, value, value, 255 ];
    }),
    ...(tier === "high" ? [
      // Neutral by construction. These two are bound so the High layout is
      // complete, but an authored dust/dirt appearance multiplies the surface
      // down far enough that the PPT and detail control deltas fall below one
      // RGBA8 LSB - the controls then measure quantization instead of shading.
      // Zero noise and clean dirt keep those oracles meaningful; what this proves
      // is that the bindings realize, not that the dust path was exercised.
      rgbaTexture("DustNoiseMap", "rgba8unorm", () => [ 0, 0, 0, 0 ]),
      rgbaTexture("DirtMap", "rgba8unorm", () => [ 255, 255, 255, 255 ]),
      // A genuinely layered texture read through a 2d-array view. The two layers
      // differ so a draw that collapsed the view to layer 0 would change the
      // rendered target rather than pass quietly.
      Object.freeze({
        name: "LightProfileArray",
        dimension: "2d-array",
        width: 1,
        height: 1,
        depthOrArrayLayers: 2,
        format: "rgba8unorm",
        data: new Uint8Array([
          255, 255, 255, 255,
          64, 96, 160, 255
        ])
      })
    ] : []),
    ...(strictHeat ? [
      rgbaTexture("HeatGlowNoiseMap", "rgba8unorm", (x, y) => [
        24 + ((x * 37 + y * 19) % 208),
        24 + ((x * 11 + y * 43) % 208),
        0,
        255
      ])
    ] : []),
    ...(heatDetail ? [
      rgbaTexture("Detail1Map", "rgba8unorm", (x, y) => [
        36 + x * 25,
        224 - y * 21,
        (x + y) % 2 ? 210 : 42,
        255
      ]),
      rgbaTexture("Detail2Map", "rgba8unorm", (x, y) => [
        (x + y) % 3 ? 58 : 232,
        40 + y * 24,
        216 - x * 19,
        255
      ])
    ] : [])
  ]);
}

/**
 * Create deterministic authored silhouette geometry and semantic texture inputs.
 * The silhouette is not an extracted EVE asset; it exercises the current
 * unpacked shader contract without reading SOF or inferring production
 * defaults.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @param {"static"|"skinned"|"skinnedHeat"|"skinnedHeatDetail"} [variant="static"] Fixture variant.
 * @param {"high"|"medium"|"low"} [tier="medium"] Compiled quality tier.
 * @returns {object} Typed-array fixture values.
 */
export function createQuadV5FixtureValues(width, height, variant = "static", tier = "medium")
{
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)
  {
    throw new TypeError("QuadV5 fixture dimensions must be positive integers");
  }
  const heat = variant === "skinnedHeat";
  const heatDetail = variant === "skinnedHeatDetail";
  if (variant !== "static" && variant !== "skinned" && !heat && !heatDetail)
  {
    throw new TypeError(
      "QuadV5 fixture variant must be static, skinned, skinnedHeat, or skinnedHeatDetail"
    );
  }
  if (tier !== "high" && tier !== "medium" && tier !== "low")
  {
    throw new TypeError("QuadV5 fixture tier must be high, medium, or low");
  }
  if (tier === "high" && variant !== "static")
  {
    throw new TypeError("QuadV5 High fixture values are only authored for the static variant");
  }
  const points = [
    [ 0, 0, 0.12 ],
    [ 0, 0.88, 0 ],
    [ 0.18, 0.46, 0.02 ],
    [ 0.76, 0.06, 0 ],
    [ 0.62, -0.2, 0 ],
    [ 0.22, -0.3, 0.03 ],
    [ 0.38, -0.72, 0 ],
    [ 0, -0.58, 0.02 ],
    [ -0.38, -0.72, 0 ],
    [ -0.22, -0.3, 0.03 ],
    [ -0.62, -0.2, 0 ],
    [ -0.76, 0.06, 0 ],
    [ -0.18, 0.46, 0.02 ]
  ];
  const vertices = new Float32Array(points.length * 16);
  for (let index = 0; index < points.length; index += 1)
  {
    const [ x, y, z ] = points[index];
    const uv = [ x * 0.5 + 0.5, 0.5 - y * 0.5 ];
    vertices.set([
      x, y, z,
      uv[0], uv[1],
      0, 0, 1,
      1, 0, 0,
      0, 1, 0,
      uv[0], uv[1]
    ], index * 16);
  }
  const indices = new Uint16Array(12 * 3);
  for (let edge = 0; edge < 12; edge += 1)
  {
    indices.set([ 0, edge + 1, edge === 11 ? 1 : edge + 2 ], edge * 3);
  }
  const boneIndices = new Uint16Array(points.length * 4);
  for (let index = 0; index < points.length; index += 1)
  {
    boneIndices[index * 4] = 1;
  }
  // The High forward-light bindings must be present and correctly sized, but
  // the LightBuffer row layout is Carbon's and is not reflected, so the fixture
  // declares zero active lights rather than authoring a struct it cannot verify.
  // What the draw proves is that all 25 bindings realize and bind, including the
  // 2d-array view; it does not claim to exercise light shading.
  const storageBuffers = tier === "high"
    ? Object.freeze([
      Object.freeze({
        name: "LightIndexBuffer",
        structureStride: 4,
        data: new Uint32Array([ 0 ])
      }),
      Object.freeze({
        name: "LightBuffer",
        structureStride: 48,
        data: new Float32Array(12)
      })
    ])
    : Object.freeze([]);
  const samplers = tier === "high" ? HIGH_SAMPLER_DESCRIPTORS : SAMPLER_DESCRIPTORS;
  return Object.freeze({
    vertices,
    boneIndices,
    indices,
    tier,
    textures: fixtureTextures(variant, tier),
    storageBuffers,
    samplers,
    samplerNames: Object.freeze(samplers.map((entry) => entry.name))
  });
}
