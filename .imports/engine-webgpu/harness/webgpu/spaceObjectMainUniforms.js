import { PackMaterialConstants } from "../../src/core/materialConstants.js";

const BUFFER_SIZES = Object.freeze({
  perFrameVS: 736,
  perFramePS: 1888,
  perObjectVS: 464,
  perObjectPS: 464
});

export const EVE_SPACE_OBJECT_MAIN_BUFFER_SIZES = BUFFER_SIZES;

const IDENTITIES = Object.freeze({
  material: "uniform-buffer:0:0",
  perFrameVS: "uniform-buffer:0:1",
  perFramePS: "uniform-buffer:0:2",
  perObjectVS: "uniform-buffer:0:3",
  perObjectPS: "uniform-buffer:0:4"
});

const VISIBILITY = Object.freeze({
  [IDENTITIES.material]: "fragment",
  [IDENTITIES.perFrameVS]: "vertex",
  [IDENTITIES.perFramePS]: "fragment",
  [IDENTITIES.perObjectVS]: "vertex",
  [IDENTITIES.perObjectPS]: "fragment"
});

const PER_FRAME_VS_FIELDS = Object.freeze([
  [ "ViewInverseTransposeMat", 0, 16, true, "matrix" ],
  [ "ViewProjectionMat", 64, 16, true, "matrix" ],
  [ "ViewMat", 128, 16, false, "matrix" ],
  [ "ProjectionMat", 192, 16, false, "matrix" ],
  [ "ShadowViewMat", 256, 16, false, "matrix" ],
  [ "ShadowViewProjectionMat", 320, 16, false, "matrix" ],
  [ "EnvMapRotationMat", 384, 16, false, "matrix" ],
  [ "ViewProjectionLast", 448, 16, true, "matrix" ],
  [ "ViewLast", 512, 16, false, "matrix" ],
  [ "ProjLast", 576, 16, false, "matrix" ],
  [ "Sun.DirWorld", 640, 3, true ],
  [ "Sun.unused_pad0", 652, 1 ],
  [ "Sun.DiffuseColor", 656, 4 ],
  [ "FogFactors", 672, 3 ],
  [ "pad", 684, 1 ],
  [ "TargetResolution", 688, 2 ],
  [ "FovXY", 696, 2 ],
  [ "ViewportAdjustment", 704, 4 ],
  [ "Time", 720, 1 ],
  [ "Upscaling", 724, 1 ],
  [ "ViewportSize", 728, 2 ]
]);

const PER_FRAME_PS_FIELDS = Object.freeze([
  [ "ViewInverseTransposeMat", 0, 16, false, "matrix" ],
  [ "ViewMat", 64, 16, false, "matrix" ],
  [ "EnvMapRotationMat", 128, 16, false, "matrix" ],
  [ "Sun.DirWorld", 192, 3 ],
  [ "Sun.unused_pad0", 204, 1 ],
  [ "Sun.DiffuseColor", 208, 4 ],
  [ "AmbientColor", 224, 3 ],
  [ "ReflectionIntensity", 236, 1 ],
  [ "FogColor", 240, 4 ],
  [ "ViewportOffset", 256, 2 ],
  [ "ViewportSize", 264, 2 ],
  [ "TargetResolution", 272, 2, true ],
  [ "DepthMapSampleCount", 280, 1 ],
  [ "Debug", 284, 1 ],
  [ "ShadowMapSettings", 288, 4 ],
  [ "ShadowCameraRange", 304, 2 ],
  [ "ShadowLightness", 312, 1 ],
  [ "ShadowQuality", 316, 1, false, "uint" ],
  [ "ProjectionToView", 320, 2 ],
  [ "FovXY", 328, 2 ],
  [ "Time", 336, 1 ],
  [ "SceneMipLodBias", 340, 1, true ],
  [ "Upscaling", 344, 1 ],
  [ "GammaBrightness", 348, 1, true ],
  [ "FrameIndex", 352, 1, false, "uint" ],
  [ "Jittering", 356, 1, false, "uint" ],
  [ "InverseShadowMapAtlasSize", 360, 1 ],
  [ "ShadowMapAtlasEntryMinSizeLog2", 364, 1, false, "uint" ],
  [ "VolumetricSlices", 368, 4 ],
  [ "ShadowMapValues", 384, 16 ],
  [ "ShadowMatrixVal", 448, 256, false, "matrix" ],
  [ "SplitInfo", 1472, 4 ],
  [ "ProjectionInverseMat", 1488, 16, false, "matrix" ],
  [ "CascadeRanges", 1552, 64 ],
  [ "FroxelFogData.FogColor", 1808, 3 ],
  [ "FroxelFogData.BackgroundVisibility", 1820, 1 ],
  [ "FroxelFogData.BaseDensity", 1824, 1 ],
  [ "FroxelFogData.MaxDistance", 1828, 1 ],
  [ "FroxelFogData.MaxDistanceVisibility", 1832, 1 ],
  [ "FroxelFogData.EnvironmentIntensity", 1836, 1 ],
  [ "FroxelFogData.EnvironmentG", 1840, 1 ],
  [ "FroxelFogData._pad0", 1844, 1 ],
  [ "FroxelFogData._pad1", 1848, 1 ],
  [ "FroxelFogData._pad2", 1852, 1 ],
  [ "FroxelFogData.planets", 1856, 8 ]
]);

