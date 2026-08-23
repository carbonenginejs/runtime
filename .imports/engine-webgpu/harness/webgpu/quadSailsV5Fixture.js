import {
  QUADV5_CLEAR_TARGETS,
  QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT,
  QUADV5_TARGET_HEIGHT,
  QUADV5_TARGET_WIDTH,
  QUADV5_VERTEX_BUFFER_LAYOUT,
  createQuadV5FixtureValues,
  createQuadV5MainBindingValues
} from "./quadV5Fixture.js";

export const QUAD_SAILS_V5_TARGET_WIDTH = QUADV5_TARGET_WIDTH;
export const QUAD_SAILS_V5_TARGET_HEIGHT = QUADV5_TARGET_HEIGHT;
export const QUAD_SAILS_V5_VERTEX_BUFFER_LAYOUT = QUADV5_VERTEX_BUFFER_LAYOUT;
export const QUAD_SAILS_V5_SKINNED_VERTEX_BUFFER_LAYOUT =
  QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT;
export const QUAD_SAILS_V5_CLEAR_TARGETS = QUADV5_CLEAR_TARGETS;
export const QUAD_SAILS_V5_CASES = Object.freeze([ "unrotated", "authored" ]);

const SKINNED_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_ENABLED",
  V5_DEBUG: "OFF"
});

const STATIC_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_DISABLED",
  V5_DEBUG: "OFF",
  SPACE_OBJECT_INSTANCED_ATTACHMENT: "SOIA_DISABLED"
});

export const QUAD_SAILS_V5_SELECTIONS = Object.freeze({
  skinned: SKINNED_SELECTION,
  static: STATIC_SELECTION
});

// Retain the original export as the exact skinned contract.
export const QUAD_SAILS_V5_SELECTION = SKINNED_SELECTION;

const SKINNED_SELECTION_PROVENANCE = Object.freeze({
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
    optionIndex: 1,
    defaultOption: 0,
    defaultValue: "SOPPT_DISABLED"
  }),
  V5_DEBUG: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "OFF"
  })
});

const STATIC_SELECTION_PROVENANCE = Object.freeze({
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

const BASE_UNIFORMS = Object.freeze([
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
    minBindingSize: null
  }),
  Object.freeze({
    identity: "uniform-buffer:0:4",
    scopeIdentity: "uniform-buffer:0:4@fragment",
    binding: 4,
    visibility: "fragment",
    minBindingSize: 208
  })
]);

function uniformsFor(minBindingSize3)
{
  return BASE_UNIFORMS.map((entry) => Object.freeze({
    ...entry,
    minBindingSize: entry.binding === 3 ? minBindingSize3 : entry.minBindingSize
  }));
}

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
  "AlbedoMap",
  "RoughnessMap",
  "MaterialMap",
  "PaintMaskMap",
  "SailsDetailMap"
]);

const PROFILES = Object.freeze({
  skinned: Object.freeze({
    variant: "skinned",
    bodyIndex: 4,
    sourceFile: "unpackedskinned_quadsailsv5.sm_hi",
    selection: SKINNED_SELECTION,
    selectionProvenance: SKINNED_SELECTION_PROVENANCE,
    uniforms: Object.freeze(uniformsFor(432)),
    bone: BONE_TRANSFORMS,
    textureBindingBase: 6,
    samplerBinding: 16,
    pixelTailLocation: 9,
    resourceRegisters: Object.freeze({
      dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]),
      dx12: Object.freeze([ 0, 1, 2, 3, 4, 6, 7, 9, 10, 13 ])
    })
  }),
  static: Object.freeze({
    variant: "static",
    bodyIndex: 0,
    sourceFile: "unpacked_quadsailsv5.sm_hi",
    selection: STATIC_SELECTION,
    selectionProvenance: STATIC_SELECTION_PROVENANCE,
    uniforms: Object.freeze(uniformsFor(128)),
    bone: null,
    textureBindingBase: 5,
    samplerBinding: 15,
    pixelTailLocation: 8,
    resourceRegisters: Object.freeze({
      dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]),
      dx12: Object.freeze([ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11 ])
    })
  })
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
  Object.freeze({ name: "Mtl4Gloss", offset: 208 }),
  Object.freeze({ name: "SailsDetailData", offset: 448 })
]);

function fail(message)
{
  throw new Error(`QuadSailsV5 fixture: ${message}`);
}

function normalizedPath(value)
{
  return typeof value === "string" ? value.replace(/\\/gu, "/").toLowerCase() : "";
}

