import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Tr2SwapChain.h
//   trinity/trinity/Tr2SwapChain.cpp
//   trinity/trinity/Tr2SwapChain_Blue.cpp
//
// Carbon's swap chain HOLDS its AL object (`m_swapChain`) and forwards to it:
// `Present` is `m_swapChain.Present(...)`, and `GetWidth`/`GetHeight` ask the
// AL rather than reporting stored numbers. This class does the same.
import { meta, type, blue } from "#schema";
import { Succeeded } from "../../../trinityal/ALResult.js";
import { Tr2SwapChainAL } from "../../../trinityal/Tr2SwapChainAL/index.js";

/** Tr2SwapChain (trinityCore) - generated from schema shapeHash 955529ab.... */
@be.define("Tr2SwapChain")
@blue.inherit(IRoot)

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
   * MAP_PROPERTY_READONLY "width" -> GetWidth (`Tr2SwapChain_Blue.cpp:19`).
   * Carbon has no `m_width`; the Blue property IS the getter. The field stays
   * because every class whose readable properties come from getters renders
   * them this way here (`Tr2RenderTarget`, `Tr2DepthStencil`), and changing one
   * class alone would make its schema shape disagree with the emitter. It is a
   * MIRROR of the AL, refreshed when the AL is created or released.
   *
   * Adapted: Carbon exposes width as MAP_PROPERTY_READONLY over GetWidth with no backing
   * member; the field mirrors the AL to keep the emitted schema shape.
   */
  @blue.read
  @type.int32
  @meta.adapted
  width = 0;

  /**
   * MAP_PROPERTY_READONLY "height" -> GetHeight; see `width`.
   *
   * Adapted: Carbon exposes height as MAP_PROPERTY_READONLY over GetHeight with no backing
   * member; the field mirrors the AL to keep the emitted schema shape.
   */
  @blue.read
  @type.int32
  @meta.adapted
  height = 0;

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
   * Adapted: Carbon reaches the main-thread render context through a macro over process-wide
   * state; the context is an argument here, as it is for Tr2Blitter.
   *
   * @param {number|object} windowHandle The window to present into.
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Whether the chain came up.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  CreateForWindow(windowHandle, renderContext)
  {
    this.#windowHandle = windowHandle;

    return this.PrepareResources(renderContext);
  }

  /**
   * Carbon's `Tr2DeviceResource::PrepareResources` half; see `Tr2Blitter` for
   * why the split is kept rather than collapsed.
   *
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Whether the chain came up.
   */
  @blue.method
  @meta.implemented
  PrepareResources(renderContext)
  {
    return this.OnPrepareResources(renderContext);
  }

  /**
   * Creates the AL swap chain and refreshes the mirrored dimensions.
   * Carbon OnPrepareResources (Tr2SwapChain.cpp:29-48).
   *
   * Adapted: Omits Carbon's depth-stencil creation and back-buffer attachment.
   *
   * @param {Tr2RenderContext} renderContext The context to create against.
   * @returns {boolean} Whether the AL chain came up.
   */

  @meta.adapted
  OnPrepareResources(renderContext)
  {
    if (!Succeeded(this.#swapChain.Create(this.#windowHandle, renderContext))) return false;

    this.width = this.#swapChain.GetWidth();
    this.height = this.#swapChain.GetHeight();

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
   * @param {object} renderContext The context presenting the frame.
   * @returns {boolean} Carbon's `SUCCEEDED( m_swapChain.Present(...) )`.
   */

  @meta.implemented
  Present(renderContext)
  {
    return Succeeded(this.#swapChain.Present(renderContext.GetRenderContextAL()));
  }

  /**
   * Width of the back buffer, from the AL rather than from the mirror.
   *
   * @returns {number} Width in pixels.
   */

  @meta.implemented
  GetWidth()
  {
    return this.#swapChain.GetWidth();
  }

  /**
   * Height of the back buffer, from the AL rather than from the mirror.
   *
   * @returns {number} Height in pixels.
   */

  @meta.implemented
  GetHeight()
  {
    return this.#swapChain.GetHeight();
  }

  /**
   * Drops the AL chain, as Carbon's `m_swapChain = Tr2SwapChainAL()` does
   * (`Tr2SwapChain.cpp:24-27`): the value returns to the null implementation,
   * so the member is still callable afterwards.
   *
   * @param {number} _storage Carbon's `TriStorage` mask; every AL surface here
   *   belongs to video memory, so there is nothing to select between.
   */

  @meta.implemented
  ReleaseResources(_storage)
  {
    this.#swapChain.Destroy();
    this.width = 0;
    this.height = 0;
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
    this.width = this.#swapChain.GetWidth();
    this.height = this.#swapChain.GetHeight();

    return this.#swapChain;
  }

  /** The installed backend; never null. */
  GetSwapChainAL()
  {
    return this.#swapChain;
  }

}
