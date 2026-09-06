import {
  QUADV5_TARGET_HEIGHT,
  QUADV5_TARGET_WIDTH,
  QUADV5_VERTEX_BUFFER_LAYOUT,
  createQuadV5FixtureValues,
  createQuadV5MainBindingValues
} from "./quadV5Fixture.js";

const TARGET_BODY_INDEX = 4;

export const QUAD_DETAIL_V5_TARGET_WIDTH = QUADV5_TARGET_WIDTH;
export const QUAD_DETAIL_V5_TARGET_HEIGHT = QUADV5_TARGET_HEIGHT;
export const QUAD_DETAIL_V5_VERTEX_BUFFER_LAYOUT = QUADV5_VERTEX_BUFFER_LAYOUT;

const STATIC_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_ENABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF",
  SPACE_OBJECT_INSTANCED_ATTACHMENT: "SOIA_DISABLED",
  BLEND_MODE: "BLEND_MODE_OVERLAY"
});

const SKINNED_SELECTION = Object.freeze({
  BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
  SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
  SPACE_OBJECT_PPT_ENABLED: "SOPPT_ENABLED",
  SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
  V5_DEBUG: "OFF",
  BLEND_MODE: "BLEND_MODE_OVERLAY"
});

export const QUAD_DETAIL_V5_SELECTIONS = Object.freeze({
  static: STATIC_SELECTION,
  skinned: SKINNED_SELECTION
});

// Retain the original export as the exact static contract.
export const QUAD_DETAIL_V5_SELECTION = STATIC_SELECTION;

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
    optionIndex: 1,
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
  }),
  BLEND_MODE: Object.freeze({
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "BLEND_MODE_OVERLAY"
  })
});

const BASE_UNIFORMS = Object.freeze([
  Object.freeze({
    identity: "uniform-buffer:0:0",
    scopeIdentity: "uniform-buffer:0:0@fragment",
    binding: 0,
    visibility: "fragment",
    minBindingSize: 608
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
    minBindingSize: 432
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
  "PatternMask1Map",
  "PatternMask2Map",
  "Detail1Map",
  "Detail2Map",
  "Detail3Map"
]);

const RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15 ])
});

// High (.sm_depth) adds the same six bindings the Quad V5 High tier adds -
// DustNoiseMap and DirtMap mid-sequence, the two forward-light storage buffers,
// LightProfileArray, and a fourth sampler - on top of the detail merge. It is
// therefore the only body that carries both a transform and the light set, which
// is why Stage 5b's gate names it rather than the Medium tier.
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
  "PatternMask2Map",
  "Detail1Map",
  "Detail2Map",
  "Detail3Map"
]);

// dx11 runs 0..18 contiguously. dx12 fills the holes Medium leaves at 5 and 8,
// then skips 13 before the light set, so the two backends diverge only after the
// textures.
const HIGH_RESOURCE_REGISTERS = Object.freeze({
  dx11: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18 ]),
  dx12: Object.freeze([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 19 ])
});

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

// A source-declared array texture: it keeps its binding and carries no transform,
// so it needs no assembly even though it sits beside one that does.
const HIGH_ARRAY_RESOURCES = Object.freeze([
  Object.freeze({
    name: "LightProfileArray",
    viewDimension: "2d-array",
    registers: Object.freeze({ dx11: 15, dx12: 16 })
  })
]);

const TIER_BY_SUFFIX = Object.freeze({
  sm_depth: "high",
  sm_hi: "medium",
  sm_lo: "low"
});

// The tier is a property of the compiled source, so it is read from the path the
// package carries rather than passed in beside it.
function tierFromSource(analysisSource, stem)
{
  const match = new RegExp(`/${stem}\\.([a-z_0-9]+)$`, "u").exec(analysisSource ?? "");
  const tier = match ? TIER_BY_SUFFIX[match[1]] : undefined;
  if (!tier)
  {
    fail(`package source must name a known quality tier, not ${String(analysisSource)}`);
  }
  return tier;
}

const BASE_SAMPLERS = Object.freeze([
  Object.freeze({
    name: "Sampler0",
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    registerIndex: 0,
    reflectedName: null,
    isDynamic: false
  }),
  Object.freeze({
    name: "PatternMask1MapSampler",
    identity: "sampler:0:1",
    scopeIdentity: "sampler:0:1@fragment",
    registerIndex: 1,
    reflectedName: "PatternMask1MapSampler",
    isDynamic: true
  }),
  Object.freeze({
    name: "PatternMask2MapSampler",
    identity: "sampler:0:2",
    scopeIdentity: "sampler:0:2@fragment",
    registerIndex: 2,
    reflectedName: "PatternMask2MapSampler",
    isDynamic: true
  })
]);

// s3 samples the light profile array: linear, no mip filter, clamped on every
// axis. It is not a copy of s0, so its state is carried per sampler.
const HIGH_LIGHT_SAMPLER = Object.freeze({
  name: "Sampler3",
  identity: "sampler:0:3",
  scopeIdentity: "sampler:0:3@fragment",
  registerIndex: 3,
  reflectedName: null,
  isDynamic: false,
  filters: Object.freeze({
    minFilter: 2, magFilter: 2, mipFilter: 0,
    addressU: 3, addressV: 3, addressW: 3
  })
});

const HIGH_SAMPLERS = Object.freeze([ ...BASE_SAMPLERS, HIGH_LIGHT_SAMPLER ]);

const PROFILES = Object.freeze({
  static: Object.freeze({
    variant: "static",
    sourceStem: "unpacked_quaddetailv5",
    selection: STATIC_SELECTION,
    uniforms: Object.freeze(uniformsFor(416)),
    bone: null,
    textureBindingBase: 5
  }),
  skinned: Object.freeze({
    variant: "skinned",
    sourceStem: "unpackedskinned_quaddetailv5",
    selection: SKINNED_SELECTION,
    uniforms: Object.freeze(uniformsFor(432)),
    bone: BONE_TRANSFORMS,
    textureBindingBase: 6
  })
});

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
  Object.freeze({ name: "Mtl4Gloss", offset: 208 }),
  Object.freeze({ name: "PMtl1DiffuseColor", offset: 288 }),
  Object.freeze({ name: "PMtl1FresnelColor", offset: 304 }),
  Object.freeze({ name: "PMtl1Gloss", offset: 320 }),
  Object.freeze({ name: "PMtl2DiffuseColor", offset: 336 }),
  Object.freeze({ name: "PMtl2FresnelColor", offset: 352 }),
  Object.freeze({ name: "PMtl2Gloss", offset: 368 }),
  Object.freeze({ name: "Detail1Data", offset: 448 }),
  Object.freeze({ name: "Detail2Data", offset: 464 }),
  Object.freeze({ name: "Detail3Data", offset: 480 }),
  Object.freeze({ name: "DetailAlbedoColor", offset: 496 }),
  Object.freeze({ name: "DetailFresnelColor", offset: 512 }),
  Object.freeze({ name: "DetailSelector", offset: 592 })
]);

