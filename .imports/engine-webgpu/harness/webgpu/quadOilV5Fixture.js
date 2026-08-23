import {
  QUADV5_CLEAR_TARGETS,
  QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT,
  QUADV5_TARGET_HEIGHT,
  QUADV5_TARGET_WIDTH,
  QUADV5_VERTEX_BUFFER_LAYOUT,
  createQuadV5FixtureValues,
  createQuadV5MainBindingValues
} from "./quadV5Fixture.js";

export const QUAD_OIL_V5_TARGET_WIDTH = QUADV5_TARGET_WIDTH;
export const QUAD_OIL_V5_TARGET_HEIGHT = QUADV5_TARGET_HEIGHT;
export const QUAD_OIL_V5_VERTEX_BUFFER_LAYOUT = QUADV5_VERTEX_BUFFER_LAYOUT;
export const QUAD_OIL_V5_SKINNED_VERTEX_BUFFER_LAYOUT =
  QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT;
export const QUAD_OIL_V5_CLEAR_TARGETS = QUADV5_CLEAR_TARGETS;
export const QUAD_OIL_V5_RESOURCE_VARIANTS = Object.freeze([
  "oilOff",
  "oilChromatic"
]);

export const QUAD_OIL_V5_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_DISABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF"
});

const SELECTION_PROVENANCE = Object.freeze({
  BINDLESS_RENDERING: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "BINDLESS_RENDERING_DISABLED",
    source: "local"
  }),
  SPACE_OBJECT_CLIPPING: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOC_DISABLED",
    source: "default"
  }),
  SPACE_OBJECT_PPT_ENABLED: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOPPT_DISABLED",
    source: "local"
  }),
  SPACE_OBJECT_TRANSPARENCY: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOT_OPAQUE",
    source: "default"
  }),
  V5_DEBUG: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "OFF",
    source: "default"
  })
});

const UNIFORMS = Object.freeze([
  Object.freeze({
    identity: "uniform-buffer:0:0",
    scopeIdentity: "uniform-buffer:0:0@fragment",
    registerIndex: 0,
    binding: 0,
    visibility: "fragment",
    minBindingSize: 224,
    vectors: 14
  }),
  Object.freeze({
    identity: "uniform-buffer:0:1",
    scopeIdentity: "uniform-buffer:0:1@vertex",
    registerIndex: 1,
    binding: 1,
    visibility: "vertex",
    minBindingSize: 512,
    vectors: 32
  }),
  Object.freeze({
    identity: "uniform-buffer:0:2",
    scopeIdentity: "uniform-buffer:0:2@fragment",
    registerIndex: 2,
    binding: 2,
    visibility: "fragment",
    minBindingSize: 352,
    vectors: 22
  }),
  Object.freeze({
    identity: "uniform-buffer:0:3",
    scopeIdentity: "uniform-buffer:0:3@vertex",
    registerIndex: 3,
    binding: 3,
    visibility: "vertex",
    minBindingSize: 432,
    vectors: 27
  }),
  Object.freeze({
    identity: "uniform-buffer:0:4",
    scopeIdentity: "uniform-buffer:0:4@fragment",
    registerIndex: 4,
    binding: 4,
    visibility: "fragment",
    minBindingSize: 208,
    vectors: 13
  })
]);

const BONE_TRANSFORMS = Object.freeze({
  name: "BoneTransforms",
  identity: "sampled-resource:0:0",
  scopeIdentity: "sampled-resource:0:0@vertex",
  registerIndex: 0,
  binding: 5,
  minBindingSize: 48,
  structureStride: 48
});

const RESOURCE_NAMES = Object.freeze([
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "GlowMap",
  "OilFilmLookupMap",
  "AlbedoMap",
  "RoughnessMap",
  "MaterialMap",
  "PaintMaskMap"
]);

const RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 5, 7, 8, 10, 11 ])
});

const RESOURCE_SRGB = Object.freeze([
  true,
  false,
  false,
  false,
  false,
  true,
  true,
  false,
  false,
  false
]);

const SAMPLERS = Object.freeze([
  Object.freeze({
    name: "SurfaceSampler",
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    registerIndex: 0,
    binding: 16
  }),
  Object.freeze({
    name: "OilFilmSampler",
    identity: "sampler:0:1",
    scopeIdentity: "sampler:0:1@fragment",
    registerIndex: 1,
    binding: 17
  })
]);

