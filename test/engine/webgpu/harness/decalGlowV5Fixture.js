import {
  DECALV5_CLEAR_TARGET,
  DECALV5_TARGET_HEIGHT,
  DECALV5_TARGET_WIDTH,
  DECALV5_VERTEX_BUFFER_LAYOUT,
  createDecalV5FixtureValues
} from "./decalV5Fixture.js";
import { createQuadV5MainBindingValues } from "./quadV5Fixture.js";

const TARGET_BODY_INDEX = 0;
const PASS_STATES = Object.freeze([
  Object.freeze({ state: 14, value: 0 }),
  Object.freeze({ state: 15, value: 0 }),
  Object.freeze({ state: 19, value: 2 }),
  Object.freeze({ state: 20, value: 2 }),
  Object.freeze({ state: 27, value: 1 }),
  Object.freeze({ state: 171, value: 1 })
]);

export const DECAL_GLOW_V5_TARGET_WIDTH = DECALV5_TARGET_WIDTH;
export const DECAL_GLOW_V5_TARGET_HEIGHT = DECALV5_TARGET_HEIGHT;
export const DECAL_GLOW_V5_VERTEX_BUFFER_LAYOUT = DECALV5_VERTEX_BUFFER_LAYOUT;
export const DECAL_GLOW_V5_CLEAR_TARGET = DECALV5_CLEAR_TARGET;

export const DECAL_GLOW_V5_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_INSTANCED_ATTACHMENT: "SOIA_DISABLED"
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
  SPACE_OBJECT_INSTANCED_ATTACHMENT: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOIA_DISABLED"
  })
});

const UNIFORMS = Object.freeze([
  Object.freeze({ registerIndex: 0, binding: 0, visibility: "fragment", minBindingSize: 64 }),
  Object.freeze({ registerIndex: 1, binding: 1, visibility: "vertex", minBindingSize: 384 }),
  Object.freeze({ registerIndex: 2, binding: 2, visibility: "fragment", minBindingSize: 352 }),
  Object.freeze({ registerIndex: 3, binding: 3, visibility: "vertex", minBindingSize: 320 }),
  Object.freeze({ registerIndex: 4, binding: 4, visibility: "fragment", minBindingSize: 32 })
].map((entry) => Object.freeze({
  ...entry,
  identity: `uniform-buffer:0:${entry.registerIndex}`,
  scopeIdentity: `uniform-buffer:0:${entry.registerIndex}@${entry.visibility}`
})));

const MATERIAL_LAYOUT = Object.freeze({
  dx11: Object.freeze([
    Object.freeze({ name: "DecalTextureScaling", offset: 0 }),
    Object.freeze({ name: "DecalTextureOffset", offset: 16 }),
    Object.freeze({ name: "DecalIntensityData", offset: 32 }),
    Object.freeze({ name: "DecalGlowColor", offset: 48 })
  ]),
  dx12: Object.freeze([
    Object.freeze({ name: "DecalGlowColor", offset: 0 }),
    Object.freeze({ name: "DecalTextureScaling", offset: 16 }),
    Object.freeze({ name: "DecalTextureOffset", offset: 32 }),
    Object.freeze({ name: "DecalIntensityData", offset: 48 })
  ])
});

const TEXTURES = Object.freeze([
  Object.freeze({
    name: "DecalTransparencyMap",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@fragment",
    registerIndex: 0,
    binding: 5,
    viewDimension: "2d"
  }),
  Object.freeze({
    name: "DecalGlowMap",
    identity: "sampled-resource:0:1",
    scopeIdentity: "sampled-resource:0:1@fragment",
    registerIndex: 1,
    binding: 6,
    viewDimension: "2d"
  })
]);

const SAMPLERS = Object.freeze([
  Object.freeze({
    name: "DecalTransparencySampler",
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    registerIndex: 0,
    binding: 7,
    addressU: 4,
    addressV: 4
  }),
  Object.freeze({
    name: "DecalGlowSampler",
    identity: "sampler:0:1",
    scopeIdentity: "sampler:0:1@fragment",
    registerIndex: 1,
    binding: 8,
    addressU: 1,
    addressV: 1
  })
]);

function fail(message)
{
  throw new Error(`DecalGlowV5 fixture: ${message}`);
}

function normalizedPath(value)
{
  return typeof value === "string" ? value.replace(/\\/gu, "/").toLowerCase() : "";
}

