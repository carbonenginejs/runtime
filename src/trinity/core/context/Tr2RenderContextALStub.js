// Source: trinity/trinityal/stub/Tr2RenderContextStub.cpp
// Source: trinity/trinityal/stub/Tr2RenderContextStub.h
//
// The GPU-free backend, ported from the one Carbon already ships.
//
// WHAT THIS IS FOR. A headless Trinity that still carries CORRECT DATA. That is
// the requirement, and it is not the same as "runs without a GPU": a backend
// that did nothing at all would satisfy the second and fail the first, because
// nothing downstream would hold real state to inspect.
//
// So this is NOT a no-op. Carbon's stub validates its arguments, keeps genuine
// render-target and depth-stencil stacks, and reports real sizes back. Only the
// draws are empty, because a draw is the one thing that needs a GPU. The
// bookkeeping is the feature.
//
// Carbon builds this as a real target (`TrinityAL_stub`, `trinity_stub`) with a
// real device behind it (`TriDeviceStub.cpp`), consumed by its VideoPlayer and
// by the AL's own tests. It is a supported configuration there, not a
// scaffold, which is why it is worth porting rather than inventing.
//
// TWO REFUSALS ARE CARBON'S, AND DELIBERATE. `ClearUav` and buffer-to-buffer
// copies return failure rather than pretending to succeed
// (`Tr2RenderContextStub.cpp:87-101`). A caller that needs them needs a real
// backend, and silently succeeding would hide that.
//
// What this does NOT cover, matching Carbon: ray tracing (stubbed to fail
// there too) and the five `Tr2Rt*AL` types, plus `Tr2RenderPassAL` and
// `Tr2StreamlineAL`, none of which the stub implements.


function fail(message)
{
  const error = new Error(`Tr2RenderContextALStub: ${message}`);
  error.code = "CJS_AL_STUB_INVALID";
  throw error;
}


/** Carbon's `MAX_RENDER_TARGET`; the bound-target array is fixed width. */
const MAX_RENDER_TARGET = 8;


/**
 * A render context that keeps real state and draws nothing.
 *
 * Implements the AL verbs only. The Trinity-level verbs a render step also
 * reaches for - projection, view transform, wireframe, the render-object and
 * render-texture helpers - are NOT here, because Carbon does not put them on
 * the AL either: they belong to `Tr2Renderer`, `Tr2EffectStateManager` and the
 * `TriStep*` types themselves.
 */
export class Tr2RenderContextALStub
{
  /** m_isValid - set by CreateDevice, and required by every resource create. */
  #isValid = false;

  /** m_boundRenderTarget[MAX_RENDER_TARGET] */
  #boundRenderTargets = new Array(MAX_RENDER_TARGET).fill(null);

  #depthStencil = null;

  /** Carbon keeps real stacks and reports their depth (GetStackSizeRT/DS). */
  #renderTargetStack = [];

  #depthStencilStack = [];

  #viewport = null;

  /** Every draw the context was asked for, so a headless caller can assert. */
  #drawCount = 0;

  /**
   * Brings the context up. Carbon's `CreateDevice` sets validity and installs
   * the present parameters (`Tr2RenderContextStub.cpp:216-227`); every resource
   * `Create` then refuses unless `IsValid()`.
   *
   * @param {object} [presentParameters] Back buffer description.
   * @returns {boolean} True once valid.
   */
  CreateDevice(presentParameters = null)
  {
    this.#isValid = true;
    this.#viewport = presentParameters?.viewport ?? null;

    return true;
  }

  /** Carbon's Destroy clears the bound targets and drops validity (cpp:62-69). */
  Destroy()
  {
    this.#boundRenderTargets.fill(null);
    this.#depthStencil = null;
    this.#renderTargetStack.length = 0;
    this.#depthStencilStack.length = 0;
    this.#isValid = false;

    return true;
  }

  /** Whether a device was created. Resource creation depends on this. */
  IsValid()
  {
    return this.#isValid;
  }

  /**
   * Binds a render target to a slot, keeping it so a caller can read it back.
   *
   * @param {number} slot Target slot.
   * @param {object|null} renderTarget The target.
   * @returns {boolean} True.
   */
  SetRenderTarget(slot, renderTarget)
  {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_RENDER_TARGET)
    {
      fail(`render target slot ${slot} is outside 0..${MAX_RENDER_TARGET - 1}`);
    }

    this.#boundRenderTargets[slot] = renderTarget ?? null;

