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
// SCOPE. The geometry and draw path only: what Carbon's `SubmitGeometry`
// (`Tr2RenderContext.cpp:83-103`) touches, plus the scene and pass-hint verbs
// around it. Textures, compute, copies and upscaling are not here yet, and are
// refused rather than silently accepted.

import { Topology } from "#consts/render-context";
import { CjsWebgpuWorkQueue } from "./core/workQueue.js";


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

  /** Everything the work queue reported, for a caller that encodes it. */
  #transitions = [];

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

    this.#Record(this.#workQueue.BeginFrame());

    return true;
  }

  /**
   * Closes any encoder and commits.
   *
   * @returns {boolean} True.
   */
  EndScene()
  {
    this.#Record(this.#workQueue.EndFrame());

    return true;
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