function assertSelections(options, owner)
{
  if (!Array.isArray(options) || options.length !== Object.keys(DECAL_GLOW_V5_SELECTION).length)
  {
    fail(`${owner} must contain every DecalGlowV5 permutation selection`);
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
  for (const [ name, value ] of Object.entries(DECAL_GLOW_V5_SELECTION))
  {
    const entry = selected.get(name);
    const provenance = SELECTION_PROVENANCE[name];
    if (!entry) fail(`${owner} is missing ${name}`);
    if (entry.value !== value) fail(`${owner} requires ${name}=${value}`);
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

function assertBindingSlot(binding, expected, layoutKind, visibility)
{
  if (!binding || binding.identity !== expected.identity
    || binding.scopeIdentity !== expected.scopeIdentity
    || binding.registerSpace !== 0 || binding.registerIndex !== expected.registerIndex
    || binding.sourceTruth !== "wgsl-layout" || binding.group !== 0
    || binding.binding !== expected.binding || binding.dynamic !== false
    || !Array.isArray(binding.visibility) || binding.visibility.length !== 1
    || binding.visibility[0] !== visibility)
  {
    fail(`${expected.identity} has an unexpected slot, scope, register, or visibility`);
  }
  const layouts = Object.keys(binding.layout || {}).filter(
    (key) => [ "buffer", "texture", "sampler" ].includes(key) && binding.layout[key]
  );
  if (layouts.length !== 1 || layouts[0] !== layoutKind)
  {
    fail(`${expected.identity} has an unexpected layout kind`);
  }
}

function assertPipelineInputs(record)
{
  const stages = record.analysis?.stages;
  if (!Array.isArray(stages) || stages.length !== 2)
  {
    fail("analysis must contain exactly the Main.pass0 vertex/pixel stage pair");
  }
  const vertex = stages.filter((stage) =>
    stage?.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "vertex");
  const pixel = stages.filter((stage) =>
    stage?.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "pixel");
  if (vertex.length !== 1 || pixel.length !== 1)
  {
    fail("analysis must contain exactly one Main.pass0 vertex/pixel stage pair");
  }
  const activeVertex = (vertex[0].pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map(({ registerIndex, dimension, type }) => ({ registerIndex, dimension, type }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
  const expectedVertex = [
    { registerIndex: 0, dimension: 3, type: 0 },
    { registerIndex: 2, dimension: 2, type: 0 },
    { registerIndex: 3, dimension: 3, type: 0 },
    { registerIndex: 4, dimension: 3, type: 0 },
    { registerIndex: 5, dimension: 3, type: 0 }
  ];
  if (JSON.stringify(activeVertex) !== JSON.stringify(expectedVertex))
  {
    fail("Main.pass0.vertex has an unexpected active input contract");
  }
  const activePixel = (pixel[0].pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map(({ registerIndex, usedMask, dimension, type }) =>
      ({ registerIndex, usedMask, dimension, type }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
  const expectedPixel = [
    { registerIndex: 1, usedMask: 12, dimension: 4, type: 0 },
    { registerIndex: 5, usedMask: 8, dimension: 4, type: 0 }
  ];
  if (JSON.stringify(activePixel) !== JSON.stringify(expectedPixel))
  {
    fail("Main.pass0.pixel has an unexpected active input contract");
  }
}

function assertPassContract(record)
{
  const passes = record.analysis?.passes;
  if (!Array.isArray(passes) || passes.length !== 1
    || passes[0]?.techniqueName !== "Main" || passes[0].passIndex !== 0
    || passes[0].renderStates !== 1
    || JSON.stringify(passes[0].states) !== JSON.stringify(PASS_STATES))
  {
    fail("analysis must contain the exact canonical Main.pass0 render states");
  }
  if (record.pipeline?.renderStates !== 1
    || JSON.stringify(record.pipeline.states) !== JSON.stringify(PASS_STATES))
  {
    fail("pipeline must retain the exact canonical Main.pass0 render states");
  }
}

function assertShaderModules(record)
{
  const modules = record.pipeline?.shaderModules;
  if (!Array.isArray(modules) || modules.length !== 2)
  {
    fail("Main.pass0 requires exactly vertex and pixel modules");
  }
  for (const stageName of [ "vertex", "pixel" ])
  {
    const matches = modules.filter((entry) => entry?.stageName === stageName);
    const module = matches[0];
    if (matches.length !== 1 || typeof module.wgsl !== "string" || !module.wgsl
      || module.key !== `Main.pass0.${stageName}`
      || module.techniqueName !== "Main" || module.passIndex !== 0
      || module.stageType !== (stageName === "vertex" ? 0 : 1)
      || module.entryPoint !== "main" || module.threadGroupSize !== null)
    {
      fail(`Main.pass0 requires one complete ${stageName} module`);
    }
    const inputLocations = Array.from(
      module.wgsl.matchAll(/@location\((\d+)\)\s+input\d+:/gu),
      (match) => Number(match[1])
    ).sort((left, right) => left - right);
    if (stageName === "vertex")
    {
      if (JSON.stringify(inputLocations) !== JSON.stringify([ 0, 2, 3, 4, 5 ]))
      {
        fail("vertex WGSL has an unexpected input-location contract");
      }
    }
    else if (JSON.stringify(inputLocations) !== JSON.stringify([ 1, 5 ])
      || !/@location\(0\)\s+output0:/u.test(module.wgsl)
      || /@location\([1-9]\d*\)\s+output\d+:/u.test(module.wgsl))
    {
      fail("pixel WGSL must expose the exact DecalGlowV5 input/output interface");
    }
  }
}

function assertMaterialReflection(binding, backend)
{
  const carbon = binding?.carbon;
  const constants = carbon?.constants;
  const expected = MATERIAL_LAYOUT[backend];
  if (carbon?.hasLocalConstants !== true || carbon.constantValueSize !== 64
    || !Array.isArray(constants) || constants.length !== expected.length)
  {
    fail("cb0 has an unexpected reflected material layout");
  }
  constants.forEach((constant, index) =>
  {
    const layout = expected[index];
    if (constant.name !== layout.name || constant.offset !== layout.offset
      || constant.size !== 16 || constant.type !== 0
      || constant.dimension !== 4 || constant.elements !== 0
      || constant.isSRGB !== false || constant.isAutoregister !== false)
    {
      fail(`cb0 material constant ${layout.name} has an unexpected reflected layout`);
    }
  });
}

function assertStaticSampler(binding, expected)
{
  const state = binding?.carbon?.sampler;
  if (!state || state.comparison !== false
    || state.minFilter !== 3 || state.magFilter !== 2 || state.mipFilter !== 2
    || state.addressU !== expected.addressU || state.addressV !== expected.addressV
    || state.addressW !== 3 || state.mipLODBias !== -0.75
    || state.maxAnisotropy !== 16 || state.comparisonFunc !== 1
    || JSON.stringify(state.borderColor) !== JSON.stringify([ 0, 0, 0, 0 ])
    || state.minLOD !== -3.4028234663852886e+38
    || state.maxLOD !== 3.4028234663852886e+38
    || state.isDynamic !== false)
  {
    fail(`${expected.identity} has unexpected static sampler state`);
  }
}

function assertAnalysisBindings(record)
{
  const stages = record.analysis?.stages;
  const vertex = stages?.filter((stage) =>
    stage?.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "vertex");
  const pixel = stages?.filter((stage) =>
    stage?.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "pixel");
  if (!Array.isArray(vertex) || vertex.length !== 1
    || !Array.isArray(pixel) || pixel.length !== 1)
  {
    fail("analysis must contain one Main.pass0 vertex/pixel pair");
  }
  for (const expected of UNIFORMS)
  {
    const stage = expected.visibility === "vertex" ? vertex[0] : pixel[0];
    const matches = (stage.bindings || []).filter((entry) =>
      entry?.kind === "constantBuffer" && entry.registerSpace === 0
      && entry.registerIndex === expected.registerIndex);
    if (matches.length !== 1) fail(`${expected.identity} has unexpected reflection`);
    if (expected.registerIndex === 0) assertMaterialReflection(matches[0], record.backend);
    else if (matches[0].carbon?.hasLocalConstants !== false)
    {
      fail(`${expected.identity} has unexpected local constants`);
    }
  }
  for (const expected of TEXTURES)
  {
    const resources = (pixel[0].bindings || []).filter((entry) =>
      entry?.kind === "resource" && entry.registerSpace === 0
      && entry.registerIndex === expected.registerIndex);
    const carbon = resources[0]?.carbon;
    if (resources.length !== 1 || carbon?.name !== expected.name
      || carbon.type !== 2 || carbon.arrayElements !== 1
      || carbon.isSRGB !== false || carbon.isAutoregister !== false)
    {
      fail(`${expected.identity} must reflect ${expected.name}`);
    }
  }
  const samplers = (pixel[0].bindings || []).filter((entry) =>
    entry?.kind === "sampler" && entry.registerSpace === 0);
  // Asserted for both backends; the DX12 early return skipped every check below.
  if (samplers.length !== SAMPLERS.length)
  {
    fail("DecalGlowV5 must reflect both static samplers");
  }
  for (const expected of SAMPLERS)
  {
    const matches = samplers.filter((entry) => entry.registerIndex === expected.registerIndex);
    if (matches.length !== 1) fail(`${expected.identity} has unexpected reflection`);
    assertStaticSampler(matches[0], expected);
  }
}

function assertBindings(record)
{
  const groups = record.pipeline?.bindGroups;
  if (!Array.isArray(groups) || groups.length !== 1 || groups[0]?.group !== 0)
  {
    fail("Main.pass0 requires exactly canonical bind group 0");
  }
  const bindings = groups[0].bindings;
  if (!Array.isArray(bindings) || bindings.length !== 9)
  {
    fail("Main.pass0 must contain five uniforms, two textures, and two samplers");
  }
  const byScope = new Map(bindings.map((entry) => [ entry.scopeIdentity, entry ]));
  if (byScope.size !== bindings.length) fail("Main.pass0 contains duplicate binding scopes");
  for (const expected of UNIFORMS)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "buffer", expected.visibility);
    if (binding.resourceKind !== "uniform-buffer"
      || binding.layout.buffer.type !== "uniform"
      || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== expected.minBindingSize)
    {
      fail(`${expected.identity} has an unexpected uniform-buffer layout`);
    }
  }
  for (const expected of TEXTURES)
  {
    const texture = byScope.get(expected.scopeIdentity);
    assertBindingSlot(texture, expected, "texture", "fragment");
    if (texture.resourceKind !== "sampled-resource"
      || texture.layout.texture.sampleType !== "float"
      || texture.layout.texture.viewDimension !== expected.viewDimension
      || texture.layout.texture.multisampled !== false)
    {
      fail(`${expected.identity} has an unexpected texture layout`);
    }
  }
  for (const expected of SAMPLERS)
  {
    const sampler = byScope.get(expected.scopeIdentity);
    assertBindingSlot(sampler, expected, "sampler", "fragment");
    if (sampler.resourceKind !== "sampler" || sampler.layout.sampler.type !== "filtering")
    {
      fail(`${expected.identity} has an unexpected sampler layout`);
    }
  }
  assertAnalysisBindings(record);
}

/** Fail closed unless a record is the default non-bindless DecalGlowV5 Main pass. */
export function validateDecalGlowV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
  if (record.backend !== "dx11" && record.backend !== "dx12")
  {
    fail("package backend must be dx11 or dx12");
  }
  const source = normalizedPath(record.analysis?.source);
  const metadataSource = normalizedPath(record.metadata?.sourcePath);
  const expectedSuffix =
    `/effect.${record.backend}/managed/space/decals/v5/unpacked_decalglowv5.sm_hi`;
  if (!source || source !== metadataSource || !source.endsWith(expectedSuffix))
  {
    fail(`package source provenance must be canonical ${record.backend} unpacked_decalglowv5`);
  }
  if (record.analysis?.bodyIndex !== TARGET_BODY_INDEX
    || record.metadata?.bodyIndex !== TARGET_BODY_INDEX)
  {
    fail(`package must resolve body index ${TARGET_BODY_INDEX}`);
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions");
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions");
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
    || !selection.selectedStageKeys.includes("Main.pass0.vertex")
    || !selection.selectedStageKeys.includes("Main.pass0.pixel"))
  {
    fail("package selection must be the complete Main.pass0 vertex/pixel pair");
  }
  if (record.pipeline?.techniqueName !== "Main" || record.pipeline.passIndex !== 0)
  {
    fail("pipeline must be Main.pass0");
  }
  assertPassContract(record);
  assertPipelineInputs(record);
  assertShaderModules(record);
  assertBindings(record);
  return record;
}

/** Return the validated semantic texture and sampler identities. */
export function getDecalGlowV5ResourcePlan(record)
{
  validateDecalGlowV5PackageRecord(record);
  return Object.freeze({
    textures: TEXTURES,
    samplers: SAMPLERS
  });
}

/** Validate an ordered, distinct DX11/DX12 package pair before comparison. */
export function validateDecalGlowV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  records.forEach(validateDecalGlowV5PackageRecord);
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
  const payload = (record) => record.pipeline.shaderModules
    .slice()
    .sort((left, right) => left.stageName.localeCompare(right.stageName))
    .map((entry) => `${entry.stageName}:${entry.wgsl}`)
    .join("\n");
  if (payload(records[0]) === payload(records[1]))
  {
    fail("DX11 and DX12 packages contain identical WGSL payloads");
  }
  return records;
}

function rgbaTexture(name, pixel)
{
  const width = 8;
  const height = 8;
  const bytesPerRow = width * 4;
  const data = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y += 1)
  {
    for (let x = 0; x < width; x += 1)
    {
      const value = pixel(x, y);
      data.set([ value, value, value, 255 ], y * bytesPerRow + x * 4);
    }
  }
  return Object.freeze({
    name,
    dimension: "2d",
    width,
    height,
    format: "rgba8unorm",
    bytesPerRow,
    data
  });
}

/**
 * Create semantic scene/object values, two authored glow textures, and the
 * active DecalVS/DecalPS register payloads consumed by DecalGlowV5.
 */
export function createDecalGlowV5FixtureValues(width, height)
{
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)
  {
    throw new TypeError("DecalGlowV5 fixture dimensions must be positive integers");
  }
  const base = createDecalV5FixtureValues(width, height);
  const scene = createQuadV5MainBindingValues(width, height);
  const decalVS = new Float32Array(384 / 4);
  for (let matrix = 0; matrix < 6; matrix += 1)
  {
    const offset = matrix * 16;
    decalVS[offset] = 1;
    decalVS[offset + 5] = 1;
    decalVS[offset + 10] = 1;
    decalVS[offset + 15] = 1;
  }
  // The shader reads decal visibility from displayData.y and ship activation
  // strength from shipData.y in the active DecalPSPerObjectData prefix.
  const decalPS = new Float32Array([
    0, 1, 0, 0,
    0, 1, 0, 0
  ]);
  return Object.freeze({
    vertices: base.vertices,
    indices: base.indices,
    bindingValues: Object.freeze({
      ...scene,
      perFramePS: Object.freeze({
        ...scene.perFramePS,
        Time: 1,
        GammaBrightness: 1
      }),
      material: Object.freeze({
        DecalTextureScaling: [ -0.25, -0.375, 0.31, 0 ],
        DecalTextureOffset: [ 0.61, 0.47, 0, 0 ],
        DecalIntensityData: [ 0.85, 0, 0, 0 ],
        DecalGlowColor: [ 0.78, 0.31, 0.09, 1 ]
      })
    }),
    decalUniformData: Object.freeze({
      "uniform-buffer:0:3@vertex": new Uint8Array(decalVS.buffer),
      "uniform-buffer:0:4@fragment": new Uint8Array(decalPS.buffer)
    }),
    textures: Object.freeze([
      rgbaTexture(
        "DecalTransparencyMap",
        (x, y) => x === 0 || x === 7 || y === 0 || y === 7
          ? 0
          : 48 + 20 * x + 4 * ((x + 2 * y) & 3)
      ),
      rgbaTexture(
        "DecalGlowMap",
        (x, y) => 224 - 16 * y - 8 * ((3 * x + y) & 3)
      ),
      rgbaTexture("WhiteDecalTransparencyMap", () => 255),
      rgbaTexture("WhiteDecalGlowMap", () => 255)
    ]),
    textureResourceVariants: Object.freeze({
      base: Object.freeze({}),
      whiteTransparency: Object.freeze({
        DecalTransparencyMap: "WhiteDecalTransparencyMap"
      }),
      whiteGlow: Object.freeze({
        DecalGlowMap: "WhiteDecalGlowMap"
      })
    }),
    samplers: Object.freeze([
      Object.freeze({
        name: "DecalTransparencySampler",
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        addressModeW: "clamp-to-edge",
        maxAnisotropy: 16
      }),
      Object.freeze({
        name: "DecalGlowSampler",
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "clamp-to-edge",
        maxAnisotropy: 16
      })
    ]),
    samplerNames: Object.freeze([
      "DecalTransparencySampler",
      "DecalGlowSampler"
    ])
  });
}
