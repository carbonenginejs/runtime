// What a texture's bytes look like, before any GPU object exists.
//
// The adapter this replaces accepted exactly two formats, one mip level, one
// sample and 2D or 2D-array only, so every real EVE texture was outside it:
// they arrive as DDS carrying block-compressed BC data with full mip chains,
// and cube maps for environment probes.
//
// BLOCK COMPRESSION IS WHY THIS IS A MODULE AND NOT A CONSTANT. For an
// uncompressed format a row of bytes is `width * bytesPerPixel` and a mip level
// is `height` rows. For a block-compressed one, BOTH of those are wrong:
// `bytesPerRow` counts BLOCK rows - `ceil(width / 4) * blockBytes` - and
// `rowsPerImage` is `ceil(height / 4)`, not `height`. Passing pixel rows to
// `writeTexture` for a BC texture is the classic version of this bug, and it
// does not fail loudly: at 256x256 it claims 256 rows where 64 exist, so the
// copy runs off the end of the data and reads garbage.
//
// The same rounding is why a BC mip chain does not shrink to nothing. A 1x1 mip
// of a 4x4-block format still occupies one whole block, so the last three
// levels of any BC chain are the same size. Computing a level's footprint from
// its pixel dimensions alone under-counts them.
//
// An uncompressed format is expressed here as a 1x1 block, so there is one code
// path rather than two and the compressed case cannot drift from the plain one.

function fail(message)
{
  const error = new Error(`CjsWebgpuTextureLayout: ${message}`);
  error.code = "CJS_WEBGPU_TEXTURE_LAYOUT_INVALID";
  throw error;
}


/**
 * Supported texture formats, each as a block size in texels and bytes.
 *
 * `feature` names the WebGPU device feature a format requires. BC formats are
 * behind `texture-compression-bc`, which desktop adapters have and many mobile
 * ones do not, so a device without it must be told rather than left to fail
 * inside `createTexture`.
 */
