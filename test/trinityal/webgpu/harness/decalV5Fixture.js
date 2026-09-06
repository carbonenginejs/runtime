const TARGET_BODY_INDEX = 0;

export const DECALV5_TARGET_WIDTH = 64;
export const DECALV5_TARGET_HEIGHT = 64;

export const DECALV5_SELECTION = Object.freeze({
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
  Object.freeze({
    identity: "uniform-buffer:0:1",
    scopeIdentity: "uniform-buffer:0:1@vertex",
    registerIndex: 1,
    binding: 0,
    visibility: "vertex",
    minBindingSize: 384
  }),
  Object.freeze({
    identity: "uniform-buffer:0:2",
    scopeIdentity: "uniform-buffer:0:2@fragment",
    registerIndex: 2,
    binding: 1,
    visibility: "fragment",
    minBindingSize: 352
  }),
  Object.freeze({
    identity: "uniform-buffer:0:3",
    scopeIdentity: "uniform-buffer:0:3@vertex",
    registerIndex: 3,
    binding: 2,
    visibility: "vertex",
    minBindingSize: 320
  }),
  Object.freeze({
    identity: "uniform-buffer:0:4",
    scopeIdentity: "uniform-buffer:0:4@fragment",
    registerIndex: 4,
    binding: 3,
    visibility: "fragment",
    minBindingSize: 16
  })
]);

const RESOURCE_NAMES = Object.freeze([
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "DecalTransparencyMap",
  "DecalNormalMap",
  "DecalAlbedoMap",
  "DecalFresnelMap",
  "DecalRoughnessMap"
]);

const RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 5, 6, 7, 8, 9 ])
});

const SAMPLER_NAMES = Object.freeze([ "Sampler0", "DecalSampler" ]);

export const DECALV5_VERTEX_BUFFER_LAYOUT = Object.freeze({
  arrayStride: 64,
  attributes: Object.freeze([
    Object.freeze({ shaderLocation: 0, offset: 0, format: "float32x3" }),
    Object.freeze({ shaderLocation: 2, offset: 12, format: "float32x2" }),
    Object.freeze({ shaderLocation: 3, offset: 20, format: "float32x3" }),
    Object.freeze({ shaderLocation: 4, offset: 32, format: "float32x3" }),
    Object.freeze({ shaderLocation: 5, offset: 44, format: "float32x3" })
  ])
});

export const DECALV5_CLEAR_TARGET = Object.freeze([ 0, 255, 0, 255 ]);

function fail(message)
{
  throw new Error(`DecalV5 fixture: ${message}`);
}

function normalizedPath(value)
{
  return typeof value === "string" ? value.replace(/\\/gu, "/").toLowerCase() : "";
}

