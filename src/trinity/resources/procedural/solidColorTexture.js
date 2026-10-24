// Source: trinity/trinity/Resources/Procedural/SolidColorTexture.h
// Source: trinity/trinity/Resources/Procedural/SolidColorTexture.cpp
//
// The free functions of Carbon's solid colour texture: a `dynamic:/color/r,g,b,a`
// path names a 1x1 texture of that colour. They live apart from
// SolidColorTextureConstructor because TriTextureRes.Initialize calls them, and
// the constructor builds a TriTextureRes - one module holding both would be an
// import cycle.
//
// Not ported, for want of a consumer: ColorPathToColor and ColorToColorPath.
import { HostBitmap } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { num } from "#math/num";

/** `colorPrefix` (SolidColorTexture.cpp:13). */
export const ColorPrefix = "dynamic:/color/";

// One `stream >> float` extraction under `std::locale( "C" )`: leading
// whitespace, an optional sign, digits with an optional fraction, and an
// optional exponent.
const FLOAT_EXTRACTION = /^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/u;

// `stream >> coma` skips whitespace, then reads one character.
const COMMA_EXTRACTION = /^\s*,/u;

/**
 * Parses `r,g,b,a` exactly as Carbon's `ParseColor` does
 * (SolidColorTexture.cpp:34-70), or returns null where Carbon logs and returns
 * an empty optional.
 *
 * quirk: the alpha extraction is followed only by `stream.eof()`. When nothing
 * but whitespace follows the third comma, `stream >> color.a` fails AT the end
 * of the stream, which sets eofbit, and C++11 `num_get` stores 0 on failure - so
 * Carbon accepts `1,1,1,` as alpha 0. Reproduced, not corrected: a port never
 * silently fixes Carbon.
 *
 * @param {string} query Text after `dynamic:/color/`.
 * @returns {number[]|null} `[r, g, b, a]`, or null when Carbon would reject it.
 */
export function ParseColor(query)
{
  let rest = String(query);
  const color = [];
  for (let index = 0; index < 4; index++)
  {
    const extraction = FLOAT_EXTRACTION.exec(rest);
    if (!extraction)
    {
      // Only the last component can fail at the end of the stream and still
      // pass the eof test; a failed r/g/b leaves the stream in a fail state and
      // the following comma is never read.
      if (index === 3 && /^\s*$/u.test(rest))
      {
        color.push(0);
        return color;
      }
      return null;
    }
    color.push(Number(extraction[0]));
    rest = rest.slice(extraction[0].length);
    if (index < 3)
    {
      const comma = COMMA_EXTRACTION.exec(rest);
      if (!comma) return null;
      rest = rest.slice(comma[0].length);
    }
  }
  // `stream.eof()`: the alpha extraction must have reached the end of the query.
  return rest.length === 0 ? color : null;
}

/**
 * Whether a path names a solid colour texture (SolidColorTexture.cpp:72-75).
 *
 * @param {string} path Resource path.
 * @returns {boolean}
 */
export function IsSolidColorTexturePath(path)
{
  return String(path).startsWith(ColorPrefix);
}

/**
 * Carbon's `RasterizeSolidColor` (SolidColorTexture.cpp:104-126): a 1x1 bitmap of
 * the parsed colour, or null where Carbon leaves the bitmap invalid.
 *
 * Carbon's format exactly: a 1x1 `PIXEL_FORMAT_R16G16B16A16_FLOAT` bitmap.
 *
 * @param {string} path `dynamic:/color/...` path.
 * @returns {HostBitmap|null} The bitmap, or null where Carbon leaves it invalid.
 */
export function RasterizeSolidColor(path)
{
  if (!IsSolidColorTexturePath(path)) return null;
  const color = ParseColor(String(path).slice(ColorPrefix.length));
  if (!color) return null;

  const bitmap = new HostBitmap();

  if (!bitmap.Create(1, 1, 1, PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT)) return null;

  const raw = bitmap.GetRawData();
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  for (let index = 0; index < 4; index++)
  {
    view.setUint16(index * 2, num.toHalfFloat(color[index]), true);
  }

  return bitmap;
}
