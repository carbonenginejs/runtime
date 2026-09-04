// Source: trinity/trinityal/stub/Tr2ConstantBufferALStub.cpp
// Source: trinity/trinityal/stub/Tr2ConstantBufferALStub.h
// Source: trinity/trinityal/include/Tr2ConstantBufferAL.h
//
// The GPU-free constant buffer - the shadow copy behind cb0..cb8.
//
// This is the type the per-frame and per-object data actually lands in, so its
// storage being real is what makes a headless frame inspectable: lock it, write
// the vec4 registers, unlock, and read the same bytes back.
//
// Carbon names the storage `m_shadowCopy` and that is exactly what it is even
// on a real backend - the CPU-side mirror the driver uploads from. Here there
// is nothing to upload to, so the mirror is the whole resource.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";


/** `Tr2ConstantUsageAL` (`Tr2ConstantBufferAL.h:16-24`). */
export const Tr2ConstantUsageAL = Object.freeze({
  /** Written once at creation and never again. */
  IMMUTABLE: 0,

  /** Written and consumed within one frame. */
  ONE_SHOT: 1,

  /** Written repeatedly across frames. */
  REUSABLE: 2
});


/**
 * A constant buffer holding its shadow copy on the CPU.
 */
export class Tr2ConstantBufferALStub extends Tr2BaseDeviceResourceAL
{
  /** m_shadowCopy */
  #shadowCopy = new Uint8Array(0);

  /**
   * Creates the buffer.
   *
   * An immutable buffer is written once, at creation - so arriving without
   * data means it can never hold anything, and Carbon logs and refuses rather
   * than handing back a buffer of zeroes.
   *
   * @param {number} size Size in bytes.
   * @param {number} usage A `Tr2ConstantUsageAL` value.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(size, usage, initialData, renderContext)
  {
    if (!renderContext.IsValid()) return ALResult.E_INVALIDARG;

    if (size === 0) return ALResult.E_INVALIDARG;

    if (usage === Tr2ConstantUsageAL.IMMUTABLE && !initialData) return ALResult.E_INVALIDARG;

    this.#shadowCopy = new Uint8Array(size);

    // Carbon's allocation can fail; here only a zero size produces an empty
    // buffer, and that was already refused above.
    if (this.#shadowCopy.length === 0) return ALResult.E_OUTOFMEMORY;

    return ALResult.S_OK;
  }

  /**
   * Hands back the shadow copy to write into.
   *
   * @returns {{result: number, data: Uint8Array|null}} The locked storage.
   */
  Lock()
  {
    if (this.#shadowCopy.length === 0) return { result: ALResult.E_FAIL, data: null };

    return { result: ALResult.S_OK, data: this.#shadowCopy };
  }

  /**
   * Releases the lock. The storage stays; there is nothing to upload to.
   *
   * @returns {number} An `ALResult` value.
   */
  Unlock()
  {
    return ALResult.S_OK;
  }

  /** Releases the shadow copy and leaves the device-resource registry. */
  Destroy()
  {
    this.#shadowCopy = new Uint8Array(0);
    super.Destroy();
  }

  /**
   * Whether the buffer holds anything.
   *
   * @returns {boolean} True when it has a size.
   */
  IsValid()
  {
    return this.#shadowCopy.length !== 0;
  }

  /**
   * The buffer's size.
   *
   * @returns {number} Size in bytes.
   */
  GetSize()
  {
    return this.#shadowCopy.length;
  }

  /**
   * Which memory class this buffer occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Names the buffer for a debugger.
   *
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }
}