function assertSelections(options, owner)
{
  if (!Array.isArray(options) || options.length !== Object.keys(DECALV5_SELECTION).length)
  {
    fail(`${owner} must contain every DecalV5 permutation selection`);
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
  for (const [ name, value ] of Object.entries(DECALV5_SELECTION))
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

function expectedResources(backend)
{
  const registers = RESOURCE_REGISTERS[backend];
  if (!registers) fail(`unsupported package backend ${String(backend)}`);
  return RESOURCE_NAMES.map((name, index) => Object.freeze({
    name,
    identity: `sampled-resource:0:${registers[index]}`,
    scopeIdentity: `sampled-resource:0:${registers[index]}@fragment`,
    registerIndex: registers[index],
    binding: 4 + index,
    viewDimension: index === 0 ? "cube" : "2d"
  }));
}

function expectedSamplers()
{
  return SAMPLER_NAMES.map((name, registerIndex) => Object.freeze({
    name,
    identity: `sampler:0:${registerIndex}`,
    scopeIdentity: `sampler:0:${registerIndex}@fragment`,
    registerIndex,
    binding: 13 + registerIndex
  }));
}

function assertBindingSlot(binding, expected, kind, visibility)
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
  if (layouts.length !== 1 || layouts[0] !== kind)
  {
    fail(`${expected.identity} has an unexpected layout kind`);
  }
}

function assertPipelineInputs(record)
{
  const vertex = record.analysis?.stages?.filter((stage) =>
    stage?.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "vertex");
  if (!Array.isArray(vertex) || vertex.length !== 1)
  {
    fail("analysis must contain exactly one Main.pass0.vertex stage");
  }
  const active = (vertex[0].pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map(({ registerIndex, dimension, type }) => ({ registerIndex, dimension, type }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
  const expected = [
    { registerIndex: 0, dimension: 3, type: 0 },
    { registerIndex: 2, dimension: 2, type: 0 },
    { registerIndex: 3, dimension: 3, type: 0 },
    { registerIndex: 4, dimension: 3, type: 0 },
    { registerIndex: 5, dimension: 3, type: 0 }
  ];
  if (JSON.stringify(active) !== JSON.stringify(expected))
  {
    fail("Main.pass0.vertex has an unexpected active input contract");
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
      || module.entryPoint !== "main")
    {
      fail(`Main.pass0 requires one complete ${stageName} module`);
    }
    if (stageName === "vertex")
    {
      for (const location of [ 0, 2, 3, 4, 5 ])
      {
        if (!new RegExp(`@location\\(${location}\\)\\s+input${location}:`, "u").test(module.wgsl))
        {
          fail(`vertex WGSL is missing location ${location}`);
        }
      }
    }
    else if (!/@location\(0\)\s+output0:/u.test(module.wgsl)
      || /@location\(1\)\s+output1:/u.test(module.wgsl))
    {
      fail("pixel WGSL must expose exactly the DecalV5 color target");
    }
  }
}

function assertAnalysisBindings(record, resources)
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
    if (matches.length !== 1 || matches[0].carbon?.hasLocalConstants !== false)
    {
      fail(`${expected.identity} has unexpected constant-buffer reflection`);
    }
  }
  for (const expected of resources)
  {
    const matches = (pixel[0].bindings || []).filter((entry) =>
      entry?.kind === "resource" && entry.registerSpace === 0
      && entry.registerIndex === expected.registerIndex);
    if (matches.length !== 1 || matches[0].carbon?.name !== expected.name)
    {
      fail(`${expected.identity} must reflect ${expected.name}`);
    }
  }
  const reflectedSamplers = (pixel[0].bindings || []).filter((entry) =>
    entry?.kind === "sampler" && entry.registerSpace === 0);
  // Both backends assert the same sampler reflection. DX12 declares these in the
  // root signature rather than the stage register list, but that is how the
  // compiled effect spells them, not what they are.
  if (reflectedSamplers.length !== 2)
  {
    fail("DecalV5 requires two reflected static samplers");
  }
  const expectedStates = [
    { registerIndex: 0, addressU: 1, addressV: 1, mipLODBias: 0 },
    { registerIndex: 1, addressU: 4, addressV: 4, mipLODBias: -0.75 }
  ];
  for (const expected of expectedStates)
  {
    const state = reflectedSamplers.find((entry) =>
      entry.registerIndex === expected.registerIndex)?.carbon?.sampler;
    if (!state || state.comparison !== false
      || state.minFilter !== 3 || state.magFilter !== 2 || state.mipFilter !== 2
      || state.addressU !== expected.addressU || state.addressV !== expected.addressV
      || state.addressW !== 3 || state.mipLODBias !== expected.mipLODBias
      || state.maxAnisotropy !== 16 || state.isDynamic !== false)
    {
      fail(`sampler:0:${expected.registerIndex} has unexpected static sampler state`);
    }
  }
}

function assertBindings(record)
{
  const pipeline = record.pipeline;
  if (!Array.isArray(pipeline?.bindGroups) || pipeline.bindGroups.length !== 1
    || pipeline.bindGroups[0]?.group !== 0)
  {
    fail("Main.pass0 requires exactly canonical bind group 0");
  }
  const resources = expectedResources(record.backend);
  const samplers = expectedSamplers();
  const bindings = pipeline.bindGroups[0].bindings;
  if (!Array.isArray(bindings)
    || bindings.length !== UNIFORMS.length + resources.length + samplers.length)
  {
    fail("Main.pass0 has an unexpected canonical binding count");
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
  for (const expected of resources)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "texture", "fragment");
    if (binding.resourceKind !== "sampled-resource"
      || binding.layout.texture.sampleType !== "float"
      || binding.layout.texture.viewDimension !== expected.viewDimension
      || binding.layout.texture.multisampled !== false)
    {
      fail(`${expected.identity} has an unexpected texture layout`);
    }
  }
  for (const expected of samplers)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "sampler", "fragment");
    if (binding.resourceKind !== "sampler" || binding.layout.sampler.type !== "filtering")
    {
      fail(`${expected.identity} has an unexpected sampler layout`);
    }
  }
  assertAnalysisBindings(record, resources);
}

/**
 * Fail closed unless a loaded package is the exact non-bindless unpacked
 * DecalV5 Main pass used by the ship-family gate.
 */
export function validateDecalV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
  if (record.backend !== "dx11" && record.backend !== "dx12")
  {
    fail("package backend must be dx11 or dx12");
  }
  const analysisSource = normalizedPath(record.analysis?.source);
  const metadataSource = normalizedPath(record.metadata?.sourcePath);
  const expectedSuffix =
    `/effect.${record.backend}/managed/space/decals/v5/unpacked_decalv5.sm_hi`;
  if (!analysisSource || analysisSource !== metadataSource
    || !analysisSource.endsWith(expectedSuffix))
  {
    fail(`package source provenance must be canonical ${record.backend} unpacked_decalv5`);
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
  assertPipelineInputs(record);
  assertShaderModules(record);
  assertBindings(record);
  return record;
}