// High keeps the same sparse 608-byte footprint and fills the 64-byte hole at 224
// with the four dust colors. Those four are body-gated rather than tier-gated -
// Medium reaches them at V5_DEBUG=ON - but this fixture pins body 4 at
// V5_DEBUG=OFF, where the tier does decide.
const HIGH_MATERIAL_CONSTANTS = Object.freeze([
  ...MATERIAL_CONSTANTS.slice(0, 14),
  Object.freeze({ name: "Mtl1DustDiffuseColor", offset: 224 }),
  Object.freeze({ name: "Mtl2DustDiffuseColor", offset: 240 }),
  Object.freeze({ name: "Mtl3DustDiffuseColor", offset: 256 }),
  Object.freeze({ name: "Mtl4DustDiffuseColor", offset: 272 }),
  ...MATERIAL_CONSTANTS.slice(14)
]);

const VERTEX_INPUTS = Object.freeze([
  Object.freeze({
    usageName: "POSITION",
    usageIndex: 0,
    registerIndex: 0,
    usedMask: 7,
    type: 0,
    dimension: 3
  }),
  Object.freeze({
    usageName: "BLENDINDICES",
    usageIndex: 0,
    registerIndex: 1,
    usedMask: 0,
    type: 2,
    dimension: 4
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 0,
    registerIndex: 2,
    usedMask: 3,
    type: 0,
    dimension: 2
  }),
  Object.freeze({
    usageName: "NORMAL",
    usageIndex: 0,
    registerIndex: 3,
    usedMask: 7,
    type: 0,
    dimension: 3
  }),
  Object.freeze({
    usageName: "TANGENT",
    usageIndex: 0,
    registerIndex: 4,
    usedMask: 7,
    type: 0,
    dimension: 3
  }),
  Object.freeze({
    usageName: "BITANGENT",
    usageIndex: 0,
    registerIndex: 5,
    usedMask: 7,
    type: 0,
    dimension: 3
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 1,
    registerIndex: 6,
    usedMask: 3,
    type: 0,
    dimension: 2
  })
]);

const SKINNED_VERTEX_INPUTS = Object.freeze(VERTEX_INPUTS.map((entry) =>
  Object.freeze({
    ...entry,
    usedMask: entry.registerIndex === 1 ? 1 : entry.usedMask
  })));

const PIXEL_INPUTS = Object.freeze([
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 0,
    registerIndex: 1,
    usedMask: 3,
    type: 0,
    dimension: 4
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 1,
    registerIndex: 2,
    usedMask: 7,
    type: 0,
    dimension: 3
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 2,
    registerIndex: 3,
    usedMask: 7,
    type: 0,
    dimension: 3
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 3,
    registerIndex: 4,
    usedMask: 7,
    type: 0,
    dimension: 3
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 4,
    registerIndex: 5,
    usedMask: 15,
    type: 0,
    dimension: 4
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 5,
    registerIndex: 6,
    usedMask: 0,
    type: 0,
    dimension: 4
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 6,
    registerIndex: 7,
    usedMask: 15,
    type: 0,
    dimension: 4
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 8,
    registerIndex: 8,
    usedMask: 0,
    type: 0,
    dimension: 4
  }),
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 9,
    registerIndex: 9,
    usedMask: 11,
    type: 0,
    dimension: 4
  })
]);

// High carries one extra interpolant. The vertex interface is unchanged, so this
// is the only interface difference between the tiers.
const HIGH_PIXEL_INPUTS = Object.freeze([
  ...PIXEL_INPUTS,
  Object.freeze({
    usageName: "TEXCOORD",
    usageIndex: 11,
    registerIndex: 10,
    usedMask: 7,
    type: 0,
    dimension: 3
  })
]);

const WGSL_STRUCTS = Object.freeze({
  VertexInput: Object.freeze([
    Object.freeze({
      attribute: "location",
      value: "0",
      name: "input0",
      type: "vec3<f32>"
    }),
    Object.freeze({
      attribute: "location",
      value: "2",
      name: "input2",
      type: "vec2<f32>"
    }),
    Object.freeze({
      attribute: "location",
      value: "3",
      name: "input3",
      type: "vec3<f32>"
    }),
    Object.freeze({
      attribute: "location",
      value: "4",
      name: "input4",
      type: "vec3<f32>"
    }),
    Object.freeze({
      attribute: "location",
      value: "5",
      name: "input5",
      type: "vec3<f32>"
    }),
    Object.freeze({
      attribute: "location",
      value: "6",
      name: "input6",
      type: "vec2<f32>"
    })
  ]),
  VertexOutput: Object.freeze([
    Object.freeze({
      attribute: "builtin",
      value: "position",
      name: "position",
      type: "vec4<f32>"
    }),
    ...Object.freeze([
      [ 1, "vec4<f32>" ],
      [ 2, "vec3<f32>" ],
      [ 3, "vec3<f32>" ],
      [ 4, "vec3<f32>" ],
      [ 5, "vec4<f32>" ],
      [ 6, "vec4<f32>" ],
      [ 7, "vec4<f32>" ],
      [ 8, "vec4<f32>" ],
      [ 9, "vec4<f32>" ]
    ]).map(([ location, type ]) => Object.freeze({
      attribute: "location",
      value: String(location),
      name: `output${location}`,
      type
    }))
  ]),
  FragmentInput: Object.freeze([
    Object.freeze({
      attribute: "builtin",
      value: "position",
      name: "position",
      type: "vec4<f32>"
    }),
    ...Object.freeze([
      [ 1, "vec4<f32>" ],
      [ 2, "vec3<f32>" ],
      [ 3, "vec3<f32>" ],
      [ 4, "vec3<f32>" ],
      [ 5, "vec4<f32>" ],
      [ 7, "vec4<f32>" ],
      [ 9, "vec4<f32>" ]
    ]).map(([ location, type ]) => Object.freeze({
      attribute: "location",
      value: String(location),
      name: `input${location}`,
      type
    }))
  ]),
  FragmentOutput: Object.freeze([
    Object.freeze({
      attribute: "location",
      value: "0",
      name: "output0",
      type: "vec4<f32>"
    }),
    Object.freeze({
      attribute: "location",
      value: "1",
      name: "output1",
      type: "vec4<f32>"
    })
  ])
});