const PER_OBJECT_VS_FIELDS = Object.freeze([
  [ "worldTransform", 0, 16, true, "matrix" ],
  [ "worldTransformLast", 64, 16, true, "matrix" ],
  [ "invWorldTransform", 128, 16, true, "matrix" ],
  [ "shipData", 192, 4, true ],
  [ "clipData", 208, 4 ],
  [ "ellpsoidRadii", 224, 4 ],
  [ "ellpsoidCenter", 240, 4 ],
  [ "customMaskMatrix", 256, 32, false, "raw-matrix" ],
  [ "customMaskData", 384, 8 ],
  [ "boneOffsets", 416, 4, false, "uint" ],
  [ "morphTargetVertexDataOffset", 432, 1, false, "uint" ],
  [ "morphTargetAnimationDataOffset", 436, 1, false, "uint" ],
  [ "activeMorphTargetsCount", 440, 1, false, "uint" ],
  [ "bakedMorphTargetVertexDataOffset", 444, 1, false, "uint" ],
  [ "customData", 448, 4 ]
]);

const PER_OBJECT_PS_FIELDS = Object.freeze([
  [ "worldTransform", 0, 16, true, "matrix" ],
  [ "worldTransformLast", 64, 16, true, "matrix" ],
  [ "invWorldTransform", 128, 16, true, "matrix" ],
  [ "shipData", 192, 4, true ],
  [ "clipSphereCenter", 208, 3 ],
  [ "clipRadiusSq", 220, 1 ],
  [ "clipRadius2Sq", 224, 1 ],
  [ "impactDataOffset", 228, 1 ],
  [ "clipSphereFactor2", 232, 1 ],
  [ "clipSphereFactor", 236, 1 ],
  [ "shLightingCoefficients", 240, 28 ],
  [ "customMaskMaterialIDs", 352, 8 ],
  [ "customMaskTargets", 384, 8 ],
  [ "customMaskClamps", 416, 4 ],
  [ "screenSize", 432, 4 ],
  [ "customData", 448, 4 ]
]);

function fail(message)
{
  throw new Error(`Eve space-object Main bindings: ${message}`);
}

