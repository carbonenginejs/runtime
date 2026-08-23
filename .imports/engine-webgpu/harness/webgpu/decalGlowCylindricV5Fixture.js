import {
  DECAL_GLOW_V5_CLEAR_TARGET,
  DECAL_GLOW_V5_TARGET_HEIGHT,
  DECAL_GLOW_V5_TARGET_WIDTH,
  DECAL_GLOW_V5_VERTEX_BUFFER_LAYOUT,
  createDecalGlowV5FixtureValues
} from "./decalGlowV5Fixture.js";

const TARGET_BODY_INDEX = 0;
const PASS_STATES = Object.freeze([
  Object.freeze({ state: 14, value: 0 }),
  Object.freeze({ state: 15, value: 0 }),
  Object.freeze({ state: 19, value: 2 }),
  Object.freeze({ state: 20, value: 2 }),
  Object.freeze({ state: 27, value: 1 }),
  Object.freeze({ state: 171, value: 1 })
]);

export const DECAL_GLOW_CYLINDRIC_V5_TARGET_WIDTH = DECAL_GLOW_V5_TARGET_WIDTH;
export const DECAL_GLOW_CYLINDRIC_V5_TARGET_HEIGHT = DECAL_GLOW_V5_TARGET_HEIGHT;
export const DECAL_GLOW_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT =
  DECAL_GLOW_V5_VERTEX_BUFFER_LAYOUT;
export const DECAL_GLOW_CYLINDRIC_V5_CLEAR_TARGET = DECAL_GLOW_V5_CLEAR_TARGET;

export const DECAL_GLOW_CYLINDRIC_V5_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_INSTANCED_ATTACHMENT: "SOIA_DISABLED"
});

const UNIFORMS = Object.freeze([
  Object.freeze({ registerIndex: 0, binding: 0, visibility: "fragment", minBindingSize: 64 }),
  Object.freeze({ registerIndex: 1, binding: 1, visibility: "vertex", minBindingSize: 384 }),
  Object.freeze({ registerIndex: 2, binding: 2, visibility: "fragment", minBindingSize: 352 }),
  Object.freeze({ registerIndex: 3, binding: 3, visibility: "vertex", minBindingSize: 320 }),
  Object.freeze({ registerIndex: 4, binding: 4, visibility: "fragment", minBindingSize: 32 })
].map((entry) => Object.freeze({
  ...entry,
  resourceKind: "uniform-buffer",
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
    registerIndex: 0,
    binding: 5,
    resourceKind: "sampled-resource",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@fragment"
  }),
  Object.freeze({
    name: "DecalGlowMap",
    registerIndex: 1,
    binding: 6,
    resourceKind: "sampled-resource",
    identity: "sampled-resource:0:1",
    scopeIdentity: "sampled-resource:0:1@fragment"
  })
]);

const SAMPLER = Object.freeze({
  name: "Sampler0",
  registerIndex: 0,
  binding: 7,
  resourceKind: "sampler",
  identity: "sampler:0:0",
  scopeIdentity: "sampler:0:0@fragment"
});

function fail(message)
{
  throw new Error(`DecalGlowCylindricV5 fixture: ${message}`);
}

function normalizedPath(value)
{
  return typeof value === "string" ? value.replace(/\\/gu, "/").toLowerCase() : "";
}

