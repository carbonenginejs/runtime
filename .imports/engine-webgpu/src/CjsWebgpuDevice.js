import { CanonicalKey, CjsWebgpuPipelineCache, RenderPipelineKey } from "./core/pipelineCache.js";
import { AssertFormatFeature, PlanTextureUpload } from "./core/textureLayout.js";

const PREPARED_PIPELINES = new WeakMap();
const LIVE_PIPELINES = new WeakMap();
const BINDING_SETS = new WeakMap();
const GEOMETRIES = new WeakMap();
const TEXTURES = new WeakMap();
const SAMPLERS = new WeakMap();
const RESOURCE_BUNDLES = new WeakMap();
const DRAWS = new WeakMap();
const MAX_GPU_SIZE_32 = 0xFFFFFFFF;
const MIN_GPU_SIGNED_OFFSET_32 = -0x80000000;
const MAX_GPU_SIGNED_OFFSET_32 = 0x7FFFFFFF;
const VERTEX_FORMAT_BYTES = new Map([
  [ "uint8", 1 ], [ "sint8", 1 ], [ "unorm8", 1 ], [ "snorm8", 1 ],
  [ "uint8x2", 2 ], [ "uint8x4", 4 ],
  [ "sint8x2", 2 ], [ "sint8x4", 4 ],
  [ "unorm8x2", 2 ], [ "unorm8x4", 4 ], [ "unorm8x4-bgra", 4 ],
  [ "snorm8x2", 2 ], [ "snorm8x4", 4 ],
  [ "uint16", 2 ], [ "sint16", 2 ], [ "unorm16", 2 ], [ "snorm16", 2 ], [ "float16", 2 ],
  [ "uint16x2", 4 ], [ "uint16x4", 8 ],
  [ "sint16x2", 4 ], [ "sint16x4", 8 ],
  [ "unorm16x2", 4 ], [ "unorm16x4", 8 ],
  [ "snorm16x2", 4 ], [ "snorm16x4", 8 ],
  [ "float16x2", 4 ], [ "float16x4", 8 ],
  [ "float32", 4 ], [ "float32x2", 8 ], [ "float32x3", 12 ], [ "float32x4", 16 ],
  [ "uint32", 4 ], [ "uint32x2", 8 ], [ "uint32x3", 12 ], [ "uint32x4", 16 ],
  [ "sint32", 4 ], [ "sint32x2", 8 ], [ "sint32x3", 12 ], [ "sint32x4", 16 ],
  [ "unorm10-10-10-2", 4 ]
]);
const TEXTURE_VIEW_DIMENSIONS = new Set([ "2d", "2d-array", "cube", "cube-array" ]);
const TEXTURE_FORMATS = new Map([
  [ "rgba8unorm", Object.freeze({ bytesPerPixel: 4, isSRGB: false }) ],
  [ "rgba8unorm-srgb", Object.freeze({ bytesPerPixel: 4, isSRGB: true }) ]
]);
const SAMPLER_ADDRESS_MODES = new Set([ "clamp-to-edge", "repeat", "mirror-repeat" ]);
const SAMPLER_FILTER_MODES = new Set([ "nearest", "linear" ]);
const SAMPLER_COMPARE_FUNCTIONS = new Set([
  "never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"
]);
const SELECTED_SAMPLER_PAYLOAD_KEYS = new Set([
  "payloadType", "label", "addressModeU", "addressModeV", "addressModeW",
  "magFilter", "minFilter", "mipmapFilter", "lodMinClamp", "lodMaxClamp",
  "compare", "maxAnisotropy"
]);
const SELECTED_SAMPLER_REQUIRED_KEYS = Object.freeze([
  "addressModeU", "addressModeV", "addressModeW", "magFilter", "minFilter",
  "mipmapFilter", "lodMinClamp", "lodMaxClamp", "maxAnisotropy"
]);
const RGBA8_TEXTURE_PAYLOAD_KEYS = new Set([
  "payloadType", "sourceFormat", "width", "height", "pixelFormat", "data",
  "strideBytes", "origin", "colorSpace", "alphaMode", "containerOnly",
  "isDecoded", "rgbaDecodeSupported"
]);

function fail(message)
{
  throw new Error(`CjsWebgpuDevice: ${message}`);
}

function asPipelineJson(pipeline)
{
  if (pipeline && typeof pipeline.ToJSON === "function") return pipeline.ToJSON();
  if (!pipeline || typeof pipeline !== "object") fail("pipeline must be a CjsWebgpuPipeline or plain descriptor");
  return pipeline;
}

function normalizeStageName(value)
{
  if (value === "pixel" || value === "fragment") return "fragment";
  if (value === "vertex") return "vertex";
  return String(value || "");
}

function bindingIdentity(binding)
{
  if (!binding?.resourceKind || !Number.isInteger(binding.registerSpace) || !Number.isInteger(binding.registerIndex))
  {
    fail("canonical binding has an invalid D3D identity");
  }
  const identity = `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
  if (binding.identity !== undefined && binding.identity !== identity)
  {
    fail(`canonical binding has inconsistent D3D identity ${binding.identity}`);
  }
  if (binding.scopeIdentity !== undefined
    && (typeof binding.scopeIdentity !== "string" || !binding.scopeIdentity))
  {
    fail(`canonical binding has invalid scope identity ${binding.scopeIdentity || "<empty>"}`);
  }
  const scopeIdentity = binding.scopeIdentity === undefined ? identity : binding.scopeIdentity;
  const visibility = Array.isArray(binding.visibility)
    ? Array.from(new Set(binding.visibility.map(normalizeStageName)))
    : [];
  if (typeof scopeIdentity !== "string"
    || (scopeIdentity !== identity
      && (visibility.length !== 1 || scopeIdentity !== `${identity}@${visibility[0]}`)))
  {
    fail(`canonical binding has invalid scope identity ${scopeIdentity || "<empty>"}`);
  }
  return scopeIdentity;
}

function own(value, key)
{
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assertPlainObject(value, label)
{
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(`${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length) fail(`${label} cannot have symbol keys`);
}

function frozenRecord(entries)
{
  const result = {};
  for (const [ key, value ] of entries)
  {
    Object.defineProperty(result, key, {
      configurable: false,
      enumerable: true,
      writable: false,
      value
    });
  }
  return Object.freeze(result);
}

function snapshotPlain(value)
{
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return Object.freeze(value.map(snapshotPlain));
  const result = {};
  for (const [ key, entry ] of Object.entries(value)) result[key] = snapshotPlain(entry);
  return Object.freeze(result);
}

function samePlain(left, right)
{
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right))
  {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((entry, index) => samePlain(entry, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && samePlain(left[key], right[key]));
}

function assertKeys(value, allowed, label)
{
  for (const key of Object.keys(value))
  {
    if (!allowed.has(key)) fail(`${label} has unsupported ${key}`);
  }
}

function binaryView(value, label)
{
  if (ArrayBuffer.isView(value))
  {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value).slice();
  fail(`${label} data must be an ArrayBuffer or ArrayBufferView`);
}

function normalizeVertexLayout(value, label)
{
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} layout must be an object`);
  assertKeys(value, new Set([ "arrayStride", "stepMode", "attributes" ]), `${label} layout`);
  if (!Number.isSafeInteger(value.arrayStride) || value.arrayStride < 4 || value.arrayStride % 4 !== 0)
  {
    fail(`${label} arrayStride must be a positive multiple of 4`);
  }
  if (value.stepMode !== undefined && value.stepMode !== "vertex" && value.stepMode !== "instance")
  {
    fail(`${label} stepMode must be vertex or instance`);
  }
  if (!Array.isArray(value.attributes) || !value.attributes.length) fail(`${label} attributes must be a non-empty array`);
  const locations = new Set();
  const attributes = value.attributes.map((attribute, index) =>
  {
    const attributeLabel = `${label} attribute ${index}`;
    if (!attribute || typeof attribute !== "object" || Array.isArray(attribute)) fail(`${attributeLabel} must be an object`);
    assertKeys(attribute, new Set([ "shaderLocation", "offset", "format" ]), attributeLabel);
    if (!Number.isSafeInteger(attribute.shaderLocation) || attribute.shaderLocation < 0
      || attribute.shaderLocation > MAX_GPU_SIZE_32)
    {
      fail(`${attributeLabel} shaderLocation must be nonnegative`);
    }
    if (locations.has(attribute.shaderLocation)) fail(`${label} duplicates shader location ${attribute.shaderLocation}`);
    locations.add(attribute.shaderLocation);
    if (!Number.isSafeInteger(attribute.offset) || attribute.offset < 0)
    {
      fail(`${attributeLabel} offset must be nonnegative`);
    }
    const byteSize = VERTEX_FORMAT_BYTES.get(attribute.format);
    if (!byteSize) fail(`${attributeLabel} has unsupported GPUVertexFormat ${String(attribute.format || "<empty>")}`);
    const alignment = Math.min(4, byteSize);
    if (attribute.offset % alignment !== 0)
    {
      fail(`${attributeLabel} offset must be aligned to ${alignment} bytes for ${attribute.format}`);
    }
    if (attribute.offset + byteSize > value.arrayStride)
    {
      fail(`${attributeLabel} exceeds arrayStride`);
    }
    return {
      shaderLocation: attribute.shaderLocation,
      offset: attribute.offset,
      format: attribute.format
    };
  }).sort((left, right) => left.shaderLocation - right.shaderLocation);
  return snapshotPlain({
    arrayStride: value.arrayStride,
    stepMode: value.stepMode || "vertex",
    attributes
  });
}

function canonicalVertexLayouts(values, label)
{
  if (!Array.isArray(values)) fail(`${label} must be an array`);
  const layouts = values.map((value, index) => normalizeVertexLayout(value, `${label} slot ${index}`));
  const shaderLocations = new Set();
  for (const layout of layouts)
  {
    for (const attribute of layout.attributes)
    {
      if (shaderLocations.has(attribute.shaderLocation))
      {
        fail(`${label} duplicates shader location ${attribute.shaderLocation}`);
      }
      shaderLocations.add(attribute.shaderLocation);
    }
  }
  return Object.freeze(layouts);
}

function normalizeGeometry(options)
{
  if (!options || typeof options !== "object" || Array.isArray(options)) fail("geometry options must be an object");
  assertKeys(options, new Set([ "label", "vertexBuffers", "indexBuffer" ]), "geometry");
  if (options.label !== undefined && (typeof options.label !== "string" || !options.label))
  {
    fail("geometry label must be a non-empty string");
  }
  if (!Array.isArray(options.vertexBuffers) || !options.vertexBuffers.length)
  {
    fail("geometry vertexBuffers must be a non-empty array");
  }
  const vertexBuffers = options.vertexBuffers.map((entry, index) =>
  {
    const label = `geometry vertex buffer ${index}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail(`${label} must be an object`);
    assertKeys(entry, new Set([ "slot", "label", "data", "layout" ]), label);
    if (!Number.isInteger(entry.slot) || entry.slot < 0) fail(`${label} slot must be nonnegative`);
    if (entry.label !== undefined && (typeof entry.label !== "string" || !entry.label))
    {
      fail(`${label} label must be a non-empty string`);
    }
    const data = binaryView(entry.data, label);
    if (!data.byteLength) fail(`${label} data must not be empty`);
    const layout = normalizeVertexLayout(entry.layout, label);
    if (data.byteLength % layout.arrayStride !== 0)
    {
      fail(`${label} byte length must be a multiple of arrayStride`);
    }
    return { slot: entry.slot, label: entry.label || null, data, layout };
  }).sort((left, right) => left.slot - right.slot);
  for (let index = 0; index < vertexBuffers.length; index += 1)
  {
    if (vertexBuffers[index].slot !== index) fail("geometry vertex-buffer slots must be unique and contiguous from 0");
  }
  const shaderLocations = new Set();
  for (const entry of vertexBuffers)
  {
    for (const attribute of entry.layout.attributes)
    {
      if (shaderLocations.has(attribute.shaderLocation))
      {
        fail(`geometry duplicates shader location ${attribute.shaderLocation} across vertex buffers`);
      }
      shaderLocations.add(attribute.shaderLocation);
    }
  }

  let indexBuffer = null;
  if (options.indexBuffer != null)
  {
    const entry = options.indexBuffer;
    if (typeof entry !== "object" || Array.isArray(entry)) fail("geometry index buffer must be an object");
    assertKeys(entry, new Set([ "label", "data", "format" ]), "geometry index buffer");
    if (entry.label !== undefined && (typeof entry.label !== "string" || !entry.label))
    {
      fail("geometry index-buffer label must be a non-empty string");
    }
    if (entry.format !== "uint16" && entry.format !== "uint32")
    {
      fail("geometry index-buffer format must be uint16 or uint32");
    }
    const data = binaryView(entry.data, "geometry index buffer");
    const elementSize = entry.format === "uint16" ? 2 : 4;
    if (!data.byteLength || data.byteLength % elementSize !== 0)
    {
      fail(`geometry ${entry.format} index-buffer data has an invalid byte length`);
    }
    indexBuffer = { label: entry.label || null, data, format: entry.format };
  }
  return {
    label: options.label || "geometry",
    vertexBuffers,
    indexBuffer
  };
}

