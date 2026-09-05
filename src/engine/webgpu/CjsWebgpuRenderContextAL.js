// Source: trinity/trinityal/metal/Tr2RenderContextMetal.h
// Source: trinity/trinityal/metal/Tr2RenderContextMetal.mm
// Source: trinity/trinityal/stub/Tr2RenderContextStub.h
//
// The WebGPU backend behind Carbon's abstraction layer.
//
// WHAT THIS REPLACES. `Tr2RenderContext` currently RECORDS what Trinity asked
// for into an intent list, which `framePlan.js` partitions and
// `frameExecutor.js` encodes. That mechanism has no Carbon counterpart: Carbon
// gives the same job to the abstraction layer, and a backend is simply called.
// The intent path is still present and still the live one - this backend
// replaces it, and it is deleted once it does.
//
// THE DIVISION OF LABOUR IS CARBON'S. `Tr2RenderContextAL` (metal) holds the
// bound state and validates; `MetalWorkQueue` owns the command buffer and the
// encoder lifetime. `DrawIndexedInstanced` there checks its index buffer,
// converts a primitive count to a vertex count, then calls the work queue,
// whose draw opens a render encoder if none is current
// (`Tr2RenderContextMetal.mm:414-436`, `MetalWorkQueue.mm:2922-2945`). This
// keeps that split, so `CjsWebgpuWorkQueue` is the only thing that knows when a
// pass begins.
//
// DEVICE-FREE, AS CARBON'S STUB IS. Every verb here is argument validation,
// state, and delegation - none of it needs a GPU, and Carbon ships a whole
// backend (`TrinityAL_stub`) on that basis. The device arrives when the work
// queue's recorded transitions are applied to a real command encoder.
//
// SCOPE. The verbs `Tr2RenderContext` forwards to a backend: the geometry and
// draw path Carbon's `SubmitGeometry` touches (`Tr2RenderContext.cpp:83-103`),
// the render-target and depth-stencil families with their per-slot stacks, the
// viewport, clear, compute and present. That is what installing this backend
// requires, because the context prefers the AL per verb and a missing one is a
// crash rather than a fallback.
//
// NOT HERE YET: texture and buffer creation, copies, mip generation and
// upscaling. Absent rather than faked.

import { Topology, Tr2LoadAction, Tr2StoreAction } from "#consts/render-context";
import { ALResult, Tr2ColorAttachment, Tr2DepthAttachment } from "#trinity/core";
import { CjsWebgpuWorkQueue, EncoderType } from "./core/workQueue.js";


function fail(message)
{
  const error = new Error(`CjsWebgpuRenderContextAL: ${message}`);
  error.code = "CJS_WEBGPU_AL_INVALID";
  throw error;
}


/**
 * How many vertices a primitive count describes, per topology.
 *
 * CARBON'S DRAW VERBS TAKE PRIMITIVES AND ITS BACKENDS DRAW VERTICES, so every
 * one of them converts (`Tr2RenderContextMetal.mm:424`, `ComputeVertexCount`).
 * The conversion depends on the bound topology, which is why the AL holds it.
 */
const VERTICES_PER_PRIMITIVE = Object.freeze({
  [Topology.TOP_TRIANGLES]: count => count * 3,
  [Topology.TOP_TRIANGLE_STRIP]: count => count + 2,
  [Topology.TOP_TRIANGLE_FAN]: count => count + 2,
  [Topology.TOP_LINES]: count => count * 2,
  [Topology.TOP_LINE_STRIP]: count => count + 1,
  [Topology.TOP_POINTS]: count => count
});


/** Carbon's `MAX_RENDER_TARGET`; the bound-target array is fixed width. */
const MAX_RENDER_TARGET = 8;


/** WebGPU behind the abstraction layer, holding a work queue as Metal does. */
export class CjsWebgpuRenderContextAL
{
  /** m_workQueue */
  #workQueue = new CjsWebgpuWorkQueue();

  /** m_isValid */
  #isValid = false;

  /** m_metalPrimitiveInfo - the topology following draws use. */
  #topology = Topology.TOP_TRIANGLES;