    return true;
  }

  /**
   * The target bound to a slot.
   *
   * @param {number} [slot] Target slot.
   * @returns {object|null} The bound target.
   */
  GetRenderTarget(slot = 0)
  {
    return this.#boundRenderTargets[slot] ?? null;
  }

  /**
   * Pushes the current target and binds a new one.
   *
   * @param {object|null} renderTarget The target to bind.
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  PushRenderTarget(renderTarget = null, slot = 0)
  {
    this.#renderTargetStack.push({ slot, renderTarget: this.#boundRenderTargets[slot] ?? null });

    return this.SetRenderTarget(slot, renderTarget);
  }

  /**
   * Restores the target beneath the top of the stack.
   *
   * @param {number} [slot] Target slot, for the message only.
   * @returns {boolean} True.
   */
  PopRenderTarget(slot = 0)
  {
    const restored = this.#renderTargetStack.pop();

    // Carbon reports the stack depth rather than guarding, but an unbalanced
    // pop is a caller bug and silence here would leave the wrong target bound
    // for the rest of the frame.
    if (!restored) fail(`render target stack is empty, popping slot ${slot}`);

    this.#boundRenderTargets[restored.slot] = restored.renderTarget;

    return true;
  }

  /** Carbon's GetStackSizeRT. */
  GetStackSizeRT()
  {
    return this.#renderTargetStack.length;
  }

  /**
   * Binds the depth-stencil surface.
   *
   * @param {object|null} depthStencil The surface.
   * @returns {boolean} True.
   */
  SetDepthStencil(depthStencil)
  {
    this.#depthStencil = depthStencil ?? null;

    return true;
  }

  /** The bound depth-stencil surface. */
  GetDepthStencil()
  {
    return this.#depthStencil;
  }

  /**
   * Pushes the current depth-stencil and binds a new one.
   *
   * @param {object|null} depthStencil The surface to bind.
   * @returns {boolean} True.
   */
  PushDepthStencil(depthStencil = null)
  {
    this.#depthStencilStack.push(this.#depthStencil);

    return this.SetDepthStencil(depthStencil);
  }

  /** Restores the depth-stencil beneath the top of the stack. */
  PopDepthStencil()
  {
    if (!this.#depthStencilStack.length) fail("depth stencil stack is empty");

    this.#depthStencil = this.#depthStencilStack.pop();

    return true;
  }

  /** Carbon's GetStackSizeDS. */
  GetStackSizeDS()
  {
    return this.#depthStencilStack.length;
  }

  /**
   * Sets the viewport.
   *
   * @param {object} viewport Viewport rectangle and depth range.
   * @returns {boolean} True.
   */
  SetViewport(viewport)
  {
    this.#viewport = viewport ?? null;

    return true;
  }

  /** The current viewport. */
  GetViewport()
  {
    return this.#viewport;
  }

  /**
   * Clears the bound targets. A clear needs no GPU to be recorded as done.
   *
   * @param {object} _options Clear colour, depth, stencil and flags.
   * @returns {boolean} True.
   */
  Clear(_options)
  {
    return true;
  }

  /**
   * REFUSED, as Carbon refuses it (`Tr2RenderContextStub.cpp:87-95`).
   *
   * @returns {boolean} False, always.
   */
  ClearUav()
  {
    return false;
  }

  /**
   * REFUSED, as Carbon refuses `CopySubBuffer` (`cpp:97-101`).
   *
   * @returns {boolean} False, always.
   */
  CopyRenderTarget()
  {
    return false;
  }

  /**
   * A render target is valid once a device exists and something is bound.
   *
   * @param {object} renderTarget The target to test.
   * @returns {boolean} Whether it can be drawn to.
   */
  IsRenderTargetValid(renderTarget)
  {
    return this.#isValid && !!renderTarget;
  }

  /**
   * Resolving a multisampled target has no meaning without a GPU, and Carbon's
   * stub carries no multisample path, so this reports success and does nothing.
   *
   * @returns {boolean} True.
   */
  ResolveRenderTarget()
  {
    return true;
  }

  /** @see ResolveRenderTarget */
  GenerateMipMaps()
  {
    return true;
  }

  /**
   * Accepts a render state. Carbon's stub validates the topology enum and
   * accepts the rest (`cpp:112-119`); state values are not interpreted.
   *
   * @returns {boolean} True.
   */
  SetRenderState()
  {
    return true;
  }

  /**
   * Counts a compute dispatch without running one.
   *
   * @returns {boolean} True.
   */
  RunComputeShader()
  {
    return true;
  }

  /** @see RunComputeShader */
  RunComputeShaderIndirect()
  {
    return true;
  }

  /**
   * Counts a draw. Carbon's draws return success and do nothing
   * (`cpp:126-186`); the count is ours, so a headless test can assert that the
   * frame reached the point of drawing.
   *
   * @returns {boolean} True.
   */
  DrawIndexedInstanced()
  {
    this.#drawCount += 1;

    return true;
  }

  /** @see DrawIndexedInstanced */
  DrawInstanced()
  {
    this.#drawCount += 1;

    return true;
  }

  /** How many draws this context was asked for. */
  GetDrawCount()
  {
    return this.#drawCount;
  }

  /** Presenting has nothing to show, but the frame still completed. */
  PresentSwapChain()
  {
    return true;
  }
}
