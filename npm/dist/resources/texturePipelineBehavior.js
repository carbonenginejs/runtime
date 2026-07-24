import { validateRgbaPayload } from '../format/payloadContract.js';
import { PixelFormat as PixelFormat$1 } from '@carbonenginejs/runtime-utils/graphics';
import { PixelFormat } from '@carbonenginejs/runtime-utils/render-context';

// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.cpp
const STEP_LOAD = "Tr2TexturePipelineStepLoad";
const STEP_LIMIT_SIZE = "Tr2TexturePipelineStepLimitSize";
const STEP_COMPRESS = "Tr2TexturePipelineStepCompress";
const STEP_PACK = "Tr2TexturePipelineStepPack";
const PACK_FORMATS = new Set([PixelFormat.PIXEL_FORMAT_R8_UNORM, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM]);

/**
 * Collect Carbon texture-pipeline dependencies in std::set-equivalent order.
 *
 * @param {object[]} steps Pipeline steps.
 * @returns {string[]} Sorted unique resource paths.
 */
function GetTexturePipelineDependencies(steps) {
  const dependencies = new Set();
  for (const step of AssertSteps(steps)) {
    const name = StepName(step);
    if (name === STEP_LOAD) {
      AddDependency(dependencies, step.path);
    } else if (name === STEP_PACK) {
      AddDependency(dependencies, step.r?.path);
      AddDependency(dependencies, step.g?.path);
      AddDependency(dependencies, step.b?.path);
      AddDependency(dependencies, step.a?.path);
    }
  }
  return [...dependencies].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Execute the maintained JavaScript form of Carbon's CPU bitmap pipeline.
 *
 * @param {object[]} steps Pipeline steps.
 * @param {{maxWidth:number,maxHeight:number}} params Caller size limits.
 * @param {object|null} options Input resolution options.
 * @returns {Promise<object>} Canonical RGBA payload.
 */
async function ExecuteTexturePipeline(steps, params, options = null) {
  const list = AssertSteps(steps);
  if (!list.length) {
    throw PipelineError("CJS_TEXTURE_PIPELINE_NO_STEPS", "Tr2TexturePipeline has no steps.");
  }
  const limits = {
    maxWidth: AssertLimit(params?.maxWidth, "maxWidth"),
    maxHeight: AssertLimit(params?.maxHeight, "maxHeight")
  };
  const settings = NormalizeOptions(options);
  const inputs = new Map();
  for (const path of GetTexturePipelineDependencies(list)) {
    inputs.set(path, await ResolveInput(path, settings));
  }
  let bitmap = null;
  for (const step of list) {
    const name = StepName(step);
    if (name === STEP_LOAD) {
      bitmap = CloneBitmap(RequireInput(inputs, step.path));
    } else if (name === STEP_LIMIT_SIZE) {
      bitmap = LimitBitmap(RequireBitmap(bitmap), CombineLimits(step, limits));
    } else if (name === STEP_COMPRESS) {
      // Carbon's current implementation validates the bitmap and otherwise
      // performs no compression work.
      RequireBitmap(bitmap);
    } else if (name === STEP_PACK) {
      bitmap = PackBitmap(step, inputs);
    } else {
      throw PipelineError("CJS_TEXTURE_PIPELINE_STEP_UNSUPPORTED", `Unsupported texture pipeline step: ${name || "unknown"}.`);
    }
  }
  bitmap = LimitBitmap(RequireBitmap(bitmap), limits);
  return ToPayload(bitmap);
}
function AssertSteps(steps) {
  if (!Array.isArray(steps)) {
    throw new TypeError("Tr2TexturePipeline.steps must be an array.");
  }
  return steps;
}
function AssertLimit(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Tr2TexturePipeline ${name} must be a non-negative safe integer.`);
  }
  return value;
}
function NormalizeOptions(options) {
  if (options === null || options === undefined) {
    return {};
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Tr2TexturePipeline options must be an object or null.");
  }
  if (options.load !== undefined && typeof options.load !== "function") {
    throw new TypeError("Tr2TexturePipeline options.load must be a function.");
  }
  if (options.resMan !== undefined && typeof options.resMan?.GetObject !== "function") {
    throw new TypeError("Tr2TexturePipeline options.resMan must provide GetObject().");
  }
  return options;
}
async function ResolveInput(path, options) {
  let value;
  if (options.inputs instanceof Map) {
    value = options.inputs.get(path);
  } else if (options.inputs && typeof options.inputs === "object") {
    value = options.inputs[path];
  }
  if (value === undefined && options.load) {
    value = await options.load(path);
  }
  if (value === undefined && options.resMan) {
    value = await options.resMan.GetObject(path, {
      ...(options.resourceOptions || {}),
      requirement: "image",
      emit: "rgba"
    });
  }
  if (value === undefined) {
    throw PipelineError("CJS_TEXTURE_PIPELINE_INPUT_MISSING", `No texture pipeline input was provided for ${path}.`);
  }
  const payload = typeof value?.GetPayload === "function" ? value.GetPayload() : value;
  validateRgbaPayload(payload);
  if (payload.pixelFormat !== PixelFormat$1.RGBA8_UNORM) {
    throw PipelineError("CJS_TEXTURE_PIPELINE_FORMAT_UNSUPPORTED", `Texture pipeline input ${path} must use rgba8unorm.`);
  }
  return FromPayload(payload);
}
function FromPayload(payload) {
  const data = new Uint8Array(payload.width * payload.height * 4);
  for (let y = 0; y < payload.height; y++) {
    const sourceOffset = y * payload.strideBytes;
    const targetOffset = y * payload.width * 4;
    data.set(payload.data.subarray(sourceOffset, sourceOffset + payload.width * 4), targetOffset);
  }
  return {
    width: payload.width,
    height: payload.height,
    data,
    sourceFormat: payload.sourceFormat || "rgba",
    colorSpace: payload.colorSpace,
    alphaMode: payload.alphaMode,
    metadata: payload.metadata || null
  };
}
function ToPayload(bitmap) {
  return {
    payloadType: "rgba",
    sourceFormat: bitmap.sourceFormat || "texture-pipeline",
    width: bitmap.width,
    height: bitmap.height,
    pixelFormat: PixelFormat$1.RGBA8_UNORM,
    data: bitmap.data,
    strideBytes: bitmap.width * 4,
    origin: "top-left",
    colorSpace: bitmap.colorSpace || "unknown",
    alphaMode: bitmap.alphaMode || "unknown",
    ...(bitmap.metadata ? {
      metadata: bitmap.metadata
    } : {})
  };
}
function CloneBitmap(bitmap) {
  return {
    ...bitmap,
    data: new Uint8Array(bitmap.data),
    metadata: bitmap.metadata && typeof bitmap.metadata === "object" ? {
      ...bitmap.metadata
    } : bitmap.metadata
  };
}
function CombineLimits(step, params) {
  return {
    maxWidth: TightestLimit(AssertLimit(step.maxWidth ?? 0, "step.maxWidth"), params.maxWidth),
    maxHeight: TightestLimit(AssertLimit(step.maxHeight ?? 0, "step.maxHeight"), params.maxHeight)
  };
}
function TightestLimit(first, second) {
  if (!first) return second;
  if (!second) return first;
  return Math.min(first, second);
}
function LimitBitmap(bitmap, limits) {
  let result = bitmap;
  while (limits.maxWidth && result.width > limits.maxWidth || limits.maxHeight && result.height > limits.maxHeight) {
    result = Downsample2x2(result);
  }
  return result;
}
function Downsample2x2(bitmap) {
  const width = Math.max(1, Math.floor(bitmap.width / 2));
  const height = Math.max(1, Math.floor(bitmap.height / 2));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const counts = [0, 0, 0, 0];
      let samples = 0;
      for (let oy = 0; oy < 2; oy++) {
        for (let ox = 0; ox < 2; ox++) {
          const sourceX = Math.min(bitmap.width - 1, x * 2 + ox);
          const sourceY = Math.min(bitmap.height - 1, y * 2 + oy);
          const source = (sourceY * bitmap.width + sourceX) * 4;
          for (let channel = 0; channel < 4; channel++) {
            counts[channel] += bitmap.data[source + channel];
          }
          samples++;
        }
      }
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        data[target + channel] = Math.round(counts[channel] / samples);
      }
    }
  }
  return {
    ...bitmap,
    width,
    height,
    data
  };
}
function PackBitmap(step, inputs) {
  // The generated schema records the enum's zero value, while Carbon's
  // constructor initializes this step to B8G8R8A8_UNORM.
  const format = step.format === PixelFormat.PIXEL_FORMAT_UNKNOWN ? PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM : step.format;
  if (!PACK_FORMATS.has(format)) {
    throw PipelineError("CJS_TEXTURE_PIPELINE_FORMAT_UNSUPPORTED", `Unsupported Carbon pack pixel format: ${String(format)}.`);
  }
  const descriptors = [step.r, step.g, step.b, step.a];
  const sources = descriptors.map(channel => channel?.path ? RequireInput(inputs, channel.path) : null);
  const first = sources.find(Boolean);
  const width = first?.width || 4;
  const height = first?.height || 4;
  for (const source of sources) {
    if (source && (source.width !== width || source.height !== height)) {
      throw PipelineError("CJS_TEXTURE_PIPELINE_SIZE_MISMATCH", "Texture pipeline pack inputs must have identical dimensions.");
    }
  }
  const data = new Uint8Array(width * height * 4);
  const isR8 = format === PixelFormat.PIXEL_FORMAT_R8_UNORM;
  const isX8 = format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM;
  for (let pixel = 0; pixel < width * height; pixel++) {
    const values = descriptors.map((channel, index) => ReadPackChannel(sources[index], channel, pixel));
    const target = pixel * 4;
    if (isR8) {
      data[target] = values[0];
      data[target + 3] = 255;
    } else {
      data[target] = values[0];
      data[target + 1] = values[1];
      data[target + 2] = values[2];
      data[target + 3] = isX8 ? 255 : values[3];
    }
  }
  return {
    width,
    height,
    data,
    sourceFormat: "texture-pipeline",
    colorSpace: first?.colorSpace || "unknown",
    alphaMode: isX8 || isR8 ? "opaque" : "unknown",
    metadata: {
      carbonPixelFormat: format
    }
  };
}
function ReadPackChannel(source, descriptor, pixel) {
  if (!source) {
    return AssertByte(descriptor?.fill ?? 0, "fill");
  }
  const channel = AssertByte(descriptor?.channel ?? 0, "channel");
  if (channel > 3) {
    throw new RangeError("Tr2TexturePackChannel.channel must be between 0 and 3.");
  }
  // Carbon's exposed chooser encodes RED=2 and BLUE=0 for BGRA host
  // bitmaps. Translate those values to this package's canonical RGBA input.
  const rgbaChannel = channel === 0 ? 2 : channel === 2 ? 0 : channel;
  return source.data[pixel * 4 + rgbaChannel];
}
function AssertByte(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`Tr2TexturePackChannel.${name} must be an integer from 0 to 255.`);
  }
  return value;
}
function RequireInput(inputs, path) {
  const value = inputs.get(String(path || ""));
  if (!value) {
    throw PipelineError("CJS_TEXTURE_PIPELINE_INPUT_MISSING", `Texture pipeline input is unavailable: ${String(path || "")}.`);
  }
  return value;
}
function RequireBitmap(bitmap) {
  if (!bitmap) {
    throw PipelineError("CJS_TEXTURE_PIPELINE_BITMAP_INVALID", "Texture pipeline step requires a valid input bitmap.");
  }
  return bitmap;
}
function AddDependency(dependencies, value) {
  const path = String(value || "");
  if (path) {
    dependencies.add(path);
  }
}
function StepName(step) {
  return step?.constructor?.name || step?.className || "";
}
function PipelineError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export { ExecuteTexturePipeline, GetTexturePipelineDependencies };
//# sourceMappingURL=texturePipelineBehavior.js.map
