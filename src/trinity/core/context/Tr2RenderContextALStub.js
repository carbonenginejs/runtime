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


import { ALResult, Failed, Tr2BitmapDimensions, Tr2CapsALStub, Tr2TextureALStub } from "../al/index.js";
import { PixelFormat, Tr2GpuUsage } from "../../../global/consts/renderContext/index.js";


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

  // ONE STACK PER SLOT, as Carbon has (`m_stackRT[MAX_RENDER_TARGET]`). A single
  // shared stack pops the most recent push regardless of slot, so pushing slot 0
  // then slot 1 and popping slot 0 restores the wrong surface.

  /** Carbon keeps real stacks and reports their depth (GetStackSizeRT/DS). */
  #renderTargetStacks = Array.from({ length: MAX_RENDER_TARGET }, () => []);

  #depthStencilStack = [];

  #viewport = null;

  /** Every draw the context was asked for, so a headless caller can assert. */
  #drawCount = 0;

  // m_frameNumber. THIS IS NOT THE TRINITY FRAME COUNTER. Trinity's counts
  // frames the render path has begun (`Tr2Renderer::GetCurrentFrameCounter`);
  // this one counts frames the DEVICE has finished, and the gap between them is
  // what a ring buffer fences against. Carbon's stub keeps one number and
  // derives both: recording is the next frame, rendered is this one
  // (`Tr2RenderContextStub.cpp:453-456,500-503`), which is the same as saying
  // the stub always finishes a frame before the next begins.

  /** m_frameNumber - frames the device has finished. */
  #frameNumber = 0;

  /** m_caps - the context owns its capabilities, as Carbon's does. */
  #caps = new Tr2CapsALStub();

  /** m_defaultBackBuffer - a real texture, so size and format read back. */
  #defaultBackBuffer = new Tr2TextureALStub();

  /**
   * Brings the context up. Carbon's `CreateDevice` sets validity and installs
   * the present parameters (`Tr2RenderContextStub.cpp:230-243`); every resource
   * `Create` then refuses unless `IsValid()`.
   *
   * THE ORDER MATTERS AND IS CARBON'S. Validity is set BEFORE the present
   * parameters, because creating the back buffer is a resource create and so
   * asks this same context whether it is valid yet.
   *
   * @param {object} [presentParameters] Present parameters, as the AL shapes
   * them: `{ mode: { width, height } }`.
   * @returns {boolean} True once valid.
   */
  CreateDevice(presentParameters = null)
  {
    this.#isValid = true;

    if (presentParameters) this.SetPresentParameters(presentParameters);

    return true;
  }

  /**
   * Creates the default back buffer and binds it to slot zero.
   *
   * Carbon's back buffer is `B8G8R8A8_UNORM` with one mip
   * (`Tr2RenderContextStub.cpp:249-260`), and the create is checked: a mode
   * with no size produces no back buffer rather than a zero-sized one.
   *
   * @param {object} presentParameters `{ mode: { width, height } }`.
   * @returns {number} An `ALResult` value.
   */
  SetPresentParameters(presentParameters)
  {
    const { mode } = presentParameters;

    const result = this.#defaultBackBuffer.Create(
      Tr2BitmapDimensions.Texture2D(mode.width, mode.height, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM),
      { gpuUsage: Tr2GpuUsage.RENDER_TARGET },
      this
    );

    if (Failed(result)) return result;

    this.SetRenderTarget(0, this.#defaultBackBuffer);

    return ALResult.S_OK;
  }

  /**
   * What this backend can do.
   *
   * Carbon's context owns its caps and hands out a reference
   * (`Tr2RenderContextStub.h:70`); a caller asks the context, never the caps
   * object directly, which is why this lives here rather than on a factory.
   *
   * @returns {Tr2CapsALStub} The capabilities.
   */
  GetCaps()
  {
    return this.#caps;
  }

  /**
   * The default back buffer.
   *
   * @returns {Tr2TextureALStub} The back buffer, created or not.
   */
  GetBackBuffer()
  {
    return this.#defaultBackBuffer;
  }

  /**
   * The back buffer's pixel format.
   *
   * @returns {number} A `PixelFormat` value.
   */
  GetBackBufferFormat()
  {
    return this.#defaultBackBuffer.GetFormat();
  }

  /**
   * The size of a bound render target.
   *
   * Carbon separates the two failures deliberately: a slot past the end of the
   * array is `E_FAIL`, while an empty slot is `E_INVALIDCALL` - the caller
   * asked a reasonable question about a target that is not there.
   *
   * @param {number} [slot] Target slot.
   * @returns {{result: number, width: number, height: number}} The size.
   */
  GetRenderTargetSize(slot = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return { result: ALResult.E_FAIL, width: 0, height: 0 };

    const target = this.#boundRenderTargets[slot];

    if (!target || !target.IsValid()) return { result: ALResult.E_INVALIDCALL, width: 0, height: 0 };

    return { result: ALResult.S_OK, width: target.GetWidth(), height: target.GetHeight() };
  }

  /**
   * Releases every bound target and the back buffer, as a device loss does.
   *
   * @returns {boolean} True.
   */
  ReleaseDeviceResources()
  {
    this.#boundRenderTargets.fill(null);
    this.#defaultBackBuffer.Destroy();
    this.#defaultBackBuffer = new Tr2TextureALStub();

    return true;
  }

  /** Carbon's Destroy clears the bound targets and drops validity (cpp:62-69). */
  Destroy()
  {
    this.#boundRenderTargets.fill(null);
    this.#depthStencil = null;
    for (const stack of this.#renderTargetStacks) stack.length = 0;
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
   * Saves the target bound to a slot.
   *
   * CARBON'S PUSH TAKES ONLY A SLOT (`Tr2RenderContextDx11.cpp:2178-2188`). It
   * binds nothing: the "push this target" convenience belongs to the effect
   * state manager, which pushes and then sets. Folding that into the backend
   * here would put a Trinity-level verb in the abstraction layer.
   *
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  PushRenderTarget(slot = 0)
  {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_RENDER_TARGET)
    {
      fail(`render target slot ${slot} is outside 0..${MAX_RENDER_TARGET - 1}`);
    }

    this.#renderTargetStacks[slot].push(this.#boundRenderTargets[slot] ?? null);

    return true;
  }

  /**
   * Restores the target saved for a slot, binding it again.
   *
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  PopRenderTarget(slot = 0)
  {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_RENDER_TARGET)
    {
      fail(`render target slot ${slot} is outside 0..${MAX_RENDER_TARGET - 1}`);
    }

    const stack = this.#renderTargetStacks[slot];

    // Carbon reports the stack depth rather than guarding, but an unbalanced
    // pop is a caller bug and silence here would leave the wrong target bound
    // for the rest of the frame.
    if (!stack.length) fail(`render target stack is empty, popping slot ${slot}`);

    this.#boundRenderTargets[slot] = stack.pop();

    return true;
  }

  /**
   * Carbon's GetStackSizeRT, which is per slot.
   *
   * @param {number} [slot] Target slot.
   * @returns {number} Saved targets for that slot.
   */
  GetStackSizeRT(slot = 0)
  {
    return this.#renderTargetStacks[slot]?.length ?? 0;
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
   * Saves the bound depth-stencil. Binds nothing; see `PushRenderTarget`.
   *
   * @returns {boolean} True.
   */
  PushDepthStencil()
  {
    this.#depthStencilStack.push(this.#depthStencil);

    return true;
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

  /**
   * Presenting has nothing to show, but the frame still completed.
   *
   * Carbon's stub advances its frame number here and nowhere else
   * (`Tr2RenderContextStub.cpp:277-281`), which makes Present the frame
   * boundary a fence can be measured against.
   *
   * @returns {boolean} True.
   */
  PresentSwapChain()
  {
    this.#frameNumber += 1;

    return true;
  }

  /**
   * The frame being recorded now.
   *
   * @returns {number} One past the finished frame.
   */
  GetRecordingFrameNumber()
  {
    return this.#frameNumber + 1;
  }

  /**
   * The last frame the device has finished.
   *
   * @returns {number} The finished frame.
   */
  GetRenderedFrameNumber()
  {
    return this.#frameNumber;
  }
}
