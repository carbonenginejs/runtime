// Source: trinity/trinity/Tr2RenderUtils.h
// Source: trinity/trinity/Tr2RenderUtils.cpp
//
// Freestanding helpers that need no private state. Carbon's own header explains
// why the file exists: "Most of this was TriDevice/Tr2Renderer but works just
// fine with the public interfaces. So put those guys here to lighten up those
// classes."
//
// THESE ARE TRINITY, NOT THE ABSTRACTION LAYER, and that is the whole reason
// they were missing. `FillAndSetConstants` is the last hop of Carbon's
// per-object upload - `Tr2PerObjectDataStandard::SetPerObjectDataToDevice`
// calls it twice and does nothing else - and it lives in a Trinity header. It
// went unported because "the engine does device work" was read as the
// `engine/webgpu` package rather than the abstraction layer, so the upload was
// reimplemented engine-side and this file never got written. See
// /docs/research/graphics-path-review-2026-09-05.md.
//
// NOT PORTED HERE YET: `SetupScreenQuad` and `SetupScreenQuadInCameraSpace`,
// which belong to `Tr2Blitter`'s fullscreen-quad path. They are in the same
// Carbon file and are a separate piece of work.
import { ShaderType } from "#consts/render-context";
import { Tr2ConstantUsageAL } from "./al/Tr2ConstantBufferALStub.js";
import { Failed } from "./al/ALResult.js";


/**
 * Binds one constant buffer to every shader stage a mask names.
 *
 * Carbon `SetConstants` (`Tr2RenderUtils.cpp:126-137`). The loop clears each
 * bit as it goes and stops as soon as the mask is empty, so a single-stage
 * bind costs one iteration rather than six.
 *
 * @param {object} buffer A `Tr2ConstantBufferAL`.
 * @param {number} constantTypeMask A bit per `ShaderType`.
 * @param {number} registerIndex The constant-buffer register.
 * @param {object} renderContext The context to bind against.
 * @returns {number} How many stages were bound.
 */
export function SetConstants(buffer, constantTypeMask, registerIndex, renderContext)
{
  let mask = constantTypeMask >>> 0;
  let bound = 0;

  for (let stage = ShaderType.SHADER_TYPE_FIRST; stage !== ShaderType.SHADER_TYPE_COUNT && mask; stage += 1)
  {
    if (!(mask & (1 << stage))) continue;

    renderContext.SetConstants(buffer, stage, registerIndex);
    mask &= ~(1 << stage);
    bound += 1;
  }

  return bound;
}


/**
 * Creates or grows a constant buffer, copies data into it, and binds it.
 *
 * Carbon `FillAndSetConstants` (`Tr2RenderUtils.cpp:100-124`), the repeating
 * pattern its own comment describes: create if needed, lock, copy, unlock, set.
 *
 * A ZERO MASK RETURNS SUCCESS AND BINDS NOTHING. That is Carbon's first line
 * and it is not a guard against bad input - it is how a payload declared for
 * stages a technique does not use gets skipped, per batch, without the caller
 * testing anything.
 *
 * THE COPY IS CLAMPED TO THE BUFFER, not to the data. Carbon writes
 * `min( dataSize, buffer.GetSize() )`, so a payload larger than the buffer
 * fills it and the tail is dropped rather than overrunning.
 *
 * @param {object} buffer A `Tr2ConstantBufferAL`, created here if it has to be.
 * @param {ArrayBufferView} data The bytes to upload.
 * @param {number} dataSize How many bytes of `data` to upload.
 * @param {number} constantTypeMask A bit per `ShaderType`.
 * @param {number} registerIndex The constant-buffer register.
 * @param {object} renderContext The context to upload and bind against.
 * @returns {boolean} Whether the data was uploaded and bound.
 */
export function FillAndSetConstants(buffer, data, dataSize, constantTypeMask, registerIndex, renderContext)
{
  if (!(constantTypeMask >>> 0)) return true;

  if (!buffer.IsValid() || dataSize > buffer.GetSize())
  {
    if (Failed(buffer.Create(dataSize, Tr2ConstantUsageAL.REUSABLE, null, renderContext))) return false;
  }

  const { result, data: mapped } = buffer.Lock(renderContext);

  if (Failed(result) || !mapped) return false;

  const bytes = data instanceof Uint8Array
    ? data
    : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  mapped.set(bytes.subarray(0, Math.min(dataSize, buffer.GetSize())));

  buffer.Unlock(renderContext);

  SetConstants(buffer, constantTypeMask, registerIndex, renderContext);

  return true;
}
