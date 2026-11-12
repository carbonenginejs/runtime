import { exposure as be } from "#be";
import { IRoot } from "../../../blue/exposure/IRoot.js";
// Source: trinity/trinity/Tr2SwapChain.h
//   trinity/trinity/Tr2SwapChain.cpp
//   trinity/trinity/Tr2SwapChain_Blue.cpp
//
// Carbon's swap chain HOLDS its AL object (`m_swapChain`) and forwards to it:
// `Present` is `m_swapChain.Present(...)`, and `GetWidth`/`GetHeight` ask the
// AL rather than reporting stored numbers. This class does the same.
import { type } from "#schema";
import { Succeeded } from "../../../trinityal/ALResult.js";
import { Tr2SwapChainAL } from "../../../trinityal/Tr2SwapChainAL/index.js";
import { Tr2DeviceResource } from "./Tr2DeviceResource.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

/**
 * Presents into a window through its AL swap chain.
 * Carbon: Tr2SwapChain (trinity/trinity/Tr2SwapChain.h:16-17)
 */
@be.define({
  name: "Tr2SwapChain",
  inherit: [ IRoot, Tr2DeviceResource ],
  // Tr2SwapChain_Blue.cpp:12-21, in Carbon's order.
  members: [
    [ be.ATTR, "backBuffer", be.READ ],
    [ be.ATTR, "depthStencilBuffer", be.READ ],
    [ be.PROP_RO, "width" ],
    [ be.PROP_RO, "height" ],
    [ be.METHOD, "CreateForWindow", be.WRAP ]
  ]
})

export class Tr2SwapChain extends IRoot
{

  /** m_depthStencil (Tr2DepthStencilPtr) [READ] */
  @type.object.ref("Tr2DepthStencil")
  depthStencilBuffer = null;

  /** m_backBuffer (Tr2RenderTargetPtr) [READ] */
  @type.object.ref("Tr2RenderTarget")
  backBuffer = null;

  /**
   * m_swapChain: Carbon's by-value `Tr2SwapChainAL` (`Tr2SwapChain.h`), invalid
   * until `OnPrepareResources` creates it against the context, whose backend
   * supplies the implementation.
   */
  _swapChain = new Tr2SwapChainAL();

  /** m_windowHandle */
  _windowHandle = 0;

  /** @cjs Presentation infrastructure lives until explicit teardown, never idle purge. */
  _neverPurge = true;

  /**
   * Records the window and brings the chain up.
   * Carbon: Tr2SwapChain::CreateForWindow (trinity/trinity/Tr2SwapChain.cpp:13-22).
   *
   * @implemented
   * @param {number|object} windowHandle The window to present into.
   * @returns {boolean} Whether the chain came up.
   */
  CreateForWindow(windowHandle)
  {
    this._windowHandle = windowHandle;

    return this.PrepareResources();
  }

  /**
   * Carbon: Tr2DeviceResource::PrepareResources (trinity/trinity/Tr2DeviceResource.cpp:21-33).
   *
   * @adapted Explicit preparation renews JS residency; the base keeps the creation gate and readiness state.
   * @returns {boolean} False when OnPrepareResources fails.
   */
  PrepareResources()
  {
    this.KeepAlive();
    return Tr2DeviceResource.prototype.PrepareResources.call(this);
  }

  /**
   * Creates the AL swap chain on the main-thread render context.
   * Carbon OnPrepareResources (Tr2SwapChain.cpp:29-48).
   *
   * @adapted Omits Carbon's depth-stencil creation and back-buffer attachment.
   * @returns {boolean} Whether the AL chain came up.
   */

  _OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    if (!Succeeded(this._swapChain.Create(this._windowHandle, renderContext))) return false;

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
    return Succeeded(this._swapChain.Present(renderContext.GetRenderContextAL()));
  }

  /**
   * Width of the back buffer, from the AL rather than from the mirror.
   *
   * @implemented
   * @returns {number} Width in pixels.
   */

  GetWidth()
  {
    return this._swapChain.GetWidth();
  }

  /**
   * Height of the back buffer, from the AL rather than from the mirror.
   *
   * @implemented
   * @returns {number} Height in pixels.
   */

  GetHeight()
  {
    return this._swapChain.GetHeight();
  }

  /**
   * width (MAP_PROPERTY_READONLY): Carbon's property over GetWidth, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2SwapChain_Blue.cpp:18).
   *
   * @implemented
   */
  @type.uint32
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
  @type.uint32
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
    this._swapChain.Destroy();
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
    this._swapChain = al ?? new Tr2SwapChainAL();

    return this._swapChain;
  }

  /** The installed backend; never null. */
  GetSwapChainAL()
  {
    return this._swapChain;
  }

}