const SKINNED_WGSL_STRUCTS = Object.freeze({
  ...WGSL_STRUCTS,
  VertexInput: Object.freeze([
    WGSL_STRUCTS.VertexInput[0],
    Object.freeze({
      attribute: "location",
      value: "1",
      name: "input1",
      type: "vec4<u32>"
    }),
    ...WGSL_STRUCTS.VertexInput.slice(1)
  ])
});

// High carries the extra interpolant through to WGSL as location 10 on both sides
// of the vertex/fragment boundary. The vertex input and fragment output are
// unchanged, so this is applied as a delta rather than a second full table.
function highWgslStructs(structs)
{
  return Object.freeze({
    ...structs,
    VertexOutput: Object.freeze([
      ...structs.VertexOutput,
      Object.freeze({
        attribute: "location",
        value: "10",
        name: "output10",
        type: "vec3<f32>"
      })
    ]),
    FragmentInput: Object.freeze([
      ...structs.FragmentInput,
      Object.freeze({
        attribute: "location",
        value: "10",
        name: "input10",
        type: "vec3<f32>"
      })
    ])
  });
}

const CASE_NAMES = Object.freeze([ "pptNeutral", "surface", "detail1", "detail2" ]);

function fail(message)
{
  throw new Error(`QuadDetailV5 fixture: ${message}`);
}

