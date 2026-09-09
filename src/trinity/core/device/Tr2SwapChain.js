// Source: trinity/trinity/Tr2SwapChain.h
//   trinity/trinity/Tr2SwapChain.cpp
//   trinity/trinity/Tr2SwapChain_Blue.cpp
//
// Carbon's swap chain HOLDS its AL object (`m_swapChain`) and forwards to it:
// `Present` is `m_swapChain.Present(...)`, and `GetWidth`/`GetHeight` ask the
// AL rather than reporting stored numbers. This class did none of that until
// 2026-09-09 - it was four decorated fields and a `CreateForWindow` that threw,
// because a since-retired rule said Trinity could hold no live device state.
// See /docs/internal/decisions/trinity-gpu-free-means-the-stub.md.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { Succeeded } from "../../../trinityal/ALResult.js";
import { Tr2SwapChainALStub } from "../../../trinityal/stub/Tr2SwapChainALStub.js";

/** Tr2SwapChain (trinityCore) - generated from schema shapeHash 955529ab.... */
@type.define({ className: "Tr2SwapChain", family: "trinityCore" })
export class Tr2SwapChain extends CjsModel
{

  /** m_depthStencil (Tr2DepthStencilPtr) [READ] */
  @io.read
  @type.objectRef("Tr2DepthStencil")
  depthStencilBuffer = null;

  /** m_backBuffer (Tr2RenderTargetPtr) [READ] */
  @io.read
  @type.objectRef("Tr2RenderTarget")
  backBuffer = null;

  /**
   * MAP_PROPERTY_READONLY "width" -> GetWidth (`Tr2SwapChain_Blue.cpp:19`).
   * Carbon has no `m_width`; the Blue property IS the getter. The field stays
   * because every class whose readable properties come from getters renders
   * them this way here (`Tr2RenderTarget`, `Tr2DepthStencil`), and changing one
   * class alone would make its schema shape disagree with the emitter. It is a
   * MIRROR of the AL, refreshed when the AL is created or released.
   */
  @io.read
  @type.int32
  @impl.adapted
  @impl.reason("Carbon exposes width as MAP_PROPERTY_READONLY over GetWidth with no backing member; the field mirrors the AL to keep the emitted schema shape.")
  width = 0;

  /** MAP_PROPERTY_READONLY "height" -> GetHeight; see `width`. */
  @io.read
  @type.int32
  @impl.adapted
  @impl.reason("Carbon exposes height as MAP_PROPERTY_READONLY over GetHeight with no backing member; the field mirrors the AL to keep the emitted schema shape.")
  height = 0;

  /**
   * m_swapChain, defaulted to the stub exactly as `Tr2RenderContext` defaults
   * its own AL. Carbon's member is a `Tr2SwapChainAL` compiled against whichever
   * backend the build selected, so it is never absent; defaulting to the stub is
   * how that stays true here.
   */
  #swapChain = new Tr2SwapChainALStub();

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
   * @param {number|object} windowHandle The window to present into.
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Whether the chain came up.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reaches the main-thread render context through a macro over process-wide state; the context is an argument here, as it is for Tr2Blitter.")
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
  @carbon.method
  @impl.implemented
  PrepareResources(renderContext)
  {
    return this.OnPrepareResources(renderContext);
  }

  /**
   * Creates the AL swap chain and refreshes the mirrored dimensions.
   *
   * CARBON ALSO CREATES THE DEPTH-STENCIL AND ATTACHES THE BACK BUFFER here
   * (`Tr2SwapChain.cpp:38-50`). That half is NOT ported, because the two classes
   * it needs cannot do it yet: `Tr2DepthStencil.Create` and
   * `Tr2RenderTarget.Create` are both `@impl.notImplemented` shells, and
   * `Tr2RenderTarget` has no `Attach` at all. Calling them would throw. This is
   * recorded rather than worked around - the same missing-live-object shape this
   * class had, one layer down.
   *
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Whether the AL chain came up.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon also creates the depth-stencil and attaches the back buffer; Tr2DepthStencil.Create, Tr2RenderTarget.Create and Tr2RenderTarget.Attach do not exist yet, so only the AL half is ported.")
  OnPrepareResources(renderContext)
  {
    if (!Succeeded(this.#swapChain.Create(this.#windowHandle, renderContext.GetRenderContextAL()))) return false;

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
  @carbon.method
  @impl.implemented
  Present(renderContext)
  {
    return Succeeded(this.#swapChain.Present(renderContext.GetRenderContextAL()));
  }

  /**
   * Width of the back buffer, from the AL rather than from the mirror.
   *
   * @returns {number} Width in pixels.
   */
  @carbon.method
  @impl.implemented
  GetWidth()
  {
    return this.#swapChain.GetWidth();
  }

  /**
   * Height of the back buffer, from the AL rather than from the mirror.
   *
   * @returns {number} Height in pixels.
   */
  @carbon.method
  @impl.implemented
  GetHeight()
  {
    return this.#swapChain.GetHeight();
  }

  /**
   * Drops the AL chain, as Carbon's `m_swapChain = Tr2SwapChainAL()` does
   * (`Tr2SwapChain.cpp:35`) - a fresh object, not a null one, so the member is
   * still callable afterwards.
   *
   * @param {number} _storage Carbon's `TriStorage` mask; every AL surface here
   *   belongs to video memory, so there is nothing to select between.
   */
  @carbon.method
  @impl.implemented
  ReleaseResources(_storage)
  {
    this.#swapChain = new Tr2SwapChainALStub();
    this.width = 0;
    this.height = 0;
  }

  /**
   * Installs a backend's AL chain in place of the stub. The accessor pair
   * matches `Tr2RenderContext.SetRenderContextAL`/`GetRenderContextAL`, down to
   * null restoring the stub rather than emptying the field: Carbon selects its
   * backend at compile time and cannot detach one, so neither can this.
   *
   * @param {object|null} al The abstraction-layer swap chain.
   * @returns {object} The backend now installed.
   */
  SetSwapChainAL(al = null)
  {
    this.#swapChain = al ?? new Tr2SwapChainALStub();
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
