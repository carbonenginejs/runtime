// Source: trinity/trinityal/dx11/Tr2TextureALDx11.h
// Source: trinity/trinityal/dx11/Tr2TextureALDx11.cpp
//
// The WebGL2 readback. dx11 declares `Tr2ReadbackAL` beside its texture
// (`Tr2TextureALDx11.h:26-52`); it is its own file here because a file holds
// one class, as `webgpu/Tr2ReadbackALWebgpu.js` and `stub/Tr2ReadbackALStub.js` do.

import { CjsSchema, blue, meta } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { SwapRedBlue } from "./Tr2TextureALWebgl2.js";


/**
 * A snapshot of one texture subresource, read back without stalling the frame
 * that made it (`Tr2TextureALDx11.h:26-52`, `Tr2TextureALDx11.cpp:332-397`).
 *
 * dx11 copies the region into a staging texture when the readback is created
 * and maps that texture later. WebGL2 has no staging texture: the copy is a
 * `readPixels` into a `PIXEL_PACK_BUFFER`, which the GPU performs in order as
 * dx11's `CopySubresourceRegion` is, and the map is `getBufferSubData`, which
 * waits for that copy as dx11's `Map(READ)` waits for the staging texture
 * (`:350-352`). BGRA data comes back swizzled to BGRA, as `MapForReading`'s.
 *
 * Carbon: Tr2ReadbackAL (trinity/trinityal/dx11/Tr2TextureALDx11.h:26)
 */
export class Tr2ReadbackALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_stagingTexture: the pack buffer holding the copy. */
  _stagingBuffer = null;

  /** m_frameNumber: the frame that recorded the copy. */
  _frameNumber = 0;

  /** m_pointer: the copied bytes, once mapped. */
  _pointer = null;

  /** m_rowPitch */
  _rowPitch = 0;

  /** The copy's size in bytes. */
  _byteLength = 0;

  /** Whether the bytes are stored RGBA for a BGRA format. */
  _bgra = false;

  /** The context the pack buffer belongs to. */
  _gl = null;

  /**
   * dx11's `Tr2ReadbackAL( stagingTexture, frameNumber )` (`:332-336`); the
   * row pitch, size and swizzle travel with the pack buffer, because a buffer
   * does not describe its contents as a staging texture does.
   *
   * @param {WebGL2RenderingContext} gl The context.
   * @param {WebGLBuffer} stagingBuffer The pack buffer the copy went into.
   * @param {number} rowPitch Bytes per row of the copy.
   * @param {number} byteLength Bytes in the copy.
   * @param {boolean} bgra Whether to swizzle the bytes back to BGRA.
   * @param {number} frameNumber The recording frame number.
   */
  constructor(gl, stagingBuffer, rowPitch, byteLength, bgra, frameNumber)
  {
    super();
    this._gl = gl;
    this._stagingBuffer = stagingBuffer;
    this._rowPitch = rowPitch;
    this._byteLength = byteLength;
    this._bgra = bgra;
    this._frameNumber = frameNumber;
  }

  /**
   * Whether the GPU has finished the frame that recorded the copy (`:343-346`).
   *
   * @param {object} renderContext The primary context.
   * @returns {boolean} True once mapping will not wait.
   */
  IsReady(renderContext)
  {
    return RenderContextALOf(renderContext).GetRenderedFrameNumber() >= this._frameNumber;
  }

  /**
   * Maps the copy (`:348-372`): read once, then the same bytes on every call.
   *
   * Adapted: dx11's out parameters come back as `{ result, data, pitch }`, as
   * every backend's readback answers, and the map is `getBufferSubData`.
   *
   * @param {object} _renderContext The primary context.
   * @returns {{result: number, data: Uint8Array|null, pitch: number}} The mapping.
   */
  @meta.adapted
  Map(_renderContext)
  {
    if (!this._stagingBuffer) return { result: ALResult.E_FAIL, data: null, pitch: 0 };

    if (!this._pointer)
    {
      const gl = this._gl;
      const bytes = new Uint8Array(this._byteLength); // alloc: the readback owns its mapped bytes, once.

      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._stagingBuffer);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, bytes);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

      this._pointer = this._bgra ? SwapRedBlue(bytes) : bytes;
    }

    return { result: ALResult.S_OK, data: this._pointer, pitch: this._rowPitch };
  }

  /**
   * Releases the copy (`:374-383`).
   *
   * Adapted: the pack buffer is deleted here, where dx11 releases its staging
   * texture's reference; JavaScript has no destructor to do it.
   */
  @meta.adapted
  Destroy()
  {
    if (this._stagingBuffer) this._gl.deleteBuffer(this._stagingBuffer);

    this._stagingBuffer = null;
    this._pointer = null;
    super.Destroy();
  }

  /**
   * dx11 describes nothing for a readback (`:385-387`).
   *
   * @param {object} _description The record to fill.
   */
  Describe(_description)
  {
  }

  /**
   * @returns {number} `AL_MEMORY_MANAGED` (`:389-392`).
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * @returns {boolean} Whether the copy is still held (`:394-397`).
   */
  IsValid()
  {
    return this._stagingBuffer !== null;
  }
}

CjsSchema.decorateMethod(Tr2ReadbackALWebgl2, "IsReady", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALWebgl2, "Map", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALWebgl2, "Destroy", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALWebgl2, "Describe", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALWebgl2, "GetMemoryClass", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALWebgl2, "IsValid", blue.method);
CjsSchema.blue.define(Tr2ReadbackALWebgl2, { className: "Tr2ReadbackALWebgl2" });