/** Return the validated backend-local semantic texture and sampler identities. */
export function getDecalV5ResourcePlan(record)
{
  validateDecalV5PackageRecord(record);
  return Object.freeze({
    textures: Object.freeze(expectedResources(record.backend)),
    samplers: Object.freeze(expectedSamplers())
  });
}

/** Validate an ordered, distinct DX11/DX12 package pair before comparison. */
export function validateDecalV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  records.forEach(validateDecalV5PackageRecord);
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

function setRegister(buffer, registerIndex, values)
{
  buffer.set(values, registerIndex * 4);
}

function setIdentityRegisters(buffer, firstRegister)
{
  setRegister(buffer, firstRegister, [ 1, 0, 0, 0 ]);
  setRegister(buffer, firstRegister + 1, [ 0, 1, 0, 0 ]);
  setRegister(buffer, firstRegister + 2, [ 0, 0, 1, 0 ]);
  setRegister(buffer, firstRegister + 3, [ 0, 0, 0, 1 ]);
}

function createUniformData(width, height)
{
  const perFrameVS = new Float32Array(384 / 4);
  for (const firstRegister of [ 0, 4, 8, 12, 16, 20 ])
  {
    setIdentityRegisters(perFrameVS, firstRegister);
  }
  setRegister(perFrameVS, 3, [ 0, 0, 5, 1 ]);

  const perFramePS = new Float32Array(352 / 4);
  for (const firstRegister of [ 0, 4, 8 ])
  {
    setIdentityRegisters(perFramePS, firstRegister);
  }
  setRegister(perFramePS, 12, [ 0.25, -0.35, 0.9027735, 0 ]);
  setRegister(perFramePS, 13, [ 1, 0.92, 0.78, 1 ]);
  setRegister(perFramePS, 14, [ 0.12, 0.15, 0.22, 0.28 ]);
  setRegister(perFramePS, 15, [ 0, 0, 0, 0 ]);
  setRegister(perFramePS, 16, [ 0, 0, width, height ]);
  setRegister(perFramePS, 17, [ width, height, 1, 0 ]);
  setRegister(perFramePS, 18, [ 1, 1, 0, 0 ]);
  setRegister(perFramePS, 19, [ 0, 1, 1, 0 ]);
  setRegister(perFramePS, 20, [ 1, 1, 1, 1 ]);
  setRegister(perFramePS, 21, [ 0, 0, 1, 2 ]);

  const perObjectVS = new Float32Array(320 / 4);
  for (const firstRegister of [ 0, 4, 8, 12, 16 ])
  {
    setIdentityRegisters(perObjectVS, firstRegister);
  }

  const perObjectPS = new Float32Array(16 / 4);
  setRegister(perObjectPS, 0, [ 0, 1, 0, 0 ]);

  return Object.freeze({
    "uniform-buffer:0:1@vertex": new Uint8Array(perFrameVS.buffer),
    "uniform-buffer:0:2@fragment": new Uint8Array(perFramePS.buffer),
    "uniform-buffer:0:3@vertex": new Uint8Array(perObjectVS.buffer),
    "uniform-buffer:0:4@fragment": new Uint8Array(perObjectPS.buffer)
  });
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

function createTextures()
{
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
    rgbaTexture("DecalTransparencyMap", "rgba8unorm", (x, y) => {
      const alpha = 112 + ((x + y) % 4) * 40;
      return [ alpha, alpha, alpha, 255 ];
    }),
    rgbaTexture("DecalNormalMap", "rgba8unorm", (x, y) => [
      120 + x * 2,
      120 + y * 2,
      250,
      255
    ]),
    rgbaTexture("DecalAlbedoMap", "rgba8unorm-srgb", (x, y) => [
      48 + x * 22,
      36 + y * 20,
      88 + ((x + y) % 4) * 28,
      255
    ]),
    rgbaTexture("DecalFresnelMap", "rgba8unorm-srgb", (x, y) => [
      72 + x * 12,
      80 + y * 10,
      128 + ((x + y) % 3) * 24,
      255
    ]),
    rgbaTexture("DecalRoughnessMap", "rgba8unorm", (x, y) => {
      const roughness = 48 + ((x * 3 + y * 5) % 8) * 24;
      return [ roughness, roughness, roughness, 255 ];
    })
  ]);
}

/**
 * Create deterministic harness-authored geometry, raw GPU-register uniform
 * bytes, and semantic texture inputs for the exact DecalV5 contract.
 */
export function createDecalV5FixtureValues(width, height)
{
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)
  {
    throw new TypeError("DecalV5 fixture dimensions must be positive integers");
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
  return Object.freeze({
    vertices,
    indices,
    uniformData: createUniformData(width, height),
    textures: createTextures(),
    samplerNames: SAMPLER_NAMES
  });
}