function getPath(source, path)
{
  let value = source;
  for (const key of path.split("."))
  {
    if (value == null || !Object.prototype.hasOwnProperty.call(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

function flattenNumbers(value, output = [])
{
  if (ArrayBuffer.isView(value) || Array.isArray(value))
  {
    for (const entry of value) flattenNumbers(entry, output);
  }
  else
  {
    output.push(value);
  }
  return output;
}

function isFiniteFloat32(value)
{
  return typeof value === "number" && Number.isFinite(value) && Number.isFinite(Math.fround(value));
}

function writeField(view, source, descriptor, owner)
{
  const [ path, offset, count, required = false, kind = "float" ] = descriptor;
  const value = getPath(source, path);
  if (value == null)
  {
    if (required) fail(`${owner}.${path} is required`);
    return;
  }
  const values = flattenNumbers(value);
  if (values.length !== count) fail(`${owner}.${path} must contain exactly ${count} values`);
  if ((kind === "matrix" || kind === "raw-matrix") && count % 16 !== 0)
  {
    fail(`${owner}.${path} has an invalid matrix footprint`);
  }
  for (let index = 0; index < count; index += 1)
  {
    let sourceIndex = index;
    if (kind === "matrix")
    {
      const element = Math.floor(index / 16) * 16;
      const lane = index % 16;
      sourceIndex = element + (lane % 4) * 4 + Math.floor(lane / 4);
    }
    const item = values[sourceIndex];
    if (kind === "uint")
    {
      if (typeof item !== "number" || !Number.isInteger(item) || item < 0 || item > 0xffffffff)
      {
        fail(`${owner}.${path}[${index}] must be a uint32`);
      }
      view.setUint32(offset + index * 4, item, true);
    }
    else
    {
      if (!isFiniteFloat32(item)) fail(`${owner}.${path}[${sourceIndex}] must be a finite float32`);
      view.setFloat32(offset + index * 4, item, true);
    }
  }
}

function packStruct(source, size, fields, owner)
{
  if (!source || typeof source !== "object") fail(`${owner} is required`);
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  for (const field of fields) writeField(view, source, field, owner);
  return new Uint8Array(buffer);
}

function namedValue(values, name)
{
  if (values instanceof Map) return values.get(name);
  if (values && typeof values === "object" && Object.prototype.hasOwnProperty.call(values, name))
  {
    return values[name];
  }
  return undefined;
}

function resolvePackageRecord(value)
{
  if (!value || typeof value !== "object") fail("package record is required");
  const pipeline = value.pipeline || (typeof value.GetPipeline === "function"
    ? value.GetPipeline("Main", 0)
    : null);
  return { analysis: value.analysis, pipeline };
}

function canonicalUniformBindings(pipeline)
{
  if (pipeline?.techniqueName !== "Main" || pipeline.passIndex !== 0)
  {
    fail("package pipeline must be Main.pass0");
  }
  const result = new Map();
  const scopeIdentities = new Set();
  const groupIndices = new Set();
  const slots = new Set();
  for (const group of Array.isArray(pipeline.bindGroups) ? pipeline.bindGroups : [])
  {
    if (!Number.isInteger(group?.group) || group.group < 0 || groupIndices.has(group.group))
    {
      fail("package contains a malformed or duplicate canonical bind group");
    }
    groupIndices.add(group.group);
    for (const binding of Array.isArray(group?.bindings) ? group.bindings : [])
    {
      if (binding?.group !== group.group || !Number.isInteger(binding.binding) || binding.binding < 0)
      {
        fail("package contains a malformed canonical binding slot");
      }
      const slot = `${binding.group}:${binding.binding}`;
      if (slots.has(slot)) fail(`package duplicates canonical binding slot ${slot}`);
      slots.add(slot);
      if (binding?.layout?.buffer?.type === "uniform")
      {
        if (binding.resourceKind !== "uniform-buffer"
          || !Number.isInteger(binding.registerSpace) || binding.registerSpace < 0
          || !Number.isInteger(binding.registerIndex) || binding.registerIndex < 0)
        {
          fail("package contains a malformed canonical uniform identity");
        }
        const identity = `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
        if (result.has(identity)) fail(`package duplicates canonical uniform ${identity}`);
        const expectedVisibility = VISIBILITY[identity];
        if (binding.identity !== undefined && binding.identity !== identity)
        {
          fail(`package uniform ${identity} has an inconsistent D3D identity`);
        }
        if (binding.scopeIdentity !== undefined
          && (typeof binding.scopeIdentity !== "string" || !binding.scopeIdentity))
        {
          fail(`package uniform ${identity} has an invalid scope identity`);
        }
        const scopeIdentity = binding.scopeIdentity === undefined ? identity : binding.scopeIdentity;
        if (binding.sourceTruth !== "wgsl-layout" || binding.layout.buffer.type !== "uniform"
          || binding.dynamic !== false || binding.layout.buffer.hasDynamicOffset !== false
          || !expectedVisibility || !Array.isArray(binding.visibility)
          || binding.visibility.length !== 1 || binding.visibility[0] !== expectedVisibility
          || (scopeIdentity !== identity && scopeIdentity !== `${identity}@${expectedVisibility}`)
          || !Number.isInteger(binding.layout.buffer.minBindingSize)
          || binding.layout.buffer.minBindingSize < 1 || binding.layout.buffer.minBindingSize % 4 !== 0)
        {
          fail(`package uniform ${identity} is not canonical`);
        }
        if (scopeIdentities.has(scopeIdentity))
        {
          fail(`package duplicates canonical uniform scope ${scopeIdentity}`);
        }
        scopeIdentities.add(scopeIdentity);
        result.set(identity, {
          scopeIdentity,
          minBindingSize: binding.layout.buffer.minBindingSize
        });
      }
    }
  }
  return result;
}

/**
 * Derives a material layout from the package's own pass binding.
 *
 * This is FIXTURE convenience, not an engine path. The engine used to read the
 * analysis chunk for the same facts, which put a format-record read inside a
 * package that must consume reflection rather than own it; that fallback is
 * gone and must not reappear in a second engine. A harness fixture is allowed
 * to say "bind what this package declares", because proving the engine draws
 * the package is the whole point of these gates. A composed caller uses
 * `MaterialLayoutFromShader` against `Tr2Shader` instead.
 *
 * @param {object} record Validated package record.
 * @returns {object} `{ size, constants }` material layout.
 */
export function MaterialLayoutFromPackage(record)
{
  const { pipeline } = resolvePackageRecord(record);
  const binding = (pipeline?.bindGroups ?? [])
    .flatMap((group) => group.bindings ?? [])
    .find((entry) => entry.name === "$LocalConstants");
  if (!binding?.carbon?.constants?.length) fail("package declares no material constants");
  return Object.freeze({
    size: binding.carbon.constantValueSize,
    constants: Object.freeze(binding.carbon.constants.map((constant) => Object.freeze({
      name: constant.name,
      offset: constant.offset,
      size: constant.size,
      type: constant.type,
      dimension: constant.dimension,
      elements: constant.elements
    })))
  });
}


/**
 * Serialize the proven Carbon space-scene/space-object Main-pass structs and
 * the package-reflected stage-local material constants into canonical binding
 * scope identities. The caller owns
 * policy; this function owns only the byte ABI. Logical 4x4 matrix values are
 * transposed once into Carbon cbuffer register-row order. `customMaskMatrix`
 * is the exception: its Trinity producer already supplies GPU-form bytes, so
 * those matrix slots are copied unchanged.
 *
 * @param {object} record Loaded CjsWebgpuPackage or record with analysis and pipeline.
 * @param {object} values Plain values for the five constant buffers.
 * @returns {object} Frozen scope-identity-to-Uint8Array uniform data.
 */
export function buildEveSpaceObjectMainUniformData(record, values = {}, options = {})
{
  const { pipeline } = resolvePackageRecord(record);
  // The layout is the caller's to supply and has no fallback. The analysis
  // chunk used to stand in for it, which put a format-record read inside the
  // engine; that path is gone, and it must not come back in a second engine.
  // A fixture states its own layout, and a composed caller derives one from
  // `Tr2Shader` through `MaterialLayoutFromShader`.
  const layout = options.materialLayout;
  if (!layout) fail("options.materialLayout is required");
  const material = PackMaterialConstants(layout, values.material);
  const packedData = {
    [IDENTITIES.material]: material,
    [IDENTITIES.perFrameVS]: packStruct(values.perFrameVS, BUFFER_SIZES.perFrameVS, PER_FRAME_VS_FIELDS, "perFrameVS"),
    [IDENTITIES.perFramePS]: packStruct(values.perFramePS, BUFFER_SIZES.perFramePS, PER_FRAME_PS_FIELDS, "perFramePS"),
    [IDENTITIES.perObjectVS]: packStruct(values.perObjectVS, BUFFER_SIZES.perObjectVS, PER_OBJECT_VS_FIELDS, "perObjectVS"),
    [IDENTITIES.perObjectPS]: packStruct(values.perObjectPS, BUFFER_SIZES.perObjectPS, PER_OBJECT_PS_FIELDS, "perObjectPS")
  };
  const canonical = canonicalUniformBindings(pipeline);
  const uniformData = {};
  for (const [ role, identity ] of Object.entries(IDENTITIES))
  {
    const canonicalBinding = canonical.get(identity);
    const data = packedData[identity];
    if (!canonicalBinding)
    {
      fail(`package is missing canonical ${role} binding ${identity}`);
    }
    if (data.byteLength < canonicalBinding.minBindingSize)
    {
      fail(`${role} ABI is ${data.byteLength} bytes but package requires at least ${canonicalBinding.minBindingSize}`);
    }
    uniformData[canonicalBinding.scopeIdentity] = data;
  }
  if (canonical.size !== Object.keys(IDENTITIES).length)
  {
    fail("package contains unsupported additional uniform bindings");
  }
  return Object.freeze(uniformData);
}
