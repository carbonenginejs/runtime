// Source: trinity/trinityal/dx12/util/PsoDescription.h
//   trinity/trinityal/dx12/util/PsoDescription.cpp
//   trinity/trinityal/dx12/Tr2RenderContextDx12.cpp (the setters and SetAllState)
//
// The pipeline description a draw resolves, and the fourth piece of the
// immediate-draw route.
//
// WHAT CARBON DOES. Its backend does not assemble a pipeline per draw. The
// setters describe one incrementally and mark it dirty
// (`Tr2RenderContextDx12.cpp:315-338`: each compares before dirtying, so a
// redundant apply costs nothing), and the draw resolves it:
//
//     m_psoDescription.UpdateHash();                                  // cpp:793
//     auto found = m_ownerDevice->m_pipelineStates.find( m_psoDescription );
//     if( found != end ) return found->second;
//     m_psoDescription.CreatePipelineState( device, pipelineState );
//     m_ownerDevice->m_pipelineStates[ m_psoDescription ] = pipelineState;
//
// THE CACHE IS ON THE DEVICE, NOT THE CONTEXT (`Tr2PrimaryRenderContextDx12.h:319`),
// which is why two contexts drawing the same material share one pipeline. Ours
// is `CjsWebgpuPipelineCache`, already on `CjsWebgpuDevice` and already serving
// the batch path - this describes, and hands the description to that.
//
// Carbon's fields, and where each lives here:
//
//   m_vertexLayout        -> vertexBufferLayouts, from the bound layout
//   m_shaderProgram       -> shaderProgram, a CjsWebgpuShaderProgramAL
//   m_topologyType        -> topology, mapped through the AL's own table
//   m_blendDesc           }
//   m_rasterizerDesc      }  all three -> renderStateSetup + overrides, which
//   m_depthStencilDesc    }  `GetWebgpuRecipe` projects. WebGPU folds state into
//                            a pipeline at creation, so the three descriptors
//                            are one projection rather than three structs.
//   m_renderTargetFormats -> colorFormats
//   m_depthStencilFormat  -> depthFormat
//   m_sampleDesc          -> sampleCount
//   m_vertexStreamMask    -> derived from vertexBufferLayouts
//
// THE PROJECTION IS NOT REIMPLEMENTED HERE. `Tr2RenderStateSetup.GetWebgpuRecipe`
// already turns an interpreted setup into WebGPU state, applies the render-state
// overrides while doing it, and refuses a fill mode WebGPU cannot rasterize. A
// second translator is the mistake this whole lane exists to undo.
//
// THE KEY IS DX12'S (`PsoDescription.cpp:68-71`, `:136-150`): `UpdateHash`
// writes the description into a block of integers - Carbon's hashable block,
// `m_topologyType` through `m_sampleDesc`, plus the program and vertex-layout
// pointers - and hashes it with `CcpHashFNV1`; the cache compares the block
// itself on a hash hit, Carbon's `operator==`, so a collision cannot alias two
// pipelines. Nothing is allocated to key a draw.
import { CjsSchema } from "#schema";
import { CARBON_BACKEND_COVERAGE_DISCARD_OVERRIDE, CARBON_BACKEND_UNORM_TARGET_OVERRIDE } from "#resource/format";
import { ccpHashFnv1, identityOf } from "#utils/hash";
import { TOPOLOGIES } from "./topology.js";

/** Carbon's `m_renderTargetFormats[MAX_RENDER_TARGET]`. */
const MAX_COLOR_TARGETS = 8;

/** Vertex stream slots the block keeps a stride for (WebGPU allows 8 buffers). */
export const MAX_VERTEX_STREAMS = 16;

// The hashable block's slots.
const SLOT_PROGRAM = 0;
const SLOT_VERTEX_LAYOUT = 1;
const SLOT_TOPOLOGY = 2;
const SLOT_RENDER_STATE = 3;
const SLOT_OVERRIDES = 4;
const SLOT_COLOR_FORMATS = 5;
const SLOT_DEPTH_FORMAT = SLOT_COLOR_FORMATS + MAX_COLOR_TARGETS;
const SLOT_SAMPLE_COUNT = SLOT_DEPTH_FORMAT + 1;
const SLOT_UNORM_TARGETS = SLOT_SAMPLE_COUNT + 1;
const SLOT_UNCLIPPED_DEPTH = SLOT_UNORM_TARGETS + 1;
const SLOT_COVERAGE_DISCARD = SLOT_UNCLIPPED_DEPTH + 1;
const SLOT_STRIP_INDEX_FORMAT = SLOT_COVERAGE_DISCARD + 1;
const SLOT_STREAM_MASK = SLOT_STRIP_INDEX_FORMAT + 1;
const SLOT_STREAM_STRIDES = SLOT_STREAM_MASK + 1;
const BLOCK_SIZE = SLOT_STREAM_STRIDES + MAX_VERTEX_STREAMS;

