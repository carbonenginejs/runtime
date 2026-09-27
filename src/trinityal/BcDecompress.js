// Source: trinity/trinityal/BcDecompress.h
// Source: trinity/trinityal/BcDecompress.cpp
//
// Carbon's `BcDecompress`, kept at the AL root where Carbon keeps it, as a door.
//
// The decoding lives in resource/formats/dds - the runtime's one home of BC
// decoding - as `CjsDdsFormat.metal.bcDecompress`, which reproduces Carbon's
// output exactly, quirks included (CE-36, CE-37). Carbon calls it only from its
// Metal backend; EVE on PC decodes BC in D3D11 hardware, and the WebGL2 backend
// uses the format's spec decoder for that reason. This keeps Carbon's name so a
// backend porting Carbon's call site finds it where Carbon has it, and so the
// name leads back to the implementation.
//
// Carbon's free function is a static here: `BcDecompress.bcDecompress`.

import { CjsDdsFormat } from "../resource/formats/dds/CjsDdsFormat.js";

/**
 * Carbon's BC1-BC3 CPU decompressor (`trinity/trinityal/BcDecompress.cpp`).
 */
export class BcDecompress
{
  /**
   * Decompresses one BC1, BC2 or BC3 subresource - every depth slice of it - to
   * BGRA8 (`BcDecompress.cpp:240-270`).
   *
   * Delegates to `CjsDdsFormat.metal.bcDecompress`, the one implementation.
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
    return CjsDdsFormat.metal.bcDecompress(width, height, depth, format, src, decompressed);
  }
}
