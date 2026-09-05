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
import { PixelFormat, Topology, Tr2GpuUsage } from "../../../global/consts/renderContext/index.js";


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
   * Opens the device's scene. Carbon's stub accepts it and does nothing
   * (`cpp:267-270`).
   *
   * BeginScene/EndScene is where a deferred backend has its frame boundary:
   * DX11 uses the pair for nothing, and a command-encoder backend creates its
   * command buffer on the first and submits on the second.
   *
   * @returns {boolean} True.
   */
  BeginScene()
  {
    return true;
  }

  /** @see BeginScene */
  EndScene()
  {
    return true;
  }

  /**
   * Binds the vertex declaration a following draw reads its streams through.
   *
   * @param {object} _layout A `Tr2VertexLayoutAL`.
   * @returns {boolean} True.
   */
  SetVertexLayout(_layout)
  {
    return true;
  }

  /**
   * Binds one vertex stream.
   *
   * @param {number} _stream The stream index.
   * @param {object} _buffer A `Tr2BufferAL`.
   * @param {number} _offset Byte offset into the buffer.
   * @param {number} _stride Bytes per vertex.
   * @returns {boolean} True.
   */
  SetStreamSource(_stream, _buffer, _offset, _stride)
  {
    return true;
  }

  /**
   * Binds the index buffer.
   *
   * Carbon has a stride-less overload as well; the stride defaults here rather
   * than duplicating the method, because both bodies are the same.
   *
   * @param {object} _buffer A `Tr2BufferAL`.
   * @param {number} [_stride] Bytes per index.
   * @returns {boolean} True.
   */
  SetIndices(_buffer, _stride = 0)
  {
    return true;
  }

  /**
   * Sets the primitive topology for following draws.
   *
   * THE ONE ARGUMENT CARBON'S STUB ACTUALLY VALIDATES (`cpp:112-119`), and the
   * value is a `Topology`, not a D3D topology. `Tr2RenderBatch` carries this
   * vocabulary too as of 2026-09-05, so a caller reaching this from a batch
   * has nothing to translate - which is the point, since Carbon's
   * `SubmitGeometry` hands `m_topology` straight through
   * (`Tr2RenderContext.cpp:86`).
   *
   * @param {number} topology A `Topology` value.
   * @returns {boolean} Whether the topology is one the AL knows.
   */
  SetTopology(topology)
  {
    return topology < Topology.TOP_MAX_TOPOLOGY;
  }

  /**
   * Binds the vertex and pixel shader pair following draws run.
   *
   * @param {object} _shaderProgram A `Tr2ShaderProgramAL`.
   * @returns {boolean} True.
   */
  SetShaderProgram(_shaderProgram)
  {
    return true;
  }

  /**
   * Binds a prepared set of textures, samplers and buffers in one call.
   *
   * This is the verb the resource-set caching exists for: Carbon builds a
   * `Tr2ResourceSetAL` once and rebinds it per draw, rather than binding each
   * resource individually.
   *
   * @param {object} _resourceSet A `Tr2ResourceSetAL`.
   * @returns {boolean} True.
   */
  SetResourceSet(_resourceSet)
  {
    return true;
  }

  /**
   * Binds a constant buffer at one register for one shader stage.
   *
   * The register is the one `Tr2Renderer` names - b0 effect, b1/b2 per frame,
   * b3/b4 per object - so this is where that map meets the device.
   *
   * @param {object} _buffer A `Tr2ConstantBufferAL`.
   * @param {number} _constantType A `ShaderType`.
   * @param {number} _registerIndex The constant-buffer register.
   * @param {number} [_maxRegisterCount] Zero means the buffer's own size.
   * @returns {boolean} True.
   */
  SetConstants(_buffer, _constantType, _registerIndex, _maxRegisterCount = 0)
  {
    return true;
  }

  /**
   * Sets several render states from packed id/value pairs.
   *
   * @param {number[]} _stateValuePairs Alternating state id and value.
   * @param {number} [_count] How many pairs to read.
   * @returns {boolean} True.
   */
  SetRenderStates(_stateValuePairs, _count = 0)
  {
    return true;
  }

  /**
   * REFUSED, as Carbon refuses it (`cpp:97-101`). A buffer-to-buffer copy needs
   * a real backend, and succeeding silently would hide that.
   *
   * @returns {boolean} False, always.
   */
  CopySubBuffer()
  {
    return false;
  }

  /**
   * Whether the bound depth buffer is readable while it is also bound.
   *
   * Carbon's stub keeps no state here and always answers false (`cpp:211-217`),
   * so a caller that needs read-only depth needs a real backend.
   *
   * @param {boolean} _enable Ignored.
   */
  SetReadOnlyDepth(_enable)
  {
  }

  /** @see SetReadOnlyDepth @returns {boolean} False, always. */
  GetReadOnlyDepth()
  {
    return false;
  }

  /**
   * DECLARES what the next pass does with its attachments at both edges.
   *
   * THIS IS THE VERB A COMMAND-ENCODER BACKEND IS BUILT AROUND, and it is
   * Carbon's, not an extension. DX11 and DX12 implement it as an empty function
   * (`Tr2RenderContextDx11.cpp:2414`); Metal folds it into the pass descriptor
   * it opens the next render encoder with. Trinity declares the actions from
   * `EveSpaceScene`, `Tr2PostProcessRenderer`, `Tr2Denoiser` and
   * `Tr2ReflectionProbe`, so the load and store actions are DECLARED by the
   * caller rather than inferred from what follows.
   *
   * Carbon's two overloads differ only in how many colour attachments they
   * carry, so they collapse into one variadic list here.
   *
   * @param {...object} _attachments `Tr2ColorAttachment`s then one
   *   `Tr2DepthAttachment`.
   */
  RenderPassHint(..._attachments)
  {
  }

  /**
   * Ends the declared pass, so anything after it opens a new one.
   *
   * @see RenderPassHint
   */
  EndRenderPassHint()
  {
  }

  /**
   * Names a point in the command stream for a GPU debugger.
   *
   * All three marker verbs are empty in Carbon's stub (`cpp:399-410`), and they
   * are ported because a backend that drops them silently loses every capture
   * label - which is only ever noticed while debugging something else.
   *
   * @param {string} _marker The label.
   */
  AddGpuMarker(_marker)
  {
  }

  /** @see AddGpuMarker @param {string} _marker The label. */
  PushGpuMarker(_marker)
  {
  }

  /** @see AddGpuMarker */
  PopGpuMarker()
  {
  }

  /**
   * Whether the backend can address textures without binding them.
   *
   * @returns {boolean} False; the stub has no bindless path.
   */
  SupportsBindlessTextures()
  {
    return false;
  }

  /**
   * Declares that a bindless resource collection is about to be read.
   *
   * Carbon's stub accepts it (`cpp:436-439`) even though it has no bindless
   * path, because the declaration is a residency hint rather than a bind.
   *
   * @returns {boolean} True.
   */
  UseResources()
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
  DrawIndexedInstanced(_indexCountPerInstance, _instanceCount, _startIndexLocation, _baseVertexLocation, _startInstanceLocation)
  {
    this.#drawCount += 1;

    return true;
  }

  /** @see DrawIndexedInstanced */
  DrawInstanced(_vertexCountPerInstance, _instanceCount, _startVertexLocation, _startInstanceLocation)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts an indexed draw with no instancing.
   *
   * @param {number} _numVertices Vertices the index range spans.
   * @param {number} _startIndex First index to read.
   * @param {number} _primitiveCount Primitives to draw.
   * @param {number} [_minimumIndex] Lowest index value present.
   * @returns {boolean} True.
   */
  DrawIndexedPrimitive(_numVertices, _startIndex, _primitiveCount, _minimumIndex = 0)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts a non-indexed draw with no instancing.
   *
   * @param {number} _startVertex First vertex to read.
   * @param {number} _primitiveCount Primitives to draw.
   * @returns {boolean} True.
   */
  DrawPrimitive(_startVertex, _primitiveCount)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts an indexed draw from caller-supplied memory.
   *
   * VALIDATES ITS POINTERS, which Carbon's stub does and does nowhere else
   * (`cpp:172-199`): a user-pointer draw with nothing behind the pointer is a
   * caller error the backend can catch without a GPU.
   *
   * Carbon's two overloads differ only in 16- versus 32-bit index data, which
   * is carried by the array's own type here.
   *
   * @param {number} _numVertices Vertices the index data spans.
   * @param {number} _primitiveCount Primitives to draw.
   * @param {ArrayBufferView} indexData The indices.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} _vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} Whether both pointers were supplied.
   */
  DrawIndexedPrimitiveUP(_numVertices, _primitiveCount, indexData, vertexStreamZeroData, _vertexStreamZeroStride)
  {
    if (!indexData || !vertexStreamZeroData) return false;

    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts a non-indexed draw from caller-supplied memory.
   *
   * Carbon does NOT validate here, unlike its indexed counterpart
   * (`cpp:165-171`), and the asymmetry is transcribed rather than tidied.
   *
   * @param {number} _primitiveCount Primitives to draw.
   * @param {ArrayBufferView} _vertexStreamZeroData The vertices.
   * @param {number} _vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} True.
   */
  DrawPrimitiveUP(_primitiveCount, _vertexStreamZeroData, _vertexStreamZeroStride)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * REFUSED, as Carbon refuses both indirect draws (`Tr2RenderContextStub.h:161-169`).
   * Reading the draw arguments from a buffer needs a GPU.
   *
   * @returns {boolean} False, always.
   */
  DrawIndexedInstancedIndirect()
  {
    return false;
  }

  /** @see DrawIndexedInstancedIndirect @returns {boolean} False, always. */
  DrawInstancedIndirect()
  {
    return false;
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