/** WebGPU format strings as small integers; 0 is "none". */
const formatIds = new Map();

/** Interned render-state content: `Tr2RenderStateSetup.Key()` to an integer. */
const setupContentIds = new Map();

/** Each setup's content id, computed once per setup object. */
const setupIds = new WeakMap();

/** Each vertex layout's stream mask, computed once per layout object. */
const streamMasks = new WeakMap();

/** A format's integer id; null is 0. */
function FormatId(format)
{
  if (!format) return 0;

  let id = formatIds.get(format);

  if (id === undefined)
  {
    id = formatIds.size + 1;
    formatIds.set(format, id);
  }

  return id;
}

/**
 * A setup's CONTENT id, as DX12's block holds the resolved blend, rasterizer
 * and depth descriptors rather than a pointer to where they came from. Setups
 * are interpreted once and not changed after (registerRenderStateSetup,
 * Tr2RenderStateSetup.Overlay), so the id is taken once per setup object.
 */
function SetupId(setup)
{
  let id = setupIds.get(setup);

  if (id === undefined)
  {
    const key = setup.Key();

    id = setupContentIds.get(key);

    if (id === undefined)
    {
      id = setupContentIds.size + 1;
      setupContentIds.set(key, id);
    }

    setupIds.set(setup, id);
  }

  return id;
}

/** Carbon's `m_vertexStreamMask`: the streams a layout's elements read. */
function StreamMask(layout)
{
  if (!layout) return 0;

  let mask = streamMasks.get(layout);

  if (mask === undefined)
  {
    mask = 0;
    for (const element of layout.GetDefinition() ?? []) mask |= 1 << (element.stream ?? 0);
    streamMasks.set(layout, mask);
  }

  return mask;
}


/**
 * A pipeline description, filled by the abstraction layer's setters.
 *
 * Carbon's `PSODescription` is a plain struct with an `operator==` and a hash;
 * this is the same: `UpdateHash` and `BlockEquals`.
 */
export class CjsWebgpuPsoDescription
{
  /** m_shaderProgram */
  shaderProgram = null;

  /** m_vertexLayout: the bound declaration, keyed by identity as Carbon keys the pointer. */
  vertexLayout = null;

  /**
   * The bound stride per vertex stream. On WebGPU the stride is part of the
   * pipeline, as it is part of Metal's vertex-descriptor hash
   * (`MetalWorkQueue.mm:1512-1531`); only the streams the layout reads are keyed.
   */
  streamStrides = new Uint32Array(MAX_VERTEX_STREAMS);

  /**
   * The layout's WebGPU buffer layouts, built from the layout, the program's
   * inputs and the strides. Needed only to create a pipeline, so the context
   * builds it on a cache miss.
   */
  vertexBufferLayouts = [];

  /** m_topologyType, in the abstraction layer's vocabulary. */
  topology = null;

  /** The authored state, projected at resolve time. */
  renderStateSetup = null;

  /** The state manager's overrides, applied by the projection. */
  renderStateOverrides = null;

  /** m_renderTargetFormats[MAX_RENDER_TARGET] */
  colorFormats = [];

  /** m_depthStencilFormat; null means no depth attachment. */
  depthFormat = null;

  /** m_sampleDesc, reduced to the one field WebGPU exposes. */
  sampleCount = 1;

  /**
   * Per colour slot, whether the bound target is a float stand-in for a
   * 16-bit UNORM format (CjsWebgpuTextureAL.IsUnormSubstitute).
   */
  unormTargets = [];

  /**
   * RS_DEPTH_CLIP_ENABLE off, where the device can honour it: WebGPU's
   * `primitive.unclippedDepth`, behind the depth-clip-control feature. Carbon
   * turns depth clip off to draw its shadow cascades (EveSpaceScene.cpp:748).
   */
  unclippedDepth = false;

  /**
   * The coverage-discard mode (CARBON_BACKEND_COVERAGE_DISCARD_OVERRIDE): 0
   * off, 1 alpha, 2 colour. Set only by the depth-of-field layer pass; not
   * Carbon.
   */
  coverageDiscard = 0;

  /**
   * `primitive.stripIndexFormat` for an indexed strip, or null. WebGPU bakes
   * the index format into a strip pipeline; nothing else carries it.
   */
  stripIndexFormat = null;