function alignedBufferSize(byteLength)
{
  return Math.ceil(byteLength / 4) * 4;
}

function validateGeometryLimits(plan, device)
{
  const limits = device?.limits || {};
  const exceeds = (name, value) => Number.isFinite(limits[name]) && value > limits[name];
  if (exceeds("maxVertexBuffers", plan.vertexBuffers.length))
  {
    fail(`geometry exceeds device maxVertexBuffers ${limits.maxVertexBuffers}`);
  }
  const attributeCount = plan.vertexBuffers.reduce((total, entry) => total + entry.layout.attributes.length, 0);
  if (exceeds("maxVertexAttributes", attributeCount))
  {
    fail(`geometry exceeds device maxVertexAttributes ${limits.maxVertexAttributes}`);
  }
  for (const entry of plan.vertexBuffers)
  {
    if (exceeds("maxVertexBufferArrayStride", entry.layout.arrayStride))
    {
      fail(`geometry vertex buffer ${entry.slot} exceeds device maxVertexBufferArrayStride ${limits.maxVertexBufferArrayStride}`);
    }
    if (Number.isFinite(limits.maxVertexAttributes))
    {
      for (const attribute of entry.layout.attributes)
      {
        if (attribute.shaderLocation >= limits.maxVertexAttributes)
        {
          fail(`geometry shader location ${attribute.shaderLocation} exceeds the device vertex-attribute range`);
        }
      }
    }
    if (exceeds("maxBufferSize", alignedBufferSize(entry.data.byteLength)))
    {
      fail(`geometry vertex buffer ${entry.slot} exceeds device maxBufferSize ${limits.maxBufferSize}`);
    }
  }
  if (plan.indexBuffer && exceeds("maxBufferSize", alignedBufferSize(plan.indexBuffer.data.byteLength)))
  {
    fail(`geometry index buffer exceeds device maxBufferSize ${limits.maxBufferSize}`);
  }
}

function normalizeTexture(options)
{
  if (!options || typeof options !== "object" || Array.isArray(options)) fail("texture options must be an object");
  assertKeys(
    options,
    new Set([
      "label", "width", "height", "layers", "viewDimension", "format",
      "bytesPerRow", "mipLevelCount", "data"
    ]),
    "texture"
  );
  if (options.label !== undefined && (typeof options.label !== "string" || !options.label))
  {
    fail("texture label must be a non-empty string");
  }
  if (!Number.isSafeInteger(options.width) || options.width < 1 || options.width > MAX_GPU_SIZE_32)
  {
    fail("texture width must be a positive GPUSize32 value");
  }
  if (!Number.isSafeInteger(options.height) || options.height < 1 || options.height > MAX_GPU_SIZE_32)
  {
    fail("texture height must be a positive GPUSize32 value");
  }
  // A 1-layer array view is legal and distinct from a plain 2D view: a shader
  // declaring texture_2d_array<f32> needs the array view whatever the layer
  // count, so the view dimension stays explicit rather than inferred.
  const plan = PlanTextureUpload({
    format: options.format,
    width: options.width,
    height: options.height,
    layers: own(options, "layers") && options.layers !== undefined ? options.layers : undefined,
    viewDimension: own(options, "viewDimension") && options.viewDimension !== undefined
      ? options.viewDimension
      : undefined,
    mipLevelCount: own(options, "mipLevelCount") && options.mipLevelCount !== undefined
      ? options.mipLevelCount
      : undefined
  });

  // `bytesPerRow` remains accepted for a single-level image, where a caller may
  // legitimately hand over padded rows. It is checked against the tight stride
  // the format implies rather than trusted, and it has no meaning once a mip
  // chain is involved because each level has its own stride.
  let bytesPerRow = plan.writes[0].bytesPerRow;
  if (own(options, "bytesPerRow") && options.bytesPerRow !== undefined)
  {
    if (plan.mipLevelCount > 1)
    {
      fail("texture bytesPerRow cannot be supplied with a mip chain; each level has its own stride");
    }
    if (!Number.isSafeInteger(options.bytesPerRow) || options.bytesPerRow < 1
      || options.bytesPerRow > MAX_GPU_SIZE_32)
    {
      fail("texture bytesPerRow must be a positive GPUSize32 value");
    }
    if (options.bytesPerRow < bytesPerRow || options.bytesPerRow % plan.format.blockBytes !== 0)
    {
      fail(`texture bytesPerRow must contain ${bytesPerRow} active bytes and align to the block size`);
    }
    bytesPerRow = options.bytesPerRow;
  }

  const expectedBytes = plan.mipLevelCount > 1
    ? plan.byteLength
    : bytesPerRow * plan.writes[0].rowsPerImage * plan.layers;
  if (!Number.isSafeInteger(expectedBytes)) fail("texture byte length exceeds the supported JavaScript range");
  const data = binaryView(options.data, "texture");
  if (data.byteLength !== expectedBytes)
  {
    fail(`texture data must be exactly ${expectedBytes} bytes`);
  }

  return {
    label: options.label || "texture",
    width: plan.width,
    height: plan.height,
    layers: plan.layers,
    viewDimension: plan.viewDimension,
    mipLevelCount: plan.mipLevelCount,
    formatName: plan.formatName,
    format: plan.format,
    plan,
    bytesPerRow,
    data
  };
}

function validateTextureLimits(plan, device)
{
  const limit = device?.limits?.maxTextureDimension2D;
  if (Number.isFinite(limit) && (plan.width > limit || plan.height > limit))
  {
    fail(`texture dimensions exceed device maxTextureDimension2D ${limit}`);
  }
  const layerLimit = device?.limits?.maxTextureArrayLayers;
  if (Number.isFinite(layerLimit) && plan.layers > layerLimit)
  {
    fail(`texture layers exceed device maxTextureArrayLayers ${layerLimit}`);
  }
}

function normalizeSampler(options)
{
  if (!options || typeof options !== "object" || Array.isArray(options)) fail("sampler options must be an object");
  const prototype = Object.getPrototypeOf(options);
  if (prototype !== Object.prototype && prototype !== null) fail("sampler options must be a plain object");
  assertKeys(options, new Set([
    "label", "addressModeU", "addressModeV", "addressModeW", "magFilter", "minFilter",
    "mipmapFilter", "lodMinClamp", "lodMaxClamp", "compare", "maxAnisotropy"
  ]), "sampler");
  if (options.label !== undefined && (typeof options.label !== "string" || !options.label))
  {
    fail("sampler label must be a non-empty string");
  }
  const enumValue = (name, allowed, fallback) =>
  {
    const value = own(options, name) && options[name] !== undefined ? options[name] : fallback;
    if (!allowed.has(value)) fail(`sampler ${name} has unsupported ${String(value)}`);
    return value;
  };
  const addressModeU = enumValue("addressModeU", SAMPLER_ADDRESS_MODES, "clamp-to-edge");
  const addressModeV = enumValue("addressModeV", SAMPLER_ADDRESS_MODES, "clamp-to-edge");
  const addressModeW = enumValue("addressModeW", SAMPLER_ADDRESS_MODES, "clamp-to-edge");
  const magFilter = enumValue("magFilter", SAMPLER_FILTER_MODES, "nearest");
  const minFilter = enumValue("minFilter", SAMPLER_FILTER_MODES, "nearest");
  const mipmapFilter = enumValue("mipmapFilter", SAMPLER_FILTER_MODES, "nearest");
  const numberValue = (name, fallback) =>
  {
    const input = own(options, name) && options[name] !== undefined ? options[name] : fallback;
    if (typeof input !== "number" || !Number.isFinite(input)) fail(`sampler ${name} must be finite`);
    const value = Math.fround(input);
    if (!Number.isFinite(value)) fail(`sampler ${name} must fit a finite float32 value`);
    return value === 0 ? 0 : value;
  };
  const lodMinClamp = numberValue("lodMinClamp", 0);
  const lodMaxClamp = numberValue("lodMaxClamp", 32);
  if (lodMinClamp < 0) fail("sampler lodMinClamp must be nonnegative");
  if (lodMaxClamp < lodMinClamp) fail("sampler lodMaxClamp must be at least lodMinClamp");
  const maxAnisotropy = own(options, "maxAnisotropy") && options.maxAnisotropy !== undefined
    ? options.maxAnisotropy
    : 1;
  if (!Number.isInteger(maxAnisotropy) || maxAnisotropy < 1 || maxAnisotropy > 0xFFFF)
  {
    fail("sampler maxAnisotropy must be an integer from 1 through 65535");
  }
  if (maxAnisotropy > 1
    && (magFilter !== "linear" || minFilter !== "linear" || mipmapFilter !== "linear"))
  {
    fail("sampler anisotropy requires linear magFilter, minFilter, and mipmapFilter");
  }
  let compare;
  if (own(options, "compare") && options.compare !== undefined)
  {
    compare = options.compare;
    if (!SAMPLER_COMPARE_FUNCTIONS.has(compare))
    {
      fail(`sampler compare has unsupported ${String(compare)}`);
    }
  }
  const label = options.label || "sampler";
  const semantic = {
    addressModeU,
    addressModeV,
    addressModeW,
    magFilter,
    minFilter,
    mipmapFilter,
    lodMinClamp,
    lodMaxClamp,
    ...(compare === undefined ? {} : { compare }),
    maxAnisotropy
  };
  return {
    label,
    descriptor: snapshotPlain({ label, ...semantic }),
    semantic: snapshotPlain(semantic),
    cacheKey: JSON.stringify(semantic),
    isComparison: compare !== undefined,
    isFiltering: magFilter === "linear" || minFilter === "linear" || mipmapFilter === "linear"
  };
}

function normalizeResourceBundle(options)
{
  assertPlainObject(options, "resource bundle options");
  assertKeys(options, new Set([ "label", "geometries", "textures", "samplers" ]), "resource bundle");
  if (options.label !== undefined && (typeof options.label !== "string" || options.label.trim() === ""))
  {
    fail("resource bundle label must be a non-empty string");
  }
  const label = options.label || "resource bundle";
  const definitions = [];
  for (const [ category, kind ] of [
    [ "geometries", "geometry" ],
    [ "textures", "texture" ],
    [ "samplers", "sampler" ]
  ])
  {
    const values = own(options, category) && options[category] !== undefined
      ? options[category]
      : {};
    assertPlainObject(values, `resource bundle ${category}`);
    for (const [ key, value ] of Object.entries(values))
    {
      if (key.trim() === "") fail(`resource bundle ${category} keys must be non-empty`);
      assertPlainObject(value, `resource bundle ${category}.${key}`);
      definitions.push(Object.freeze({
        category,
        kind,
        key,
        options: value.label === undefined
          ? { ...value, label: `${label}.${kind}.${key}` }
          : value
      }));
    }
  }
  if (!definitions.length) fail("resource bundle must contain at least one geometry, texture, or sampler");
  return Object.freeze({ label, definitions: Object.freeze(definitions) });
}

