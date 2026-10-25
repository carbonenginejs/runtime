// Source: trinity/trinityal/BcDecompress.h
// Source: trinity/trinityal/BcDecompress.cpp
//
// Carbon's `BcDecompress`, kept at the AL root where Carbon keeps it, as a door.
//
// The decoding lives in resource/codecs/bcn - the runtime's one home of BC
// decoding - as `bcDecompress`, which reproduces Carbon's
// output exactly, quirks included (CE-36, CE-37). Carbon calls it only from its
// Metal backend; EVE on PC decodes BC in D3D11 hardware, and the WebGL2 backend
// uses the codec's spec decoder for that reason. This keeps Carbon's name so a
// backend porting Carbon's call site finds it where Carbon has it, and so the
// name leads back to the implementation.
//
// Carbon's free function is a static here: `BcDecompress.bcDecompress`.

import { CjsSchema } from "#schema";
import { bcDecompress } from "#resource/codecs/bcn";

/**
 * Carbon's BC1-BC3 CPU decompressor (`trinity/trinityal/BcDecompress.cpp`).
 *
 * Modelled on: BcDecompress (trinity/trinityal/BcDecompress.h:10)
 */
export class BcDecompress
{
  /**
   * Decompresses one BC1, BC2 or BC3 subresource - every depth slice of it - to
   * BGRA8 (`BcDecompress.cpp:240-270`).
   *
   * Delegates to the BC codec's `bcDecompress`, the one implementation.
   * Carbon's signature fills a caller's `unique_ptr` and answers whether the
   * format was handled; JavaScript has no reference argument, so the pixels
   * come back instead, or null where Carbon answers false.
   *
   * @param {number} width Level width in pixels.
   * @param {number} height Level height in pixels.
   * @param {number} depth Level depth in slices.
   * @param {number} format A `PixelFormat` value.
   * @param {{m_sysMem: Uint8Array, m_sysMemSlicePitch: number}} src The compressed level.
   * @param {Uint8Array} [decompressed] A buffer to reuse; allocated when absent.
   * @returns {Uint8Array|null} The BGRA8 pixels.
   */
  static bcDecompress(width, height, depth, format, src, decompressed = null)
  {
    return bcDecompress(width, height, depth, format, src, decompressed);
  }
}

// Carbon's BcDecompress is a free function, not a class, so there is no class
// surface to compare: the class is modelled on it and carries it as a static.
CjsSchema.meta.define(BcDecompress, { className: "BcDecompress" });