  /** m_metalIndexBuffer */
  #indexBuffer = null;

  #indexStride = 0;

  /** Vertex streams by slot, as SetStreamSource fills them. */
  #streams = [];

  /** m_vertexLayout */
  #vertexLayout = null;

  /** m_shaderProgram */
  #shaderProgram = null;

  /** m_resourceSet */
  #resourceSet = null;

  /** m_boundRenderTarget[MAX_RENDER_TARGET] */
  #boundRenderTargets = new Array(MAX_RENDER_TARGET).fill(null);

  /** m_stackRT[MAX_RENDER_TARGET] - one stack per slot, as Carbon has. */
  #renderTargetStacks = Array.from({ length: MAX_RENDER_TARGET }, () => []);

  #depthStencil = null;

  #depthStencilStack = [];

  #viewport = null;

  /** Everything the work queue reported, for a caller that encodes it. */
  #transitions = [];

  // THE DEVICE HALF, AND WHY IT IS OPTIONAL. Composed, this backend draws:
  // `BeginScene` opens a command encoder, the work queue turns it into real
  // render passes, `RenderBatches` hands each pass to the dispatcher, and
  // `EndScene` submits. Uncomposed it behaves exactly as it did before -
  // validating verbs and recording transitions - which is the stub backend
  // Carbon ships and the thing every test here relies on.
  //
  // IT DELEGATES RATHER THAN DRAWS. `CjsWebgpuDevice.EncodeDraw` already IS
  // Carbon's `SubmitGeometry` sequence - pipeline, bind groups, vertex and
  // index buffers, then the draw - and the dispatcher already groups batches
  // and filters redundant state. A second implementation here would be the
  // mistake this whole exercise is undoing, one layer further down.

  #webgpu = null;

  #dispatcher = null;

  #renderTarget = null;

  /** The frame's command encoder, between BeginScene and EndScene. */
  #commandEncoder = null;

  /** The acquired swap-chain frame, valid only within one scene. */
  #frame = null;

  /** Prepared accumulators, keyed by the accumulator they were prepared from. */
  #prepared = new WeakMap();

  /**
   * @param {object} [composition] The device half; omit for the stub backend.
   * @param {object} [composition.webgpu] A `CjsWebgpuDevice`.
   * @param {object} [composition.dispatcher] A `CjsWebgpuTrinityBatchDispatcher`.
   * @param {object} [composition.renderTarget] A `CjsWebgpuRenderTarget`.
   */
  constructor({ webgpu = null, dispatcher = null, renderTarget = null } = {})
  {
    if (webgpu && !(dispatcher && renderTarget))
    {
      fail("a composed backend needs a dispatcher and a render target as well as a device");
    }

    this.#webgpu = webgpu;
    this.#dispatcher = dispatcher;
    this.#renderTarget = renderTarget;
  }

  /** Whether this backend can actually draw. @returns {boolean} */
  IsComposed()
  {
    return this.#webgpu !== null;
  }

  /**
   * The work queue this backend records through.
   *
   * @returns {CjsWebgpuWorkQueue} The queue.
   */
  GetWorkQueue()
  {
    return this.#workQueue;
  }

  /**
   * Everything the work queue has reported since the last drain.
   *
   * @returns {object[]} Transitions and draws, in order.
   */
  DrainTransitions()
  {
    const transitions = this.#transitions;

    this.#transitions = [];

    return transitions;
  }

  /**
   * Creates the device. Carbon gates every resource create on this.
   *
   * @returns {boolean} True.
   */
  CreateDevice()
  {
    this.#isValid = true;

    return true;
  }

  /** @returns {boolean} Whether a device exists. */
  IsValid()
  {
    return this.#isValid;
  }