  /** Carbon's `m_hash`, as the last `UpdateHash` left it. */
  hash = 0;

  /** The hashable block `UpdateHash` fills. */
  _block = new Uint32Array(BLOCK_SIZE);

  /** The same block as bytes, for `CcpHashFNV1`. */
  _blockBytes = new Uint8Array(this._block.buffer);

  /**
   * Whether the description names everything a pipeline needs.
   *
   * Carbon's `GetPipelineState` returns null and `SetAllState` fails
   * (`cpp:847-851`) rather than creating a partial pipeline; this is the same
   * check, made before the attempt so the caller can say what is missing.
   *
   * @returns {string|null} What is missing, or null when complete.
   */
  GetMissing()
  {
    if (!this.shaderProgram || !this.shaderProgram.IsValid()) return "a linked shader program";
    if (!this.renderStateSetup) return "a render-state setup";
    if (this.topology === null || TOPOLOGIES[this.topology] === undefined) return "a topology WebGPU can draw";
    if (this.colorFormats.length === 0 && this.depthFormat === null) return "a colour or depth attachment";

    return null;
  }

  /**
   * The WebGPU pipeline descriptor this description resolves to.
   *
   * Carbon's `CreatePipelineState` builds a `D3D12_GRAPHICS_PIPELINE_STATE_DESC`
   * from the same fields. Ours produces the recipe shape the device's pipeline
   * factory already takes from the batch path, so both paths create pipelines
   * the same way.
   *
   * @returns {object} The recipe.
   */
  BuildRecipe()
  {
    const projected = this.renderStateSetup.GetWebgpuRecipe({
      depthFormat: this.depthFormat,
      invertedDepthTest: !!this.renderStateOverrides?.invertedDepthTest,
      invertedCullMode: !!this.renderStateOverrides?.invertedCullMode
    });

    // The authored blend and colour write mask are the projection's `target`
    // (Tr2RenderStateSetup.GetWebgpuRecipe); each colour target carries them,
    // as D3D11's non-independent blend gives every RTV RenderTarget[0]'s state
    // (Tr2RenderContextDx11.cpp:784-785).
    const { target, ...state } = projected;

    // A BOUND TARGET THE PIXEL SHADER DOES NOT WRITE gets writeMask 0 and no
    // blend. D3D11 leaves such an RTV untouched; WebGPU rejects the pipeline
    // unless its mask is 0. That is what lets the velocity target stay bound at
    // slot 1 through opaque draws whose shaders never output SV_Target1.
    const outputs = typeof this.shaderProgram.GetFragmentOutputs === "function"
      ? this.shaderProgram.GetFragmentOutputs()
      : null;
    const colourTarget = (format, index) =>
    {
      if (!format) return null;
      if (outputs && !outputs.includes(index)) return { format, writeMask: 0 };
      return { format, ...target };
    };

    // A FLOAT STAND-IN FOR A UNORM TARGET stores what UNORM would: the
    // shader's per-target override clamps the output to [0, 1] and makes NaN 0,
    // as D3D does writing to UNORM. TAA's R16G16B16A16_UNORM history kept a
    // NaN forever without it. Only overrides the module declares may be set.
    const overrides = typeof this.shaderProgram.GetUnormTargetOverrides === "function"
      ? this.shaderProgram.GetUnormTargetOverrides()
      : [];
    const constants = {};

    for (const location of overrides)
    {
      if (this.unormTargets[location]) constants[`${CARBON_BACKEND_UNORM_TARGET_OVERRIDE}${location}`] = 1;
    }

    if (this.coverageDiscard && typeof this.shaderProgram.HasCoverageDiscardOverride === "function"
      && this.shaderProgram.HasCoverageDiscardOverride())
    {
      constants[CARBON_BACKEND_COVERAGE_DISCARD_OVERRIDE] = this.coverageDiscard;
    }

    return {
      ...state,
      primitive: {
        ...projected.primitive,
        topology: TOPOLOGIES[this.topology],
        ...(this.stripIndexFormat ? { stripIndexFormat: this.stripIndexFormat } : {}),
        ...(this.unclippedDepth ? { unclippedDepth: true } : {})
      },
      vertex: { buffers: this.vertexBufferLayouts },
      fragment: {
        // An unbound slot between bound ones is a null target, as it is a null
        // colour attachment in the pass.
        targets: this.colorFormats.map(colourTarget),
        ...(Object.keys(constants).length ? { constants } : {})
      },
      multisample: { count: this.sampleCount }
    };
  }