function profileForVariant(variant)
{
  const profile = PROFILES[variant];
  if (!profile) fail("package variant must be static or skinned");
  return profile;
}

function expectedResources(backend, profile)
{
  const registers = profile.resourceRegisters[backend];
  if (!registers) fail(`unsupported package backend ${String(backend)}`);
  return RESOURCE_NAMES.map((name, index) => Object.freeze({
    name,
    identity: `sampled-resource:0:${registers[index]}`,
    scopeIdentity: `sampled-resource:0:${registers[index]}@fragment`,
    registerIndex: registers[index],
    binding: profile.textureBindingBase + index,
    viewDimension: index === 0 ? "cube" : "2d",
    isSRGB: RESOURCE_SRGB[index],
    isAutoregister: name === "EveSpaceSceneShadowMap"
  }));
}

function expectedSampler(profile)
{
  return Object.freeze({
    name: "SurfaceSampler",
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    registerIndex: 0,
    binding: profile.samplerBinding
  });
}

function assertSelections(options, owner, profile)
{
  if (!Array.isArray(options) || options.length !== Object.keys(profile.selection).length)
  {
    fail(`${owner} must contain every QuadSailsV5 permutation selection`);
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
  for (const [ name, value ] of Object.entries(profile.selection))
  {
    const entry = selected.get(name);
    const provenance = profile.selectionProvenance[name];
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

function activeInterface(stage)
{
  return (stage.pipelineInputs || [])
    .filter((entry) => entry.usedMask !== 0)
    .map((entry) => ({
      usageName: entry.usageName,
      usageIndex: entry.usageIndex,
      registerIndex: entry.registerIndex,
      usedMask: entry.usedMask,
      type: entry.type,
      dimension: entry.dimension
    }))
    .sort((left, right) => left.registerIndex - right.registerIndex);
}

function assertVertexInputs(record, profile)
{
  const expected = [
    {
      usageName: "POSITION",
      usageIndex: 0,
      registerIndex: 0,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    ...(profile.bone ? [ {
      usageName: "BLENDINDICES",
      usageIndex: 0,
      registerIndex: 1,
      usedMask: 1,
      type: 2,
      dimension: 4
    } ] : []),
    {
      usageName: "TEXCOORD",
      usageIndex: 0,
      registerIndex: 2,
      usedMask: 3,
      type: 0,
      dimension: 2
    },
    {
      usageName: "NORMAL",
      usageIndex: 0,
      registerIndex: 3,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TANGENT",
      usageIndex: 0,
      registerIndex: 4,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "BITANGENT",
      usageIndex: 0,
      registerIndex: 5,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 1,
      registerIndex: 6,
      usedMask: 3,
      type: 0,
      dimension: 2
    }
  ];
  if (JSON.stringify(activeInterface(mainStage(record, "vertex"))) !== JSON.stringify(expected))
  {
    fail("Main.pass0.vertex has an unexpected active input contract");
  }
}

function assertPixelInputs(record, profile)
{
  const expected = [
    {
      usageName: "TEXCOORD",
      usageIndex: 0,
      registerIndex: 1,
      usedMask: 3,
      type: 0,
      dimension: 4
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 1,
      registerIndex: 2,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 2,
      registerIndex: 3,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 3,
      registerIndex: 4,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 4,
      registerIndex: 5,
      usedMask: 15,
      type: 0,
      dimension: 4
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 9,
      registerIndex: profile.pixelTailLocation,
      usedMask: 11,
      type: 0,
      dimension: 4
    }
  ];
  if (JSON.stringify(activeInterface(mainStage(record, "pixel"))) !== JSON.stringify(expected))
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

function assertShaderModules(pipeline, profile)
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
        ...(profile.bone ? [
          { attribute: "location", value: "1", name: "input1", type: "vec4<u32>" }
        ] : []),
        { attribute: "location", value: "2", name: "input2", type: "vec2<f32>" },
        { attribute: "location", value: "3", name: "input3", type: "vec3<f32>" },
        { attribute: "location", value: "4", name: "input4", type: "vec3<f32>" },
        { attribute: "location", value: "5", name: "input5", type: "vec3<f32>" },
        { attribute: "location", value: "6", name: "input6", type: "vec2<f32>" }
      ]);
      assertWgslStruct(matches[0].wgsl, "VertexOutput", [
        { attribute: "builtin", value: "position", name: "position", type: "vec4<f32>" },
        { attribute: "location", value: "1", name: "output1", type: "vec4<f32>" },
        { attribute: "location", value: "2", name: "output2", type: "vec3<f32>" },
        { attribute: "location", value: "3", name: "output3", type: "vec3<f32>" },
        { attribute: "location", value: "4", name: "output4", type: "vec3<f32>" },
        { attribute: "location", value: "5", name: "output5", type: "vec4<f32>" },
        { attribute: "location", value: "6", name: "output6", type: "vec4<f32>" },
        { attribute: "location", value: "7", name: "output7", type: "vec4<f32>" },
        { attribute: "location", value: "8", name: "output8", type: "vec4<f32>" },
        ...(profile.pixelTailLocation === 9 ? [
          { attribute: "location", value: "9", name: "output9", type: "vec4<f32>" }
        ] : [])
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
        {
          attribute: "location",
          value: String(profile.pixelTailLocation),
          name: `input${profile.pixelTailLocation}`,
          type: "vec4<f32>"
        }
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
    fail(`${expected.scopeIdentity} has an unexpected slot, scope, register, or visibility`);
  }
  const kinds = [ "buffer", "texture", "sampler" ].filter((key) => binding.layout?.[key]);
  if (kinds.length !== 1 || kinds[0] !== kind)
  {
    fail(`${expected.scopeIdentity} has an unexpected layout kind`);
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
    fail("pixel cb0 must expose the exact sparse 464-byte local material layout");
  }
  const constants = material[0].carbon.constants;
  if (!Array.isArray(constants) || constants.length !== MATERIAL_CONSTANTS.length)
  {
    fail("pixel cb0 has an unexpected sparse material constant count");
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

function hasExactSurfaceSampler(state)
{
  return Boolean(state)
    && state.comparison === false
    && state.minFilter === 3
    && state.magFilter === 2
    && state.mipFilter === 2
    && state.addressU === 1
    && state.addressV === 1
    && state.addressW === 3
    && state.mipLODBias === 0
    && state.maxAnisotropy === 16
    && state.isDynamic === false;
}

function assertAnalysisResources(record, resources, profile)
{
  const vertexBindings = mainStage(record, "vertex").bindings || [];
  const vertexInventory = vertexBindings.map((entry) =>
    `${entry?.kind}:${entry?.registerSpace}:${entry?.registerIndex}`).sort();
  const expectedVertexInventory = [
    "constantBuffer:0:1",
    "constantBuffer:0:3",
    ...(profile.bone ? [ "resource:0:0" ] : [])
  ].sort();
  if (JSON.stringify(vertexInventory) !== JSON.stringify(expectedVertexInventory))
  {
    fail("vertex analysis has an unexpected active binding inventory");
  }
  const bone = vertexBindings.filter((entry) =>
    entry?.kind === "resource"
      && entry.registerSpace === 0
      && entry.registerIndex === 0);
  if (profile.bone && (bone.length !== 1 || bone[0].registerType !== 33
    || bone[0].carbon?.name !== "BoneTransforms"
    || bone[0].carbon?.type !== 7
    || bone[0].carbon?.arrayElements !== 1
    || bone[0].carbon?.isSRGB !== false
    || bone[0].carbon?.isAutoregister !== false))
  {
    fail("vertex t0 BoneTransforms has unexpected Carbon metadata");
  }
  if (!profile.bone && bone.length !== 0)
  {
    fail("static vertex analysis must not contain BoneTransforms");
  }

  const bindings = mainStage(record, "pixel").bindings || [];
  const pixelInventory = bindings.map((entry) =>
    `${entry?.kind}:${entry?.registerSpace}:${entry?.registerIndex}`).sort();
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
    const expectedRegisterType = expected.viewDimension === "cube" ? 41 : 36;
    if (matches.length !== 1 || matches[0].registerType !== expectedRegisterType
      || carbon?.name !== expected.name
      || carbon.type !== expectedType || carbon.arrayElements !== 1
      || carbon.isSRGB !== expected.isSRGB
      || carbon.isAutoregister !== expected.isAutoregister)
    {
      fail(`${expected.identity} must reflect the exact ${expected.name} resource`);
    }
  }
  // One assertion for both backends. DX12 declares this sampler in the root
  // signature and DX11 as a stage register, but the reflected state is now
  // identical, so branching would only hide a future divergence.
  const samplers = bindings.filter((entry) => entry?.kind === "sampler");
  if (samplers.length !== 1 || samplers[0].registerSpace !== 0
    || samplers[0].registerIndex !== 0
    || samplers[0].registerType !== 1
    || (samplers[0].carbon?.name ?? null) !== null
    || !hasExactSurfaceSampler(samplers[0].carbon?.sampler))
  {
    fail("sampler s0 has unexpected static state");
  }
}

function assertBindings(record, profile)
{
  const groups = record.pipeline?.bindGroups;
  if (!Array.isArray(groups) || groups.length !== 1 || groups[0]?.group !== 0)
  {
    fail("Main.pass0 requires exactly canonical bind group 0");
  }
  const bindings = groups[0].bindings;
  const resources = expectedResources(record.backend, profile);
  const sampler = expectedSampler(profile);
  if (!Array.isArray(bindings)
    || bindings.length !== profile.uniforms.length
      + (profile.bone ? 1 : 0) + resources.length + 1)
  {
    fail(
      `Main.pass0 requires exactly ${profile.bone ? 17 : 16} canonical bindings`
    );
  }
  const byScope = new Map(bindings.map((entry) => [ entry.scopeIdentity, entry ]));
  if (byScope.size !== bindings.length)
  {
    fail("Main.pass0 contains duplicate binding scopes");
  }
  for (const expected of profile.uniforms)
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
  const bone = byScope.get(BONE_TRANSFORMS.scopeIdentity);
  if (profile.bone)
  {
    assertBindingSlot(bone, BONE_TRANSFORMS, "buffer", "vertex");
    if (bone.layout.buffer.type !== "read-only-storage"
      || bone.layout.buffer.hasDynamicOffset !== false
      || bone.layout.buffer.minBindingSize !== BONE_TRANSFORMS.minBindingSize
      || bone.structureStride !== BONE_TRANSFORMS.structureStride)
    {
      fail("BoneTransforms has an unexpected read-only storage layout");
    }
  }
  else if (bone)
  {
    fail("static Main.pass0 must not bind BoneTransforms");
  }
  for (const expected of resources)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "texture", "fragment");
    if (binding.layout.texture.sampleType !== "float"
      || binding.layout.texture.viewDimension !== expected.viewDimension
      || binding.layout.texture.multisampled !== false
      || binding.layout.type !== `texture_${expected.viewDimension}<f32>`
      || binding.isSRGB !== expected.isSRGB)
    {
      fail(`${expected.identity} has an unexpected texture layout`);
    }
  }
  const samplerBinding = byScope.get(sampler.scopeIdentity);
  assertBindingSlot(samplerBinding, sampler, "sampler", "fragment");
  if (samplerBinding.layout.sampler.type !== "filtering")
  {
    fail("sampler:0:0 has an unexpected sampler layout");
  }
  assertMaterialReflection(record);
  assertAnalysisResources(record, resources, profile);
}

/**
 * Return the caller-owned raster recipe used by the synthetic gate. The
 * package's separate RS_ZWRITEENABLE state is validated but requires a depth
 * attachment to exercise in a runner.
 *
 * @returns {{frontFace: string, cullMode: string}} Frozen primitive recipe.
 */
export function getQuadSailsV5PrimitiveRecipe()
{
  return Object.freeze({ frontFace: "cw", cullMode: "back" });
}

/**
 * Fail closed unless the record is one exact medium-quality, whole-Main
 * QuadSailsV5 profile: PPT-on body 4 skinned, or PPT-off body 0 static.
 *
 * @param {object} record Resource provenance plus a pipeline descriptor.
 * @returns {object} The validated input record.
 */
export function validateQuadSailsV5PackageRecord(record)
{
  if (!record || typeof record !== "object") fail("package record is required");
  const profile = profileForVariant(record.variant);
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
    `/managed/space/spaceobject/v5/quad/${profile.sourceFile}`
  ))
  {
    fail(`package source must be the medium-quality ${profile.sourceFile} ship shader`);
  }
  if (record.analysis?.bodyIndex !== profile.bodyIndex
    || record.metadata?.bodyIndex !== profile.bodyIndex)
  {
    fail(`package must resolve body index ${profile.bodyIndex}`);
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions", profile);
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions", profile);
  // Build-time selection policy is not asserted; see quadHeatV5Fixture.js. The
  // container reconstructs `passIndex` and `requestedStageNames` from what the
  // package holds, so neither can carry the caller's original request.
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
  const expectedStates = [ { state: 14, value: 1 } ];
  if (!Array.isArray(analysisPasses) || analysisPasses.length !== 1
    || analysisPasses[0].passIndex !== 0 || analysisPasses[0].renderStates !== 1
    || JSON.stringify(analysisPasses[0].states) !== JSON.stringify(expectedStates))
  {
    fail("analysis must retain Main.pass0 RS_ZWRITEENABLE=1");
  }
  const pipeline = record.pipeline;
  if (pipeline?.techniqueName !== "Main" || pipeline.passIndex !== 0
    || pipeline.renderStates !== 1
    || JSON.stringify(pipeline.states) !== JSON.stringify(expectedStates))
  {
    fail("pipeline Main.pass0 must retain RS_ZWRITEENABLE=1");
  }
  assertVertexInputs(record, profile);
  assertPixelInputs(record, profile);
  assertShaderModules(pipeline, profile);
  assertBindings(record, profile);
  return record;
}

/**
 * Return backend-local binding identities for the shared semantic fixture.
 *
 * @param {object} record One validated QuadSailsV5 package record.
 * @returns {{bone: object|null, textures: object[], samplers: object[]}} Frozen resource plan.
 */
export function getQuadSailsV5ResourcePlan(record)
{
  validateQuadSailsV5PackageRecord(record);
  const profile = profileForVariant(record.variant);
  return Object.freeze({
    bone: profile.bone,
    textures: Object.freeze(expectedResources(record.backend, profile)),
    samplers: Object.freeze([ expectedSampler(profile) ])
  });
}

/**
 * Validate ordered and distinct DX11/DX12 records before claiming parity.
 *
 * @param {object[]} records Package records in DX11, DX12 order.
 * @returns {object[]} The validated input array.
 */
export function validateQuadSailsV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  if (records[0]?.variant !== records[1]?.variant)
  {
    fail("comparison requires matching package variants");
  }
  records.forEach(validateQuadSailsV5PackageRecord);
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

function createSailsMaterial(base, sailsDetailData)
{
  return Object.freeze({
    GeneralGlowColor: base.GeneralGlowColor,
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
    SailsDetailData: sailsDetailData
  });
}

function createSailsBindingCase(base, sailsDetailData)
{
  return Object.freeze({
    ...base,
    material: createSailsMaterial(base.material, sailsDetailData)
  });
}

/**
 * Create two otherwise-identical semantic binding cases that isolate only the
 * authored SailsDetailData rotation. Geometry and PaintMask coverage are
 * shared between the cases.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @returns {{caseNames: readonly string[], bindingValuesByCase: Readonly<Record<string, object>>}}
 * Frozen case names and binding values.
 */
export function createQuadSailsV5BindingCases(width, height)
{
  const shared = createQuadV5MainBindingValues(width, height);
  const unrotated = Object.freeze([ 16, 0, 1, 0.65 ]);
  const authored = Object.freeze([ 16, 1.570796012878418, 1, 0.65 ]);
  return Object.freeze({
    caseNames: QUAD_SAILS_V5_CASES,
    bindingValuesByCase: Object.freeze({
      unrotated: createSailsBindingCase(shared, unrotated),
      authored: createSailsBindingCase(shared, authored)
    })
  });
}

/**
 * Create deterministic QuadV5 geometry plus the exact active Sails texture
 * inventory for one explicit static or skinned profile. The authored
 * silhouette and surface textures are shared with QuadV5; only SailsDetailMap
 * is specific to this fixture.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @param {"static"|"skinned"} variant Exact package/geometry variant.
 * @returns {object} Typed-array fixture values.
 */
export function createQuadSailsV5FixtureValues(width, height, variant)
{
  const profile = profileForVariant(variant);
  const surface = createQuadV5FixtureValues(width, height, profile.variant);
  const requiredSurfaceNames = new Set(RESOURCE_NAMES.filter((name) =>
    name !== "SailsDetailMap"));
  const textures = surface.textures
    .filter((entry) => requiredSurfaceNames.has(entry.name))
    .map((entry) => profile.variant === "static" && entry.name === "MaterialMap"
      ? rgbaTexture("MaterialMap", () => [ 0, 255, 128, 255 ])
      : entry);
  if (textures.length !== requiredSurfaceNames.size)
  {
    fail("shared QuadV5 fixture does not expose every required surface texture");
  }
  const sailsDetail = rgbaTexture("SailsDetailMap", (x, y) => [
    24 + ((x * 37 + y * 19 + x * y * 7) % 208),
    32 + ((x * 13 + y * 47) % 192),
    224 - ((x * 17 + y * 11) % 160),
    255
  ]);
  const cases = createQuadSailsV5BindingCases(width, height);
  return Object.freeze({
    vertices: surface.vertices,
    boneIndices: profile.bone ? surface.boneIndices : null,
    indices: surface.indices,
    textures: Object.freeze([ ...textures, sailsDetail ]),
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
    caseNames: cases.caseNames,
    bindingValuesByCase: cases.bindingValuesByCase
  });
}