const MATERIAL_CONSTANTS = Object.freeze([
  Object.freeze({ name: "GeneralData", offset: 0 }),
  Object.freeze({ name: "GeneralGlowColor", offset: 16 }),
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
  Object.freeze({ name: "Mtl4Gloss", offset: 208 })
]);

const EXPECTED_VERTEX_INPUTS = Object.freeze([
  Object.freeze([ "POSITION", 0, 0, 7, 0, 3 ]),
  Object.freeze([ "BLENDINDICES", 0, 1, 1, 2, 4 ]),
  Object.freeze([ "TEXCOORD", 0, 2, 3, 0, 2 ]),
  Object.freeze([ "NORMAL", 0, 3, 7, 0, 3 ]),
  Object.freeze([ "TANGENT", 0, 4, 7, 0, 3 ]),
  Object.freeze([ "BITANGENT", 0, 5, 7, 0, 3 ]),
  Object.freeze([ "TEXCOORD", 1, 6, 3, 0, 2 ])
]);

const EXPECTED_PIXEL_INPUTS = Object.freeze([
  Object.freeze([ "TEXCOORD", 0, 1, 3, 0, 4 ]),
  Object.freeze([ "TEXCOORD", 1, 2, 7, 0, 3 ]),
  Object.freeze([ "TEXCOORD", 2, 3, 7, 0, 3 ]),
  Object.freeze([ "TEXCOORD", 3, 4, 7, 0, 3 ]),
  Object.freeze([ "TEXCOORD", 4, 5, 15, 0, 4 ]),
  Object.freeze([ "TEXCOORD", 5, 6, 0, 0, 4 ]),
  Object.freeze([ "TEXCOORD", 8, 7, 0, 0, 4 ]),
  Object.freeze([ "TEXCOORD", 9, 8, 11, 0, 4 ])
]);

function fail(message)
{
  throw new Error(`QuadOilV5 fixture: ${message}`);
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
    binding: 6 + index,
    viewDimension: index === 0 ? "cube" : "2d",
    isSRGB: RESOURCE_SRGB[index],
    isAutoregister: name === "EveSpaceSceneShadowMap"
  }));
}

