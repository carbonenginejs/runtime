// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.cpp
import { validateRgbaPayload } from "../format/payloadContract.js";
import { PixelFormat as PayloadPixelFormat } from "#consts/graphics";
import { PixelFormat as CarbonPixelFormat } from "#consts/render-context";

const STEP_LOAD = "Tr2TexturePipelineStepLoad";
const STEP_LIMIT_SIZE = "Tr2TexturePipelineStepLimitSize";
const STEP_COMPRESS = "Tr2TexturePipelineStepCompress";
const STEP_PACK = "Tr2TexturePipelineStepPack";
const PACK_FORMATS = new Set([
  CarbonPixelFormat.PIXEL_FORMAT_R8_UNORM,
  CarbonPixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM,
  CarbonPixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM
]);

/**
 * Collect Carbon texture-pipeline dependencies in std::set-equivalent order.
 *
 * @param {object[]} steps Pipeline steps.
 * @returns {string[]} Sorted unique resource paths.
 */
export function getTexturePipelineDependencies(steps)
{
  const dependencies = new Set();
  for (const step of assertSteps(steps))
  {
    const name = stepName(step);
    if (name === STEP_LOAD)
    {
      addDependency(dependencies, step.path);
    }
    else if (name === STEP_PACK)
    {
      addDependency(dependencies, step.r?.path);
      addDependency(dependencies, step.g?.path);
      addDependency(dependencies, step.b?.path);
      addDependency(dependencies, step.a?.path);
    }
  }
  return [ ...dependencies ].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Execute the maintained JavaScript form of Carbon's CPU bitmap pipeline.
 *
 * @param {object[]} steps Pipeline steps.
 * @param {{maxWidth:number,maxHeight:number}} params Caller size limits.
 * @param {object|null} options Input resolution options.
 * @returns {Promise<object>} Canonical RGBA payload.
 */
export async function executeTexturePipeline(steps, params, options = null)
{
  const list = assertSteps(steps);
  if (!list.length)
  {
    throw pipelineError("CJS_TEXTURE_PIPELINE_NO_STEPS", "Tr2TexturePipeline has no steps.");
  }
  const limits = {
    maxWidth: assertLimit(params?.maxWidth, "maxWidth"),
    maxHeight: assertLimit(params?.maxHeight, "maxHeight")
  };
  const settings = normalizeOptions(options);
  const inputs = new Map();
  for (const path of getTexturePipelineDependencies(list))
  {
    inputs.set(path, await resolveInput(path, settings));
  }

  let bitmap = null;
  for (const step of list)
  {
    const name = stepName(step);
    if (name === STEP_LOAD)
    {
      bitmap = cloneBitmap(requireInput(inputs, step.path));
    }
    else if (name === STEP_LIMIT_SIZE)
    {
      bitmap = limitBitmap(requireBitmap(bitmap), combineLimits(step, limits));
    }
    else if (name === STEP_COMPRESS)
    {
      // Carbon's current implementation validates the bitmap and otherwise
      // performs no compression work.
      requireBitmap(bitmap);
    }
    else if (name === STEP_PACK)
    {
      bitmap = packBitmap(step, inputs);
    }
    else
    {
      throw pipelineError(
        "CJS_TEXTURE_PIPELINE_STEP_UNSUPPORTED",
        `Unsupported texture pipeline step: ${name || "unknown"}.`
      );
    }
  }

  bitmap = limitBitmap(requireBitmap(bitmap), limits);
  return toPayload(bitmap);
}

function assertSteps(steps)
{
  if (!Array.isArray(steps))
  {
    throw new TypeError("Tr2TexturePipeline.steps must be an array.");
  }
  return steps;
}

function assertLimit(value, name)
{
  if (!Number.isSafeInteger(value) || value < 0)
  {
    throw new TypeError(`Tr2TexturePipeline ${name} must be a non-negative safe integer.`);
  }
  return value;
}

function normalizeOptions(options)
{
  if (options === null || options === undefined)
  {
    return {};
  }
  if (!options || typeof options !== "object" || Array.isArray(options))
  {
    throw new TypeError("Tr2TexturePipeline options must be an object or null.");
  }
  if (options.load !== undefined && typeof options.load !== "function")
  {
    throw new TypeError("Tr2TexturePipeline options.load must be a function.");
  }
  if (options.resMan !== undefined && typeof options.resMan?.GetObject !== "function")
  {
    throw new TypeError("Tr2TexturePipeline options.resMan must provide GetObject().");
  }
  return options;
}

async function resolveInput(path, options)
{
  let value;
  if (options.inputs instanceof Map)
  {
    value = options.inputs.get(path);
  }
  else if (options.inputs && typeof options.inputs === "object")
  {
    value = options.inputs[path];
  }
  if (value === undefined && options.load)
  {
    value = await options.load(path);
  }
  if (value === undefined && options.resMan)
  {
    value = await options.resMan.GetObject(path, {
      ...(options.resourceOptions || {}),
      requirement: "image",
      emit: "rgba"
    });
  }
  if (value === undefined)
  {
    throw pipelineError(
      "CJS_TEXTURE_PIPELINE_INPUT_MISSING",
      `No texture pipeline input was provided for ${path}.`
    );
  }
  const payload = typeof value?.GetPayload === "function" ? value.GetPayload() : value;
  validateRgbaPayload(payload);
  if (payload.pixelFormat !== PayloadPixelFormat.RGBA8_UNORM)
  {
    throw pipelineError(
      "CJS_TEXTURE_PIPELINE_FORMAT_UNSUPPORTED",
      `Texture pipeline input ${path} must use rgba8unorm.`
    );
  }
  return fromPayload(payload);
}

function fromPayload(payload)
{
  const data = new Uint8Array(payload.width * payload.height * 4);
  for (let y = 0; y < payload.height; y++)
  {
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

function toPayload(bitmap)
{
  return {
    payloadType: "rgba",
    sourceFormat: bitmap.sourceFormat || "texture-pipeline",
    width: bitmap.width,
    height: bitmap.height,
    pixelFormat: PayloadPixelFormat.RGBA8_UNORM,
    data: bitmap.data,
    strideBytes: bitmap.width * 4,
    origin: "top-left",
    colorSpace: bitmap.colorSpace || "unknown",
    alphaMode: bitmap.alphaMode || "unknown",
    ...(bitmap.metadata ? { metadata: bitmap.metadata } : {})
  };
}

function cloneBitmap(bitmap)
{
  return {
    ...bitmap,
    data: new Uint8Array(bitmap.data),
    metadata: bitmap.metadata && typeof bitmap.metadata === "object"
      ? { ...bitmap.metadata }
      : bitmap.metadata
  };
}

function combineLimits(step, params)
{
  return {
    maxWidth: tightestLimit(assertLimit(step.maxWidth ?? 0, "step.maxWidth"), params.maxWidth),
    maxHeight: tightestLimit(assertLimit(step.maxHeight ?? 0, "step.maxHeight"), params.maxHeight)
  };
}

function tightestLimit(first, second)
{
  if (!first) return second;
  if (!second) return first;
  return Math.min(first, second);
}

function limitBitmap(bitmap, limits)
{
  let result = bitmap;
  while ((limits.maxWidth && result.width > limits.maxWidth)
    || (limits.maxHeight && result.height > limits.maxHeight))
  {
    result = downsample2x2(result);
  }
  return result;
}

function downsample2x2(bitmap)
{
  const width = Math.max(1, Math.floor(bitmap.width / 2));
  const height = Math.max(1, Math.floor(bitmap.height / 2));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
  {
    for (let x = 0; x < width; x++)
    {
      const counts = [ 0, 0, 0, 0 ];
      let samples = 0;
      for (let oy = 0; oy < 2; oy++)
      {
        for (let ox = 0; ox < 2; ox++)
        {
          const sourceX = Math.min(bitmap.width - 1, x * 2 + ox);
          const sourceY = Math.min(bitmap.height - 1, y * 2 + oy);
          const source = (sourceY * bitmap.width + sourceX) * 4;
          for (let channel = 0; channel < 4; channel++)
          {
            counts[channel] += bitmap.data[source + channel];
          }
          samples++;
        }
      }
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++)
      {
        data[target + channel] = Math.round(counts[channel] / samples);
      }
    }
  }
  return { ...bitmap, width, height, data };
}

function packBitmap(step, inputs)
{
  // The generated schema records the enum's zero value, while Carbon's
  // constructor initializes this step to B8G8R8A8_UNORM.
  const format = step.format === CarbonPixelFormat.PIXEL_FORMAT_UNKNOWN
    ? CarbonPixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM
    : step.format;
  if (!PACK_FORMATS.has(format))
  {
    throw pipelineError(
      "CJS_TEXTURE_PIPELINE_FORMAT_UNSUPPORTED",
      `Unsupported Carbon pack pixel format: ${String(format)}.`
    );
  }
  const descriptors = [ step.r, step.g, step.b, step.a ];
  const sources = descriptors.map(channel => channel?.path
    ? requireInput(inputs, channel.path)
    : null);
  const first = sources.find(Boolean);
  const width = first?.width || 4;
  const height = first?.height || 4;
  for (const source of sources)
  {
    if (source && (source.width !== width || source.height !== height))
    {
      throw pipelineError(
        "CJS_TEXTURE_PIPELINE_SIZE_MISMATCH",
        "Texture pipeline pack inputs must have identical dimensions."
      );
    }
  }

  const data = new Uint8Array(width * height * 4);
  const isR8 = format === CarbonPixelFormat.PIXEL_FORMAT_R8_UNORM;
  const isX8 = format === CarbonPixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM;
  for (let pixel = 0; pixel < width * height; pixel++)
  {
    const values = descriptors.map((channel, index) => readPackChannel(
      sources[index],
      channel,
      pixel
    ));
    const target = pixel * 4;
    if (isR8)
    {
      data[target] = values[0];
      data[target + 3] = 255;
    }
    else
    {
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
    metadata: { carbonPixelFormat: format }
  };
}

function readPackChannel(source, descriptor, pixel)
{
  if (!source)
  {
    return assertByte(descriptor?.fill ?? 0, "fill");
  }
  const channel = assertByte(descriptor?.channel ?? 0, "channel");
  if (channel > 3)
  {
    throw new RangeError("Tr2TexturePackChannel.channel must be between 0 and 3.");
  }
  // Carbon's exposed chooser encodes RED=2 and BLUE=0 for BGRA host
  // bitmaps. Translate those values to this package's canonical RGBA input.
  const rgbaChannel = channel === 0 ? 2 : channel === 2 ? 0 : channel;
  return source.data[pixel * 4 + rgbaChannel];
}

function assertByte(value, name)
{
  if (!Number.isInteger(value) || value < 0 || value > 255)
  {
    throw new RangeError(`Tr2TexturePackChannel.${name} must be an integer from 0 to 255.`);
  }
  return value;
}

function requireInput(inputs, path)
{
  const value = inputs.get(String(path || ""));
  if (!value)
  {
    throw pipelineError(
      "CJS_TEXTURE_PIPELINE_INPUT_MISSING",
      `Texture pipeline input is unavailable: ${String(path || "")}.`
    );
  }
  return value;
}

function requireBitmap(bitmap)
{
  if (!bitmap)
  {
    throw pipelineError(
      "CJS_TEXTURE_PIPELINE_BITMAP_INVALID",
      "Texture pipeline step requires a valid input bitmap."
    );
  }
  return bitmap;
}

function addDependency(dependencies, value)
{
  const path = String(value || "");
  if (path)
  {
    dependencies.add(path);
  }
}

function stepName(step)
{
  return step?.constructor?.name || step?.className || "";
}

function pipelineError(code, message)
{
  const error = new Error(message);
  error.code = code;
  return error;
}