function same(left, right)
{
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertSelections(options, owner)
{
  const expected = Object.entries(DECAL_GLOW_CYLINDRIC_V5_SELECTION);
  if (!Array.isArray(options) || options.length !== expected.length)
  {
    fail(`${owner} must contain every DecalGlowCylindricV5 selection`);
  }
  const selected = new Map(options.map((entry) => [ entry?.name, entry ]));
  if (selected.size !== options.length) fail(`${owner} has malformed or duplicate selections`);
  for (const [ name, value ] of expected)
  {
    const entry = selected.get(name);
    // `source` is build-time policy (who chose the value), not container
    // data; see quadV5Fixture.js. It cannot survive a read back from bytes.
    if (!entry || entry.value !== value || entry.optionIndex !== 0
      || entry.defaultOption !== 0 || entry.defaultValue !== value)
    {
      fail(`${owner} has unexpected ${name} provenance`);
    }
  }
}

function activeInputs(stage)
{
  return (stage.pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map(({ registerIndex, usedMask, dimension, type }) =>
      ({ registerIndex, usedMask, dimension, type }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
}

function assertPassAndStages(record)
{
  const passes = record.analysis?.passes;
  if (!Array.isArray(passes) || passes.length !== 1
    || passes[0]?.techniqueName !== "Main" || passes[0].passIndex !== 0
    || passes[0].renderStates !== 1 || !same(passes[0].states, PASS_STATES)
    || record.pipeline?.key !== "Main.pass0"
    || record.pipeline.techniqueName !== "Main" || record.pipeline.passIndex !== 0
    || record.pipeline.renderStates !== 1 || !same(record.pipeline.states, PASS_STATES))
  {
    fail("package must retain the exact canonical Main.pass0 render states");
  }
  const stages = record.analysis?.stages;
  if (!Array.isArray(stages) || stages.length !== 2)
  {
    fail("analysis must contain exactly the Main.pass0 vertex/pixel pair");
  }
  const vertex = stages.filter((stage) =>
    stage?.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "vertex");
  const pixel = stages.filter((stage) =>
    stage?.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "pixel");
  if (vertex.length !== 1 || pixel.length !== 1)
  {
    fail("analysis must contain one Main.pass0 vertex/pixel pair");
  }
  const inactiveThreadGroupSize = { x: 0, y: 0, z: 0 };
  if (vertex[0].key !== "Main.pass0.vertex" || vertex[0].stageType !== 0
    || !same(vertex[0].threadGroupSize, inactiveThreadGroupSize)
    || pixel[0].key !== "Main.pass0.pixel" || pixel[0].stageType !== 1
    || !same(pixel[0].threadGroupSize, inactiveThreadGroupSize))
  {
    fail("analysis has unexpected stage key, type, or thread-group metadata");
  }
  const expectedVertex = [
    { registerIndex: 0, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 2, usedMask: 3, dimension: 2, type: 0 },
    { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 5, usedMask: 7, dimension: 3, type: 0 }
  ];
  const expectedPixel = [
    { registerIndex: 1, usedMask: 12, dimension: 4, type: 0 },
    { registerIndex: 5, usedMask: 8, dimension: 4, type: 0 },
    { registerIndex: 8, usedMask: 8, dimension: 4, type: 0 }
  ];
  if (!same(activeInputs(vertex[0]), expectedVertex))
  {
    fail("Main.pass0.vertex has an unexpected active input contract");
  }
  if (!same(activeInputs(pixel[0]), expectedPixel))
  {
    fail("Main.pass0.pixel has an unexpected active cylindrical input contract");
  }
  return { vertex: vertex[0], pixel: pixel[0] };
}

function wgslLocations(wgsl, direction)
{
  return Array.from(
    wgsl.matchAll(new RegExp(`@location\\((\\d+)\\)\\s+${direction}\\d+:`, "gu")),
    (match) => Number(match[1])
  ).sort((left, right) => left - right);
}

function assertShaderModules(record)
{
  const modules = record.pipeline?.shaderModules;
  if (!Array.isArray(modules) || modules.length !== 2)
  {
    fail("pipeline requires exactly two shader modules");
  }
  for (const [ stageName, stageType, inputs, outputs ] of [
    [ "vertex", 0, [ 0, 2, 3, 4, 5 ], [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ] ],
    [ "pixel", 1, [ 1, 5, 8 ], [ 0 ] ]
  ])
  {
    const matches = modules.filter((module) => module?.stageName === stageName);
    const module = matches[0];
    if (matches.length !== 1 || module.key !== `Main.pass0.${stageName}`
      || module.techniqueName !== "Main" || module.passIndex !== 0
      || module.stageType !== stageType || module.entryPoint !== "main"
      || module.threadGroupSize !== null || typeof module.wgsl !== "string"
      || !same(wgslLocations(module.wgsl, "input"), inputs)
      || !same(wgslLocations(module.wgsl, "output"), outputs))
    {
      fail(`Main.pass0 has an unexpected ${stageName} module interface`);
    }
    if (stageName === "pixel" && !/@location\(8\)\s+input8:/u.test(module.wgsl))
    {
      fail("pixel WGSL must expose the exact cylindrical input/output interface");
    }
  }
}

function assertPipelineBinding(binding, expected)
{
  if (!binding || binding.sourceTruth !== "wgsl-layout"
    || binding.resourceKind !== expected.resourceKind
    || binding.identity !== expected.identity
    || binding.scopeIdentity !== expected.scopeIdentity
    || binding.registerSpace !== 0 || binding.registerIndex !== expected.registerIndex
    || binding.group !== 0 || binding.binding !== expected.binding
    || binding.dynamic !== false || !same(binding.visibility, [ expected.visibility ?? "fragment" ]))
  {
    fail(`${expected.identity} has an unexpected canonical binding slot`);
  }
  if (expected.resourceKind === "uniform-buffer")
  {
    if (binding.layout?.buffer?.type !== "uniform"
      || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== expected.minBindingSize
      || binding.layout.texture !== null || binding.layout.sampler !== null)
    {
      fail(`${expected.identity} has an unexpected uniform layout`);
    }
  }
  else if (expected.resourceKind === "sampled-resource")
  {
    if (binding.layout?.texture?.sampleType !== "float"
      || binding.layout.texture.viewDimension !== "2d"
      || binding.layout.texture.multisampled !== false
      || binding.layout.buffer !== null || binding.layout.sampler !== null)
    {
      fail(`${expected.identity} has an unexpected texture layout`);
    }
  }
  else if (binding.layout?.sampler?.type !== "filtering"
    || binding.layout.buffer !== null || binding.layout.texture !== null)
  {
    fail(`${expected.identity} has an unexpected sampler layout`);
  }
}

function assertMaterial(binding, backend)
{
  const carbon = binding?.carbon;
  const expected = MATERIAL_LAYOUT[backend];
  if (carbon?.hasLocalConstants !== true || carbon.constantValueSize !== 64
    || !Array.isArray(carbon.constants) || carbon.constants.length !== expected.length)
  {
    fail("cb0 has an unexpected reflected material layout");
  }
  carbon.constants.forEach((constant, index) =>
  {
    const layout = expected[index];
    if (constant.name !== layout.name || constant.offset !== layout.offset
      || constant.size !== 16 || constant.type !== 0 || constant.dimension !== 4
      || constant.elements !== 0 || constant.isSRGB !== false
      || constant.isAutoregister !== false)
    {
      fail(`cb0 material constant ${layout.name} has an unexpected layout`);
    }
  });
}

function assertSampler(binding)
{
  const state = binding?.carbon?.sampler;
  if (!state || state.comparison !== false
    || state.minFilter !== 3 || state.magFilter !== 2 || state.mipFilter !== 2
    || state.addressU !== 1 || state.addressV !== 1 || state.addressW !== 3
    || state.mipLODBias !== -0.75 || state.maxAnisotropy !== 16
    || state.comparisonFunc !== 1 || !same(state.borderColor, [ 0, 0, 0, 0 ])
    || state.minLOD !== -3.4028234663852886e+38
    || state.maxLOD !== 3.4028234663852886e+38 || state.isDynamic !== false)
  {
    fail("sampler:0:0 has unexpected static wrap state");
  }
}

function assertReflection(record, stages)
{
  if (!Array.isArray(stages.vertex.bindings) || stages.vertex.bindings.length !== 2)
  {
    fail("vertex reflection must contain only cb1 and cb3");
  }
  for (const registerIndex of [ 1, 3 ])
  {
    const matches = stages.vertex.bindings.filter((binding) =>
      binding?.kind === "constantBuffer" && binding.registerSpace === 0
      && binding.registerIndex === registerIndex);
    if (matches.length !== 1 || matches[0].carbon?.hasLocalConstants !== false)
    {
      fail(`uniform-buffer:0:${registerIndex} has unexpected vertex reflection`);
    }
  }
  // Both backends reflect the same samplers now, so the count no longer splits.
  const expectedPixelCount = 6;
  if (!Array.isArray(stages.pixel.bindings)
    || stages.pixel.bindings.length !== expectedPixelCount)
  {
    fail("pixel reflection has an unexpected binding count");
  }
  for (const registerIndex of [ 0, 2, 4 ])
  {
    const matches = stages.pixel.bindings.filter((binding) =>
      binding?.kind === "constantBuffer" && binding.registerSpace === 0
      && binding.registerIndex === registerIndex);
    if (matches.length !== 1) fail(`uniform-buffer:0:${registerIndex} has unexpected reflection`);
    if (registerIndex === 0) assertMaterial(matches[0], record.backend);
    else if (matches[0].carbon?.hasLocalConstants !== false)
    {
      fail(`uniform-buffer:0:${registerIndex} has unexpected local constants`);
    }
  }
  for (const expected of TEXTURES)
  {
    const matches = stages.pixel.bindings.filter((binding) =>
      binding?.kind === "resource" && binding.registerSpace === 0
      && binding.registerIndex === expected.registerIndex);
    const carbon = matches[0]?.carbon;
    if (matches.length !== 1 || carbon?.name !== expected.name || carbon.type !== 2
      || carbon.arrayElements !== 1 || carbon.isSRGB !== false
      || carbon.isAutoregister !== false)
    {
      fail(`${expected.identity} has unexpected Carbon reflection`);
    }
  }
  const samplers = stages.pixel.bindings.filter((binding) =>
    binding?.kind === "sampler" && binding.registerSpace === 0);
  // Asserted for both backends; the DX12 branch skipped these entirely.
  {
    if (samplers.length !== 1 || samplers[0].registerIndex !== 0)
    {
      fail("must reflect exactly the shared s0 sampler");
    }
    assertSampler(samplers[0]);
  }
}

function assertBindings(record, stages)
{
  const groups = record.pipeline?.bindGroups;
  if (!Array.isArray(groups) || groups.length !== 1 || groups[0]?.group !== 0
    || !Array.isArray(groups[0].bindings) || groups[0].bindings.length !== 8)
  {
    fail("Main.pass0 requires canonical group0 with eight bindings");
  }
  const bindings = groups[0].bindings;
  const byScope = new Map(bindings.map((binding) => [ binding.scopeIdentity, binding ]));
  if (byScope.size !== bindings.length) fail("Main.pass0 has duplicate binding scopes");
  for (const expected of [ ...UNIFORMS, ...TEXTURES, SAMPLER ])
  {
    assertPipelineBinding(byScope.get(expected.scopeIdentity), expected);
  }
  assertReflection(record, stages);
}

/** Fail closed unless a record is the default DecalGlowCylindricV5 Main pass. */
export function validateDecalGlowCylindricV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
  if (record.backend !== "dx11" && record.backend !== "dx12")
  {
    fail("package backend must be dx11 or dx12");
  }
  const source = normalizedPath(record.analysis?.source);
  const metadataSource = normalizedPath(record.metadata?.sourcePath);
  const suffix =
    `/effect.${record.backend}/managed/space/decals/v5/` +
    "unpacked_decalglowcylindricv5.sm_hi";
  if (!source || source !== metadataSource || !source.endsWith(suffix))
  {
    fail(`package source provenance must be canonical ${record.backend} DecalGlowCylindricV5`);
  }
  if (record.analysis?.bodyIndex !== TARGET_BODY_INDEX
    || record.metadata?.bodyIndex !== TARGET_BODY_INDEX)
  {
    fail(`package must resolve body index ${TARGET_BODY_INDEX}`);
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions");
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions");
  const selection = record.metadata.wgslSelection;
  if (selection?.mode !== "explicit" || selection.completePasses !== true
    || selection.techniqueName !== "Main" || selection.passIndex !== 0
    || !same(selection.requestedStageNames, [ "vertex", "pixel" ])
    || !same(selection.selectedStageKeys, [ "Main.pass0.vertex", "Main.pass0.pixel" ]))
  {
    fail("package selection must be the complete Main.pass0 vertex/pixel pair");
  }
  const stages = assertPassAndStages(record);
  assertShaderModules(record);
  assertBindings(record, stages);
  return record;
}

/** Return the validated two-texture, one-shared-sampler resource plan. */
export function getDecalGlowCylindricV5ResourcePlan(record)
{
  validateDecalGlowCylindricV5PackageRecord(record);
  return Object.freeze({
    textures: TEXTURES,
    samplers: Object.freeze([ SAMPLER ])
  });
}

/** Validate an ordered, distinct DX11/DX12 package pair. */
export function validateDecalGlowCylindricV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  records.forEach(validateDecalGlowCylindricV5PackageRecord);
  if (records[0].backend !== "dx11" || records[1].backend !== "dx12")
  {
    fail("comparison package order must be DX11 then DX12");
  }
  const physical = records.map((record) => normalizedPath(record.filePath));
  const logical = records.map((record) => normalizedPath(record.resourcePath));
  if (physical.some((path) => !path) || physical[0] === physical[1])
  {
    fail("comparison requires distinct physical package files");
  }
  if (logical.some((path) => !path) || logical[0] === logical[1])
  {
    fail("comparison requires distinct logical resource paths");
  }
  const payload = (record) => record.pipeline.shaderModules
    .slice()
    .sort((left, right) => left.stageName.localeCompare(right.stageName))
    .map((module) => `${module.stageName}:${module.wgsl}`)
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
 * Create a cylindrical two-texture glow fixture. Scaling.w is deliberately
 * nonzero so the cylindrical angular coordinate cannot collapse to a constant.
 */
export function createDecalGlowCylindricV5FixtureValues(width, height)
{
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)
  {
    throw new TypeError(
      "DecalGlowCylindricV5 fixture dimensions must be positive integers"
    );
  }
  const base = createDecalGlowV5FixtureValues(width, height);
  const vertices = base.vertices.slice();
  for (let offset = 2; offset < vertices.length; offset += 16)
  {
    // With the identity fixture matrices, a constant positive z makes the
    // atan2 angular input deterministic while x remains the axial coordinate.
    vertices[offset] = 0.25;
  }
  return Object.freeze({
    vertices,
    indices: base.indices,
    bindingValues: Object.freeze({
      ...base.bindingValues,
      material: Object.freeze({
        ...base.bindingValues.material,
        DecalTextureScaling: [ 0, 0, 0, 1 ],
        DecalTextureOffset: [ 0, 0, 0, 0 ]
      })
    }),
    decalUniformData: base.decalUniformData,
    textures: Object.freeze([
      rgbaTexture(
        "DecalTransparencyMap",
        (x, y) => 32 + 20 * x + 8 * y
      ),
      rgbaTexture(
        "DecalGlowMap",
        (x, y) => 192 - 16 * x + 8 * y
      ),
      rgbaTexture("WhiteDecalTransparencyMap", () => 255),
      rgbaTexture("WhiteDecalGlowMap", () => 255),
      rgbaTexture("HalfDecalTransparencyMap", () => 128),
      rgbaTexture("HalfDecalGlowMap", () => 128)
    ]),
    textureResourceVariants: Object.freeze({
      base: Object.freeze({}),
      whiteTransparency: Object.freeze({
        DecalTransparencyMap: "WhiteDecalTransparencyMap"
      }),
      whiteGlow: Object.freeze({
        DecalGlowMap: "WhiteDecalGlowMap"
      }),
      whiteBoth: Object.freeze({
        DecalTransparencyMap: "WhiteDecalTransparencyMap",
        DecalGlowMap: "WhiteDecalGlowMap"
      }),
      halfTransparency: Object.freeze({
        DecalTransparencyMap: "HalfDecalTransparencyMap",
        DecalGlowMap: "WhiteDecalGlowMap"
      }),
      halfGlow: Object.freeze({
        DecalTransparencyMap: "WhiteDecalTransparencyMap",
        DecalGlowMap: "HalfDecalGlowMap"
      })
    }),
    samplers: Object.freeze([
      Object.freeze({
        name: SAMPLER.name,
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "clamp-to-edge",
        maxAnisotropy: 16
      })
    ]),
    samplerNames: Object.freeze([ SAMPLER.name ])
  });
}
