import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Tr2SwapChain.h
//   trinity/trinity/Tr2SwapChain.cpp
//   trinity/trinity/Tr2SwapChain_Blue.cpp
//
// Carbon's swap chain HOLDS its AL object (`m_swapChain`) and forwards to it:
// `Present` is `m_swapChain.Present(...)`, and `GetWidth`/`GetHeight` ask the
// AL rather than reporting stored numbers. This class does the same.
import { type, blue } from "#schema";
import { Succeeded } from "../../../trinityal/ALResult.js";
import { Tr2SwapChainAL } from "../../../trinityal/Tr2SwapChainAL/index.js";

/** Tr2SwapChain (trinityCore) - generated from schema shapeHash 955529ab.... */
@be.define("Tr2SwapChain")
@be.inherit(IRoot)

export class Tr2SwapChain extends IRoot
{

  /** m_depthStencil (Tr2DepthStencilPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2DepthStencil")
  depthStencilBuffer = null;

  /** m_backBuffer (Tr2RenderTargetPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2RenderTarget")
  backBuffer = null;

  /**
   * m_swapChain: Carbon's by-value `Tr2SwapChainAL` (`Tr2SwapChain.h`), invalid
   * until `OnPrepareResources` creates it against the context, whose backend
   * supplies the implementation.
   */
  #swapChain = new Tr2SwapChainAL();

  /** m_windowHandle */
  #windowHandle = 0;

  /**
   * Records the window and brings the chain up.
   *
   * Carbon reads the context from `USE_MAIN_THREAD_RENDER_CONTEXT()`
   * (`Tr2SwapChain.cpp:31`), a macro over a process-wide main-thread context we
   * do not have. It is passed instead, as `Tr2Blitter.PrepareResources` already
   * does.
   *
   * @adapted Carbon reaches the main-thread render context through a macro over process-wide
   *   state; the context is an argument here, as it is for Tr2Blitter.
   * @param {number|object} windowHandle The window to present into.
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Whether the chain came up.
   */
  @be.mapMethodAndWrap()
  CreateForWindow(windowHandle, renderContext)
  {
    this.#windowHandle = windowHandle;

    return this.PrepareResources(renderContext);
  }

  /**
   * Carbon's `Tr2DeviceResource::PrepareResources` half; see `Tr2Blitter` for
   * why the split is kept rather than collapsed.
   *
   * @implemented
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Whether the chain came up.
   */
  PrepareResources(renderContext)
  {
    return this.OnPrepareResources(renderContext);
  }

  /**
   * Creates the AL swap chain and refreshes the mirrored dimensions.
   * Carbon OnPrepareResources (Tr2SwapChain.cpp:29-48).
   *
   * @adapted Omits Carbon's depth-stencil creation and back-buffer attachment.
   * @param {Tr2RenderContext} renderContext The context to create against.
   * @returns {boolean} Whether the AL chain came up.
   */

  OnPrepareResources(renderContext)
  {
    if (!Succeeded(this.#swapChain.Create(this.#windowHandle, renderContext))) return false;

    return true;
  }

  /**
   * Presents the frame the preceding render steps produced.
   *
   * Carbon's `TriStepPresentSwapChain` calls THIS (`cpp:12-15`), not anything on
   * the render context. Carbon passes its `Tr2RenderContext` straight to the AL
   * because it inherits `Tr2RenderContextAL`; we compose, so the AL is taken out
   * of it here.
   *
   * @implemented
   * @param {object} renderContext The context presenting the frame.
   * @returns {boolean} Carbon's `SUCCEEDED( m_swapChain.Present(...) )`.
   */

  Present(renderContext)
  {
    return Succeeded(this.#swapChain.Present(renderContext.GetRenderContextAL()));
  }

  /**
   * Width of the back buffer, from the AL rather than from the mirror.
   *
   * @implemented
   * @returns {number} Width in pixels.
   */

  GetWidth()
  {
    return this.#swapChain.GetWidth();
  }

  /**
   * Height of the back buffer, from the AL rather than from the mirror.
   *
   * @implemented
   * @returns {number} Height in pixels.
   */

  GetHeight()
  {
    return this.#swapChain.GetHeight();
  }

  /**
   * width (MAP_PROPERTY_READONLY): Carbon's property over GetWidth, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2SwapChain_Blue.cpp:18).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  get width()
  {
    return this.GetWidth();
  }

  /**
   * height (MAP_PROPERTY_READONLY): Carbon's property over GetHeight, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2SwapChain_Blue.cpp:19).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  get height()
  {
    return this.GetHeight();
  }

  /**
   * Drops the AL chain, as Carbon's `m_swapChain = Tr2SwapChainAL()` does
   * (`Tr2SwapChain.cpp:24-27`): the value returns to the null implementation,
   * so the member is still callable afterwards.
   *
   * @implemented
   * @param {number} _storage Carbon's `TriStorage` mask; every AL surface here
   *   belongs to video memory, so there is nothing to select between.
   */

  ReleaseResources(_storage)
  {
    this.#swapChain.Destroy();
  }

  /**
   * Installs an abstraction-layer swap chain value. The accessor pair matches
   * `Tr2RenderContext.SetRenderContextAL`/`GetRenderContextAL`, down to null
   * restoring a default value rather than emptying the field: Carbon's member
   * is by value and never absent, so neither is this.
   *
   * @param {Tr2SwapChainAL|null} al The abstraction-layer swap chain.
   * @returns {Tr2SwapChainAL} The value now installed.
   */
  SetSwapChainAL(al = null)
  {
    this.#swapChain = al ?? new Tr2SwapChainAL();

    return this.#swapChain;
  }

  /** The installed backend; never null. */
  GetSwapChainAL()
  {
    return this.#swapChain;
  }

}