function assertSelections(options, owner)
{
  if (!Array.isArray(options)
    || options.length !== Object.keys(QUAD_OIL_V5_SELECTION).length)
  {
    fail(`${owner} must contain every QuadOilV5 permutation selection`);
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
  for (const [ name, value ] of Object.entries(QUAD_OIL_V5_SELECTION))
  {
    const entry = selected.get(name);
    const provenance = SELECTION_PROVENANCE[name];
    // `source` is build-time policy (who chose the value), not container
    // data; see quadV5Fixture.js. It cannot survive a read back from bytes.
    if (!entry || entry.value !== value
      || entry.optionIndex !== provenance.optionIndex
      || entry.defaultOption !== provenance.defaultOption
      || entry.defaultValue !== provenance.defaultValue)
    {
      fail(`${owner} has an unexpected ${name} selection or provenance`);
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

function interfaceSignature(stage)
{
  return (stage.pipelineInputs || []).map((entry) => [
    entry.usageName,
    entry.usageIndex,
    entry.registerIndex,
    entry.usedMask,
    entry.type,
    entry.dimension
  ]);
}

function assertInterfaces(record)
{
  if (JSON.stringify(interfaceSignature(mainStage(record, "vertex")))
    !== JSON.stringify(EXPECTED_VERTEX_INPUTS))
  {
    fail("Main.pass0.vertex has an unexpected input contract");
  }
  if (JSON.stringify(interfaceSignature(mainStage(record, "pixel")))
    !== JSON.stringify(EXPECTED_PIXEL_INPUTS))
  {
    fail("Main.pass0.pixel has an unexpected input contract");
  }
}

function wgslStructFields(wgsl, name)
{
  const match = new RegExp(`struct\\s+${name}\\s*\\{([^}]*)\\};`, "u").exec(wgsl);
  if (!match) fail(`WGSL is missing ${name}`);
  const annotations = match[1].match(/@(location|builtin)\(/gu) || [];
  const fields = [ ...match[1].matchAll(
    /@(location|builtin)\(([^)]+)\)\s+([A-Za-z_][A-Za-z0-9_]*):\s*([^,\r\n]+),/gu
  ) ].map((entry) => [
    entry[1],
    entry[2],
    entry[3],
    entry[4].replace(/\s+/gu, "")
  ]);
  if (fields.length !== annotations.length)
  {
    fail(`${name} contains an unsupported or malformed interface field`);
  }
  return fields;
}

function assertShaderModules(pipeline)
{
  if (!Array.isArray(pipeline?.shaderModules) || pipeline.shaderModules.length !== 2)
  {
    fail("Main.pass0 requires exactly vertex and pixel modules");
  }
  const expected = {
    vertex: {
      input: [
        [ "location", "0", "input0", "vec3<f32>" ],
        [ "location", "1", "input1", "vec4<u32>" ],
        [ "location", "2", "input2", "vec2<f32>" ],
        [ "location", "3", "input3", "vec3<f32>" ],
        [ "location", "4", "input4", "vec3<f32>" ],
        [ "location", "5", "input5", "vec3<f32>" ],
        [ "location", "6", "input6", "vec2<f32>" ]
      ],
      output: [
        [ "builtin", "position", "position", "vec4<f32>" ],
        [ "location", "1", "output1", "vec4<f32>" ],
        [ "location", "2", "output2", "vec3<f32>" ],
        [ "location", "3", "output3", "vec3<f32>" ],
        [ "location", "4", "output4", "vec3<f32>" ],
        [ "location", "5", "output5", "vec4<f32>" ],
        [ "location", "6", "output6", "vec4<f32>" ],
        [ "location", "7", "output7", "vec4<f32>" ],
        [ "location", "8", "output8", "vec4<f32>" ]
      ]
    },
    pixel: {
      input: [
        [ "builtin", "position", "position", "vec4<f32>" ],
        [ "location", "1", "input1", "vec4<f32>" ],
        [ "location", "2", "input2", "vec3<f32>" ],
        [ "location", "3", "input3", "vec3<f32>" ],
        [ "location", "4", "input4", "vec3<f32>" ],
        [ "location", "5", "input5", "vec4<f32>" ],
        [ "location", "8", "input8", "vec4<f32>" ]
      ],
      output: [
        [ "location", "0", "output0", "vec4<f32>" ],
        [ "location", "1", "output1", "vec4<f32>" ]
      ]
    }
  };
  for (const stageName of [ "vertex", "pixel" ])
  {
    const matches = pipeline.shaderModules.filter((entry) => entry?.stageName === stageName);
    const module = matches[0];
    if (matches.length !== 1
      || module.key !== `Main.pass0.${stageName}`
      || module.techniqueName !== "Main"
      || module.passIndex !== 0
      || module.stageType !== (stageName === "vertex" ? 0 : 1)
      || module.entryPoint !== "main"
      || typeof module.wgsl !== "string" || !module.wgsl)
    {
      fail(`Main.pass0 requires one complete ${stageName} module`);
    }
    const inputName = stageName === "vertex" ? "VertexInput" : "FragmentInput";
    const outputName = stageName === "vertex" ? "VertexOutput" : "FragmentOutput";
    if (JSON.stringify(wgslStructFields(module.wgsl, inputName))
      !== JSON.stringify(expected[stageName].input)
      || JSON.stringify(wgslStructFields(module.wgsl, outputName))
        !== JSON.stringify(expected[stageName].output))
    {
      fail(`Main.pass0.${stageName} has an unexpected WGSL interface`);
    }
  }
}

function assertBindingSlot(binding, expected, kind, visibility)
{
  const [ resourceKind, registerSpace, registerIndex ] = expected.identity.split(":");
  if (!binding
    || binding.identity !== expected.identity
    || binding.scopeIdentity !== expected.scopeIdentity
    || binding.resourceKind !== resourceKind
    || binding.registerSpace !== Number(registerSpace)
    || binding.registerIndex !== Number(registerIndex)
    || binding.sourceTruth !== "wgsl-layout"
    || binding.group !== 0
    || binding.binding !== expected.binding
    || binding.dynamic !== false
    || !Array.isArray(binding.visibility)
    || binding.visibility.length !== 1
    || binding.visibility[0] !== visibility)
  {
    fail(`${expected.scopeIdentity} has an unexpected canonical slot or scope`);
  }
  const kinds = [ "buffer", "texture", "sampler" ].filter((key) =>
    binding.layout?.[key]);
  if (kinds.length !== 1 || kinds[0] !== kind)
  {
    fail(`${expected.scopeIdentity} has an unexpected layout kind`);
  }
}

function assertMaterialReflection(record)
{
  const matches = mainStage(record, "pixel").bindings?.filter((entry) =>
    entry?.kind === "constantBuffer"
      && entry.registerSpace === 0
      && entry.registerIndex === 0);
  if (!Array.isArray(matches) || matches.length !== 1
    || matches[0].carbon?.hasLocalConstants !== true
    || matches[0].carbon?.constantValueSize !== 224)
  {
    fail("pixel cb0 must expose the exact 224-byte local material layout");
  }
  const constants = matches[0].carbon.constants;
  if (!Array.isArray(constants) || constants.length !== MATERIAL_CONSTANTS.length)
  {
    fail("pixel cb0 has an unexpected material constant count");
  }
  for (let index = 0; index < MATERIAL_CONSTANTS.length; index += 1)
  {
    const constant = constants[index];
    const expected = MATERIAL_CONSTANTS[index];
    if (constant?.name !== expected.name
      || constant.offset !== expected.offset
      || constant.size !== 16
      || constant.type !== 0
      || constant.dimension !== 4
      || constant.elements !== 0)
    {
      fail(`pixel cb0 has an unexpected ${expected.name} layout`);
    }
  }
}

function hasExactSamplerState(state, registerIndex)
{
  return Boolean(state)
    && state.comparison === false
    && state.minFilter === (registerIndex === 0 ? 3 : 2)
    && state.magFilter === 2
    && state.mipFilter === 2
    && state.addressU === 1
    && state.addressV === 1
    && state.addressW === 3
    && state.mipLODBias === 0
    && state.maxAnisotropy === 16
    && state.minLOD === (registerIndex === 0
      ? -3.4028234663852886e+38
      : 0)
    && state.isDynamic === false;
}

function assertAnalysisBindings(record, resources)
{
  const vertexBindings = mainStage(record, "vertex").bindings || [];
  const vertexInventory = vertexBindings.map((entry) =>
    `${entry?.kind}:${entry?.registerSpace}:${entry?.registerIndex}`).sort();
  if (JSON.stringify(vertexInventory) !== JSON.stringify([
    "constantBuffer:0:1",
    "constantBuffer:0:3",
    "resource:0:0"
  ].sort()))
  {
    fail("vertex analysis has an unexpected active binding inventory");
  }
  const bone = vertexBindings.find((entry) => entry?.kind === "resource");
  if (bone?.registerSpace !== 0
    || bone.registerIndex !== 0
    || bone.registerType !== 33
    || bone.dynamic !== true
    || bone.carbon?.name !== "BoneTransforms"
    || bone.carbon?.type !== 7
    || bone.carbon?.arrayElements !== 1
    || bone.carbon?.isSRGB !== false
    || bone.carbon?.isAutoregister !== false)
  {
    fail("vertex t0 BoneTransforms has unexpected Carbon metadata");
  }

  const pixelBindings = mainStage(record, "pixel").bindings || [];
  const expectedInventory = [
    "constantBuffer:0:0",
    "constantBuffer:0:2",
    "constantBuffer:0:4",
    ...resources.map((entry) => `resource:0:${entry.registerIndex}`),
    // Both backends now reflect the samplers; DX12 reached them through the
    // root signature rather than the stage register list, which is a difference
    // in declaration, not in inventory.
    "sampler:0:0",
    "sampler:0:1"
  ].sort();
  const inventory = pixelBindings.map((entry) =>
    `${entry?.kind}:${entry?.registerSpace}:${entry?.registerIndex}`).sort();
  if (JSON.stringify(inventory) !== JSON.stringify(expectedInventory))
  {
    fail("pixel analysis has an unexpected active binding inventory");
  }
  for (const expected of resources)
  {
    const matches = pixelBindings.filter((entry) =>
      entry?.kind === "resource"
        && entry.registerSpace === 0
        && entry.registerIndex === expected.registerIndex);
    const resource = matches[0];
    if (matches.length !== 1
      || resource.registerType !== (expected.viewDimension === "cube" ? 41 : 36)
      || resource.dynamic !== true
      || resource.carbon?.name !== expected.name
      || resource.carbon?.type !== (expected.viewDimension === "cube" ? 4 : 2)
      || resource.carbon?.arrayElements !== 1
      || resource.carbon?.isSRGB !== expected.isSRGB
      || resource.carbon?.isAutoregister !== expected.isAutoregister)
    {
      fail(`${expected.identity} must reflect the exact ${expected.name} resource`);
    }
  }
  // One assertion covers both backends, and `dynamic` is false on both. See
  // hasStaticSamplerState in quadV5Fixture.js for why the reflected state is
  // backend-identical and what `dynamic` means.
  const samplers = pixelBindings.filter((entry) => entry?.kind === "sampler");
  if (samplers.length !== 2)
  {
    fail("analysis must expose both static samplers");
  }
  for (let registerIndex = 0; registerIndex < 2; registerIndex += 1)
  {
    const sampler = samplers.find((entry) =>
      entry.registerSpace === 0 && entry.registerIndex === registerIndex);
    if (!sampler
      || sampler.registerType !== 1
      || sampler.dynamic !== false
      || (sampler.carbon?.name ?? null) !== null
      || !hasExactSamplerState(sampler.carbon?.sampler, registerIndex))
    {
      fail(`sampler s${registerIndex} has unexpected static state`);
    }
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
  if (!Array.isArray(bindings) || bindings.length !== 18)
  {
    fail("Main.pass0 requires exactly 18 canonical bindings");
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
    if (binding.layout.type !== `array<vec4<f32>, ${expected.vectors}>`
      || binding.layout.buffer.type !== "uniform"
      || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== expected.minBindingSize)
    {
      fail(`${expected.scopeIdentity} has an unexpected uniform layout`);
    }
  }
  const bone = byScope.get(BONE_TRANSFORMS.scopeIdentity);
  assertBindingSlot(bone, BONE_TRANSFORMS, "buffer", "vertex");
  if (bone.layout.type !== "array<u32>"
    || bone.layout.buffer.type !== "read-only-storage"
    || bone.layout.buffer.hasDynamicOffset !== false
    || bone.layout.buffer.minBindingSize !== BONE_TRANSFORMS.minBindingSize
    || bone.structureStride !== BONE_TRANSFORMS.structureStride)
  {
    fail("BoneTransforms has an unexpected read-only storage layout");
  }
  const resources = expectedResources(record.backend);
  for (const expected of resources)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "texture", "fragment");
    if (binding.layout.type !== `texture_${expected.viewDimension}<f32>`
      || binding.layout.texture.sampleType !== "float"
      || binding.layout.texture.viewDimension !== expected.viewDimension
      || binding.layout.texture.multisampled !== false
      || binding.isSRGB !== expected.isSRGB)
    {
      fail(`${expected.scopeIdentity} has an unexpected texture layout`);
    }
  }
  for (const expected of SAMPLERS)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "sampler", "fragment");
    if (binding.layout.type !== "sampler"
      || binding.layout.sampler.type !== "filtering")
    {
      fail(`${expected.scopeIdentity} has an unexpected sampler layout`);
    }
  }
  assertMaterialReflection(record);
  assertAnalysisBindings(record, resources);
}

/**
 * Fail closed unless the record is the exact medium-quality, PPT-off, skinned
 * QuadOilV5 Main.pass0 profile used by the live-ship gate.
 *
 * @param {object} record Resource provenance plus a pipeline descriptor.
 * @returns {object} The validated input record.
 */
export function validateQuadOilV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
  if (record.variant !== "skinned")
  {
    fail("package variant must be skinned");
  }
  if (record.backend !== "dx11" && record.backend !== "dx12")
  {
    fail("package backend must be dx11 or dx12");
  }
  const analysisSource = normalizedPath(record.analysis?.source);
  const metadataSource = normalizedPath(record.metadata?.sourcePath);
  if (!analysisSource
    || analysisSource !== metadataSource
    || !analysisSource.includes(`/effect.${record.backend}/`))
  {
    fail(`package source provenance must match ${record.backend}`);
  }
  if (!analysisSource.endsWith(
    "/managed/space/spaceobject/v5/quad/unpackedskinned_quadoilv5.sm_hi"
  ))
  {
    fail("package source must be unpackedskinned_quadoilv5.sm_hi");
  }
  if (record.analysis?.bodyIndex !== 0 || record.metadata?.bodyIndex !== 0)
  {
    fail("package must resolve body index 0");
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions");
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions");
  const selection = record.metadata.wgslSelection;
  if (selection?.mode !== "explicit"
    || selection.techniqueName !== "Main"
    || selection.passIndex !== 0
    || selection.completePasses !== true
    || JSON.stringify(selection.requestedStageNames)
      !== JSON.stringify([ "vertex", "pixel" ])
    || JSON.stringify(selection.selectedStageKeys)
      !== JSON.stringify([ "Main.pass0.vertex", "Main.pass0.pixel" ]))
  {
    fail("package selection must contain the explicit complete Main.pass0 pair");
  }
  const analysisPasses = record.analysis?.passes?.filter((entry) =>
    entry?.techniqueName === "Main");
  if (!Array.isArray(analysisPasses)
    || analysisPasses.length !== 1
    || analysisPasses[0].passIndex !== 0
    || analysisPasses[0].renderStates !== 1
    || !Array.isArray(analysisPasses[0].states)
    || analysisPasses[0].states.length !== 0)
  {
    fail("analysis must retain the state-free Main.pass0 contract");
  }
  const pipeline = record.pipeline;
  if (pipeline?.techniqueName !== "Main"
    || pipeline.passIndex !== 0
    || pipeline.renderStates !== 1
    || !Array.isArray(pipeline.states)
    || pipeline.states.length !== 0)
  {
    fail("pipeline must retain the state-free Main.pass0 contract");
  }
  assertInterfaces(record);
  assertShaderModules(pipeline);
  assertBindings(record);
  return record;
}

/**
 * Return backend-local resource identities for the shared synthetic fixture.
 *
 * @param {object} record One validated QuadOilV5 package record.
 * @returns {{bone: object, textures: object[], samplers: object[]}} Resource plan.
 */
export function getQuadOilV5ResourcePlan(record)
{
  validateQuadOilV5PackageRecord(record);
  return Object.freeze({
    bone: BONE_TRANSFORMS,
    textures: Object.freeze(expectedResources(record.backend)),
    samplers: SAMPLERS
  });
}

/**
 * Validate ordered and distinct DX11/DX12 records before claiming parity.
 *
 * @param {object[]} records Package records in DX11, DX12 order.
 * @returns {object[]} The validated input array.
 */
export function validateQuadOilV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  records.forEach(validateQuadOilV5PackageRecord);
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
  return Object.freeze({
    name,
    dimension: "2d",
    width,
    height,
    format,
    bytesPerRow,
    data
  });
}