function normalizeResourceRealizationOptions(options)
{
  assertPlainObject(options, "resource realization options");
  assertKeys(options, new Set([ "adapterKey" ]), "resource realization");
  const adapterKey = options.adapterKey ?? "webgpu";
  if (typeof adapterKey !== "string" || adapterKey.trim() === "")
  {
    fail("resource realization adapterKey must be a non-empty string");
  }
  return Object.freeze({ adapterKey });
}

function normalizeRgba8TextureRealizationOptions(options)
{
  assertPlainObject(options, "RGBA8 texture realization options");
  assertKeys(options, new Set([ "textureKey", "bundleLabel", "adapterKey" ]), "RGBA8 texture realization");
  const textureKey = options.textureKey;
  const bundleLabel = options.bundleLabel ?? "prepared RGBA8 texture";
  const adapterKey = options.adapterKey ?? "webgpu";
  if (typeof textureKey !== "string" || textureKey.trim() === "")
  {
    fail("RGBA8 texture realization textureKey must be a non-empty string");
  }
  if (typeof bundleLabel !== "string" || bundleLabel.trim() === "")
  {
    fail("RGBA8 texture realization bundleLabel must be a non-empty string");
  }
  if (typeof adapterKey !== "string" || adapterKey.trim() === "")
  {
    fail("RGBA8 texture realization adapterKey must be a non-empty string");
  }
  return Object.freeze({ name: "RGBA8 texture realization", textureKey, bundleLabel, adapterKey });
}

function normalizeSamplerRealizationOptions(options)
{
  assertPlainObject(options, "sampler realization options");
  assertKeys(options, new Set([ "samplerKey", "bundleLabel", "adapterKey" ]), "sampler realization");
  const samplerKey = options.samplerKey;
  const bundleLabel = options.bundleLabel ?? "prepared WebGPU sampler";
  const adapterKey = options.adapterKey ?? "webgpu";
  if (typeof samplerKey !== "string" || samplerKey.trim() === "")
  {
    fail("sampler realization samplerKey must be a non-empty string");
  }
  if (typeof bundleLabel !== "string" || bundleLabel.trim() === "")
  {
    fail("sampler realization bundleLabel must be a non-empty string");
  }
  if (typeof adapterKey !== "string" || adapterKey.trim() === "")
  {
    fail("sampler realization adapterKey must be a non-empty string");
  }
  return Object.freeze({ name: "sampler realization", samplerKey, bundleLabel, adapterKey });
}

function mapRgba8TexturePayload(value, plan)
{
  const label = `${plan.name} payload`;
  assertPlainObject(value, label);
  assertKeys(value, RGBA8_TEXTURE_PAYLOAD_KEYS, label);
  if (value.payloadType !== "rgba") fail(`${label} payloadType must be rgba`);
  if (typeof value.sourceFormat !== "string" || value.sourceFormat.trim() === "")
  {
    fail(`${label} sourceFormat must be a non-empty string`);
  }
  if (value.containerOnly !== false) fail(`${label} containerOnly must be false`);
  if (value.isDecoded !== true) fail(`${label} isDecoded must be true`);
  if (own(value, "rgbaDecodeSupported") && value.rgbaDecodeSupported !== true)
  {
    fail(`${label} rgbaDecodeSupported must be true when provided`);
  }
  if (!Number.isSafeInteger(value.width) || value.width < 1 || value.width > MAX_GPU_SIZE_32)
  {
    fail(`${label} width must be a positive GPUSize32 value`);
  }
  if (!Number.isSafeInteger(value.height) || value.height < 1 || value.height > MAX_GPU_SIZE_32)
  {
    fail(`${label} height must be a positive GPUSize32 value`);
  }
  if (value.pixelFormat !== "rgba8unorm") fail(`${label} pixelFormat must be rgba8unorm`);
  if (!(value.data instanceof Uint8Array)) fail(`${label} data must be a Uint8Array`);
  if (!Number.isSafeInteger(value.strideBytes) || value.strideBytes < 1
    || value.strideBytes > MAX_GPU_SIZE_32)
  {
    fail(`${label} strideBytes must be a positive GPUSize32 value`);
  }
  const activeRowBytes = value.width * 4;
  if (value.strideBytes < activeRowBytes || value.strideBytes % 4 !== 0)
  {
    fail(`${label} strideBytes must contain ${activeRowBytes} active bytes and align to the RGBA8 texel size`);
  }
  const expectedBytes = value.strideBytes * value.height;
  if (!Number.isSafeInteger(expectedBytes)) fail(`${label} byte length exceeds the supported JavaScript range`);
  if (value.data.byteLength !== expectedBytes)
  {
    fail(`${label} data must be exactly ${expectedBytes} bytes`);
  }
  if (value.origin !== "top-left") fail(`${label} origin must be top-left`);
  if (value.colorSpace !== "srgb" && value.colorSpace !== "linear")
  {
    fail(`${label} colorSpace must be srgb or linear`);
  }
  if (value.alphaMode !== "straight" && value.alphaMode !== "opaque")
  {
    fail(`${label} alphaMode must be straight or opaque`);
  }

  const texture = Object.freeze({
    width: value.width,
    height: value.height,
    format: value.colorSpace === "srgb" ? "rgba8unorm-srgb" : "rgba8unorm",
    bytesPerRow: value.strideBytes,
    data: value.data
  });
  return Object.freeze({
    label: plan.bundleLabel,
    textures: frozenRecord([ [ plan.textureKey, texture ] ])
  });
}

function mapSamplerPayload(value, plan)
{
  assertPlainObject(value, `${plan.name} payload`);
  assertKeys(value, SELECTED_SAMPLER_PAYLOAD_KEYS, `${plan.name} payload`);
  if (value.payloadType !== "webgpu-sampler")
  {
    fail(`${plan.name} payload payloadType must be webgpu-sampler`);
  }
  for (const key of SELECTED_SAMPLER_REQUIRED_KEYS)
  {
    if (!own(value, key) || value[key] === undefined)
    {
      fail(`${plan.name} payload must provide ${key}`);
    }
  }
  const { payloadType: _payloadType, ...descriptor } = value;
  const normalized = normalizeSampler(descriptor);
  const sampler = Object.freeze({
    label: normalized.label,
    ...normalized.semantic
  });
  return Object.freeze({
    label: plan.bundleLabel,
    samplers: frozenRecord([ [ plan.samplerKey, sampler ] ])
  });
}

function assertRealizationResource(resource)
{
  if (!resource || typeof resource.GetAdapterResource !== "function"
    || typeof resource.SetAdapterResource !== "function"
    || typeof resource.DestroyAdapterResource !== "function"
    || typeof resource.GetPayload !== "function"
    || typeof resource.IsCurrent !== "function"
    || typeof resource.MarkLoaded !== "function"
    || typeof resource.MarkPreparing !== "function"
    || typeof resource.MarkPrepared !== "function")
  {
    fail("resource realization requires a current CPU resource with payload, state, and adapter methods");
  }
  return resource;
}

function cloneDiagnostics(messages)
{
  return Object.freeze((messages || []).map((message) => Object.freeze({
    type: String(message.type || "info"),
    message: String(message.message || ""),
    lineNum: Number.isInteger(message.lineNum) ? message.lineNum : null,
    linePos: Number.isInteger(message.linePos) ? message.linePos : null,
    offset: Number.isInteger(message.offset) ? message.offset : null,
    length: Number.isInteger(message.length) ? message.length : null
  })));
}

function visibilityFlags(visibility, shaderStage)
{
  const names = Array.isArray(visibility) ? Array.from(new Set(visibility.map(normalizeStageName))) : [];
  if (!names.length) fail("canonical binding has no shader visibility");
  let flags = 0;
  for (const name of names)
  {
    if (name === "vertex") flags |= shaderStage.VERTEX;
    else if (name === "fragment") flags |= shaderStage.FRAGMENT;
    else fail(`canonical binding has unsupported ${name || "empty"} visibility`);
  }
  return flags;
}

function bindingLayout(binding)
{
  if (binding?.sourceTruth !== "wgsl-layout") fail("all live bindings must come from a canonical WGSL layout");
  // A dynamic binding must be marked in BOTH places or WebGPU rejects the bind
  // group: `dynamic` is the package's word for it and `hasDynamicOffset` is the
  // layout's, and they are written by different producers. Disagreement here
  // surfaces much later as a bind-group validation error that names neither.
  if (Boolean(binding.dynamic) !== Boolean(binding.layout?.buffer?.hasDynamicOffset))
  {
    fail(`${bindingIdentity(binding)} disagrees with its layout about being dynamic`);
  }
  const layout = binding.layout;
  if (!layout || typeof layout !== "object") fail(`${bindingIdentity(binding)} has no WebGPU layout`);
  const keys = [ "buffer", "sampler", "texture", "storageTexture", "externalTexture" ]
    .filter((key) => layout[key] != null);
  if (keys.length !== 1) fail(`${bindingIdentity(binding)} must have exactly one WebGPU layout kind`);
  return { [keys[0]]: snapshotPlain(layout[keys[0]]) };
}