  /**
   * Opens the frame's command buffer.
   *
   * @returns {boolean} True.
   */
  BeginScene()
  {
    if (!this.#isValid) fail("BeginScene before CreateDevice");

    if (this.#webgpu)
    {
      // The canvas texture is valid for THIS frame only, so it is acquired per
      // scene and every pass opened during it shares the one view.
      this.#frame = this.#renderTarget.AcquireFrame();
      this.#commandEncoder = this.#webgpu.GetDevice().createCommandEncoder({ label: "CjsWebgpuRenderContextAL" });
      this.#workQueue.SetCommandEncoder(this.#commandEncoder, attachments => this.#Descriptor(attachments));
    }

    this.#Record(this.#workQueue.BeginFrame());

    return true;
  }

  /**
   * The render-pass descriptor for a set of folded attachments.
   *
   * `attachments` IS NULL FOR AN UNHINTED PASS, which is most of them: Carbon
   * applies load and store actions only when a hint is pending and otherwise
   * leaves the backend's own defaults alone. Ours are the render target's.
   */
  #Descriptor(attachments)
  {
    const clear = attachments?.colors?.[0];

    return this.#renderTarget.CreateRenderPassDescriptor(this.#frame, {
      label: `pass ${this.#workQueue.GetPassCount()}`,
      clearColor: clear?.loadOp === "clear" ? clear.clearValue : undefined,
      clearDepth: attachments?.depth?.loadOp === "clear" ? attachments.depth.clearValue : undefined
    });
  }