function createOilMaterial(base)
{
  return Object.freeze(Object.fromEntries(MATERIAL_CONSTANTS.map(({ name }) => [
    name,
    base[name]
  ])));
}

/**
 * Create the synthetic skinned silhouette and two mip-clamped OilFilm lookup
 * variants. The two variants share every input except the lookup texture.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @returns {object} Frozen fixture values.
 */
export function createQuadOilV5FixtureValues(width, height)
{
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)
  {
    throw new TypeError("QuadOilV5 fixture dimensions must be positive integers");
  }
  const surface = createQuadV5FixtureValues(width, height, "skinned");
  const surfaceNames = new Set(RESOURCE_NAMES.filter((name) =>
    name !== "OilFilmLookupMap"));
  const textures = surface.textures.filter((entry) => surfaceNames.has(entry.name));
  if (textures.length !== surfaceNames.size)
  {
    fail("shared QuadV5 fixture does not expose every required surface texture");
  }
  const oilOff = rgbaTexture(
    "OilFilmLookupOff",
    "rgba8unorm-srgb",
    () => [ 0, 0, 0, 255 ]
  );
  const oilChromatic = rgbaTexture(
    "OilFilmLookupChromatic",
    "rgba8unorm-srgb",
    () => [ 255, 48, 224, 255 ]
  );
  const base = createQuadV5MainBindingValues(width, height);
  const oilSun = Object.freeze({
    ...base.perFramePS.Sun,
    DirWorld: Object.freeze([ -0.8660253882408142, 0, 0.5 ])
  });
  const bindingValues = Object.freeze({
    ...base,
    material: createOilMaterial(base.material),
    perFrameVS: Object.freeze({
      ...base.perFrameVS,
      Sun: oilSun
    }),
    perFramePS: Object.freeze({
      ...base.perFramePS,
      Sun: oilSun
    })
  });
  return Object.freeze({
    vertices: surface.vertices,
    boneIndices: surface.boneIndices,
    indices: surface.indices,
    bindingValues,
    textures: Object.freeze([ ...textures, oilOff, oilChromatic ]),
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
        name: "OilFilmSampler",
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "clamp-to-edge",
        maxAnisotropy: 16
      })
    ]),
    textureResourceVariants: Object.freeze({
      oilOff: Object.freeze({
        OilFilmLookupMap: "OilFilmLookupOff"
      }),
      oilChromatic: Object.freeze({
        OilFilmLookupMap: "OilFilmLookupChromatic"
      })
    })
  });
}