  /**
   * Carbon's `UpdateHash` (`PsoDescription.cpp:136-141`): writes the hashable
   * block and hashes it.
   *
   * Every input `BuildRecipe` reads is in the block, directly or through what
   * determines it: the program and vertex layout by identity, as Carbon keys
   * their pointers; the render-state setup by content, as Carbon's block holds
   * the resolved descriptors; `vertexBufferLayouts` through the layout, the
   * program and the strides of the streams the layout reads.
   *
   * Adapted: JavaScript has no addresses, so program and layout identities are
   * the interned integers of `identityOf`, and formats are interned integers
   * rather than Carbon's PixelFormat values. The strip index format, UNORM
   * bits, unclipped depth and coverage discard are WebGPU pipeline inputs
   * Carbon's block has no slot for.
   *
   * @returns {number} The hash, also kept as `hash`.
   */
  UpdateHash()
  {
    const block = this._block;
    const overrides = this.renderStateOverrides;

    block.fill(0);
    block[SLOT_PROGRAM] = identityOf(this.shaderProgram);
    block[SLOT_VERTEX_LAYOUT] = identityOf(this.vertexLayout);
    block[SLOT_TOPOLOGY] = this.topology ?? 0xffffffff;
    block[SLOT_RENDER_STATE] = this.renderStateSetup ? SetupId(this.renderStateSetup) : 0;
    block[SLOT_OVERRIDES] = overrides ? (overrides.invertedDepthTest ? 1 : 0) | (overrides.invertedCullMode ? 2 : 0) : 0;

    for (let slot = 0; slot < MAX_COLOR_TARGETS && slot < this.colorFormats.length; slot++)
    {
      block[SLOT_COLOR_FORMATS + slot] = FormatId(this.colorFormats[slot]);
      if (this.unormTargets[slot]) block[SLOT_UNORM_TARGETS] |= 1 << slot;
    }

    block[SLOT_DEPTH_FORMAT] = FormatId(this.depthFormat);
    block[SLOT_SAMPLE_COUNT] = this.sampleCount;
    block[SLOT_UNCLIPPED_DEPTH] = this.unclippedDepth ? 1 : 0;
    block[SLOT_COVERAGE_DISCARD] = this.coverageDiscard;
    block[SLOT_STRIP_INDEX_FORMAT] = FormatId(this.stripIndexFormat);

    const mask = StreamMask(this.vertexLayout);

    block[SLOT_STREAM_MASK] = mask;

    for (let stream = 0; stream < MAX_VERTEX_STREAMS; stream++)
    {
      if (mask & (1 << stream)) block[SLOT_STREAM_STRIDES + stream] = this.streamStrides[stream];
    }

    this.hash = ccpHashFnv1(this._blockBytes);

    return this.hash;
  }

  /**
   * Carbon's `operator==` (`PsoDescription.cpp:68-71`) against a block a cache
   * entry kept: element by element, so equal hashes alone never match.
   *
   * @param {Uint32Array} block A block from `CopyBlock`.
   * @returns {boolean} Whether this description's last `UpdateHash` wrote the same block.
   */
  BlockEquals(block)
  {
    const own = this._block;

    for (let index = 0; index < own.length; index++)
    {
      if (own[index] !== block[index]) return false;
    }

    return true;
  }

  /**
   * A copy of the block, for a cache entry to compare against later.
   *
   * @returns {Uint32Array} The copy.
   */
  CopyBlock()
  {
    return this._block.slice(); // alloc: kept by the cache entry
  }

  /**
   * The cache key: the hash, or null when the description is incomplete.
   *
   * @returns {number|null} The key.
   */
  GetKey()
  {
    if (this.GetMissing()) return null;

    return this.UpdateHash();
  }

  /**
   * Whether two descriptions resolve to the same pipeline: both complete, and
   * their blocks equal.
   *
   * @param {CjsWebgpuPsoDescription} other The description to compare.
   * @returns {boolean} True when both are complete and equal.
   */
  Equals(other)
  {
    if (!other || this.GetKey() === null || other.GetKey() === null) return false;

    return other.BlockEquals(this._block);
  }
}


// DECLARED AS A CALL, NOT A DECORATOR. The abstraction layer is imported
// straight from source by its tests - `#trinityal/...` resolves to `src/` - and
// raw Node cannot parse decorator syntax, so a decorator here breaks every test
// that reaches this file without a build first. `CjsSchema.define` is the same
// metadata through the door the schema already provides for exactly this, and
// it keeps the layer free of the decorator chain it has never carried.
CjsSchema.define(CjsWebgpuPsoDescription, { className: "CjsWebgpuPsoDescription", carbon: "PSODescription" });
