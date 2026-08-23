import {
  QUADV5_CLEAR_TARGETS,
  QUADV5_TARGET_HEIGHT,
  QUADV5_TARGET_WIDTH,
  QUADV5_VERTEX_BUFFER_LAYOUT,
  createQuadV5FixtureValues,
  createQuadV5MainBindingValues
} from "./quadV5Fixture.js";

const TARGET_BODY_INDEX = 0;

export const QUAD_HEAT_V5_TARGET_WIDTH = QUADV5_TARGET_WIDTH;
export const QUAD_HEAT_V5_TARGET_HEIGHT = QUADV5_TARGET_HEIGHT;
export const QUAD_HEAT_V5_VERTEX_BUFFER_LAYOUT = QUADV5_VERTEX_BUFFER_LAYOUT;
export const QUAD_HEAT_V5_CLEAR_TARGETS = QUADV5_CLEAR_TARGETS;
export const QUAD_HEAT_V5_CASES = Object.freeze([ "cold", "hot" ]);

export const QUAD_HEAT_V5_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_DISABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF",
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

const UNIFORMS = Object.freeze([
  Object.freeze({
    identity: "uniform-buffer:0:0",
    scopeIdentity: "uniform-buffer:0:0@fragment",
    binding: 0,
    visibility: "fragment",
    minBindingSize: 464
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
    minBindingSize: 352
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
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "GlowMap",
  "AlbedoMap",
  "RoughnessMap",
  "MaterialMap",
  "PaintMaskMap",
  "HeatGlowNoiseMap"
]);

const RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11 ])
});

const RESOURCE_SRGB = Object.freeze([
  true,
  false,
  false,
  false,
  false,
  true,
  false,
  false,
  false,
  false
]);

const MATERIAL_CONSTANTS = Object.freeze([
  Object.freeze({ name: "GeneralData", offset: 0 }),
  Object.freeze({ name: "Mtl1DiffuseColor", offset: 32 }),
  Object.freeze({ name: "Mtl2DiffuseColor", offset: 48 }),
  Object.freeze({ name: "Mtl3DiffuseColor", offset: 64 }),
  Object.freeze({ name: "Mtl4DiffuseColor", offset: 80 }),
  Object.freeze({ name: "Mtl1FresnelColor", offset: 96 }),
  Object.freeze({ name: "Mtl2FresnelColor", offset: 112 }),
  Object.freeze({ name: "Mtl3FresnelColor", offset: 128 }),
  Object.freeze({ name: "Mtl4FresnelColor", offset: 144 }),
  Object.freeze({ name: "Mtl1Gloss", offset: 160 }),
  Object.freeze({ name: "Mtl2Gloss", offset: 176 }),
  Object.freeze({ name: "Mtl3Gloss", offset: 192 }),
  Object.freeze({ name: "Mtl4Gloss", offset: 208 }),
  Object.freeze({ name: "Mtl1HeatGlowData", offset: 384 }),
  Object.freeze({ name: "Mtl2HeatGlowData", offset: 400 }),
  Object.freeze({ name: "Mtl3HeatGlowData", offset: 416 }),
  Object.freeze({ name: "Mtl4HeatGlowData", offset: 432 }),
  Object.freeze({ name: "GeneralHeatGlowColor", offset: 448 })
]);

function fail(message)
{
  throw new Error(`QuadHeatV5 fixture: ${message}`);
}

function normalizedPath(value)
{
  return typeof value === "string" ? value.replace(/\\/gu, "/").toLowerCase() : "";
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
    binding: 5 + index,
    viewDimension: index === 0 ? "cube" : "2d",
    isSRGB: RESOURCE_SRGB[index],
    isAutoregister: name === "EveSpaceSceneShadowMap"
  }));
}

function expectedSamplers()
{
  return Object.freeze([
    Object.freeze({
      name: "SurfaceSampler",
      identity: "sampler:0:0",
      scopeIdentity: "sampler:0:0@fragment",
      registerIndex: 0,
      binding: 15
    })
  ]);
}