function profileForVariant(variant)
{
  const profile = PROFILES[variant];
  if (!profile) fail("package variant must be static or skinned");
  return profile;
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

function assertMainStageInventory(record)
{
  const stages = record.analysis?.stages?.filter((entry) =>
    entry?.techniqueName === "Main");
  const expected = [
    {
      key: "Main.pass0.vertex",
      passIndex: 0,
      stageName: "vertex",
      stageType: 0
    },
    {
      key: "Main.pass0.pixel",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1
    }
  ];
  if (!Array.isArray(stages) || stages.length !== expected.length)
  {
    fail("analysis must expose exactly the Main.pass0 vertex/pixel stage pair");
  }
  for (let index = 0; index < expected.length; index += 1)
  {
    const stage = stages[index];
    const entry = expected[index];
    if (stage?.key !== entry.key || stage.passIndex !== entry.passIndex
      || stage.stageName !== entry.stageName || stage.stageType !== entry.stageType)
    {
      fail("analysis has an unexpected Main stage inventory");
    }
  }
}

function assertSelections(options, owner, profile)
{
  if (!Array.isArray(options)
    || options.length !== Object.keys(profile.selection).length)
  {
    fail(`${owner} must contain every QuadDetailV5 permutation selection`);
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

function assertAnalysisInterface(record, profile, tier)
{
  const vertex = mainStage(record, "vertex").pipelineInputs?.map(interfaceInput);
  const pixel = mainStage(record, "pixel").pipelineInputs?.map(interfaceInput);
  const expectedVertex = profile.bone ? SKINNED_VERTEX_INPUTS : VERTEX_INPUTS;
  const expectedPixel = tier === "high" ? HIGH_PIXEL_INPUTS : PIXEL_INPUTS;
  if (JSON.stringify(vertex) !== JSON.stringify(expectedVertex))
  {
    fail("Main.pass0.vertex has an unexpected exact input contract");
  }
  if (JSON.stringify(pixel) !== JSON.stringify(expectedPixel))
  {
    fail("Main.pass0.pixel has an unexpected exact input contract");
  }
}

function wgslStructFields(wgsl, name)
{
  const match = new RegExp(`struct\\s+${name}\\s*\\{([^}]*)\\};`, "u").exec(wgsl);
  if (!match) fail(`WGSL is missing ${name}`);
  const annotations = match[1].match(/@(location|builtin)\(/gu) || [];
  const fields = [ ...match[1].matchAll(
    /(?:@invariant\s+)?@(location|builtin)\(([^)]+)\)\s+([A-Za-z_][A-Za-z0-9_]*):\s*([^,\r\n]+),/gu
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

function assertShaderModules(pipeline, profile, tier)
{
  if (!Array.isArray(pipeline.shaderModules) || pipeline.shaderModules.length !== 2)
  {
    fail("Main.pass0 requires exactly vertex and pixel modules");
  }
  const expectations = [
    [ "vertex", 0, [ "VertexInput", "VertexOutput" ] ],
    [ "pixel", 1, [ "FragmentInput", "FragmentOutput" ] ]
  ];
  const baseStructs = profile.bone ? SKINNED_WGSL_STRUCTS : WGSL_STRUCTS;
  const expectedStructs = tier === "high" ? highWgslStructs(baseStructs) : baseStructs;
  for (const [ stageName, stageType, structNames ] of expectations)
  {
    const matches = pipeline.shaderModules.filter((entry) => entry?.stageName === stageName);
    const module = matches[0];
    if (matches.length !== 1 || typeof module?.wgsl !== "string" || !module.wgsl
      || module.key !== `Main.pass0.${stageName}`
      || module.techniqueName !== "Main" || module.passIndex !== 0
      || module.stageType !== stageType || module.entryPoint !== "main")
    {
      fail(`Main.pass0 requires one complete ${stageName} module`);
    }
    for (const structName of structNames)
    {
      if (JSON.stringify(wgslStructFields(module.wgsl, structName))
        !== JSON.stringify(expectedStructs[structName]))
      {
        fail(`${structName} has an unexpected interface contract`);
      }
    }
  }
}

// The producer merges all three detail maps into one 2d-array binding in
// Detail1Map's slot and removes the other two bindings, so the layout is two
// bindings shorter than the reflection. Sampler slots are therefore derived from
// the post-transform texture count rather than tabulated.
const DETAIL_MERGE = Object.freeze({
  // Renamed by runtime-resource 866c5c8 (2026-08-02); this pin predated it and
  // held the old spelling. The name is a read-side default restored from the
  // family, never carried on the wire, so it moves whenever that table does.
  outputName: "DetailArrayMap",
  inputParameters: Object.freeze([ "Detail1Map", "Detail2Map", "Detail3Map" ]),
  viewDimension: "2d-array",
  layerCount: 3,
  representation: "native-or-rgba8",
  missingLayer: "reject",
  stage: "fragment",
  kind: "texture-2d-array",
  version: 1
});

// Derived from the name rather than the list position: High inserts DustNoiseMap
// and DirtMap mid-sequence, so any index-keyed table silently misattributes sRGB
// and the cube to whichever resource happens to land in the old slot.
const CUBE_RESOURCE_NAME = "EveSpaceSceneEnvMap";
const SRGB_RESOURCE_NAMES = new Set([ CUBE_RESOURCE_NAME, "AlbedoMap" ]);

function detailResource(name, registerIndex, binding, index, extra = {})
{
  const cube = name === CUBE_RESOURCE_NAME;
  return Object.freeze({
    name,
    identity: `sampled-resource:0:${registerIndex}`,
    scopeIdentity: `sampled-resource:0:${registerIndex}@fragment`,
    registerIndex,
    binding,
    viewDimension: cube ? "cube" : "2d",
    registerType: cube ? 41 : 36,
    carbonType: cube ? 4 : 2,
    isSRGB: SRGB_RESOURCE_NAMES.has(name),
    isAutoregister: name === "EveSpaceSceneShadowMap",
    ...extra
  });
}

function tierNames(tier)
{
  return tier === "high" ? HIGH_RESOURCE_NAMES : RESOURCE_NAMES;
}

function tierRegisters(backend, tier)
{
  const registers = (tier === "high" ? HIGH_RESOURCE_REGISTERS : RESOURCE_REGISTERS)[backend];
  if (!registers) fail(`unsupported package backend ${String(backend)}`);
  return registers;
}

function tierSamplers(tier)
{
  return tier === "high" ? HIGH_SAMPLERS : BASE_SAMPLERS;
}

// Reflection order, before the merge: every declared fragment resource. At High
// the forward-light set sits between the surface textures and the detail maps.
function expectedAnalysisResources(backend, tier)
{
  const names = tierNames(tier);
  const registers = tierRegisters(backend, tier);
  const surfaceCount = names.length - DETAIL_MERGE.inputParameters.length;
  const resources = names.slice(0, surfaceCount).map((name, index) =>
    detailResource(name, registers[index], null, index));
  if (tier === "high")
  {
    for (const entry of HIGH_STORAGE_RESOURCES)
    {
      resources.push(detailResource(entry.name, entry.registers[backend], null, 1, {
        registerType: 33,
        carbonType: 7,
        isSRGB: false,
        isAutoregister: true,
        minBindingSize: entry.minBindingSize,
        structureStride: entry.structureStride
      }));
    }
    for (const entry of HIGH_ARRAY_RESOURCES)
    {
      resources.push(detailResource(entry.name, entry.registers[backend], null, 1, {
        viewDimension: entry.viewDimension,
        registerType: 37,
        carbonType: 5,
        isSRGB: false,
        isAutoregister: true
      }));
    }
  }
  for (let offset = 0; offset < DETAIL_MERGE.inputParameters.length; offset += 1)
  {
    const index = surfaceCount + offset;
    resources.push(detailResource(names[index], registers[index], null, index));
  }
  return resources;
}

function expectedResources(backend, profile, tier)
{
  const names = tierNames(tier);
  const registers = tierRegisters(backend, tier);
  const surfaceCount = names.length - DETAIL_MERGE.inputParameters.length;
  const textures = [];
  let slot = profile.textureBindingBase;
  for (let index = 0; index < surfaceCount; index += 1)
  {
    textures.push(detailResource(names[index], registers[index], slot, index));
    slot += 1;
  }
  const storage = [];
  if (tier === "high")
  {
    for (const entry of HIGH_STORAGE_RESOURCES)
    {
      storage.push(detailResource(entry.name, entry.registers[backend], slot, 1, {
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
      textures.push(detailResource(entry.name, entry.registers[backend], slot, 1, {
        viewDimension: entry.viewDimension,
        registerType: 37,
        carbonType: 5,
        isSRGB: false,
        isAutoregister: true
      }));
      slot += 1;
    }
  }
  // The merge collapses the detail maps into one array binding in layer 0's slot.
  textures.push(detailResource(DETAIL_MERGE.outputName, registers[surfaceCount], slot, 1, {
    viewDimension: DETAIL_MERGE.viewDimension,
    isSRGB: false,
    arrayLayerCount: DETAIL_MERGE.layerCount
  }));
  slot += 1;
  return { textures, storage, samplerBase: slot };
}

function expectedTransforms(backend, profile, tier)
{
  const names = tierNames(tier);
  const registers = tierRegisters(backend, tier);
  const output = expectedResources(backend, profile, tier).textures
    .find((entry) => entry.name === DETAIL_MERGE.outputName);
  if (!output) fail("the QuadDetailV5 layout must expose the merged detail array");
  return [ Object.freeze({
    id: `Main.pass0:detail-map-array:${output.identity}`,
    kind: DETAIL_MERGE.kind,
    version: DETAIL_MERGE.version,
    layoutKey: "Main.pass0",
    stage: DETAIL_MERGE.stage,
    representation: DETAIL_MERGE.representation,
    missingLayer: DETAIL_MERGE.missingLayer,
    group: 0,
    binding: output.binding,
    output: Object.freeze({
      name: DETAIL_MERGE.outputName,
      identity: output.identity,
      scopeIdentity: output.scopeIdentity,
      viewDimension: DETAIL_MERGE.viewDimension,
      layerCount: DETAIL_MERGE.layerCount
    }),
    inputs: Object.freeze(DETAIL_MERGE.inputParameters.map((parameter, layer) =>
    {
      const registerIndex = registers[names.indexOf(parameter)];
      return Object.freeze({
        parameter,
        layer,
        identity: `sampled-resource:0:${registerIndex}`,
        scopeIdentity: `sampled-resource:0:${registerIndex}@fragment`
      });
    }))
  }) ];
}

// Derived from the post-transform inventory rather than tabulated, so a tier that
// adds bindings cannot leave the sampler slots stale.
function expectedSamplers(backend, profile, tier)
{
  const base = expectedResources(backend, profile, tier).samplerBase;
  return tierSamplers(tier).map((entry) => Object.freeze({
    ...entry,
    binding: base + entry.registerIndex
  }));
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
  const kinds = [ "buffer", "texture", "sampler" ].filter((key) =>
    binding.layout?.[key]);
  if (kinds.length !== 1 || kinds[0] !== kind)
  {
    fail(`${expected.scopeIdentity} has an unexpected layout kind`);
  }
}

const ANISOTROPIC_REPEAT_FILTERS = Object.freeze({
  minFilter: 3, magFilter: 2, mipFilter: 2,
  addressU: 1, addressV: 1, addressW: 3
});

function hasFilterState(state, filters)
{
  return Boolean(state)
    && state.comparison === false
    && state.minFilter === filters.minFilter
    && state.magFilter === filters.magFilter
    && state.mipFilter === filters.mipFilter
    && state.addressU === filters.addressU
    && state.addressV === filters.addressV
    && state.addressW === filters.addressW
    && state.mipLODBias === 0
    && state.maxAnisotropy === 16;
}

function hasExactSamplerState(state, isDynamic, filters = ANISOTROPIC_REPEAT_FILTERS)
{
  return hasFilterState(state, filters) && state.isDynamic === isDynamic;
}

// Backend-identical: the reader resolves a static sampler's wire record the way
// Carbon does, so only `sourceTruth` still records the declaration. See
// `hasStaticSamplerState` in quadV5Fixture.js for the mechanism and why
// `isDynamic` must be present rather than absent.
function hasStaticSamplerState(state, filters = ANISOTROPIC_REPEAT_FILTERS)
{
  return hasFilterState(state, filters)
    && Array.isArray(state.borderColor)
    && JSON.stringify(state.borderColor) === JSON.stringify([ 0, 0, 0, 0 ])
    && state.isDynamic === false;
}

function assertMaterialReflection(record, tier)
{
  const expectedConstants = tier === "high" ? HIGH_MATERIAL_CONSTANTS : MATERIAL_CONSTANTS;
  const material = mainStage(record, "pixel").bindings?.filter((entry) =>
    entry?.kind === "constantBuffer"
      && entry.registerSpace === 0
      && entry.registerIndex === 0);
  if (!Array.isArray(material) || material.length !== 1
    || material[0].registerType !== 0
    || material[0].carbon?.hasLocalConstants !== true
    || material[0].carbon?.constantValueSize !== 608)
  {
    fail("pixel cb0 must expose the exact sparse 608-byte local material layout");
  }
  const constants = material[0].carbon.constants;
  if (!Array.isArray(constants) || constants.length !== expectedConstants.length)
  {
    fail(`pixel cb0 must expose exactly ${expectedConstants.length} ${tier} constants`);
  }
  for (let index = 0; index < expectedConstants.length; index += 1)
  {
    const constant = constants[index];
    const expected = expectedConstants[index];
    if (constant?.name !== expected.name || constant.offset !== expected.offset
      || constant.size !== 16 || constant.dimension !== 4
      || constant.type !== 0 || constant.elements !== 0)
    {
      fail(`pixel cb0 has an unexpected ${expected.name} layout`);
    }
  }
}

// A merged binding cannot be filled from one source texture, so the requirement
// reaches the consumer through the pipeline. Assert it exactly in both
// directions, and assert that the merged-away inputs really are unbound.
function assertResourceTransforms(record, expected, bindings)
{
  const declared = record.pipeline?.resourceTransforms ?? [];
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

function assertAnalysisResources(record, resources, samplers, profile)
{
  const vertexBindings = mainStage(record, "vertex").bindings || [];
  const vertexInventory = vertexBindings.map((entry) =>
    `${entry?.kind}:${entry?.registerSpace}:${entry?.registerIndex}`);
  const expectedVertexInventory = profile.bone
    ? [ "resource:0:0", "constantBuffer:0:1", "constantBuffer:0:3" ]
    : [ "constantBuffer:0:1", "constantBuffer:0:3" ];
  if (JSON.stringify(vertexInventory)
    !== JSON.stringify(expectedVertexInventory))
  {
    fail("vertex analysis has an unexpected exact binding inventory");
  }
  const bone = vertexBindings.filter((entry) =>
    entry?.kind === "resource"
      && entry.registerSpace === 0
      && entry.registerIndex === 0);
  if (profile.bone)
  {
    const binding = bone[0];
    if (bone.length !== 1 || binding.generatedSymbol !== "t0"
      || binding.registerType !== 33 || binding.metadataName !== "BoneTransforms"
      || binding.carbon?.name !== "BoneTransforms"
      || binding.carbon?.type !== 7 || binding.carbon?.arrayElements !== 1
      || binding.carbon?.isSRGB !== false
      || binding.carbon?.isAutoregister !== false)
    {
      fail("vertex t0 BoneTransforms has unexpected Carbon metadata");
    }
  }
  else if (bone.length !== 0)
  {
    fail("static vertex analysis must not contain BoneTransforms");
  }

  const pixelBindings = mainStage(record, "pixel").bindings || [];
  const pixelInventory = pixelBindings.map((entry) =>
    `${entry?.kind}:${entry?.registerSpace}:${entry?.registerIndex}`).sort();
  const expectedInventory = [
    "constantBuffer:0:0",
    "constantBuffer:0:2",
    "constantBuffer:0:4",
    ...resources.map((entry) => `resource:0:${entry.registerIndex}`),
    // Both backends reflect all three. DX12 lowers the unnamed s0 to an
    // immutable root-signature sampler rather than omitting it, so its absence
    // is drift, not a backend difference.
    ...samplers.map((entry) => `sampler:0:${entry.registerIndex}`)
  ].sort();
  if (JSON.stringify(pixelInventory) !== JSON.stringify(expectedInventory))
  {
    const extra = pixelInventory.filter((entry) => !expectedInventory.includes(entry));
    const missing = expectedInventory.filter((entry) => !pixelInventory.includes(entry));
    fail("pixel analysis has an unexpected active binding inventory"
      + `${extra.length ? `; unexpected ${extra.join(", ")}` : ""}`
      + `${missing.length ? `; missing ${missing.join(", ")}` : ""}`);
  }
  for (const expected of resources)
  {
    const matches = pixelBindings.filter((entry) => entry?.kind === "resource"
      && entry.registerSpace === 0
      && entry.registerIndex === expected.registerIndex);
    const carbon = matches[0]?.carbon;
    if (matches.length !== 1 || matches[0].registerType !== expected.registerType
      || carbon?.name !== expected.name || carbon.type !== expected.carbonType
      || carbon.arrayElements !== 1 || carbon.isSRGB !== expected.isSRGB
      || carbon.isAutoregister !== expected.isAutoregister)
    {
      fail(`${expected.identity} must reflect the exact ${expected.name} resource`);
    }
  }
  const reflectedSamplers = pixelBindings.filter((entry) => entry?.kind === "sampler");
  if (reflectedSamplers.length !== samplers.length)
  {
    fail(`${record.backend} analysis has an unexpected sampler count`);
  }
  for (const expected of samplers)
  {
    const matches = reflectedSamplers.filter((entry) =>
      entry.registerSpace === 0 && entry.registerIndex === expected.registerIndex);
    if (matches.length !== 1)
    {
      fail(`${expected.identity} has unexpected reflected sampler state`);
    }
    // An unnamed sampler is declared in the effect signature, which is why DX12
    // lowers exactly those to immutable root-signature samplers. `sourceTruth`
    // is the only field that still records the difference.
    if (expected.reflectedName === null && record.backend === "dx12")
    {
      const signature = matches[0];
      const state = signature.carbon?.sampler;
      if ((signature.carbon?.name ?? null) !== null
        || signature.dynamic !== false
        || signature.sourceTruth !== "carbon-signature-sampler"
        || !hasStaticSamplerState(state, expected.filters))
      {
        fail(`${expected.identity} has unexpected DX12 signature-sampler reflection`);
      }
      continue;
    }
    if (matches[0].registerType !== 1
      || (matches[0].carbon?.name ?? null) !== expected.reflectedName
      || !hasExactSamplerState(matches[0].carbon?.sampler, expected.isDynamic, expected.filters))
    {
      fail(`${expected.identity} has unexpected reflected sampler state`);
    }
  }
}

function assertBindings(record, profile, tier)
{
  const groups = record.pipeline?.bindGroups;
  if (!Array.isArray(groups) || groups.length !== 1 || groups[0]?.group !== 0)
  {
    fail("Main.pass0 requires exactly canonical bind group 0");
  }
  const bindings = groups[0].bindings;
  const plan = expectedResources(record.backend, profile, tier);
  const resources = plan.textures;
  const storage = plan.storage;
  const samplers = expectedSamplers(record.backend, profile, tier);
  const expectedCount = profile.uniforms.length
    + (profile.bone ? 1 : 0) + resources.length + storage.length + samplers.length;
  if (!Array.isArray(bindings) || bindings.length !== expectedCount)
  {
    fail(`Main.pass0 requires exactly ${expectedCount} canonical bindings`);
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
    if (bone.name !== "BoneTransforms" || bone.generatedSymbol !== "t0"
      || bone.layout.type !== "array<u32>"
      || bone.layout.buffer.type !== "read-only-storage"
      || bone.layout.buffer.hasDynamicOffset !== false
      || bone.layout.buffer.minBindingSize !== BONE_TRANSFORMS.minBindingSize
      || bone.structureStride !== BONE_TRANSFORMS.structureStride
      || bone.carbon?.name !== "BoneTransforms"
      || bone.carbon?.type !== 7 || bone.carbon?.arrayElements !== 1
      || bone.carbon?.isSRGB !== false
      || bone.carbon?.isAutoregister !== false)
    {
      fail("BoneTransforms has an unexpected read-only storage layout or Carbon metadata");
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
      || binding.layout.type !== `texture_${expected.viewDimension.replace("-", "_")}<f32>`
      || binding.textureKind !== expected.viewDimension
      || binding.arrayElements !== 1
      || binding.isSRGB !== expected.isSRGB
      || (binding.arrayLayerCount ?? null) !== (expected.arrayLayerCount ?? null))
    {
      fail(`${expected.identity} has an unexpected texture layout`);
    }
  }
  for (const expected of storage)
  {
    const binding = byScope.get(expected.scopeIdentity);
    assertBindingSlot(binding, expected, "buffer", "fragment");
    if (binding.resourceKind !== "sampled-resource"
      || binding.layout.buffer.type !== "read-only-storage"
      || binding.layout.buffer.hasDynamicOffset !== false
      || binding.layout.buffer.minBindingSize !== expected.minBindingSize
      || binding.structureStride !== expected.structureStride)
    {
      fail(`${expected.name} has an unexpected read-only storage layout`);
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
  assertMaterialReflection(record, tier);
  assertResourceTransforms(record, expectedTransforms(record.backend, profile, tier), bindings);
  // The reflection is pre-transform, so it is checked against the unmerged list:
  // comparing it to the post-transform layout would read the merge as drift.
  assertAnalysisResources(
    record, expectedAnalysisResources(record.backend, tier), samplers, profile
  );
}

/**
 * Fail closed unless a package record is one exact PPT-on body-4
 * QuadDetailV5 profile: unpacked static or unpacked skinned.
 *
 * @param {object} record Resource provenance plus a pipeline descriptor.
 * @returns {object} The validated input record.
 */
export function validateQuadDetailV5PackageRecord(record)
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
    || !analysisSource.includes(`/effect.${record.backend}/`)
    || !analysisSource.includes(
      `/managed/space/spaceobject/v5/quad/${profile.sourceStem}.`
    ))
  {
    fail(
      `package source must be the ${record.backend} ` +
        `${profile.variant} QuadDetailV5 shader`
    );
  }
  const tier = tierFromSource(analysisSource, profile.sourceStem);
  if (tier !== "high" && tier !== "medium")
  {
    fail(`the ${tier} tier is not encoded for the ${profile.variant} QuadDetailV5 variant`);
  }
  if (record.analysis?.bodyIndex !== TARGET_BODY_INDEX
    || record.metadata?.bodyIndex !== TARGET_BODY_INDEX)
  {
    fail(`package must resolve body index ${TARGET_BODY_INDEX}`);
  }
  assertSelections(record.analysis.selectedOptions, "analysis.selectedOptions", profile);
  assertSelections(record.metadata.selectedOptions, "metadata.selectedOptions", profile);
  const selection = record.metadata.wgslSelection;
  if (selection?.mode !== "explicit"
    || selection.techniqueName !== "Main" || selection.passIndex !== 0
    || selection.completePasses !== true
    || JSON.stringify(selection.requestedStageNames) !== JSON.stringify([ "vertex", "pixel" ])
    || JSON.stringify(selection.selectedStageKeys)
      !== JSON.stringify([ "Main.pass0.vertex", "Main.pass0.pixel" ]))
  {
    fail("package selection must be the complete Main.pass0 vertex/pixel pair");
  }
  const mainPasses = record.analysis?.passes?.filter((entry) =>
    entry?.techniqueName === "Main");
  if (!Array.isArray(mainPasses) || mainPasses.length !== 1
    || mainPasses[0].passIndex !== 0 || mainPasses[0].renderStates !== 1
    || JSON.stringify(mainPasses[0].states) !== "[]")
  {
    fail("analysis must retain the exact state-free Main.pass0 render state set");
  }
  const pipeline = record.pipeline;
  if (pipeline?.techniqueName !== "Main" || pipeline.passIndex !== 0
    || pipeline.renderStates !== 1 || JSON.stringify(pipeline.states) !== "[]")
  {
    fail("pipeline must retain the exact state-free Main.pass0 render state set");
  }
  assertMainStageInventory(record);
  assertAnalysisInterface(record, profile, tier);
  assertShaderModules(pipeline, profile, tier);
  assertBindings(record, profile, tier);
  return record;
}

/**
 * Validate the ordered, distinct DX11/DX12 records before claiming parity.
 *
 * @param {object[]} records Package records in DX11, DX12 order.
 * @returns {object[]} The validated input array.
 */
export function validateQuadDetailV5PackagePair(records)
{
  if (!Array.isArray(records) || records.length !== 2)
  {
    fail("comparison requires exactly one DX11 and one DX12 package");
  }
  if (records[0]?.variant !== records[1]?.variant)
  {
    fail("comparison requires matching package variants");
  }
  records.forEach(validateQuadDetailV5PackageRecord);
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

/**
 * Return the exact backend-local sampled-resource and sampler plan.
 *
 * @param {object} record One validated QuadDetailV5 package record.
 * @returns {{bone: object|null, textures: object[], samplers: object[]}} Frozen resource plan.
 */
export function getQuadDetailV5ResourcePlan(record)
{
  validateQuadDetailV5PackageRecord(record);
  const profile = profileForVariant(record.variant);
  const tier = tierFromSource(normalizedPath(record.analysis?.source), profile.sourceStem);
  const plan = expectedResources(record.backend, profile, tier);
  return Object.freeze({
    bone: profile.bone,
    tier,
    textures: Object.freeze(plan.textures),
    storage: Object.freeze(plan.storage),
    samplers: Object.freeze(expectedSamplers(record.backend, profile, tier)),
    analysisResources: Object.freeze(expectedAnalysisResources(record.backend, tier)),
    transforms: Object.freeze(expectedTransforms(record.backend, profile, tier))
  });
}

function frozenVector(values)
{
  return Object.freeze([ ...values ]);
}

function detailMaterial(base, patternMaterial, detail1Data, detail2Data)
{
  return Object.freeze({
    GeneralData: base.GeneralData,
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
    // Present only when the shared authored ABI carries them, which happens at
    // High. packMaterial is reflection-driven and ignores values the body does not
    // declare, so forwarding them unconditionally would be harmless but silent;
    // forwarding what `base` actually has keeps the tiers honest in both
    // directions - a missing value at High fails closed rather than packing zero.
    ...(base.Mtl1DustDiffuseColor
      ? {
        Mtl1DustDiffuseColor: base.Mtl1DustDiffuseColor,
        Mtl2DustDiffuseColor: base.Mtl2DustDiffuseColor,
        Mtl3DustDiffuseColor: base.Mtl3DustDiffuseColor,
        Mtl4DustDiffuseColor: base.Mtl4DustDiffuseColor
      }
      : {}),
    PMtl1DiffuseColor: patternMaterial.PMtl1DiffuseColor,
    PMtl1FresnelColor: patternMaterial.PMtl1FresnelColor,
    PMtl1Gloss: patternMaterial.PMtl1Gloss,
    PMtl2DiffuseColor: patternMaterial.PMtl2DiffuseColor,
    PMtl2FresnelColor: patternMaterial.PMtl2FresnelColor,
    PMtl2Gloss: patternMaterial.PMtl2Gloss,
    Detail1Data: detail1Data,
    Detail2Data: detail2Data,
    Detail3Data: frozenVector([ 1, 0, 0, 0 ]),
    DetailAlbedoColor: frozenVector([ 0.32, 0.18, 0.08, 1 ]),
    DetailFresnelColor: frozenVector([ 0.24, 0.2, 0.16, 1 ]),
    DetailSelector: frozenVector([ 1, 1, 1, 1 ])
  });
}

function bindingCase(base, material)
{
  return Object.freeze({ ...base, material });
}

/**
 * Create four ordered semantic cases. Each comparison against its intended
 * baseline changes one controlled material axis only.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @returns {{caseNames: readonly string[], bindingValuesByCase: Readonly<Record<string, object>>}}
 * Frozen case names and binding values.
 */
export function createQuadDetailV5BindingCases(width, height, tier = "medium")
{
  // packMaterial requires a value for every reflected constant, so the tier must
  // reach the shared authored ABI or a High draw fails closed on the dust colors.
  const shared = createQuadV5MainBindingValues(width, height, tier);
  const base = Object.freeze({
    ...shared,
    perObjectPS: Object.freeze({
      ...shared.perObjectPS,
      customMaskMaterialIDs: frozenVector([ 4, 5, 0, 0, 0, 0, 0, 0 ]),
      customMaskTargets: frozenVector([ 1, 1, 1, 1, 1, 1, 1, 1 ])
    })
  });
  const neutralData = frozenVector([ 1, 0, 0, 0 ]);
  const detail1Data = frozenVector([ 1, 1, 0, 0 ]);
  const detail2Data = frozenVector([ 1, 1, 0, 0 ]);
  const neutralPattern = Object.freeze({
    PMtl1DiffuseColor: base.material.Mtl1DiffuseColor,
    PMtl1FresnelColor: base.material.Mtl1FresnelColor,
    PMtl1Gloss: base.material.Mtl1Gloss,
    PMtl2DiffuseColor: base.material.Mtl2DiffuseColor,
    PMtl2FresnelColor: base.material.Mtl2FresnelColor,
    PMtl2Gloss: base.material.Mtl2Gloss
  });
  // Deliberately far from the base surface materials. The PPT control measures
  // |Mtl - PMtl| after the body's own shading, and High's response to the shared
  // authored contrast peaks at 3/255 - one LSB under the oracle's absolute
  // threshold - even though 82% of covered pixels respond and the response is
  // spatially varied. Strengthening the authored contrast keeps the oracle's
  // sensitivity intact rather than relaxing it to accommodate a dimmer body.
  const surfacePattern = Object.freeze({
    PMtl1DiffuseColor: frozenVector([ 0.95, 0.2, 0.05, 1 ]),
    PMtl1FresnelColor: frozenVector([ 0.9, 0.25, 0.08, 1 ]),
    PMtl1Gloss: frozenVector([ 0.85, 0.1, 0, 0 ]),
    PMtl2DiffuseColor: frozenVector([ 0.05, 0.85, 0.95, 1 ]),
    PMtl2FresnelColor: frozenVector([ 0.08, 0.8, 0.9, 1 ]),
    PMtl2Gloss: frozenVector([ 0.12, 0.9, 0, 0 ])
  });
  const pptNeutralMaterial = detailMaterial(
    base.material,
    neutralPattern,
    neutralData,
    neutralData
  );
  const surfaceMaterial = detailMaterial(
    base.material,
    surfacePattern,
    neutralData,
    neutralData
  );
  return Object.freeze({
    caseNames: CASE_NAMES,
    bindingValuesByCase: Object.freeze({
      pptNeutral: bindingCase(base, pptNeutralMaterial),
      surface: bindingCase(base, surfaceMaterial),
      detail1: bindingCase(base, detailMaterial(
        base.material,
        surfacePattern,
        detail1Data,
        neutralData
      )),
      detail2: bindingCase(base, detailMaterial(
        base.material,
        surfacePattern,
        neutralData,
        detail2Data
      ))
    })
  });
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

function sampler(name)
{
  // s3 reflects linear filtering with no mip filter and clamped addressing, so it
  // is created that way rather than sharing the repeat-sampling descriptor.
  if (name === HIGH_LIGHT_SAMPLER.name)
  {
    return Object.freeze({
      name,
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
      maxAnisotropy: 1
    });
  }
  return Object.freeze({
    name,
    minFilter: "linear",
    magFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
    addressModeW: "clamp-to-edge",
    maxAnisotropy: 16
  });
}

/**
 * Create deterministic QuadV5 geometry plus the exact active QuadDetailV5
 * texture and sampler inventory for one static or skinned profile.
 *
 * @param {number} width Render-target width.
 * @param {number} height Render-target height.
 * @param {"static"|"skinned"} [variant="static"] Exact geometry variant.
 * @returns {object} Typed-array fixture values.
 */
export function createQuadDetailV5FixtureValues(width, height, variant = "static", tier = "medium")
{
  const profile = profileForVariant(variant);
  if (tier !== "high" && tier !== "medium")
  {
    fail(`QuadDetailV5 fixture values are not authored for the ${tier} tier`);
  }
  // The High light set, its extra surface maps, and the fourth sampler are the
  // same ones the shared QuadV5 fixture authors, so they are composed rather than
  // duplicated here. High values are only authored for the static QuadV5 variant,
  // and the light bindings do not depend on skinning, so they are read from the
  // static build and the geometry from this profile's own variant.
  const surface = createQuadV5FixtureValues(width, height, profile.variant);
  const highSource = tier === "high"
    ? createQuadV5FixtureValues(width, height, "static", "high")
    : null;
  const names = tierNames(tier);
  const surfaceCount = names.length - DETAIL_MERGE.inputParameters.length;
  const requiredSurfaceNames = new Set(names.slice(0, surfaceCount));
  const available = tier === "high" ? highSource.textures : surface.textures;
  const textures = available.filter((entry) => requiredSurfaceNames.has(entry.name));
  if (textures.length !== requiredSurfaceNames.size)
  {
    fail("shared QuadV5 fixture does not expose every required surface texture");
  }
  // Saturated and full-range, and distinct from each other on opposite axes. Flat
  // mid-grey layers with only an alpha ramp leave the detail response peaking at
  // 3/255 on the skinned High body, one LSB under the control oracle: the colour
  // contributed nothing and only the mask varied. The axis split is what keeps the
  // Detail1 and Detail2 delta maps distinguishable.
  const detail1 = rgbaTexture("Detail1Map", (_x, y) => [
    230,
    90,
    40,
    y < 4 ? 0 : 255
  ]);
  const detail2 = rgbaTexture("Detail2Map", (x) => [
    40,
    120,
    230,
    x < 4 ? 0 : 255
  ]);
  const detail3 = rgbaTexture("Detail3Map", () => [ 128, 128, 128, 0 ]);
  const cases = createQuadDetailV5BindingCases(width, height, tier);
  const lightArray = tier === "high"
    ? highSource.textures.filter((entry) => entry.dimension === "2d-array")
    : [];
  return Object.freeze({
    vertices: surface.vertices,
    ...(profile.bone ? { boneIndices: surface.boneIndices } : {}),
    indices: surface.indices,
    tier,
    textures: Object.freeze([ ...textures, ...lightArray, detail1, detail2, detail3 ]),
    storageBuffers: Object.freeze(tier === "high" ? highSource.storageBuffers : []),
    samplers: Object.freeze(tierSamplers(tier).map((entry) => sampler(entry.name))),
    caseNames: cases.caseNames,
    bindingValuesByCase: cases.bindingValuesByCase
  });
}
