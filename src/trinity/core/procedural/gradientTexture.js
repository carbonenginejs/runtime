// Source: trinity/trinity/Resources/Procedural/GradientTexture.h
// Source: trinity/trinity/Resources/Procedural/GradientTexture.cpp
//
// `dynamic:/gradient_1d/<base64>` names a width x 1 texture rasterized from four
// scalar curves - Carbon's second procedural texture, beside `dynamic:/color/`.
//
// WHY THIS IS IN TRINITY AND THE COLOUR ONE IS NOT. Carbon rasterizes both
// inside TriTextureRes::Initialize (TriTextureRes.cpp:223-236), because its
// TriTextureRes sits in trinity beside the curves. Ours is in the resource
// layer, which may not import trinity (layers.json), and a gradient needs
// Tr2CurveScalar. So the gradient is rasterized here and published by the
// constructor beside this file, while the colour - which needs nothing but a
// parse - stays in TriTextureRes.Initialize as Carbon has it.
//
// Not ported, for want of a consumer: CurveToGradientPath (the writer).
import { HostBitmap } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { num } from "#math/num";
import { Tr2CurveColor } from "../../curves/curve/Tr2CurveColor.js";
import { Tr2CurveScalar } from "../../curves/curve/Tr2CurveScalar.js";

/** `gradientPrefix` (GradientTexture.cpp:24). */
export const GradientPrefix = "dynamic:/gradient_1d/";

// `Header` (GradientTexture.cpp:10-23): uint32 width, then four `Channel`
// records of uint16 keyCount, uint8 extrapolationBefore, uint8 extrapolationAfter.
const HEADER_BYTES = 20;
// `Tr2CurveScalarKey` (Tr2CurveScalar.h:54-70): float time, value, leftTangent,
// rightTangent, then uint16 id, uint8 interpolation, uint8 tangentType.
const KEY_BYTES = 20;
const CHANNEL_COUNT = 4;

/**
 * Carbon's `Base64::Decode` (Base64Encoding.h:5). Node and the browser each
 * carry a decoder; `formats/gltf/core/parser.js:163-167` picks between them the
 * same way.
 *
 * @param {string} text Base64 text.
 * @returns {Uint8Array|null} Decoded bytes, or null when the text is not base64.
 */
function decodeBase64(text)
{
  try
  {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(text, "base64"));
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  catch
  {
    return null;
  }
}

/**
 * Whether a path names a gradient texture (GradientTexture.cpp:48-51).
 *
 * @param {string} path Resource path.
 * @returns {boolean}
 */
export function IsGradientTexturePath(path)
{
  return String(path).startsWith(GradientPrefix);
}

/**
 * The header and curve definitions a gradient path carries, or null on every
 * condition Carbon logs and abandons: short data, a key count that disagrees
 * with the payload size, or a zero width (GradientTexture.cpp:148-172).
 *
 * Carbon writes this decode twice, in `GradientPathToCurve` and in
 * `RasterizeGradient`; both callers here share one copy.
 *
 * @param {string} path `dynamic:/gradient_1d/...` path.
 * @returns {{width: number, definitions: object[]}|null}
 */
function readGradient(path)
{
  if (!IsGradientTexturePath(path)) return null;

  const data = decodeBase64(String(path).slice(GradientPrefix.length));
  if (!data || data.byteLength < HEADER_BYTES) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(0, true);
  const channels = [];
  let keyCount = 0;
  for (let channel = 0; channel < CHANNEL_COUNT; channel++)
  {
    const offset = 4 + channel * 4;
    const count = view.getUint16(offset, true);
    channels.push({
      keyCount: count,
      extrapolationBefore: view.getUint8(offset + 2),
      extrapolationAfter: view.getUint8(offset + 3)
    });
    keyCount += count;
  }
  if (data.byteLength !== HEADER_BYTES + keyCount * KEY_BYTES) return null;
  if (width === 0) return null;

  let cursor = HEADER_BYTES;
  const definitions = channels.map(channel =>
  {
    const keys = [];
    for (let index = 0; index < channel.keyCount; index++)
    {
      keys.push({
        time: view.getFloat32(cursor, true),
        value: view.getFloat32(cursor + 4, true),
        leftTangent: view.getFloat32(cursor + 8, true),
        rightTangent: view.getFloat32(cursor + 12, true),
        id: view.getUint16(cursor + 16, true),
        interpolation: view.getUint8(cursor + 18),
        tangentType: view.getUint8(cursor + 19)
      });
      cursor += KEY_BYTES;
    }
    return {
      keys,
      keyCount: channel.keyCount,
      extrapolationBefore: channel.extrapolationBefore,
      extrapolationAfter: channel.extrapolationAfter
    };
  });

  return { width, definitions };
}

/**
 * Carbon's `GradientPathToCurve` (GradientTexture.cpp:55-101): the colour curve a
 * gradient path describes, with the texture width it asks for.
 *
 * Carbon returns `std::pair<IRootPtr, uint32_t>`; a JavaScript pair is an object.
 *
 * @param {string} path `dynamic:/gradient_1d/...` path.
 * @returns {{curve: Tr2CurveColor, width: number}|null}
 */
export function GradientPathToCurve(path)
{
  const gradient = readGradient(path);
  if (!gradient) return null;

  const curve = new Tr2CurveColor();
  const [ r, g, b, a ] = gradient.definitions;
  curve.r.SetDefinition(r);
  curve.g.SetDefinition(g);
  curve.b.SetDefinition(b);
  curve.a.SetDefinition(a);
  return { curve, width: gradient.width };
}

/**
 * Carbon's `RasterizeGradient` (GradientTexture.cpp:140-196): each channel
 * sampled across the texture width into one interleaved bitmap.
 *
 * Carbon writes `PIXEL_FORMAT_R16G16B16A16_FLOAT`; as with `dynamic:/color/`,
 * the payload contract carries float colour as `rgba32float`, so the samples are
 * quantized through the half-float codec and stored in a wider container. A
 * channel with no keys rasterizes to 0, which is what Carbon's scalar curve
 * returns for an empty definition - `Tr2CurveColor`'s "empty alpha is 1" rule
 * belongs to its own GetValueAt and is not used here.
 *
 * @param {string} path `dynamic:/gradient_1d/...` path.
 * @returns {object|null} An `rgba` payload.
 */
export function RasterizeGradient(path)
{
  const gradient = readGradient(path);
  if (!gradient) return null;

  const { width, definitions } = gradient;
  const data = new Float32Array(width * CHANNEL_COUNT);
  const curve = new Tr2CurveScalar();
  for (let channel = 0; channel < CHANNEL_COUNT; channel++)
  {
    curve.SetDefinition(definitions[channel]);
    // Carbon advances the pixel pointer by one half-float per channel
    // (`pixels + 1`, stride 4); a subarray is the same offset view.
    curve.Rasterize({ width, stride: CHANNEL_COUNT, data: data.subarray(channel) });
  }
  const bitmap = new HostBitmap();

  // Carbon's format: one half-float per channel (GradientTexture.cpp).
  if (!bitmap.Create(width, 1, 1, PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT)) return null;

  const raw = bitmap.GetRawData();
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  for (let index = 0; index < data.length; index++)
  {
    view.setUint16(index * 2, num.toHalfFloat(data[index]), true);
  }

  return bitmap;
}