function normalizePipeline(pipeline, shaderStage)
{
  const value = asPipelineJson(pipeline);
  const stages = Array.isArray(value.shaderModules) ? value.shaderModules : [];
  const vertex = stages.filter((entry) => normalizeStageName(entry?.stageName) === "vertex");
  const fragment = stages.filter((entry) => normalizeStageName(entry?.stageName) === "fragment");
  if (stages.length !== 2 || vertex.length !== 1 || fragment.length !== 1)
  {
    fail("render pipelines require exactly one vertex and one pixel shader module");
  }
  for (const shader of [ vertex[0], fragment[0] ])
  {
    if (typeof shader.wgsl !== "string" || !shader.wgsl) fail(`${shader.stageName} shader has no WGSL`);
    if (typeof shader.entryPoint !== "string" || !shader.entryPoint) fail(`${shader.stageName} shader has no entry point`);
  }

  const groups = Array.isArray(value.bindGroups) ? value.bindGroups.slice() : [];
  groups.sort((left, right) => left.group - right.group);
  const slots = new Set();
  const identities = new Set();
  const baseScopes = new Map();
  const normalizedGroups = groups.map((group, groupIndex) =>
  {
    if (group?.group !== groupIndex) fail("canonical bind groups must be contiguous from group 0");
    const bindings = Array.isArray(group.bindings) ? group.bindings.slice() : [];
    bindings.sort((left, right) => left.binding - right.binding);
    return Object.freeze({
      group: group.group,
      entries: Object.freeze(bindings.map((binding) =>
      {
        if (binding?.group !== group.group || !Number.isInteger(binding.binding) || binding.binding < 0)
        {
          fail(`group ${group.group} has an invalid binding slot`);
        }
        const slot = `${group.group}:${binding.binding}`;
        if (slots.has(slot)) fail(`canonical layout duplicates binding slot ${slot}`);
        slots.add(slot);
        const identity = bindingIdentity(binding);
        if (identities.has(identity)) fail(`canonical layout duplicates ${identity}`);
        identities.add(identity);
        const baseIdentity = `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
        if (!baseScopes.has(baseIdentity)) baseScopes.set(baseIdentity, new Set());
        const scopes = baseScopes.get(baseIdentity);
        if ((identity === baseIdentity && Array.from(scopes).some((scope) => scope !== baseIdentity))
          || (identity !== baseIdentity && scopes.has(baseIdentity)))
        {
          fail(`canonical layout mixes shared and stage-scoped forms for ${baseIdentity}`);
        }
        scopes.add(identity);
        return Object.freeze({
          binding: binding.binding,
          identity,
          descriptor: Object.freeze({
            binding: binding.binding,
            visibility: visibilityFlags(binding.visibility, shaderStage),
            ...bindingLayout(binding)
          })
        });
      }))
    });
  });

  const stageSnapshot = (shader) => Object.freeze({
    key: String(shader.key || ""),
    stageName: String(shader.stageName || ""),
    wgsl: shader.wgsl,
    entryPoint: shader.entryPoint
  });
  return Object.freeze({
    key: String(value.key || ""),
    vertex: stageSnapshot(vertex[0]),
    fragment: stageSnapshot(fragment[0]),
    groups: Object.freeze(normalizedGroups)
  });
}

function findResource(resources, identity)
{
  if (resources instanceof Map) return resources.get(identity);
  if (resources && typeof resources === "object" && own(resources, identity)) return resources[identity];
  return undefined;
}

function resourceEntries(resources, label)
{
  if (resources == null) return [];
  if (resources instanceof Map) return Array.from(resources.entries());
  if (typeof resources === "object") return Object.entries(resources);
  fail(`${label} must be a Map or plain object`);
}

function validateRecipe(recipe)
{
  if (!recipe || typeof recipe !== "object") fail("an explicit render-pipeline recipe is required");
  if (!recipe.vertex || !Array.isArray(recipe.vertex.buffers)) fail("recipe.vertex.buffers must be an array");
  if (!recipe.fragment || !Array.isArray(recipe.fragment.targets) || !recipe.fragment.targets.length)
  {
    fail("recipe.fragment.targets must be a non-empty array");
  }
  if (!recipe.primitive || typeof recipe.primitive !== "object") fail("recipe.primitive is required");
  if (own(recipe, "layout") || own(recipe.vertex, "module") || own(recipe.vertex, "entryPoint")
    || own(recipe.fragment, "module") || own(recipe.fragment, "entryPoint"))
  {
    fail("recipe cannot replace package shader modules, entry points, or canonical layout");
  }
  return snapshotPlain(recipe);
}

function assertPrepared(owner, prepared)
{
  const record = PREPARED_PIPELINES.get(prepared);
  if (!record || record.owner !== owner) fail("prepared pipeline belongs to another device");
  owner._AssertGeneration(record.generation);
  return record;
}

function assertLive(owner, livePipeline)
{
  const record = LIVE_PIPELINES.get(livePipeline);
  if (!record || record.owner !== owner) fail("live pipeline belongs to another device");
  owner._AssertGeneration(record.generation);
  return record;
}

function assertBindingSet(owner, bindingSet, livePipeline = null)
{
  const record = BINDING_SETS.get(bindingSet);
  if (!record || record.owner !== owner) fail("binding set belongs to another device");
  owner._AssertGeneration(record.generation);
  if (record.destroyed) fail("binding set is destroyed");
  if (livePipeline && record.livePipeline !== livePipeline) fail("binding set belongs to another live pipeline");
  assertAdapterResources(record.adapterResources, "binding set");
  return record;
}

function assertGeometry(owner, geometry)
{
  const record = GEOMETRIES.get(geometry);
  if (!record || record.owner !== owner) fail("geometry belongs to another device");
  owner._AssertGeneration(record.generation);
  if (record.destroyed) fail("geometry is destroyed");
  return record;
}

function assertTexture(owner, texture)
{
  const record = TEXTURES.get(texture);
  if (!record || record.owner !== owner) fail("texture belongs to another device");
  owner._AssertGeneration(record.generation);
  if (record.destroyed) fail("texture is destroyed");
  return record;
}

function assertSampler(owner, sampler)
{
  const record = SAMPLERS.get(sampler);
  if (!record || record.owner !== owner) fail("sampler belongs to another device");
  owner._AssertGeneration(record.generation);
  if (record.destroyed) fail("sampler is destroyed");
  return record;
}

function resolveBindingResource(owner, entry, resource)
{
  const textureRecord = TEXTURES.get(resource);
  if (textureRecord)
  {
    assertTexture(owner, resource);
    const layout = entry.descriptor.texture;
    if (!layout) fail(`${entry.identity} cannot bind an engine texture`);
    const viewDimension = layout.viewDimension ?? "2d";
    const multisampled = layout.multisampled ?? false;
    const sampleType = layout.sampleType ?? "float";
    // Every dimension the texture adapter can create must be bindable, or a
    // cube map is creatable and then unusable. Multisampled textures are still
    // out: those are attachments, and the render target owns them.
    if (!TEXTURE_VIEW_DIMENSIONS.has(viewDimension) || multisampled || sampleType !== "float")
    {
      fail(`${entry.identity} requires a ${multisampled ? "multisampled " : ""}${sampleType} ${viewDimension} texture,`
        + " which this adapter does not realize");
    }
    // The view's dimension is fixed at creation, so a layout asking for the
    // other one cannot be satisfied by reinterpreting it.
    if ((textureRecord.viewDimension ?? "2d") !== viewDimension)
    {
      fail(`${entry.identity} requires a ${viewDimension} texture view,`
        + ` but the bound texture provides ${textureRecord.viewDimension ?? "2d"}`);
    }
    return { resource: textureRecord.view, adapterRecord: textureRecord };
  }
  const samplerRecord = SAMPLERS.get(resource);
  if (samplerRecord)
  {
    assertSampler(owner, resource);
    const layout = entry.descriptor.sampler;
    if (!layout) fail(`${entry.identity} cannot bind an engine sampler`);
    const type = layout.type ?? "filtering";
    const compatible = type === "filtering"
      ? !samplerRecord.isComparison
      : type === "non-filtering"
        ? !samplerRecord.isComparison && !samplerRecord.isFiltering
        : type === "comparison" && samplerRecord.isComparison;
    if (!compatible) fail(`${entry.identity} is incompatible with the ${type} sampler layout`);
    return { resource: samplerRecord.sampler, adapterRecord: samplerRecord };
  }
  if (entry.descriptor.buffer && (!resource || typeof resource !== "object" || !resource.buffer))
  {
    fail(`${entry.identity} requires a GPUBufferBinding resource`);
  }
  return { resource, adapterRecord: null };
}

// A dynamic binding is bound once and re-aimed per draw, which is what lets
// many objects share one ring buffer instead of taking a buffer each. WebGPU
// takes the offsets as a flat array per bind group, ordered by BINDING NUMBER
// within the group - not by the order a caller happens to list them - so the
// order is derived from the layout here rather than trusted from the caller.
function resolveDynamicOffsets(record, offsets, device)
{
  const supplied = offsets == null ? null : new Map(resourceEntries(offsets, "draw dynamicOffsets"));
  const perGroup = [];
  const consumed = new Set();
  let anyDynamic = false;

  for (const group of record.descriptor.groups)
  {
    const dynamic = group.entries
      .filter((entry) => entry.descriptor.buffer?.hasDynamicOffset === true)
      .sort((first, second) => first.binding - second.binding);

    if (!dynamic.length)
    {
      perGroup[group.group] = null;
      continue;
    }

    anyDynamic = true;
    const values = [];

    for (const entry of dynamic)
    {
      // Defaulting a missing offset to zero would aim every object at the first
      // slot of the ring and render them all identically, which looks like a
      // scene bug rather than a missing argument.
      const value = supplied?.get(entry.identity);
      if (value == null) fail(`draw is missing a dynamic offset for ${entry.identity}`);
      if (!Number.isSafeInteger(value) || value < 0 || value > MAX_GPU_SIZE_32)
      {
        fail(`dynamic offset for ${entry.identity} must be a GPUSize32 value`);
      }

      const alignment = entry.descriptor.buffer.type === "uniform"
        ? device?.limits?.minUniformBufferOffsetAlignment ?? 256
        : device?.limits?.minStorageBufferOffsetAlignment ?? 256;
      if (value % alignment !== 0)
      {
        fail(`dynamic offset for ${entry.identity} must be a multiple of ${alignment}`);
      }

      consumed.add(entry.identity);
      values.push(value);
    }

    perGroup[group.group] = Object.freeze(values);
  }

  if (supplied)
  {
    for (const identity of supplied.keys())
    {
      if (!consumed.has(identity)) fail(`draw supplies a dynamic offset for ${identity}, which is not a dynamic binding`);
    }
  }

  return anyDynamic ? Object.freeze(perGroup) : null;
}

function assertAdapterResources(records, label)
{
  for (const record of records || [])
  {
    if (record.destroyed) fail(`${label} ${record.kind} is destroyed`);
  }
}

async function popValidationScope(device, state)
{
  if (!state.open) return null;
  state.open = false;
  return device.popErrorScope();
}

/**
 * Engine-owned WebGPU device boundary. It realizes already-selected Carbon WebGPU
 * descriptors; format/capability policy remains with the caller.
 */
export class CjsWebgpuDevice
{
  /**
   * Requests or accepts a WebGPU adapter and device, then returns a ready
   * engine boundary.
   */
  static async Request(options = {})
  {
    const gpu = options.gpu || globalThis.navigator?.gpu;
    if (!gpu || typeof gpu.requestAdapter !== "function") fail("WebGPU is unavailable");
    const adapter = options.adapter || await gpu.requestAdapter(options.adapterOptions);
    if (!adapter) fail("requestAdapter returned null");
    const device = options.device || await adapter.requestDevice(options.deviceDescriptor);
    return new CjsWebgpuDevice({ ...options, gpu, adapter, device });
  }

  /**
   * Creates a ready engine boundary around an already-acquired GPU device.
   */
  constructor(options = {})
  {
    if (!options.device || typeof options.device.createShaderModule !== "function") fail("a GPUDevice is required");
    const shaderStage = options.shaderStage || globalThis.GPUShaderStage;
    if (!shaderStage || !Number.isInteger(shaderStage.VERTEX) || !Number.isInteger(shaderStage.FRAGMENT))
    {
      fail("GPUShaderStage constants are required");
    }
    this._gpu = options.gpu || null;
    this._adapter = options.adapter || null;
    this._device = options.device;
    this._adapterOptions = options.adapterOptions;
    this._deviceDescriptor = options.deviceDescriptor;
    this._shaderStage = shaderStage;
    this._bufferUsage = options.bufferUsage || globalThis.GPUBufferUsage || null;
    this._textureUsage = options.textureUsage || globalThis.GPUTextureUsage || null;
    this._samplerCache = new Map();
    this._preparedCache = new CjsWebgpuPipelineCache();
    this._renderPipelineCache = new CjsWebgpuPipelineCache();
    this._resourceRealizations = new WeakMap();
    this._onLost = typeof options.onLost === "function" ? options.onLost : null;
    this._generation = 1;
    this._state = "ready";
    this._lostInfo = null;
    this._validationTail = Promise.resolve();
    this._recreateSerial = 0;
    this._lifecycleVersion = 0;
    this._WatchDevice(this._device, this._generation);
  }

  /**
   * Returns the adapter associated with the boundary, when known.
   */
  GetAdapter()
  {
    return this._adapter;
  }

  /**
   * Returns the ready native GPU device.
   */
  GetDevice()
  {
    this._AssertReady();
    return this._device;
  }

  /**
   * Returns the generation used to reject objects from earlier device
   * lifecycles.
   */
  GetGeneration()
  {
    return this._generation;
  }

  /**
   * Returns the most recently accepted device-loss record, if any.
   */
  GetLostInfo()
  {
    return this._lostInfo;
  }

  /**
   * Reports whether the boundary is currently in the lost state.
   */
  IsLost()
  {
    return this._state === "lost";
  }

  /**
   * Reports whether the boundary currently has a usable device.
   */
  IsReady()
  {
    return this._state === "ready";
  }

  /**
   * Compiles a Carbon WebGPU render descriptor and realizes its generation-bound
   * canonical pipeline layout.
   */
  async PreparePipeline(pipeline, options = {})
  {
    const descriptor = normalizePipeline(pipeline, this._shaderStage);
    const prepareOptions = snapshotPlain(options);
    // Stage A identity is the caller's to supply: shader source is too large to
    // serialize into a key on every call, and the composed path already has one
    // from runtime-resource. Without it this prepares uncached, which is never
    // wrong. The rest of the options join the key because `warningsAsErrors`
    // decides whether a warning throws, so the same program under a stricter
    // policy is not the same answer.
    const identity = prepareOptions.identity ?? null;
    const key = identity === null || identity === undefined
      ? null
      : `prepared|${CanonicalKey(identity)}|${CanonicalKey(prepareOptions)}`;

    return this._preparedCache.Resolve(key, this._generation, () => this._SerializeValidation(async () =>
    {
      const device = this.GetDevice();
      const generation = this._generation;
      const scope = { open: typeof device.pushErrorScope === "function" && typeof device.popErrorScope === "function" };
      if (scope.open) device.pushErrorScope("validation");
      try
      {
        const modules = {};
        for (const stageName of [ "vertex", "fragment" ])
        {
          const shader = descriptor[stageName];
          const module = device.createShaderModule({
            label: `${descriptor.key || "pipeline"}.${stageName}`,
            code: shader.wgsl
          });
          modules[stageName] = Object.freeze({ module, entryPoint: shader.entryPoint });
        }
        this._AssertGeneration(generation);
        const bindGroupLayouts = descriptor.groups.map((group) => device.createBindGroupLayout({
          label: `${descriptor.key || "pipeline"}.group${group.group}`,
          entries: group.entries.map((entry) => entry.descriptor)
        }));
        const pipelineLayout = device.createPipelineLayout({
          label: `${descriptor.key || "pipeline"}.layout`,
          bindGroupLayouts
        });
        const validationPromise = popValidationScope(device, scope);
        const compilationPromise = Promise.all([ "vertex", "fragment" ].map(async (stageName) =>
        {
          const module = modules[stageName].module;
          const messages = typeof module.getCompilationInfo === "function"
            ? cloneDiagnostics((await module.getCompilationInfo()).messages)
            : Object.freeze([]);
          return { stageName, messages };
        }));
        const [ compilation, validationError ] = await Promise.all([ compilationPromise, validationPromise ]);
        if (validationError) fail(`pipeline preparation validation failed: ${validationError.message || validationError}`);
        const diagnostics = [];
        for (const { stageName, messages } of compilation)
        {
          diagnostics.push(...messages.map((message) => Object.freeze({ stage: stageName, ...message })));
          const errors = messages.filter((message) => message.type === "error");
          const warnings = messages.filter((message) => message.type === "warning");
          if (errors.length || (prepareOptions.warningsAsErrors && warnings.length))
          {
            const kinds = errors.length ? errors : warnings;
            fail(`${stageName} WGSL diagnostics: ${kinds.map((entry) => entry.message).join(" | ")}`);
          }
        }
        this._AssertGeneration(generation);
        const prepared = Object.freeze({
          key: descriptor.key,
          generation,
          diagnostics: Object.freeze(diagnostics),
          bindGroupLayouts: Object.freeze(bindGroupLayouts.slice()),
          pipelineLayout
        });
        PREPARED_PIPELINES.set(prepared, {
          owner: this,
          generation,
          descriptor,
          modules,
          bindGroupLayouts,
          pipelineLayout,
          identity
        });
        return prepared;
      }
      catch (error)
      {
        await popValidationScope(device, scope).catch(() => null);
        throw error;
      }
    }));
  }

  /**
   * Realizes a generation-bound native render pipeline from a Carbon WebGPU
   * descriptor or prepared pipeline.
   */
  async CreateRenderPipeline(pipelineOrPrepared, recipe)
  {
    const pipelineRecipe = validateRecipe(recipe);
    const prepared = PREPARED_PIPELINES.has(pipelineOrPrepared)
      ? pipelineOrPrepared
      : await this.PreparePipeline(pipelineOrPrepared, pipelineRecipe.prepareOptions || {});

    // Stage B: the program's identity plus the recipe's POD block. The recipe
    // is small enough to serialize exactly, so unlike Carbon's Metal cache -
    // which keys on a hash and never rechecks, so a collision silently returns
    // the wrong pipeline - two different pipelines cannot collide here.
    const record = assertPrepared(this, prepared);
    const cacheKey = RenderPipelineKey(record.identity, pipelineRecipe);

    return this._renderPipelineCache.Resolve(cacheKey, this._generation, () => this._SerializeValidation(async () =>
    {
      const device = this.GetDevice();
      const scope = { open: typeof device.pushErrorScope === "function" && typeof device.popErrorScope === "function" };
      if (scope.open) device.pushErrorScope("validation");
      try
      {
        const pipelineDescriptor = {
          label: pipelineRecipe.label || record.descriptor.key || "Carbon WebGPU render pipeline",
          layout: record.pipelineLayout,
          vertex: {
            ...pipelineRecipe.vertex,
            module: record.modules.vertex.module,
            entryPoint: record.modules.vertex.entryPoint
          },
          fragment: {
            ...pipelineRecipe.fragment,
            module: record.modules.fragment.module,
            entryPoint: record.modules.fragment.entryPoint
          },
          primitive: pipelineRecipe.primitive,
          ...(pipelineRecipe.depthStencil ? { depthStencil: pipelineRecipe.depthStencil } : {}),
          ...(pipelineRecipe.multisample ? { multisample: pipelineRecipe.multisample } : {})
        };
        const pipelinePromise = typeof device.createRenderPipelineAsync === "function"
          ? device.createRenderPipelineAsync(pipelineDescriptor)
          : Promise.resolve(device.createRenderPipeline(pipelineDescriptor));
        const validationPromise = popValidationScope(device, scope);
        const [ gpuPipeline, validationError ] = await Promise.all([ pipelinePromise, validationPromise ]);
        if (validationError) fail(`render-pipeline validation failed: ${validationError.message || validationError}`);
        this._AssertGeneration(record.generation);
        const livePipeline = Object.freeze({
          key: record.descriptor.key,
          generation: record.generation,
          prepared,
          pipeline: gpuPipeline
        });
        LIVE_PIPELINES.set(livePipeline, { ...record, livePipeline, pipeline: gpuPipeline, pipelineRecipe });
        return livePipeline;
      }
      catch (error)
      {
        await popValidationScope(device, scope).catch(() => null);
        throw error;
      }
    }));
  }

  /**
   * Upload an explicit CPU geometry payload into device-owned vertex/index
   * buffers. The returned handle is opaque apart from its immutable
   * caller-provided vertex layouts and lifecycle metadata; TriGeometryRes
   * ownership remains outside the backend.
   */
  async CreateGeometry(options = {})
  {
    this._AssertReady();
    const plan = normalizeGeometry(options);
    const usage = this._bufferUsage;
    if (!usage || !Number.isInteger(usage.VERTEX) || !Number.isInteger(usage.INDEX)
      || !Number.isInteger(usage.COPY_DST))
    {
      fail("GPUBufferUsage VERTEX, INDEX, and COPY_DST constants are required to create geometry");
    }
    return this._SerializeValidation(async () =>
    {
      const device = this.GetDevice();
      if (typeof device.createBuffer !== "function" || typeof device.queue?.writeBuffer !== "function")
      {
        fail("GPUDevice buffer creation and queue.writeBuffer are required to create geometry");
      }
      validateGeometryLimits(plan, device);
      const generation = this._generation;
      const ownedBuffers = [];
      const scopes = { validation: false, memory: false };
      if (typeof device.pushErrorScope === "function" && typeof device.popErrorScope === "function")
      {
        device.pushErrorScope("out-of-memory");
        scopes.memory = true;
        device.pushErrorScope("validation");
        scopes.validation = true;
      }
      const popScope = async (name) =>
      {
        if (!scopes[name]) return null;
        scopes[name] = false;
        return device.popErrorScope();
      };
      const upload = (label, data, kind) =>
      {
        const size = alignedBufferSize(data.byteLength);
        const buffer = device.createBuffer({
          label,
          size,
          usage: usage[kind] | usage.COPY_DST
        });
        ownedBuffers.push(buffer);
        let bytes = data;
        if (size !== data.byteLength)
        {
          bytes = new Uint8Array(size);
          bytes.set(data);
        }
        device.queue.writeBuffer(buffer, 0, bytes);
        return buffer;
      };

      try
      {
        const vertexBuffers = plan.vertexBuffers.map((entry) => Object.freeze({
          slot: entry.slot,
          buffer: upload(entry.label || `${plan.label}.vertex${entry.slot}`, entry.data, "VERTEX"),
          offset: 0,
          size: entry.data.byteLength,
          capacity: entry.data.byteLength / entry.layout.arrayStride,
          stepMode: entry.layout.stepMode
        }));
        const indexBuffer = plan.indexBuffer
          ? Object.freeze({
            buffer: upload(plan.indexBuffer.label || `${plan.label}.index`, plan.indexBuffer.data, "INDEX"),
            format: plan.indexBuffer.format,
            offset: 0,
            size: plan.indexBuffer.data.byteLength,
            count: plan.indexBuffer.data.byteLength / (plan.indexBuffer.format === "uint16" ? 2 : 4)
          })
          : null;
        const validationPromise = popScope("validation");
        const memoryPromise = popScope("memory");
        const [ validationError, memoryError ] = await Promise.all([ validationPromise, memoryPromise ]);
        if (memoryError)
        {
          fail(`geometry allocation failed: ${memoryError.message || memoryError}`);
        }
        if (validationError)
        {
          fail(`geometry validation failed: ${validationError.message || validationError}`);
        }
        this._AssertGeneration(generation);
        const vertexBufferLayouts = Object.freeze(plan.vertexBuffers.map((entry) => entry.layout));
        const minimumCapacity = (stepMode) =>
        {
          const capacities = vertexBuffers.filter((entry) => entry.stepMode === stepMode).map((entry) => entry.capacity);
          return capacities.length ? Math.min(...capacities) : null;
        };
        let geometry;
        geometry = Object.freeze({
          label: plan.label,
          generation,
          vertexBufferCount: vertexBuffers.length,
          vertexBufferLayouts,
          vertexCapacity: minimumCapacity("vertex"),
          instanceCapacity: minimumCapacity("instance"),
          indexed: indexBuffer !== null,
          indexFormat: indexBuffer?.format || null,
          indexCount: indexBuffer?.count || 0,
          Destroy: () => this.DestroyGeometry(geometry)
        });
        GEOMETRIES.set(geometry, {
          owner: this,
          generation,
          vertexBuffers: Object.freeze(vertexBuffers),
          vertexBufferLayouts,
          indexBuffer,
          ownedBuffers: Object.freeze(ownedBuffers.slice()),
          destroyed: false
        });
        return geometry;
      }
      catch (error)
      {
        const validationPromise = popScope("validation").catch(() => null);
        const memoryPromise = popScope("memory").catch(() => null);
        await Promise.all([ validationPromise, memoryPromise ]);
        for (const buffer of ownedBuffers)
        {
          if (typeof buffer?.destroy === "function") buffer.destroy();
        }
        throw error;
      }
    });
  }

  /**
   * Destroys the device buffers owned by a geometry handle.
   */
  DestroyGeometry(geometry)
  {
    const record = GEOMETRIES.get(geometry);
    if (!record || record.owner !== this) fail("geometry belongs to another device");
    if (record.destroyed) return;
    record.destroyed = true;
    for (const buffer of record.ownedBuffers)
    {
      if (typeof buffer?.destroy === "function") buffer.destroy();
    }
  }

  /**
   * Upload one explicit, single-mip, uncompressed 2D CPU texture payload.
   * Sampler state and resource-path policy remain separate from this handle.
   */
  async CreateTexture(options = {})
  {
    this._AssertReady();
    const plan = normalizeTexture(options);
    const usage = this._textureUsage;
    if (!usage || !Number.isInteger(usage.TEXTURE_BINDING) || !Number.isInteger(usage.COPY_DST))
    {
      fail("GPUTextureUsage TEXTURE_BINDING and COPY_DST constants are required to create textures");
    }
    return this._SerializeValidation(async () =>
    {
      const device = this.GetDevice();
      if (typeof device.createTexture !== "function" || typeof device.queue?.writeTexture !== "function")
      {
        fail("GPUDevice texture creation and queue.writeTexture are required to create textures");
      }
      // Told before anything is created, so a device without BC support gets
      // the feature name rather than an unsupported-format error from inside
      // createTexture.
      AssertFormatFeature(plan, device);
      validateTextureLimits(plan, device);
      const generation = this._generation;
      const scopes = { validation: false, memory: false };
      if (typeof device.pushErrorScope === "function" && typeof device.popErrorScope === "function")
      {
        device.pushErrorScope("out-of-memory");
        scopes.memory = true;
        device.pushErrorScope("validation");
        scopes.validation = true;
      }
      const popScope = async (name) =>
      {
        if (!scopes[name]) return null;
        scopes[name] = false;
        return device.popErrorScope();
      };
      let gpuTexture = null;
      try
      {
        gpuTexture = device.createTexture({
          label: plan.label,
          size: { width: plan.width, height: plan.height, depthOrArrayLayers: plan.layers },
          mipLevelCount: plan.mipLevelCount,
          sampleCount: 1,
          // A WebGPU array texture is a 2d texture with more layers, not a 3d
          // one; only the view dimension changes. A cube is the same again: six
          // layers and a cube VIEW.
          dimension: "2d",
          format: plan.formatName,
          usage: usage.TEXTURE_BINDING | usage.COPY_DST
        });
        if (plan.mipLevelCount === 1)
        {
          // One level means every layer is a contiguous slab of the same
          // stride, so one write still covers them all.
          device.queue.writeTexture(
            { texture: gpuTexture },
            plan.data,
            { offset: 0, bytesPerRow: plan.bytesPerRow, rowsPerImage: plan.plan.writes[0].rowsPerImage },
            {
              width: plan.plan.writes[0].copyWidth,
              height: plan.plan.writes[0].copyHeight,
              depthOrArrayLayers: plan.layers
            }
          );
        }
        else
        {
          // A mip chain is stored layer-major, so one level across layers is
          // not contiguous and each (layer, level) is written on its own.
          // rowsPerImage counts BLOCK rows, which is what makes a compressed
          // upload differ from an uncompressed one.
          for (const write of plan.plan.writes)
          {
            device.queue.writeTexture(
              { texture: gpuTexture, mipLevel: write.level, origin: { x: 0, y: 0, z: write.layer } },
              plan.data,
              { offset: write.offset, bytesPerRow: write.bytesPerRow, rowsPerImage: write.rowsPerImage },
              { width: write.copyWidth, height: write.copyHeight, depthOrArrayLayers: 1 }
            );
          }
        }
        if (typeof gpuTexture?.createView !== "function") fail("created texture cannot create a view");
        const view = gpuTexture.createView({ label: `${plan.label}.view`, dimension: plan.viewDimension });
        const validationPromise = popScope("validation");
        const memoryPromise = popScope("memory");
        const [ validationError, memoryError ] = await Promise.all([ validationPromise, memoryPromise ]);
        if (memoryError)
        {
          fail(`texture allocation failed: ${memoryError.message || memoryError}`);
        }
        if (validationError)
        {
          fail(`texture validation failed: ${validationError.message || validationError}`);
        }
        this._AssertGeneration(generation);
        let texture;
        texture = Object.freeze({
          label: plan.label,
          generation,
          width: plan.width,
          height: plan.height,
          depthOrArrayLayers: plan.layers,
          mipLevelCount: plan.mipLevelCount,
          sampleCount: 1,
          dimension: "2d",
          viewDimension: plan.viewDimension,
          format: plan.formatName,
          isSRGB: plan.format.isSRGB,
          Destroy: () => this.DestroyTexture(texture)
        });
        TEXTURES.set(texture, {
          kind: "texture",
          owner: this,
          generation,
          texture: gpuTexture,
          view,
          viewDimension: plan.viewDimension,
          destroyed: false
        });
        return texture;
      }
      catch (error)
      {
        const validationPromise = popScope("validation").catch(() => null);
        const memoryPromise = popScope("memory").catch(() => null);
        await Promise.all([ validationPromise, memoryPromise ]);
        if (typeof gpuTexture?.destroy === "function") gpuTexture.destroy();
        throw error;
      }
    });
  }

  /**
   * Destroys the native texture owned by a texture handle.
   */
  DestroyTexture(texture)
  {
    const record = TEXTURES.get(texture);
    if (!record || record.owner !== this) fail("texture belongs to another device");
    if (record.destroyed) return;
    record.destroyed = true;
    if (typeof record.texture?.destroy === "function") record.texture.destroy();
  }

  /**
   * Normalize one explicit sampler descriptor and reuse its immutable native
   * GPUSampler within this device generation. Each call receives an
   * independently releasable opaque handle.
   */
  async CreateSampler(options = {})
  {
    this._AssertReady();
    const plan = normalizeSampler(options);
    return this._SerializeValidation(async () =>
    {
      const device = this.GetDevice();
      if (typeof device.createSampler !== "function") fail("GPUDevice sampler creation is required to create samplers");
      const generation = this._generation;
      let cached = this._samplerCache.get(plan.cacheKey);
      if (!cached)
      {
        const scope = {
          open: typeof device.pushErrorScope === "function" && typeof device.popErrorScope === "function"
        };
        if (scope.open) device.pushErrorScope("validation");
        const popScope = async () =>
        {
          if (!scope.open) return null;
          scope.open = false;
          return device.popErrorScope();
        };
        try
        {
          const nativeSampler = device.createSampler(plan.descriptor);
          const validationError = await popScope();
          if (validationError)
          {
            fail(`sampler validation failed: ${validationError.message || validationError}`);
          }
          this._AssertGeneration(generation);
          cached = Object.freeze({ generation, sampler: nativeSampler });
          this._samplerCache.set(plan.cacheKey, cached);
        }
        catch (error)
        {
          await popScope().catch(() => null);
          throw error;
        }
      }
      else
      {
        this._AssertGeneration(cached.generation);
      }

      let sampler;
      sampler = Object.freeze({
        label: plan.label,
        generation,
        ...plan.semantic,
        isComparison: plan.isComparison,
        isFiltering: plan.isFiltering,
        Destroy: () => this.DestroySampler(sampler)
      });
      SAMPLERS.set(sampler, {
        kind: "sampler",
        owner: this,
        generation,
        sampler: cached.sampler,
        isComparison: plan.isComparison,
        isFiltering: plan.isFiltering,
        destroyed: false
      });
      return sampler;
    });
  }

  /**
   * Releases one logical sampler handle without destroying its shared native
   * sampler.
   */
  DestroySampler(sampler)
  {
    const record = SAMPLERS.get(sampler);
    if (!record || record.owner !== this) fail("sampler belongs to another device");
    record.destroyed = true;
  }

  /**
   * Atomically realize one keyed collection of already-prepared plain GPU
   * payloads. Child handles remain private until every queued creation has
   * settled successfully, and the returned bundle owns their cleanup.
   */
  async CreateResourceBundle(options = {})
  {
    this._AssertReady();
    const plan = normalizeResourceBundle(options);
    const generation = this._generation;
    const tasks = plan.definitions.map((definition) =>
    {
      let promise;
      if (definition.kind === "geometry") promise = this.CreateGeometry(definition.options);
      else if (definition.kind === "texture") promise = this.CreateTexture(definition.options);
      else promise = this.CreateSampler(definition.options);
      return Object.freeze({ definition, promise });
    });
    const results = await Promise.allSettled(tasks.map((task) => task.promise));
    const fulfilled = results.flatMap((result, index) => result.status === "fulfilled"
      ? [ Object.freeze({ definition: tasks[index].definition, resource: result.value }) ]
      : []);
    const failure = results.find((result) => result.status === "rejected");
    let generationError = null;
    try
    {
      this._AssertGeneration(generation);
    }
    catch (error)
    {
      generationError = error;
    }
    if (failure || generationError)
    {
      for (let index = fulfilled.length - 1; index >= 0; index -= 1)
      {
        fulfilled[index].resource.Destroy();
      }
      throw failure?.reason || generationError;
    }

    const categoryEntries = {
      geometries: [],
      textures: [],
      samplers: []
    };
    for (const entry of fulfilled)
    {
      categoryEntries[entry.definition.category].push([ entry.definition.key, entry.resource ]);
    }
    const geometries = frozenRecord(categoryEntries.geometries);
    const textures = frozenRecord(categoryEntries.textures);
    const samplers = frozenRecord(categoryEntries.samplers);
    let bundle;
    bundle = Object.freeze({
      label: plan.label,
      generation,
      geometries,
      textures,
      samplers,
      Destroy: () => this.DestroyResourceBundle(bundle)
    });
    RESOURCE_BUNDLES.set(bundle, {
      owner: this,
      generation,
      resources: Object.freeze(fulfilled.map((entry) => entry.resource)),
      destroyed: false
    });
    return bundle;
  }

  /**
   * Destroys a resource bundle's child handles in reverse creation order.
   */
  DestroyResourceBundle(bundle)
  {
    const record = RESOURCE_BUNDLES.get(bundle);
    if (!record || record.owner !== this) fail("resource bundle belongs to another device");
    if (record.destroyed) return;
    record.destroyed = true;
    let firstError = null;
    for (let index = record.resources.length - 1; index >= 0; index -= 1)
    {
      try
      {
        record.resources[index].Destroy();
      }
      catch (error)
      {
        firstError ||= error;
      }
    }
    if (firstError)
    {
      record.destroyed = false;
      throw firstError;
    }
  }

  /**
   * Realize the already-published RGBA8 CPU payload attached to one resource.
   * Mapping remains synchronous and GPU-free; allocation and guarded adapter
   * publication are delegated to {@link CjsWebgpuDevice#RealizeResource}.
   * Concurrent calls for the same resource and adapter key share one operation.
   *
   * @param {object} resource Current loaded resource exposing `GetPayload()`.
   * @param {object} options Texture key, bundle label, and adapter slot.
   * @param {string} options.textureKey Binding/resource identity for the texture.
   * @param {string} [options.bundleLabel="prepared RGBA8 texture"] Diagnostic bundle label.
   * @param {string} [options.adapterKey="webgpu"] Resource adapter slot.
   * @returns {Promise<object>} Engine-owned prepared resource bundle.
   */
  RealizeRgba8Texture(resource, options = {})
  {
    assertRealizationResource(resource);
    const plan = normalizeRgba8TextureRealizationOptions(options);
    const input = mapRgba8TexturePayload(resource.GetPayload(), plan);
    return this.RealizeResource(resource, input, { adapterKey: plan.adapterKey });
  }

  /**
   * Realize already-selected WebGPU sampler state from a published CPU payload.
   * Selection and texture pairing remain caller policy; this method only maps,
   * allocates, and commits the selected sampler under the requested adapter key.
   *
   * @param {object} resource Current loaded resource exposing `GetPayload()`.
   * @param {object} options Sampler key, bundle label, and adapter slot.
   * @param {string} options.samplerKey Binding/resource identity for the sampler.
   * @param {string} [options.bundleLabel="prepared WebGPU sampler"] Diagnostic bundle label.
   * @param {string} [options.adapterKey="webgpu"] Resource adapter slot.
   * @returns {Promise<object>} Engine-owned prepared resource bundle.
   */
  RealizeSampler(resource, options = {})
  {
    assertRealizationResource(resource);
    const plan = normalizeSamplerRealizationOptions(options);
    const input = mapSamplerPayload(resource.GetPayload(), plan);
    return this.RealizeResource(resource, input, { adapterKey: plan.adapterKey });
  }

  /**
   * Realize one already-published CPU resource as an engine-owned WebGPU bundle.
   *
   * The in-flight boundary is this device session plus resource handle and
   * adapter key. Candidate allocation completes before a synchronous current-
   * target check and adapter commit. A stale or failed candidate is destroyed;
   * a current failure restores any usable prior adapter and otherwise returns
   * the resource to `LOADED` without discarding its CPU payload.
   *
   * @param {object} resource Current loaded resource receiving the adapter.
   * @param {object} value Plain geometry/texture/sampler bundle input. When omitted, the resource payload is used.
   * @param {object} [options={}] Adapter publication options.
   * @param {string} [options.adapterKey="webgpu"] Resource adapter slot.
   * @returns {Promise<object>} Engine-owned prepared resource bundle.
   */
  RealizeResource(resource, value, options = {})
  {
    assertRealizationResource(resource);
    const plan = normalizeResourceRealizationOptions(options);
    let operations = this._resourceRealizations.get(resource);
    if (!operations)
    {
      operations = new Map();
      this._resourceRealizations.set(resource, operations);
    }
    const existing = operations.get(plan.adapterKey);
    if (existing) return existing;

    const input = value === undefined ? resource.GetPayload() : value;
    const promise = this._RealizeResource(resource, input, plan);
    operations.set(plan.adapterKey, promise);
    const remove = () =>
    {
      if (operations.get(plan.adapterKey) === promise) operations.delete(plan.adapterKey);
    };
    promise.then(remove, remove);
    return promise;
  }

  /**
   * Allocates, publishes, and rolls back one guarded resource realization.
   */
  async _RealizeResource(resource, value, plan)
  {
    const stale = () =>
    {
      const error = new Error(`CjsWebgpuDevice: resource realization target ${plan.adapterKey} is stale`);
      error.code = "CJS_WEBGPU_STALE_RESOURCE_REALIZATION";
      error.adapterKey = plan.adapterKey;
      return error;
    };
    const assertOwned = (bundle, label) =>
    {
      if (bundle === undefined || bundle === null) return null;
      const record = RESOURCE_BUNDLES.get(bundle);
      if (!record || record.owner !== this)
      {
        fail(`${label} adapter slot ${plan.adapterKey} is not an engine-owned resource bundle`);
      }
      return record;
    };
    const isUsable = (bundle) =>
    {
      const record = bundle ? RESOURCE_BUNDLES.get(bundle) : null;
      return Boolean(record
        && record.owner === this
        && record.generation === this._generation
        && record.destroyed !== true);
    };

    if (!resource.IsCurrent()) throw stale();
    let displaced = resource.GetAdapterResource(plan.adapterKey);
    assertOwned(displaced, "existing");
    resource.MarkPreparing();
    if (!resource.IsCurrent()) throw stale();

    let candidate = null;
    let committed = false;
    try
    {
      candidate = await this.CreateResourceBundle(value);
      if (!resource.IsCurrent()) throw stale();

      displaced = resource.GetAdapterResource(plan.adapterKey);
      assertOwned(displaced, "current");
      resource.SetAdapterResource(plan.adapterKey, candidate);
      if (resource.GetAdapterResource(plan.adapterKey) !== candidate)
      {
        fail(`resource realization adapter slot ${plan.adapterKey} did not publish the candidate bundle`);
      }
      resource.MarkPrepared();
      if (!resource.IsCurrent()) throw stale();
      committed = true;
      if (displaced && displaced !== candidate) displaced.Destroy();
      return candidate;
    }
    catch (error)
    {
      if (!committed)
      {
        try
        {
          if (resource.IsCurrent())
          {
            const current = resource.GetAdapterResource(plan.adapterKey);
            if (current === candidate)
            {
              if (displaced !== undefined && displaced !== null)
              {
                resource.SetAdapterResource(plan.adapterKey, displaced);
              }
              else
              {
                resource.DestroyAdapterResource(plan.adapterKey);
              }
            }
            if (isUsable(resource.GetAdapterResource(plan.adapterKey))) resource.MarkPrepared();
            else resource.MarkLoaded();
          }
        }
        catch
        {
          // Preserve the realization error. The candidate is still destroyed
          // below, and a detached resource must not receive further mutation.
        }
        try
        {
          candidate?.Destroy();
        }
        catch
        {
          // Preserve the realization error after best-effort candidate cleanup.
        }
      }
      throw error;
    }
  }

  /**
   * Creates generation-bound bind groups and owned uniform buffers for a live
   * pipeline.
   */
  CreateBindingSet(livePipeline, options = {})
  {
    const record = assertLive(this, livePipeline);
    const usage = this._bufferUsage;
    const device = this.GetDevice();

    const uniformInputs = new Map(resourceEntries(options.uniformData, "binding-set uniformData"));
    const externalInputs = new Map(resourceEntries(options.resources, "binding-set resources"));
    const uniformPlans = new Map();
    const externalPlans = new Map();
    for (const group of record.descriptor.groups)
    {
      for (const entry of group.entries)
      {
        const buffer = entry.descriptor.buffer;
        if (buffer?.type === "uniform")
        {
          // A dynamic binding is bound ONCE and re-aimed per draw through the
          // offsets handed to setBindGroup, which is what lets many objects
          // share one ring buffer instead of one buffer each. The binding's
          // size is then the WINDOW, not the buffer, so it is taken from the
          // layout's minBindingSize rather than from the data's length.
          const size = buffer.minBindingSize;
          if (!Number.isInteger(size) || size < 1 || size % 4 !== 0)
          {
            fail(`${entry.identity} has an invalid uniform binding size`);
          }
          const data = uniformInputs.get(entry.identity);
          if (data == null) fail(`binding set is missing uniform data ${entry.identity}`);
          if (!ArrayBuffer.isView(data)) fail(`${entry.identity} uniform data must be an ArrayBufferView`);
          if (data.byteLength < size || data.byteLength % 4 !== 0)
          {
            fail(`${entry.identity} uniform data must be a 4-byte-aligned view of at least ${size} bytes`);
          }
          uniformPlans.set(entry.identity, {
            entry,
            data,
            size: data.byteLength,
            minBindingSize: size,
            dynamic: buffer.hasDynamicOffset === true,
            group: group.group
          });
        }
        else
        {
          const resource = externalInputs.get(entry.identity);
          if (resource == null) fail(`binding set is missing caller resource ${entry.identity}`);
          externalPlans.set(entry.identity, { entry, ...resolveBindingResource(this, entry, resource) });
        }
      }
    }
    for (const identity of uniformInputs.keys())
    {
      if (!uniformPlans.has(identity)) fail(`binding set has unexpected uniform data ${identity}`);
    }
    for (const identity of externalInputs.keys())
    {
      if (!externalPlans.has(identity)) fail(`binding set has unexpected caller resource ${identity}`);
    }
    if (uniformPlans.size
      && (!usage || !Number.isInteger(usage.UNIFORM) || !Number.isInteger(usage.COPY_DST)))
    {
      fail("GPUBufferUsage constants are required to create binding sets");
    }
    if (uniformPlans.size
      && (typeof device.createBuffer !== "function" || typeof device.queue?.writeBuffer !== "function"))
    {
      fail("GPUDevice buffer creation and queue.writeBuffer are required to create binding sets");
    }

    const buffers = [];
    try
    {
      const resources = new Map();
      const uniforms = new Map();
      const adapterResources = new Set();
      for (const [ identity, plan ] of uniformPlans)
      {
        const buffer = device.createBuffer({
          label: `${record.descriptor.key || "pipeline"}.${identity}`,
          size: plan.size,
          usage: usage.UNIFORM | usage.COPY_DST
        });
        buffers.push(buffer);
        device.queue.writeBuffer(buffer, 0, plan.data);
        // A dynamic binding's resource must describe the window the shader
        // sees, not the whole buffer; WebGPU adds the per-draw offset to this
        // one and validates that the window still fits.
        resources.set(identity, plan.dynamic
          ? { buffer, offset: 0, size: plan.minBindingSize }
          : { buffer });
        uniforms.set(identity, { buffer, size: plan.size, dynamic: plan.dynamic });
      }
      for (const [ identity, plan ] of externalPlans)
      {
        resources.set(identity, plan.resource);
        if (plan.adapterRecord) adapterResources.add(plan.adapterRecord);
      }

      const bindGroups = record.descriptor.groups.map((group) => device.createBindGroup({
        label: `${record.descriptor.key || "pipeline"}.group${group.group}.bindingSet`,
        layout: record.bindGroupLayouts[group.group],
        entries: group.entries.map((entry) => ({
          binding: entry.binding,
          resource: resources.get(entry.identity)
        }))
      }));
      let bindingSet;
      bindingSet = Object.freeze({
        key: record.descriptor.key,
        generation: record.generation,
        Update: (uniformData) =>
        {
          this.UpdateBindingSet(bindingSet, uniformData);
          return bindingSet;
        },
        Destroy: () => this.DestroyBindingSet(bindingSet)
      });
      BINDING_SETS.set(bindingSet, {
        owner: this,
        generation: record.generation,
        livePipeline,
        bindGroups: Object.freeze(bindGroups),
        buffers: Object.freeze(buffers.slice()),
        uniforms,
        adapterResources: Object.freeze(Array.from(adapterResources)),
        destroyed: false
      });
      return bindingSet;
    }
    catch (error)
    {
      for (const buffer of buffers)
      {
        if (typeof buffer?.destroy === "function") buffer.destroy();
      }
      throw error;
    }
  }

  /**
   * Validates and uploads exact-size updates to a binding set's owned uniform
   * buffers.
   */
  UpdateBindingSet(bindingSet, uniformData)
  {
    const record = assertBindingSet(this, bindingSet);
    const updates = resourceEntries(uniformData, "binding-set uniform update");
    if (!updates.length) fail("binding-set uniform update requires at least one entry");
    for (const [ identity, data ] of updates)
    {
      const uniform = record.uniforms.get(identity);
      if (!uniform) fail(`binding set has no owned uniform ${identity}`);
      if (!ArrayBuffer.isView(data)) fail(`${identity} uniform data must be an ArrayBufferView`);
      if (data.byteLength !== uniform.size)
      {
        fail(`${identity} uniform data must be exactly ${uniform.size} bytes`);
      }
    }
    const device = this.GetDevice();
    for (const [ identity, data ] of updates)
    {
      device.queue.writeBuffer(record.uniforms.get(identity).buffer, 0, data);
    }
    return bindingSet;
  }

  /**
   * Destroys a binding set's owned uniform buffers without releasing external
   * resources.
   */
  DestroyBindingSet(bindingSet)
  {
    const record = BINDING_SETS.get(bindingSet);
    if (!record || record.owner !== this) fail("binding set belongs to another device");
    if (record.destroyed) return;
    record.destroyed = true;
    for (const buffer of record.buffers)
    {
      if (typeof buffer?.destroy === "function") buffer.destroy();
    }
  }

  /**
   * Validates and snapshots one generation-bound indexed or non-indexed draw.
   */
  CreateDraw(livePipeline, options = {})
  {
    const record = assertLive(this, livePipeline);
    let geometryRecord = null;
    let vertexBuffers;
    if (options.geometry != null)
    {
      if (options.vertexBuffers != null || options.indexBuffer != null)
      {
        fail("draw geometry cannot be combined with raw vertexBuffers or indexBuffer");
      }
      geometryRecord = assertGeometry(this, options.geometry);
      const pipelineVertexLayouts = canonicalVertexLayouts(
        record.pipelineRecipe.vertex.buffers,
        "live pipeline vertex buffers"
      );
      if (!samePlain(pipelineVertexLayouts, geometryRecord.vertexBufferLayouts))
      {
        fail("draw geometry vertex layouts do not match the live pipeline");
      }
      vertexBuffers = geometryRecord.vertexBuffers.map(({ slot, buffer, offset, size }) => Object.freeze({
        slot,
        buffer,
        offset,
        size
      }));
    }
    else
    {
      vertexBuffers = (Array.isArray(options.vertexBuffers) ? options.vertexBuffers : []).map((entry) =>
      {
        if (!Number.isInteger(entry?.slot) || entry.slot < 0 || !entry.buffer) fail("draw has an invalid vertex buffer");
        if (own(entry, "offset") && (!Number.isSafeInteger(entry.offset) || entry.offset < 0)) fail("draw has an invalid vertex-buffer offset");
        if (own(entry, "size") && (!Number.isSafeInteger(entry.size) || entry.size < 0)) fail("draw has an invalid vertex-buffer size");
        return Object.freeze({ ...entry });
      });
    }
    const vertexSlots = new Set();
    for (const entry of vertexBuffers)
    {
      if (vertexSlots.has(entry.slot)) fail(`draw duplicates vertex-buffer slot ${entry.slot}`);
      vertexSlots.add(entry.slot);
    }
    vertexBuffers.sort((left, right) => left.slot - right.slot);

    const drawCall = options.draw;
    if (!drawCall || typeof drawCall !== "object") fail("draw call is required");
    const hasIndexCount = own(drawCall, "indexCount");
    const hasVertexCount = own(drawCall, "vertexCount");
    if (hasIndexCount === hasVertexCount) fail("draw requires exactly one of indexCount or vertexCount");
    const indexed = hasIndexCount;
    const count = indexed ? drawCall.indexCount : drawCall.vertexCount;
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_GPU_SIZE_32)
    {
      fail(`draw ${indexed ? "indexCount" : "vertexCount"} must be a GPUSize32 value`);
    }
    const uintValue = (key, fallback) =>
    {
      const value = own(drawCall, key) ? drawCall[key] : fallback;
      if (!Number.isSafeInteger(value) || value < 0 || value > MAX_GPU_SIZE_32)
      {
        fail(`draw ${key} must be a GPUSize32 value`);
      }
      return value;
    };
    const normalizedDraw = indexed
      ? {
        indexCount: count,
        instanceCount: uintValue("instanceCount", 1),
        firstIndex: uintValue("firstIndex", 0),
        baseVertex: own(drawCall, "baseVertex") ? drawCall.baseVertex : 0,
        firstInstance: uintValue("firstInstance", 0)
      }
      : {
        vertexCount: count,
        instanceCount: uintValue("instanceCount", 1),
        firstVertex: uintValue("firstVertex", 0),
        firstInstance: uintValue("firstInstance", 0)
      };
    if (indexed && (!Number.isSafeInteger(normalizedDraw.baseVertex)
      || normalizedDraw.baseVertex < MIN_GPU_SIGNED_OFFSET_32
      || normalizedDraw.baseVertex > MAX_GPU_SIGNED_OFFSET_32))
    {
      fail("draw baseVertex must be a GPUSignedOffset32 value");
    }
    const suppliedIndexBuffer = geometryRecord?.indexBuffer || options.indexBuffer;
    if (!indexed && suppliedIndexBuffer) fail("non-indexed draw cannot include an index buffer");
    if (indexed && (!suppliedIndexBuffer?.buffer || !suppliedIndexBuffer.format)) fail("indexed draw requires an index buffer and format");
    const indexBuffer = indexed ? Object.freeze({ ...suppliedIndexBuffer }) : null;
    if (indexBuffer && own(indexBuffer, "offset") && (!Number.isSafeInteger(indexBuffer.offset) || indexBuffer.offset < 0)) fail("draw has an invalid index-buffer offset");
    if (indexBuffer && own(indexBuffer, "size") && (!Number.isSafeInteger(indexBuffer.size) || indexBuffer.size < 0)) fail("draw has an invalid index-buffer size");
    if (geometryRecord)
    {
      if (indexed && normalizedDraw.firstIndex + normalizedDraw.indexCount > geometryRecord.indexBuffer.count)
      {
        fail("indexed draw exceeds geometry index capacity");
      }
      if (!indexed)
      {
        for (const entry of geometryRecord.vertexBuffers.filter((candidate) => candidate.stepMode === "vertex"))
        {
          if (normalizedDraw.firstVertex + normalizedDraw.vertexCount > entry.capacity)
          {
            fail(`draw exceeds geometry vertex capacity at slot ${entry.slot}`);
          }
        }
      }
      for (const entry of geometryRecord.vertexBuffers.filter((candidate) => candidate.stepMode === "instance"))
      {
        if (normalizedDraw.firstInstance + normalizedDraw.instanceCount > entry.capacity)
        {
          fail(`draw exceeds geometry instance capacity at slot ${entry.slot}`);
        }
      }
    }

    const hasBindingSet = options.bindingSet != null;
    const hasResources = options.resources != null;
    if (hasBindingSet === hasResources)
    {
      fail("draw requires exactly one of bindingSet or resources");
    }
    let bindingSetRecord = null;
    const adapterResources = new Set();
    let bindGroups;
    if (hasBindingSet)
    {
      bindingSetRecord = assertBindingSet(this, options.bindingSet, livePipeline);
      bindGroups = bindingSetRecord.bindGroups;
    }
    else
    {
      const resourceGroups = record.descriptor.groups.map((group) => ({
        group: group.group,
        entries: group.entries.map((entry) =>
        {
          const resource = findResource(options.resources, entry.identity);
          if (resource == null) fail(`draw is missing resource ${entry.identity}`);
          const resolved = resolveBindingResource(this, entry, resource);
          if (resolved.adapterRecord) adapterResources.add(resolved.adapterRecord);
          return { binding: entry.binding, resource: resolved.resource };
        })
      }));
      const device = this.GetDevice();
      bindGroups = resourceGroups.map((group) => device.createBindGroup({
        label: `${record.descriptor.key || "pipeline"}.group${group.group}.resources`,
        layout: record.bindGroupLayouts[group.group],
        entries: group.entries
      }));
    }

    const draw = Object.freeze({
      key: record.descriptor.key,
      generation: record.generation,
      livePipeline,
      bindGroups: Object.freeze(bindGroups),
      dynamicOffsets: resolveDynamicOffsets(record, options.dynamicOffsets, this.GetDevice()),
      vertexBuffers: Object.freeze(vertexBuffers),
      indexed,
      indexBuffer,
      draw: Object.freeze(normalizedDraw)
    });
    DRAWS.set(draw, {
      owner: this,
      generation: record.generation,
      record,
      bindingSetRecord,
      geometryRecord,
      adapterResources: Object.freeze(Array.from(adapterResources)),
      draw
    });
    return draw;
  }

  /**
   * Encodes one validated draw into a render pass.
   *
   * An optional `state` is a CjsWebgpuEncodeState the CALLER owns for the
   * lifetime of one render pass. When supplied, a set whose value is already
   * bound is skipped - Carbon's DX11 path does the same redundancy compare on
   * its shader program and its three state caches. Omitting it sets
   * everything, which is always correct and is what an unrelated caller gets.
   *
   * Deciding WHICH batches may share is not this method's business; that is
   * the dispatcher's grouping. This only honours a decision already made.
   */
  EncodeDraw(pass, draw, state = null)
  {
    const wrapper = DRAWS.get(draw);
    if (!wrapper || wrapper.owner !== this) fail("draw belongs to another device");
    this._AssertGeneration(wrapper.generation);
    if (wrapper.bindingSetRecord?.destroyed) fail("draw binding set is destroyed");
    assertAdapterResources(wrapper.bindingSetRecord?.adapterResources, "draw binding set");
    assertAdapterResources(wrapper.adapterResources, "draw");
    if (wrapper.geometryRecord?.destroyed) fail("draw geometry is destroyed");
    if (!pass || typeof pass.setPipeline !== "function") fail("a GPURenderPassEncoder is required");
    const encodeState = state?.Require(pass) ?? null;

    if (!encodeState || encodeState.NeedsPipeline(draw.livePipeline.pipeline))
    {
      pass.setPipeline(draw.livePipeline.pipeline);
    }
    draw.bindGroups.forEach((bindGroup, group) =>
    {
      const dynamicOffsets = draw.dynamicOffsets?.[group] ?? null;
      // A dynamic group is re-set every draw even when the bind group object is
      // unchanged, because the OFFSETS are what differ between two objects
      // sharing one ring buffer. Eliding it would draw them all at the same
      // slot.
      if (dynamicOffsets)
      {
        encodeState?.NeedsBindGroup(group, bindGroup);
        pass.setBindGroup(group, bindGroup, dynamicOffsets);
      }
      else if (!encodeState || encodeState.NeedsBindGroup(group, bindGroup))
      {
        pass.setBindGroup(group, bindGroup);
      }
    });
    if (!encodeState || encodeState.NeedsVertexBuffers(draw.vertexBuffers))
    {
      for (const entry of draw.vertexBuffers)
      {
        if (entry.size === undefined) pass.setVertexBuffer(entry.slot, entry.buffer, entry.offset ?? 0);
        else pass.setVertexBuffer(entry.slot, entry.buffer, entry.offset ?? 0, entry.size);
      }
    }
    if (draw.indexed)
    {
      if (!encodeState || encodeState.NeedsIndexBuffer(draw.indexBuffer))
      {
        if (draw.indexBuffer.size === undefined)
        {
          pass.setIndexBuffer(draw.indexBuffer.buffer, draw.indexBuffer.format, draw.indexBuffer.offset ?? 0);
        }
        else
        {
          pass.setIndexBuffer(draw.indexBuffer.buffer, draw.indexBuffer.format, draw.indexBuffer.offset ?? 0, draw.indexBuffer.size);
        }
      }
      pass.drawIndexed(
        draw.draw.indexCount,
        draw.draw.instanceCount,
        draw.draw.firstIndex,
        draw.draw.baseVertex,
        draw.draw.firstInstance
      );
    }
    else
    {
      pass.draw(
        draw.draw.vertexCount,
        draw.draw.instanceCount,
        draw.draw.firstVertex,
        draw.draw.firstInstance
      );
    }
  }

  /**
   * Submits command buffers to the ready device queue.
   */
  Submit(commandBuffers)
  {
    this.GetDevice().queue.submit(commandBuffers);
  }

  /**
   * Acquires or accepts a replacement adapter/device and advances the device
   * generation.
   */
  async Recreate(options = {})
  {
    if (this._state === "destroyed") fail("cannot recreate a destroyed device");
    const requestSerial = ++this._recreateSerial;
    const lifecycleVersion = this._lifecycleVersion;
    const previous = this._device;
    const gpu = options.gpu || this._gpu;
    if (!gpu || typeof gpu.requestAdapter !== "function") fail("recreation requires the original GPU provider");
    const adapterOptions = own(options, "adapterOptions") ? options.adapterOptions : this._adapterOptions;
    const deviceDescriptor = own(options, "deviceDescriptor") ? options.deviceDescriptor : this._deviceDescriptor;
    const adapter = options.adapter || await gpu.requestAdapter(adapterOptions);
    if (!adapter) fail("requestAdapter returned null during recreation");
    const device = options.device || await adapter.requestDevice(deviceDescriptor);
    if (this._state === "destroyed" || this._lifecycleVersion !== lifecycleVersion || this._recreateSerial !== requestSerial)
    {
      if (device !== previous && device !== this._device && typeof device?.destroy === "function") device.destroy();
      fail("recreation was superseded by another lifecycle change");
    }
    this._gpu = gpu;
    this._adapter = adapter;
    this._device = device;
    this._adapterOptions = adapterOptions;
    this._deviceDescriptor = deviceDescriptor;
    this._generation += 1;
    this._samplerCache = new Map();
    // A pipeline built for a device that is gone is not repairable.
    this._preparedCache.Clear();
    this._renderPipelineCache.Clear();
    this._state = "ready";
    this._lostInfo = null;
    this._WatchDevice(device, this._generation);
    if (previous && previous !== device && typeof previous.destroy === "function") previous.destroy();
    return this;
  }

  /**
   * Transitions the boundary to destroyed, invalidates its generation, and
   * destroys the native device.
   */
  Destroy()
  {
    if (this._state === "destroyed") return;
    const device = this._device;
    this._lifecycleVersion += 1;
    this._recreateSerial += 1;
    this._state = "destroyed";
    this._generation += 1;
    this._samplerCache.clear();
    this._preparedCache.Clear();
    this._renderPipelineCache.Clear();
    this._device = null;
    if (typeof device?.destroy === "function") device.destroy();
  }

  /**
   * Throws unless the boundary has a ready native device.
   */
  _AssertReady()
  {
    if (this._state !== "ready" || !this._device) fail(`device is ${this._state}`);
  }

  /**
   * Throws unless an object generation matches the current ready device.
   */
  _AssertGeneration(generation)
  {
    this._AssertReady();
    if (generation !== this._generation) fail(`object belongs to stale device generation ${generation}`);
  }

  /**
   * Queues a validation-sensitive operation after all previously queued
   * operations settle.
   */
  _SerializeValidation(operation)
  {
    const run = this._validationTail.then(operation, operation);
    this._validationTail = run.then(() => undefined, () => undefined);
    return run;
  }

  /**
   * Tracks loss for one device generation and accepts only a still-current
   * loss event.
   */
  _WatchDevice(device, generation)
  {
    if (!device?.lost || typeof device.lost.then !== "function") return;
    device.lost.then((info) =>
    {
      if (this._device !== device || this._generation !== generation || this._state !== "ready") return;
      this._state = "lost";
      this._lostInfo = info || null;
      this._samplerCache.clear();
      this._preparedCache.Clear();
      this._renderPipelineCache.Clear();
      this._onLost?.(this._lostInfo, generation);
    }).catch(() => undefined);
  }
}