export const TEXTURE_FORMATS = new Map([
  // Uncompressed. A 1x1 block keeps them on the same path as the rest.
  [ "r8unorm", { blockWidth: 1, blockHeight: 1, blockBytes: 1, isSRGB: false } ],
  [ "rg8unorm", { blockWidth: 1, blockHeight: 1, blockBytes: 2, isSRGB: false } ],
  [ "rgba8unorm", { blockWidth: 1, blockHeight: 1, blockBytes: 4, isSRGB: false } ],
  [ "rgba8unorm-srgb", { blockWidth: 1, blockHeight: 1, blockBytes: 4, isSRGB: true } ],
  [ "bgra8unorm", { blockWidth: 1, blockHeight: 1, blockBytes: 4, isSRGB: false } ],
  [ "bgra8unorm-srgb", { blockWidth: 1, blockHeight: 1, blockBytes: 4, isSRGB: true } ],
  [ "r16float", { blockWidth: 1, blockHeight: 1, blockBytes: 2, isSRGB: false } ],
  [ "rg16float", { blockWidth: 1, blockHeight: 1, blockBytes: 4, isSRGB: false } ],
  [ "rgba16float", { blockWidth: 1, blockHeight: 1, blockBytes: 8, isSRGB: false } ],
  [ "r32float", { blockWidth: 1, blockHeight: 1, blockBytes: 4, isSRGB: false } ],
  [ "rgba32float", { blockWidth: 1, blockHeight: 1, blockBytes: 16, isSRGB: false } ],
  [ "rgb10a2unorm", { blockWidth: 1, blockHeight: 1, blockBytes: 4, isSRGB: false } ],

  // Block compressed, 4x4 texels per block. BC1 and BC4 are 8 bytes a block;
  // the rest are 16.
  [ "bc1-rgba-unorm", { blockWidth: 4, blockHeight: 4, blockBytes: 8, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc1-rgba-unorm-srgb", { blockWidth: 4, blockHeight: 4, blockBytes: 8, isSRGB: true, feature: "texture-compression-bc" } ],
  [ "bc2-rgba-unorm", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc2-rgba-unorm-srgb", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: true, feature: "texture-compression-bc" } ],
  [ "bc3-rgba-unorm", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc3-rgba-unorm-srgb", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: true, feature: "texture-compression-bc" } ],
  [ "bc4-r-unorm", { blockWidth: 4, blockHeight: 4, blockBytes: 8, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc4-r-snorm", { blockWidth: 4, blockHeight: 4, blockBytes: 8, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc5-rg-unorm", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc5-rg-snorm", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc6h-rgb-ufloat", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc6h-rgb-float", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc7-rgba-unorm", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: false, feature: "texture-compression-bc" } ],
  [ "bc7-rgba-unorm-srgb", { blockWidth: 4, blockHeight: 4, blockBytes: 16, isSRGB: true, feature: "texture-compression-bc" } ]
]);


/** View dimensions this adapter realizes, and the layer rule each carries. */
const VIEW_DIMENSIONS = new Map([
  [ "2d", { layersPerImage: 1, exact: true } ],
  [ "2d-array", { layersPerImage: 1, exact: false } ],
  [ "cube", { layersPerImage: 6, exact: true } ],
  [ "cube-array", { layersPerImage: 6, exact: false } ]
]);


/** A mip level's size in texels, floored at one. */
export function MipSize(size, level)
{
  return Math.max(1, size >> level);
}


/** The number of mip levels a full chain has for a given size. */
export function FullMipLevelCount(width, height)
{
  return Math.floor(Math.log2(Math.max(width, height))) + 1;
}


/**
 * Describes one mip level of one layer: where its bytes start, how they are
 * strided, and how many there are.
 */
export function LevelLayout(format, width, height, level)
{
  const levelWidth = MipSize(width, level);
  const levelHeight = MipSize(height, level);
  // Rounded UP to whole blocks. A 1x1 mip of a 4x4-block format still occupies
  // a full block, which is why a BC chain's tail levels are all the same size.
  const blockColumns = Math.ceil(levelWidth / format.blockWidth);
  const blockRows = Math.ceil(levelHeight / format.blockHeight);
  const bytesPerRow = blockColumns * format.blockBytes;

  return {
    level,
    width: levelWidth,
    height: levelHeight,
    // The PHYSICAL extent, which is the logical one rounded up to whole blocks.
    // WebGPU validates a compressed copy size against block multiples, so a
    // 2x2 tail level of a BC chain has to be copied as the 4x4 block it really
    // occupies; passing the logical 2x2 is rejected outright. For an
    // uncompressed format the block is 1x1 and these are the logical sizes.
    copyWidth: blockColumns * format.blockWidth,
    copyHeight: blockRows * format.blockHeight,
    bytesPerRow,
    // In BLOCK rows, which is what writeTexture wants and what makes a
    // compressed upload differ from an uncompressed one.
    rowsPerImage: blockRows,
    byteLength: bytesPerRow * blockRows
  };
}


/**
 * Plans a whole texture upload: every layer, every mip level, in the order the
 * bytes are expected to arrive.
 *
 * ORDER IS LAYER-MAJOR — each layer's complete mip chain, then the next layer.
 * That is how DDS stores an array or a cube, and DDS is where these bytes come
 * from, so reading them in any other order would need a repack for no reason.
 * It does mean one mip level across layers is not contiguous, hence one write
 * per layer per level rather than one per level.
 */
export function PlanTextureUpload(options = {})
{
  const format = TEXTURE_FORMATS.get(options.format);
  if (!format) fail(`texture format ${String(options.format || "<empty>")} is not supported`);

  const width = requirePositive(options.width, "width");
  const height = requirePositive(options.height, "height");
  const layers = options.layers === undefined ? 1 : requirePositive(options.layers, "layers");

  const viewDimension = options.viewDimension ?? (layers > 1 ? "2d-array" : "2d");
  const dimensionRule = VIEW_DIMENSIONS.get(viewDimension);
  if (!dimensionRule) fail(`texture viewDimension ${String(viewDimension)} is not supported`);
  if (dimensionRule.exact && layers !== dimensionRule.layersPerImage)
  {
    fail(dimensionRule.layersPerImage === 1
      ? `texture viewDimension ${viewDimension} cannot cover multiple layers`
      : `texture viewDimension ${viewDimension} requires exactly ${dimensionRule.layersPerImage} layers`);
  }
  if (!dimensionRule.exact && layers % dimensionRule.layersPerImage !== 0)
  {
    fail(`texture viewDimension ${viewDimension} requires a multiple of ${dimensionRule.layersPerImage} layers`);
  }
  if (viewDimension.startsWith("cube") && width !== height)
  {
    fail("a cube texture must be square");
  }

  const maxLevels = FullMipLevelCount(width, height);
  const mipLevelCount = options.mipLevelCount === undefined ? 1 : requirePositive(options.mipLevelCount, "mipLevelCount");
  if (mipLevelCount > maxLevels)
  {
    fail(`texture mipLevelCount ${mipLevelCount} exceeds the ${maxLevels} levels a ${width}x${height} image has`);
  }

  const writes = [];
  let offset = 0;

  for (let layer = 0; layer < layers; layer += 1)
  {
    for (let level = 0; level < mipLevelCount; level += 1)
    {
      const layout = LevelLayout(format, width, height, level);
      writes.push(Object.freeze({ ...layout, layer, offset }));
      offset += layout.byteLength;
    }
  }

  return Object.freeze({
    format,
    formatName: options.format,
    width,
    height,
    layers,
    viewDimension,
    mipLevelCount,
    byteLength: offset,
    writes: Object.freeze(writes)
  });
}


/**
 * Reports whether a device advertises the feature a format needs.
 *
 * Checked before creating anything, so a device without BC support is told what
 * it is missing rather than left to fail inside `createTexture` with a message
 * about an unsupported format that does not say which feature to request.
 */
export function AssertFormatFeature(plan, device)
{
  const feature = plan.format?.feature;
  if (!feature) return true;

  const features = device?.features;
  const has = typeof features?.has === "function" ? features.has(feature) : false;
  if (!has) fail(`texture format ${plan.formatName} requires the ${feature} device feature`);

  return true;
}


function requirePositive(value, name)
{
  if (!Number.isSafeInteger(value) || value < 1) fail(`texture ${name} must be a positive integer`);
  return value;
}