  /**
   * Closes any encoder and commits.
   *
   * @returns {boolean} True.
   */
  EndScene()
  {
    this.#Record(this.#workQueue.EndFrame());

    if (this.#commandEncoder)
    {
      // EndFrame has already closed the last pass, so finishing here is safe.
      this.#webgpu.Submit([ this.#commandEncoder.finish() ]);
      this.#workQueue.SetCommandEncoder(null);
      this.#commandEncoder = null;
      this.#frame = null;
    }

    return true;
  }

  /**
   * Draws a finalized batch accumulator.
   *
   * This is the verb the whole intent queue existed to stand in for. Carbon's
   * `Tr2RenderContextBase::RenderBatches` walks the accumulator and issues
   * draws immediately; ours opens a render pass on demand and hands it to the
   * dispatcher, which already groups the batches and filters redundant state.
   *
   * PREPARATION IS ASYNCHRONOUS AND THAT IS FORCED, not a shortcut. Building a
   * pipeline and resolving a material's textures are promises in a browser and
   * synchronous in Carbon. So a batch set that has not finished preparing draws
   * NOTHING this frame and is drawn the next one - which is how every other
   * resource on this path already behaves, and is why a ship fades in rather
   * than blocking the first frame.
   *
   * @param {object} accumulator A finalized `ITriRenderBatchAccumulator`.
   * @param {string} techniqueName The technique to draw.
   * @returns {boolean} Whether anything was encoded this call.
   */
  RenderBatches(accumulator, techniqueName)
  {
    if (!this.#dispatcher) return false;

    const handle = this.#PreparedFor(accumulator, techniqueName);

    if (!handle) return false;

    const pass = this.#workQueue.RequireRenderPass();

    if (!pass) return false;

    this.#dispatcher.EncodeAccumulator(pass, handle);

    return true;
  }

  /**
   * The prepared handle for an accumulator, starting preparation on a miss.
   *
   * Keyed on the accumulator AND the technique, because the same batches drawn
   * for depth and for colour are two different sets of pipelines.
   */
  #PreparedFor(accumulator, techniqueName)
  {
    let byTechnique = this.#prepared.get(accumulator);

    if (!byTechnique)
    {
      byTechnique = new Map();
      this.#prepared.set(accumulator, byTechnique);
    }

    const entry = byTechnique.get(techniqueName);

    if (entry) return entry.handle;

    // Recorded before awaiting, so a second call in the same frame joins the
    // work in flight instead of starting it again.
    const pending = { handle: null };

    byTechnique.set(techniqueName, pending);

    this.#dispatcher.PrepareAccumulator(accumulator, { techniqueName })
      .then(handle => { pending.handle = handle; })
      .catch(error =>
      {
        byTechnique.delete(techniqueName);
        throw error;
      });

    return null;
  }

  /**
   * Declares what the next render pass does with its attachments.
   *
   * Carbon's two overloads differ only in how many colour attachments they
   * carry, so they collapse into one variadic list. The depth attachment is
   * always last.
   *
   * @param {...object} attachments `Tr2ColorAttachment`s then a `Tr2DepthAttachment`.
   */
  RenderPassHint(...attachments)
  {
    const depth = attachments.length ? attachments[attachments.length - 1] : null;
    const colors = attachments.slice(0, -1);

    this.#workQueue.RenderPassHint(colors, depth);
  }

  /** Ends the declared pass, so following work opens a new one. */
  EndRenderPassHint()
  {
    this.#Record(this.#workQueue.EndRenderPassHint());
  }

  /**
   * Binds a colour target at one slot.
   *
   * RESETS THE VIEWPORT TO THE NEW TARGET, which Carbon does here in the
   * backend (`Tr2RenderContextMetal.mm:762-766`) whenever slot zero changes.
   * Leaving it alone is the defect where a 2048 shadow pass leaves the viewport
   * at 2048 for the rest of the frame.
   *
   * @param {number} slot The slot.
   * @param {object|null} renderTarget A `Tr2TextureAL`, or null to detach.
   * @param {number} [slice] The array slice or cube face.
   * @returns {boolean} True.
   */
  SetRenderTarget(slot, renderTarget, slice = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return false;

    this.#Record(this.#workQueue.SetRenderAttachments(renderTarget ?? null, slot, slice));
    this.#boundRenderTargets[slot] = renderTarget ?? null;

    const primary = this.#boundRenderTargets[0];

    if (slot === 0 && primary)
    {
      this.SetViewport({ x: 0, y: 0, width: primary.GetWidth(), height: primary.GetHeight() });
    }

    return true;
  }

  /**
   * The target bound at one slot.
   *
   * @param {number} [slot] The slot.
   * @returns {object|null} The target.
   */
  GetRenderTarget(slot = 0)
  {
    return this.#boundRenderTargets[slot] ?? null;
  }

  /**
   * Saves the target bound at one slot.
   *
   * ONE STACK PER SLOT, as Carbon has (`m_stackRT[MAX_RENDER_TARGET]`). A single
   * shared stack pops the most recent push whatever its slot, so pushing slot 0
   * then slot 1 and popping slot 0 restores the wrong surface.
   *
   * @param {number} [slot] The slot.
   * @returns {boolean} True.
   */
  PushRenderTarget(slot = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return false;

    this.#renderTargetStacks[slot].push(this.#boundRenderTargets[slot] ?? null);

    return true;
  }

  /**
   * Restores the target saved for one slot.
   *
   * @param {number} [slot] The slot.
   * @returns {boolean} Whether anything was saved.
   */
  PopRenderTarget(slot = 0)
  {
    const stack = this.#renderTargetStacks[slot];

    if (!stack?.length) return false;

    this.SetRenderTarget(slot, stack.pop());

    return true;
  }

  /**
   * Depth of one slot's stack.
   *
   * @param {number} [slot] The slot.
   * @returns {number} The depth.
   */
  GetStackSizeRT(slot = 0)
  {
    return this.#renderTargetStacks[slot]?.length ?? 0;
  }

  /**
   * Binds the depth-stencil target.
   *
   * @param {object|null} depthStencil A `Tr2TextureAL`, or null to detach.
   * @returns {boolean} True.
   */
  SetDepthStencil(depthStencil)
  {
    this.#Record(this.#workQueue.SetDepthAttachment(depthStencil ?? null));
    this.#depthStencil = depthStencil ?? null;

    return true;
  }

  /** @returns {object|null} The bound depth-stencil target. */
  GetDepthStencil()
  {
    return this.#depthStencil;
  }

  /** Saves the bound depth-stencil target. @returns {boolean} True. */
  PushDepthStencil()
  {
    this.#depthStencilStack.push(this.#depthStencil);

    return true;
  }

  /** Restores the saved depth-stencil target. @returns {boolean} Whether one was saved. */
  PopDepthStencil()
  {
    if (!this.#depthStencilStack.length) return false;

    this.SetDepthStencil(this.#depthStencilStack.pop());

    return true;
  }

  /** @returns {number} Depth of the depth-stencil stack. */
  GetStackSizeDS()
  {
    return this.#depthStencilStack.length;
  }

  /**
   * The size of the target at one slot.
   *
   * @param {number} [slot] The slot.
   * @returns {object} `{ result, width, height }`.
   */
  GetRenderTargetSize(slot = 0)
  {
    const target = this.#boundRenderTargets[slot];

    if (!target) return { result: ALResult.E_INVALIDCALL, width: 0, height: 0 };

    return { result: ALResult.S_OK, width: target.GetWidth(), height: target.GetHeight() };
  }

  /**
   * Whether a target can be drawn to.
   *
   * @param {object} renderTarget The target.
   * @returns {boolean} Whether it is usable.
   */
  IsRenderTargetValid(renderTarget)
  {
    return this.#isValid && !!renderTarget;
  }

  /**
   * Sets the viewport following draws use.
   *
   * @param {object} viewport `{ x, y, width, height }`.
   * @returns {boolean} True.
   */
  SetViewport(viewport)
  {
    this.#viewport = viewport ? { ...viewport } : null;

    return true;
  }

  /** @returns {object|null} The current viewport. */
  GetViewport()
  {
    return this.#viewport ? { ...this.#viewport } : null;
  }

  /**
   * Clears the bound attachments.
   *
   * A CLEAR IS A LOAD OPERATION, not a command. WebGPU has no mid-pass clear,
   * so this ends the current pass and declares the next one's load actions -
   * which is the same thing `RenderPassHint` does, arrived at from the other
   * direction. Carbon's Metal backend folds a clear the same way.
   *
   * @param {object} [options] `{ color, depth, stencil }` values.
   * @returns {boolean} True.
   */
  Clear(options = {})
  {
    const attachments = this.#workQueue.GetAttachments();
    const colors = attachments.colors
      .filter(Boolean)
      .map(() => new Tr2ColorAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, options.color ?? 0));
    const depth = attachments.depth
      ? new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, options.depth ?? 1)
      : null;

    this.#workQueue.RenderPassHint(colors, depth);

    return true;
  }

  /**
   * Runs a compute dispatch, which may not happen inside a render pass.
   *
   * @param {number} [_x] Workgroups.
   * @param {number} [_y] Workgroups.
   * @param {number} [_z] Workgroups.
   * @returns {boolean} True.
   */
  RunComputeShader(_x = 1, _y = 1, _z = 1)
  {
    this.#Record(this.#workQueue.SetCurrentEncoder(EncoderType.COMPUTE));

    return true;
  }

  /**
   * Presents the frame.
   *
   * The browser presents a configured canvas after the submission that drew
   * into its current texture, so there is nothing to do beyond ending the
   * frame's work.
   *
   * @returns {boolean} True.
   */
  PresentSwapChain()
  {
    return this.EndScene();
  }

  /**
   * Sets the primitive topology following draws use.
   *
   * @param {number} topology A `Topology` value.
   * @returns {boolean} Whether the AL knows it.
   */
  SetTopology(topology)
  {
    if (topology >= Topology.TOP_MAX_TOPOLOGY || !VERTICES_PER_PRIMITIVE[topology]) return false;

    this.#topology = topology;

    return true;
  }

  /**
   * Binds the vertex declaration.
   *
   * @param {object} layout A `Tr2VertexLayoutAL`.
   * @returns {boolean} True.
   */
  SetVertexLayout(layout)
  {
    this.#vertexLayout = layout;

    return true;
  }

  /**
   * Binds one vertex stream.
   *
   * @param {number} stream The slot.
   * @param {object} buffer A `Tr2BufferAL`.
   * @param {number} offset Byte offset.
   * @param {number} stride Bytes per vertex.
   * @returns {boolean} True.
   */
  SetStreamSource(stream, buffer, offset, stride)
  {
    this.#streams[stream] = { buffer, offset, stride };

    return true;
  }

  /**
   * Binds the index buffer.
   *
   * @param {object} buffer A `Tr2BufferAL`.
   * @param {number} [stride] Bytes per index.
   * @returns {boolean} True.
   */
  SetIndices(buffer, stride = 0)
  {
    this.#indexBuffer = buffer;
    this.#indexStride = stride;

    return true;
  }

  /**
   * Binds the shader program following draws run.
   *
   * @param {object} shaderProgram A `Tr2ShaderProgramAL`.
   * @returns {boolean} True.
   */
  SetShaderProgram(shaderProgram)
  {
    this.#shaderProgram = shaderProgram;

    return true;
  }

  /**
   * Binds a prepared set of textures, samplers and buffers.
   *
   * @param {object} resourceSet A `Tr2ResourceSetAL`.
   * @returns {boolean} True.
   */
  SetResourceSet(resourceSet)
  {
    this.#resourceSet = resourceSet;

    return true;
  }

  /**
   * Draws the bound geometry, indexed.
   *
   * REFUSES WITHOUT AN INDEX BUFFER, as Metal does - `E_INVALIDARG` at
   * `Tr2RenderContextMetal.mm:419-422`. An indexed draw with nothing to index
   * is a caller error a backend can catch without a device.
   *
   * @param {number} indexCountPerInstance Indices each instance reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startIndexLocation First index.
   * @param {number} baseVertexLocation Value added to every index.
   * @param {number} startInstanceLocation First instance id.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawIndexedInstanced(
    indexCountPerInstance,
    instanceCount,
    startIndexLocation = 0,
    baseVertexLocation = 0,
    startInstanceLocation = 0
  )
  {
    if (!this.#indexBuffer) return false;
    if (!this.#shaderProgram) return false;

    this.#Record(this.#workQueue.DrawIndexedPrimitives(
      indexCountPerInstance,
      instanceCount,
      startIndexLocation,
      baseVertexLocation,
      startInstanceLocation
    ));

    return true;
  }

  /**
   * Draws the bound geometry, non-indexed.
   *
   * @param {number} vertexCountPerInstance Vertices each instance reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startVertexLocation First vertex.
   * @param {number} startInstanceLocation First instance id.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawInstanced(vertexCountPerInstance, instanceCount, startVertexLocation = 0, startInstanceLocation = 0)
  {
    if (!this.#shaderProgram) return false;

    this.#Record(this.#workQueue.DrawPrimitives(
      vertexCountPerInstance,
      instanceCount,
      startVertexLocation,
      startInstanceLocation
    ));

    return true;
  }

  /**
   * Draws a primitive COUNT, converting it to vertices first.
   *
   * @param {number} numVertices Vertices the index range spans.
   * @param {number} startIndex First index.
   * @param {number} primitiveCount Primitives to draw.
   * @param {number} [minimumIndex] Lowest index present.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawIndexedPrimitive(numVertices, startIndex, primitiveCount, minimumIndex = 0)
  {
    return this.DrawIndexedInstanced(this.ComputeVertexCount(primitiveCount), 1, startIndex, minimumIndex, 0);
  }

  /**
   * Draws a primitive count, non-indexed.
   *
   * @param {number} startVertex First vertex.
   * @param {number} primitiveCount Primitives to draw.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawPrimitive(startVertex, primitiveCount)
  {
    return this.DrawInstanced(this.ComputeVertexCount(primitiveCount), 1, startVertex, 0);
  }

  /**
   * How many vertices a primitive count describes at the bound topology.
   *
   * @param {number} primitiveCount Primitives.
   * @returns {number} Vertices.
   */
  ComputeVertexCount(primitiveCount)
  {
    return VERTICES_PER_PRIMITIVE[this.#topology](primitiveCount);
  }

  /**
   * What a following draw would bind, for a caller that must encode it.
   *
   * @returns {object} A copy of the bound state.
   */
  GetBoundState()
  {
    return {
      topology: this.#topology,
      indexBuffer: this.#indexBuffer,
      indexStride: this.#indexStride,
      streams: this.#streams.map(stream => (stream ? { ...stream } : stream)),
      vertexLayout: this.#vertexLayout,
      shaderProgram: this.#shaderProgram,
      resourceSet: this.#resourceSet
    };
  }

  #Record(events)
  {
    if (events?.length) this.#transitions.push(...events);
  }
}