function assertSelections(options, owner)
{
  if (!Array.isArray(options) || options.length !== Object.keys(QUAD_HEAT_V5_SELECTION).length)
  {
    fail(`${owner} must contain every QuadHeatV5 permutation selection`);
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
  for (const [ name, value ] of Object.entries(QUAD_HEAT_V5_SELECTION))
  {
    const entry = selected.get(name);
    const provenance = SELECTION_PROVENANCE[name];
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

function mainStage(record, stageName)
{
  const matches = record.analysis?.stages?.filter((entry) =>
    entry?.techniqueName === "Main"
      && entry.passIndex === 0
      && entry.stageName === stageName);
  if (!Array.isArray(matches) || matches.length !== 1)
  {
    fail(`analysis must contain exactly one Main.pass0.${stageName} stage`);
  }
  return matches[0];
}

function assertVertexInputs(record)
{
  const active = (mainStage(record, "vertex").pipelineInputs || [])
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
    { registerIndex: 2, usedMask: 3, dimension: 2, type: 0 },
    { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 5, usedMask: 7, dimension: 3, type: 0 },
    { registerIndex: 6, usedMask: 3, dimension: 2, type: 0 }
  ];
  if (JSON.stringify(active) !== JSON.stringify(expected))
  {
    fail("Main.pass0.vertex has an unexpected active input contract");
  }
}

function assertPixelInputs(record)
{
  const active = (mainStage(record, "pixel").pipelineInputs || [])
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
    { registerIndex: 8, usedMask: 11, dimension: 4, type: 0 }
  ];
  if (JSON.stringify(active) !== JSON.stringify(expected))
  {
    fail("Main.pass0.pixel has an unexpected active input contract");
  }
}

function wgslStructFields(wgsl, name)
{
  const match = new RegExp(`struct\\s+${name}\\s*\\{([^}]*)\\};`, "u").exec(wgsl);
  if (!match) fail(`WGSL is missing ${name}`);
  const annotations = match[1].match(/@(location|builtin)\(/gu) || [];
  const fields = [ ...match[1].matchAll(
    /@(location|builtin)\(([^)]+)\)\s+([A-Za-z_][A-Za-z0-9_]*):\s*([^,\r\n]+),/gu
  ) ].map((entry) => ({
    attribute: entry[1],
    value: entry[2],
    name: entry[3],
    type: entry[4].replace(/\s+/gu, "")
  }));
  if (fields.length !== annotations.length)
  {
    fail(`${name} contains an unsupported or malformed interface field`);
  }
  return fields;
}

function assertWgslStruct(wgsl, name, expected)
{
  if (JSON.stringify(wgslStructFields(wgsl, name)) !== JSON.stringify(expected))
  {
    fail(`${name} has an unexpected interface contract`);
  }
}

function assertShaderModules(pipeline)
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
      assertWgslStruct(matches[0].wgsl, "VertexInput", [
        { attribute: "location", value: "0", name: "input0", type: "vec3<f32>" },
        { attribute: "location", value: "2", name: "input2", type: "vec2<f32>" },
        { attribute: "location", value: "3", name: "input3", type: "vec3<f32>" },
        { attribute: "location", value: "4", name: "input4", type: "vec3<f32>" },
        { attribute: "location", value: "5", name: "input5", type: "vec3<f32>" },
        { attribute: "location", value: "6", name: "input6", type: "vec2<f32>" }
      ]);
    }
    else
    {
      assertWgslStruct(matches[0].wgsl, "FragmentInput", [
        { attribute: "builtin", value: "position", name: "position", type: "vec4<f32>" },
        { attribute: "location", value: "1", name: "input1", type: "vec4<f32>" },
        { attribute: "location", value: "2", name: "input2", type: "vec3<f32>" },
        { attribute: "location", value: "3", name: "input3", type: "vec3<f32>" },
        { attribute: "location", value: "4", name: "input4", type: "vec3<f32>" },
        { attribute: "location", value: "5", name: "input5", type: "vec4<f32>" },
        { attribute: "location", value: "8", name: "input8", type: "vec4<f32>" }
      ]);
      assertWgslStruct(matches[0].wgsl, "FragmentOutput", [
        { attribute: "location", value: "0", name: "output0", type: "vec4<f32>" },
        { attribute: "location", value: "1", name: "output1", type: "vec4<f32>" }
      ]);
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

function assertMaterialReflection(record)
{
  const material = mainStage(record, "pixel").bindings?.filter((entry) =>
    entry?.kind === "constantBuffer"
      && entry.registerSpace === 0
      && entry.registerIndex === 0);
  if (!Array.isArray(material) || material.length !== 1
    || material[0].carbon?.hasLocalConstants !== true
    || material[0].carbon?.constantValueSize !== 464)
  {
    fail("pixel cb0 must expose the exact 464-byte local material layout");
  }
  const constants = material[0].carbon.constants;
  if (!Array.isArray(constants) || constants.length !== MATERIAL_CONSTANTS.length)
  {
    fail("pixel cb0 has an unexpected material constant count");
  }
  for (let index = 0; index < MATERIAL_CONSTANTS.length; index += 1)
  {
    const constant = constants[index];
    const expected = MATERIAL_CONSTANTS[index];
    if (constant?.name !== expected.name || constant.offset !== expected.offset
      || constant.size !== 16 || constant.dimension !== 4
      || constant.type !== 0 || constant.elements !== 0)
    {
      fail(`pixel cb0 has an unexpected ${expected.name} layout`);
    }
  }
}

function assertAnalysisResources(record, resources)
{
  const vertexBindings = mainStage(record, "vertex").bindings || [];
  const bindings = mainStage(record, "pixel").bindings || [];
  const identity = (entry) =>
    `${entry?.kind}:${entry?.registerSpace}:${entry?.registerIndex}`;
  const vertexInventory = vertexBindings.map(identity).sort();
  const expectedVertexInventory = [
    "constantBuffer:0:1",
    "constantBuffer:0:3"
  ];
  if (JSON.stringify(vertexInventory) !== JSON.stringify(expectedVertexInventory))
  {
    fail("vertex analysis has an unexpected active binding inventory");
  }
  const pixelInventory = bindings.map(identity).sort();
  const expectedPixelInventory = [
    "constantBuffer:0:0",
    "constantBuffer:0:2",
    "constantBuffer:0:4",
    ...resources.map((entry) => `resource:0:${entry.registerIndex}`),
    "sampler:0:0"
  ].sort();
  if (JSON.stringify(pixelInventory) !== JSON.stringify(expectedPixelInventory))
  {
    fail("pixel analysis has an unexpected active binding inventory");
  }
  for (const expected of resources)
  {
    const matches = bindings.filter((entry) => entry?.kind === "resource"
      && entry.registerSpace === 0
      && entry.registerIndex === expected.registerIndex);
    const carbon = matches[0]?.carbon;
    const expectedType = expected.viewDimension === "cube" ? 4 : 2;
    if (matches.length !== 1 || carbon?.name !== expected.name
      || carbon.type !== expectedType || carbon.arrayElements !== 1
      || carbon.isSRGB !== expected.isSRGB
      || carbon.isAutoregister !== expected.isAutoregister)
    {
      fail(`${expected.identity} must reflect the exact ${expected.name} resource`);
    }
  }
  // The DX12 early return is gone. It asserted that DX12 reflected no samplers
  // and skipped every check below, which stopped being true once signature
  // samplers were reflected and stopped being a difference at all once their
  // state was aligned with DX11's. Both backends now reach the same assertions,
  // so a future divergence fails instead of being skipped.
  const samplerBindings = bindings.filter((entry) => entry?.kind === "sampler");
  if (samplerBindings.length !== 1 || samplerBindings[0].registerIndex !== 0)
  {
    fail("analysis must contain exactly static sampler s0");
  }
  const sampler = samplerBindings[0].carbon?.sampler;
  if (!sampler || sampler.comparison !== false
    || sampler.minFilter !== 3 || sampler.magFilter !== 2 || sampler.mipFilter !== 2
    || sampler.addressU !== 1 || sampler.addressV !== 1 || sampler.addressW !== 3
    || sampler.mipLODBias !== 0 || sampler.maxAnisotropy !== 16
    || sampler.isDynamic !== false)
  {
    fail("sampler s0 has unexpected static state");
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
  const resources = expectedResources(record.backend);
  const samplers = expectedSamplers();
  if (!Array.isArray(bindings)
    || bindings.length !== UNIFORMS.length + resources.length + samplers.length)
  {
    fail("Main.pass0 requires exactly 16 canonical bindings");
  }
  const byScope = new Map(bindings.map((entry) => [ entry.scopeIdentity, entry ]));
  if (byScope.size !== bindings.length)
  {
    fail("Main.pass0 contains duplicate binding scopes");
  }
  for (const expected of UNIFORMS)
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
  for (const expected of resources)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "texture", "fragment");
    if (binding.layout.texture.sampleType !== "float"
      || binding.layout.texture.viewDimension !== expected.viewDimension
      || binding.layout.texture.multisampled !== false
      || binding.isSRGB !== expected.isSRGB)
    {
      fail(`${expected.identity} has an unexpected texture layout`);
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
  assertMaterialReflection(record);
  assertAnalysisResources(record, resources);
}

/**
 * Return the deliberate caller-owned raster recipe used by the synthetic gate.
 *
 * @returns {{frontFace: string, cullMode: string}} Frozen primitive recipe.
 */
export function getQuadHeatV5PrimitiveRecipe()
{
  return Object.freeze({ frontFace: "cw", cullMode: "back" });
}

/**
 * Fail closed unless the record is the exact default, static, medium-quality,
 * unpacked QuadHeatV5 Main pass used by this gate.
 *
 * @param {object} record Resource provenance plus a pipeline descriptor.
 * @returns {object} The validated input record.
 */
export function validateQuadHeatV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
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
  if (!analysisSource.endsWith(
    "/managed/space/spaceobject/v5/quad/unpacked_quadheatv5.sm_hi"
  ))
  {
    fail("package source must be the medium-quality unpacked_quadheatv5 ship shader");
  }
  if (record.analysis?.bodyIndex !== TARGET_BODY_INDEX
    || record.metadata?.bodyIndex !== TARGET_BODY_INDEX)
  {
    fail(`package must resolve body index ${TARGET_BODY_INDEX}`);
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions");
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions");
  // `passIndex === null` and an empty `requestedStageNames` are NOT asserted.
  // They described how the package was asked for -- a caller that named no pass
  // and no stage -- and the Carbon container stores no build-time policy. The
  // metadata view reconstructs this field from what the package actually holds:
  // `passIndex` is parsed out of the pass key, so it is always a number, and
  // `requestedStageNames` is collected from the stages carrying programs, so it
  // is never empty. What survives the round trip, and is what actually matters
  // here, is the technique and the exact set of stage keys.
  const selection = record.metadata.wgslSelection;
  if (selection?.mode !== "explicit"
    || selection.techniqueName !== "Main"
    || selection.completePasses !== true
    || JSON.stringify(selection.selectedStageKeys)
      !== JSON.stringify([ "Main.pass0.vertex", "Main.pass0.pixel" ]))
  {
    fail("package selection must contain the complete Main.pass0 render pass");
  }
  const analysisPasses = record.analysis?.passes?.filter((entry) =>
    entry?.techniqueName === "Main");
  if (!Array.isArray(analysisPasses) || analysisPasses.length !== 1
    || analysisPasses[0].passIndex !== 0 || analysisPasses[0].renderStates !== 1
    || JSON.stringify(analysisPasses[0].states) !== "[]")
  {
    fail("analysis must retain the exact Main.pass0 render state");
  }
  const pipeline = record.pipeline;
  if (pipeline?.techniqueName !== "Main" || pipeline.passIndex !== 0
    || pipeline.renderStates !== 1 || JSON.stringify(pipeline.states) !== "[]")
  {
    fail("pipeline Main.pass0 has an unexpected render state");
  }
  assertVertexInputs(record);
  assertPixelInputs(record);
  assertShaderModules(pipeline);
  assertBindings(record);
  return record;
}

/**
 * Return backend-local binding identities for the shared semantic fixture.
 *
 * @param {object} record One validated QuadHeatV5 package record.
 * @returns {{textures: object[], samplers: object[]}} Frozen resource plan.
 */
export function getQuadHeatV5ResourcePlan(record)
{
  validateQuadHeatV5PackageRecord(record);
  return Object.freeze({
    textures: Object.freeze(expectedResources(record.backend)),
    samplers: expectedSamplers()
  });
}

/**
 * Validate ordered and distinct DX11/DX12 records before claiming parity.
 *
 * @param {object[]} records Package records in DX11, DX12 order.
 * @returns {object[]} The validated input array.
 */
export function validateQuadHeatV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  records.forEach(validateQuadHeatV5PackageRecord);
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
  const shaderPayload = (record) => record.pipeline.shaderModules
    .slice()
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((entry) => `${entry.key}:${entry.wgsl}`)
    .join("\n");
  if (shaderPayload(records[0]) === shaderPayload(records[1]))
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
      data.set(pixel(x, y), y * bytesPerRow + x * 4);
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

function createHeatMaterial(base)
{
  return Object.freeze({
    GeneralData: [ 1, 0, 0, 0 ],
    Mtl1DiffuseColor: base.Mtl1DiffuseColor,
    Mtl2DiffuseColor: base.Mtl2DiffuseColor,
    Mtl3DiffuseColor: base.Mtl3DiffuseColor,
    Mtl4DiffuseColor: base.Mtl4DiffuseColor,
    Mtl1FresnelColor: base.Mtl1FresnelColor,
    Mtl2FresnelColor: base.Mtl2FresnelColor,
    Mtl3FresnelColor: base.Mtl3FresnelColor,
    Mtl4FresnelColor: base.Mtl4FresnelColor,
    Mtl1Gloss: base.Mtl1Gloss,
    Mtl2Gloss: base.Mtl2Gloss,
    Mtl3Gloss: base.Mtl3Gloss,
    Mtl4Gloss: base.Mtl4Gloss,
    Mtl1HeatGlowData: [ 1, 0.025, 4, 0.002 ],
    Mtl2HeatGlowData: [ 1, 0.005, 8, 0.0005 ],
    Mtl3HeatGlowData: [ 1, 0.025, 4, 0.002 ],
    Mtl4HeatGlowData: [ 1, 0.025, 4, 0.002 ],
    GeneralHeatGlowColor: [ 0.85, 0, 0, 1 ]
  });
}

function createHeatBindingCase(base, material, heat)
{
  const shipData = [ heat, 1, 0, 0 ];
  return Object.freeze({
    ...base,
    material,
    perObjectVS: Object.freeze({ ...base.perObjectVS, shipData }),
    perObjectPS: Object.freeze({ ...base.perObjectPS, shipData })
  });
}

/**
 * Create a deterministic synthetic ship silhouette with cold and hot semantic
 * cases. No SOF object, production texture, or Trinity graph is loaded.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @returns {object} Typed-array fixture values.
 */
export function createQuadHeatV5FixtureValues(width, height)
{
  const surface = createQuadV5FixtureValues(width, height);
  const shared = createQuadV5MainBindingValues(width, height);
  const requiredTextures = new Set(RESOURCE_NAMES.filter((name) =>
    name !== "HeatGlowNoiseMap"));
  const textures = surface.textures.filter((entry) => requiredTextures.has(entry.name));
  if (textures.length !== requiredTextures.size)
  {
    fail("shared QuadV5 fixture does not expose every required surface texture");
  }
  const heatNoise = rgbaTexture("HeatGlowNoiseMap", (x, y) => [
    24 + ((x * 37 + y * 19) % 208),
    24 + ((x * 11 + y * 43) % 208),
    0,
    255
  ]);
  const material = createHeatMaterial(shared.material);
  return Object.freeze({
    vertices: surface.vertices,
    indices: surface.indices,
    textures: Object.freeze([ ...textures, heatNoise ]),
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
      })
    ]),
    caseNames: QUAD_HEAT_V5_CASES,
    bindingValuesByCase: Object.freeze({
      cold: createHeatBindingCase(shared, material, 0),
      hot: createHeatBindingCase(shared, material, 1)
    })
  });
}
