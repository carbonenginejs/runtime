// Source: trinity/trinityal/include/Tr2SwapChainAL.h
// Source: trinity/trinityal/src/Tr2SwapChainAL.cpp
//
// The backend-neutral swap chain: Carbon's PIMPL value. `Tr2SwapChain` holds
// one by value (`m_swapChain`, `Tr2SwapChain.h`), it is invalid until `Create`
// fills it for a window (`Tr2SwapChain.cpp:29-48`), and releasing the device
// resets it (`m_swapChain = Tr2SwapChainAL()`, `:24-27`).
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2SwapChainAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2SwapChainAL.cpp:5`): we ship every
// backend at once, so the context that knows its backend is the factory
// (`CreateSwapChain(windowHandle, true)`). A backend whose caps report no
// standalone swap chain refuses there.
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2TextureAL } from "../Tr2TextureAL/index.js";


/**
 * Carbon's `NullSC()` (`Tr2SwapChainAL.cpp:9-13`): the one shared default
 * implementation every uncreated handle points at. Carbon's is the platform
 * impl default-constructed; the handle here is backend-neutral, so this
 * answers as the stub's default-constructed impl does - no back buffer, so
 * invalid and zero-sized, a `Present` that succeeds, video memory
 * (`Tr2SwapChainALStub.cpp:14-64`, `Tr2SwapChainALStub.h:29-32`). Its share
 * count is unbounded, so releasing a default handle never destroys it.
 */
const nullSwapChain = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    Present: () => ALResult.S_OK,
    GetBackBuffer: () => new Tr2TextureAL(),
    GetWidth: () => 0,
    GetHeight: () => 0,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_VIDEO,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};


/** A swap chain value sharing one backend implementation. */
export class Tr2SwapChainAL
{
  /** m_swapChain: the shared implementation record; `nullSwapChain` until created. */
  _swapChain = nullSwapChain;

  /**
   * Carbon's default constructor (`Tr2SwapChainAL.cpp:16-19`) leaves the
   * value on `NullSC()`. A `copy` replaces C++'s implicit copy construction,
   * sharing the implementation; plain JavaScript assignment aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2SwapChainAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._swapChain = copy._swapChain;
      this._swapChain.owners += 1;
    }
  }

  /**
   * Carbon's Create( windowHandle, renderContext ) (`Tr2SwapChainAL.h:23`,
   * `Tr2SwapChainAL.cpp:21-31`): a fresh implementation replaces this value's;
   * a failure leaves it on the null implementation.
   *
   * Adapted: the render context allocates the implementation instead of a
   * compile-time platform include. The previous share is released explicitly
   * because JavaScript has no shared_ptr; existing copies keep it alive.
   *
   * @param {number|object} windowHandle The window to present into.
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(windowHandle, renderContext)
  {
    this.Destroy();

    const { result, implementation } = RenderContextALOf(renderContext).CreateSwapChain(windowHandle, true);
    if (Failed(result)) return result;

    this._swapChain = { implementation, owners: 1 };
    return result;
  }

  /**
   * Presents the back buffer (`Tr2SwapChainAL.cpp:33-36`).
   *
   * @param {object} renderContext The context presenting the frame.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Present(renderContext)
  {
    return this._swapChain.implementation.Present(renderContext);
  }

  /**
   * Whether the implementation can present (`Tr2SwapChainAL.cpp:38-41`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._swapChain.implementation.IsValid();
  }

  /**
   * The implementation's back buffer (`Tr2SwapChainAL.cpp:43-46`), which
   * Carbon reads as a friend (`m_swapChain->m_backBuffer`).
   *
   * @returns {Tr2TextureAL} The back buffer; a default, invalid one when uncreated.
   */
  @blue.method
  @meta.implemented
  GetBackBuffer()
  {
    return this._swapChain.implementation.GetBackBuffer();
  }

  /**
   * Back-buffer width (`Tr2SwapChainAL.cpp:48-51`).
   *
   * @returns {number} Width in pixels.
   */
  @blue.method
  @meta.implemented
  GetWidth()
  {
    return this._swapChain.implementation.GetWidth();
  }

  /**
   * Back-buffer height (`Tr2SwapChainAL.cpp:53-56`).
   *
   * @returns {number} Height in pixels.
   */
  @blue.method
  @meta.implemented
  GetHeight()
  {
    return this._swapChain.implementation.GetHeight();
  }

  /**
   * Compares implementation identity (`Tr2SwapChainAL.cpp:58-61`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2SwapChainAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._swapChain === other._swapChain;
  }

  /**
   * The implementation's memory class (`Tr2SwapChainAL.cpp:63-66`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._swapChain.implementation.GetMemoryClass();
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2SwapChainAL.cpp:68-79`).
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._swapChain.implementation.SetName(name);
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `m_swapChain = Tr2SwapChainAL()` (`Tr2SwapChain.cpp:24-27`).
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so
   * the share is released explicitly; the implementation is destroyed with its
   * last share.
   */
  Destroy()
  {
    const owned = this._swapChain;
    this._swapChain = nullSwapChain;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2SwapChainAL, "_swapChain", type.unknown);
CjsSchema.decorateMethod(Tr2SwapChainAL, "Equals", meta.renamed("operator=="));
CjsSchema.blue.define(Tr2SwapChainAL, { className: "Tr2SwapChainAL" });
