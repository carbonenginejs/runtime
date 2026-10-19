// Source: trinity/trinity/Shader/Tr2EffectStateManager.h
import { meta, type, blue } from "#schema";
import { Tr2BufferAL } from "../../trinityal/Tr2BufferAL/index.js";
import { Tr2VertexLayoutAL } from "../../trinityal/Tr2VertexLayoutAL/index.js";
import { Tr2ShaderAL } from "../../trinityal/Tr2ShaderAL/index.js";
import { Tr2ShaderProgramAL } from "../../trinityal/Tr2ShaderProgramAL/index.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
//
// STILL INCOMPLETE, and not finished-by-design - but much less so than this
// note used to claim, and the claim was left standing long after it stopped
// being true. Implemented: the registration half (registerShader,
// registerShaderProgram, registerRenderStateSetup, getVertexDeclarationHandle),
// the m_currentValues redundancy cache, ApplyShaderProgram, ApplyRenderStates,
// ApplyVertexDeclaration, ApplyStandardStates, ApplyStreamSource,
// ApplyIndexBuffer, and the viewport and render-target families.
//
// Still absent: RegisterShaderProgramOverride, which costs the pixel-shader
// override path, and DoApplyRenderStates, which is where a state handle turns
// into the AL's SetRenderStates.
//
// This class declares no @carbon.method, so the parity audit cannot see it:
// an entirely unimplemented class reports clean. Do not read a green audit as
// evidence that this file is finished.

import { RenderingMode, TriStorageFlags } from "#consts/graphics";
import {
  BlendMode,
  BlendOperation,
  CompareFunc,
  CullMode,
  FillMode,
  RenderState
} from "#consts/render-context";
import { Tr2VertexDefinition } from "../core/vertex/Tr2VertexDefinition/index.js";
import { Tr2RenderStateSetup } from "#resource/shader";
import { Failed } from "../../trinityal/ALResult.js";
import { Tr2VariableStore } from "../core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../generated/trinityCore/enums.js";

// Carbon's tables are file-scope statics shared across every state manager
// (Tr2EffectStateManager.cpp:17-27, "These are shared across managers."). Ours
// are module-scope for the same reason: a handle must mean the same thing to
// every consumer that compares one.
//
// The rows hold IDENTITY ONLY. Carbon's row is the Tr2ShaderAL itself, which it
// can do because its abstraction layer is compile-time selected and sits below
// Trinity in one binary. Ours is a sibling layer, so the engine keeps its own
// handle-to-object map and Trinity never has a field a device object could
// occupy. Same indirection, boundary drawn at our layering.

// Carbon's UNKNOWN (.h:56), module scope so the reset factory can reach it.
const UNKNOWN = 0xFFFFFFFF;

// Carbon's VERTEX_STREAM_MAX_COUNT (.h:55).
const VERTEX_STREAM_MAX_COUNT = 4;

/**
 * A reset redundancy cache (`CurrentValues::Reset`, cpp:415-431).
 *
 * Every handle starts UNKNOWN rather than zero, because zero is a VALID handle
 * - it is RM_ANY's empty render-state setup and the first interned program -
 * so a zeroed cache would filter out the very first bind of a span.
 */
function NewCurrentValues()
{
  const streams = [];

  for (let i = 0; i < VERTEX_STREAM_MAX_COUNT; i++)
  {
    streams.push({ vertexBuffer: null, offset: UNKNOWN, stride: UNKNOWN });
  }

  return {
    shaderProgram: UNKNOWN,
    vertexDeclaration: UNKNOWN,
    streams,
    indexBuffer: null,
    indexStride: 0,
    renderingMode: UNKNOWN,
    renderStateSetup: UNKNOWN
  };
}

/** Registered shader identities; the index is the handle. */
const shaders = [];

/** Registered shader programs; the index is the handle. */
const shaderPrograms = [];

// Carbon s_vertexLayoutMap (Tr2EffectStateManager.cpp:863-877): file-scope,
// mutex-guarded pairs of (Tr2VertexDefinition, Tr2VertexLayoutAL*), appended on
// first sight, linear-scanned by the definition's own operator==. Ours holds
// the definition identity only - the layout half of Carbon's pair is a device
// object, and per the layering note above the engine keeps its own
// handle-to-object map (ApplyVertexDeclaration's lazy hvl.Create at cpp:895-903
// happens on that side of the boundary). Single-threaded JS needs no mutex.

/** Interned vertex declarations; the index is the handle. */
const vertexLayouts = [];

/**
 * Realized layouts per context, per handle.
 *
 * Carbon stores the created Tr2VertexLayoutAL beside the definition in its own
 * intern table, because one backend is compiled. Ours must key by CONTEXT too:
 * the table is module-level and shared, and a layout made by one backend must
 * never be handed to another. A WeakMap so a dead context takes its layouts.
 */
const vertexLayoutObjects = new WeakMap();

/** Realized shader programs per context, per handle; see vertexLayoutObjects. */
const shaderProgramObjects = new WeakMap();

/**
 * Realized shader stages per context, per shader handle; see vertexLayoutObjects.
 *
 * Carbon's `s_shaders` row holds the one created `Tr2ShaderAL` for a
 * registration (cpp:500-512), and every program that links the handle copies
 * that value (`args[i] = *s_shaders[shaders[i]]`, cpp:562). Keeping the stage
 * here, rather than one per program, is what lets the release reach it.
 */
const shaderObjects = new WeakMap();

/**
 * Every context's map in `shaderObjects` and in `shaderProgramObjects` that
 * may hold a realized object.
 *
 * The tables are shared and the realized objects are per context (multiple
 * contexts are our extension; Carbon has one table and one backend). Only one
 * backend (WebGPU or WebGL2) exists at a time, never one per context
 * (operator rule), so every context realized its objects on that backend. The
 * static `releaseDeviceResources` truncates the tables, which frees every
 * handle number for the next registration, so it must release the objects
 * every context realized under those numbers - not only the calling
 * context's. A context that kept them answered a reused number with the
 * program realized for the old registration. The sets hold the maps, not the
 * contexts, so a context still dies with its WeakMap entries.
 */
const realizedShaderMaps = new Set();
const realizedShaderProgramMaps = new Set();

// Carbon interns once at asset load and stores the handle on the mesh, so its
// linear scan never runs per draw. This runtime has no load hook, so the handle
// is memoised against the element list or definition a payload already owns -
// same cost profile, no payload mutation, and it lapses with the payload.
const vertexLayoutHandles = new WeakMap();

// Carbon's built-in rendering-mode state lists, ported pair for pair from
// Tr2EffectStateManager.cpp:29-393. A mode's list occupies the render-state
// handle equal to its own enum value, which is why the table below is indexed
// by RenderingMode and why registration begins after RM_COUNT.
//
// These are the base layer of every draw. Carbon re-applies the current mode's
// list immediately before a pass's own states, every time
// (Tr2EffectStateManager.cpp:716), so a pass that authors only a blend mode
// still gets this mode's depth, cull and colour-write. Reading a pass's states
// alone yields a pipeline missing most of its state.
//
// RM_ANY is deliberately empty: it means "the caller does not care", not "no
// state", and Carbon leaves whatever was last applied in place.
const { RS_CULLMODE, RS_FILLMODE, RS_ALPHABLENDENABLE, RS_ALPHATESTENABLE, RS_ALPHAFUNC,
  RS_ALPHAREF, RS_ZENABLE, RS_ZWRITEENABLE, RS_ZFUNC, RS_COLORWRITEENABLE, RS_DEPTHBIAS,
  RS_SLOPESCALEDEPTHBIAS, RS_SEPARATEALPHABLENDENABLE, RS_SRCBLEND, RS_DESTBLEND, RS_BLENDOP,
  RS_BLENDOPALPHA, RS_SRCBLENDALPHA, RS_DESTBLENDALPHA } = RenderState;

const { CULLMODE_CW, CULLMODE_NONE } = CullMode;
const { FM_SOLID } = FillMode;
const { CMP_LESSEQUAL, CMP_GREATER, CMP_ALWAYS, CMP_EQUAL } = CompareFunc;
const { BM_ONE, BM_SRCALPHA, BM_INVSRCALPHA } = BlendMode;
const { BO_ADD } = BlendOperation;

const ALL_CHANNELS = 0x0f;
const RGB_CHANNELS = 0x7;
const FALSE = 0;
const TRUE = 1;

/** Indexed by RenderingMode; the index IS the render-state handle. */
const STANDARD_MODE_PAIRS = Object.freeze([
  // RM_ANY
  [],
  // RM_OPAQUE
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, FALSE,
    RS_ALPHATESTENABLE, FALSE, RS_ZENABLE, TRUE, RS_ZWRITEENABLE, TRUE,
    RS_ZFUNC, CMP_LESSEQUAL, RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0, RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_DECAL
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, FALSE,
    RS_ALPHATESTENABLE, TRUE, RS_ALPHAFUNC, CMP_GREATER, RS_ALPHAREF, 127,
    RS_ZENABLE, TRUE, RS_ZWRITEENABLE, TRUE, RS_ZFUNC, CMP_LESSEQUAL,
    RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0, RS_SLOPESCALEDEPTHBIAS, 0,
    RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_DECAL_NO_DEPTH
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, FALSE,
    RS_ALPHATESTENABLE, TRUE, RS_ALPHAFUNC, CMP_GREATER, RS_ALPHAREF, 127,
    RS_ZENABLE, TRUE, RS_ZWRITEENABLE, FALSE, RS_ZFUNC, CMP_LESSEQUAL,
    RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0, RS_SLOPESCALEDEPTHBIAS, 0,
    RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_ALPHA
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, TRUE,
    RS_SRCBLEND, BM_SRCALPHA, RS_DESTBLEND, BM_INVSRCALPHA, RS_BLENDOP, BO_ADD,
    RS_ZENABLE, TRUE, RS_ZWRITEENABLE, FALSE, RS_ZFUNC, CMP_LESSEQUAL,
    RS_ALPHATESTENABLE, FALSE, RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0, RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_ALPHA_ADDITIVE - note the colour write is RGB only, alpha is left alone.
  [ RS_FILLMODE, FM_SOLID, RS_CULLMODE, CULLMODE_NONE, RS_ALPHABLENDENABLE, TRUE,
    RS_SRCBLEND, BM_ONE, RS_DESTBLEND, BM_ONE, RS_BLENDOP, BO_ADD,
    RS_ZENABLE, TRUE, RS_ZWRITEENABLE, FALSE, RS_ZFUNC, CMP_LESSEQUAL,
    RS_ALPHATESTENABLE, FALSE, RS_COLORWRITEENABLE, RGB_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0, RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_DEPTH_ONLY - writes depth and no colour at all.
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, FALSE,
    RS_ALPHATESTENABLE, FALSE, RS_ZENABLE, TRUE, RS_ZWRITEENABLE, TRUE,
    RS_ZFUNC, CMP_LESSEQUAL, RS_COLORWRITEENABLE, 0, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0, RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_PICKING
  [ RS_CULLMODE, CULLMODE_CW, RS_ALPHABLENDENABLE, FALSE, RS_ALPHATESTENABLE, FALSE,
    RS_ZENABLE, TRUE, RS_ZWRITEENABLE, TRUE, RS_ZFUNC, CMP_LESSEQUAL,
    RS_FILLMODE, FM_SOLID, RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0, RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_FULLSCREEN - no depth at all, and Carbon authors no separate-alpha pair.
  [ RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, FALSE, RS_ALPHATESTENABLE, FALSE,
    RS_CULLMODE, CULLMODE_NONE, RS_ZENABLE, FALSE, RS_ZWRITEENABLE, FALSE,
    RS_ZFUNC, CMP_ALWAYS, RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0 ],
  // RM_SPRITE2D - Carbon writes RS_CULLMODE twice; the second wins, so the
  // effective cull is NONE. Kept verbatim rather than tidied.
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, TRUE,
    RS_SRCBLEND, BM_ONE, RS_DESTBLEND, BM_INVSRCALPHA, RS_BLENDOP, BO_ADD,
    RS_ALPHATESTENABLE, FALSE, RS_CULLMODE, CULLMODE_NONE, RS_ZENABLE, FALSE,
    RS_ZWRITEENABLE, FALSE, RS_ZFUNC, CMP_ALWAYS, RS_COLORWRITEENABLE, ALL_CHANNELS,
    RS_DEPTHBIAS, 0, RS_SLOPESCALEDEPTHBIAS, 0, RS_SEPARATEALPHABLENDENABLE, FALSE ],
  // RM_CULL - the one-state mode, cull only.
  [ RS_CULLMODE, CULLMODE_CW ],
  // RM_LIGHT - the only mode authoring separate alpha blending. Carbon repeats
  // RS_SLOPESCALEDEPTHBIAS; harmless and kept.
  [ RS_FILLMODE, FM_SOLID, RS_CULLMODE, CULLMODE_NONE, RS_ALPHABLENDENABLE, TRUE,
    RS_SRCBLEND, BM_ONE, RS_DESTBLEND, BM_ONE, RS_BLENDOP, BO_ADD,
    RS_ZWRITEENABLE, FALSE, RS_ZFUNC, CMP_LESSEQUAL, RS_ZENABLE, TRUE,
    RS_ALPHATESTENABLE, FALSE, RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0, RS_SLOPESCALEDEPTHBIAS, 0,
    RS_SEPARATEALPHABLENDENABLE, TRUE, RS_BLENDOPALPHA, BO_ADD,
    RS_SRCBLENDALPHA, BM_ONE, RS_DESTBLENDALPHA, BM_ONE ],
  // RM_ERASE - always passes depth and rewrites it.
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, FALSE,
    RS_ALPHATESTENABLE, FALSE, RS_ZENABLE, TRUE, RS_ZWRITEENABLE, TRUE,
    RS_ZFUNC, CMP_ALWAYS, RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0 ],
  // RM_PREPASS_COLOR - tests equal against the prepass depth and never writes.
  [ RS_CULLMODE, CULLMODE_CW, RS_FILLMODE, FM_SOLID, RS_ALPHABLENDENABLE, FALSE,
    RS_ALPHATESTENABLE, FALSE, RS_ZENABLE, TRUE, RS_ZWRITEENABLE, FALSE,
    RS_ZFUNC, CMP_EQUAL, RS_COLORWRITEENABLE, ALL_CHANNELS, RS_DEPTHBIAS, 0,
    RS_SLOPESCALEDEPTHBIAS, 0, RS_SEPARATEALPHABLENDENABLE, FALSE ]
].map(pairs => Object.freeze(pairs)));


// Carbon seeds this table with RM_COUNT built-in rendering-mode setups, so
// handle `i` IS mode `i` for i < RM_COUNT (Tr2EffectStateManager.cpp:397-410),
// and truncates back to them on device loss rather than emptying (:1012).
// The mode state lists are not ported yet, so the slots are reserved rather
// than filled: reserving now keeps every later handle stable when they land.
// Slot 0 carries RM_ANY's genuinely empty list, which is what makes an
// unauthored setup intern to 0 exactly as Carbon's does.
const renderStateSetups = STANDARD_MODE_PAIRS.map(keyValues => ({
  keyValues,
  setup: Tr2RenderStateSetup.fromKeyValues(keyValues)
}));

/**
 * Whether two byte sequences are identical.
 *
 * Carbon compares size then `memcmp` over the whole body
 * (Tr2EffectStateManager.cpp:487-491) - never by pointer, so two identical
 * bodies read from different offsets still collapse to one entry.
 *
 * @param {Uint8Array} first Left bytes.
 * @param {Uint8Array} second Right bytes.
 * @returns {boolean} Whether the bytes match.
 */
function isSameBytecode(first, second)
{
  if (first === second) return true;
  if (!first || !second || first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1)
  {
    if (first[index] !== second[index]) return false;
  }
  return true;
}

/**
 * A canonical key for a stage's static sampler signature.
 *
 * Carbon compares `signature.samplers` and nothing else
 * (Tr2EffectStateManager.cpp:493). Registers, pipeline inputs and thread-group
 * size deliberately do not participate, which is why two effects sharing
 * bytecode but declaring different registers collapse to one entry and the
 * second signature is discarded. That is Carbon's behaviour, reproduced.
 *
 * @param {Map|null} samplers Sampler setup map keyed by register index.
 * @returns {string} Canonical identity.
 */
/**
 * A canonical key for the backend block riding a stage's signature: FNV-1a over
 * its bytes, so two passes with the same bytecode and different blocks intern
 * as two shaders.
 *
 * @param {object|null} block `{ bytes, size }`, or nothing.
 * @returns {string} The key; empty for no block.
 */
function backendBlockKey(block)
{
  const bytes = block?.bytes;

  if (!bytes || !bytes.length) return "";

  let hash = 0x811c9dc5;

  for (let index = 0; index < bytes.length; index += 1)
  {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `${bytes.length}:${hash.toString(16)}`;
}

function samplerSignatureKey(samplers)
{
  if (!samplers || typeof samplers.entries !== "function") return "[]";
  const entries = [ ...samplers.entries() ]
    .map(([ register, setup ]) => [
      Number(register),
      // Carbon compares the setups themselves (Tr2EffectStateManager.cpp:490); their own fields are the key.
      setup ?? null
    ])
    .sort((left, right) => left[0] - right[0]);
  return JSON.stringify(entries);
}

function failState(message)
{
  const error = new Error(`Tr2EffectStateManager: ${message}`);
  error.code = "CJS_EFFECT_STATE_INVALID";
  throw error;
}

/** Tracks the portable render, stream, buffer, viewport, and override state used while applying an effect, owns the process-wide shader, shader-program and render-state registration tables its handle fields index, and filters redundant binds out of the Apply* surface that carries those handles to the abstraction layer. */
@blue.define("Tr2EffectStateManager")
export class Tr2EffectStateManager
{

  /** m_renderContext (Tr2RenderContext&) */
  @type.rawStruct("Tr2RenderContext")
  renderContext = null;

  /** m_perObjectConstantBuffers (Tr2ConstantBufferAL) */
  @type.array({ kind: "rawStruct", className: "Tr2ConstantBufferAL" })
  perObjectConstantBuffers = null;

  // Carbon's CurrentValues and RenderStates are PRIVATE nested structs
  // (Tr2EffectStateManager.h:171-206), and nothing serializes a state manager:
  // it is a runtime object, not a resource. The generator had flattened both
  // structs into schema properties, which declared persisted defaults for state
  // that is neither persisted nor reachable from outside. They are private
  // instance fields here, in Carbon's own shape.

  /** m_currentValues - the redundancy cache (.h:193). */
  #currentValues = NewCurrentValues();

  /** m_isManagedRendering (.h:195). */
  #isManagedRendering = false;

  /**
   * m_renderStateOverrides (.h:209), as FLAGS rather than as value tables.
   *
   * Carbon holds an array of `const uint32_t*` indexed by render state, each
   * pointing at a table indexed by the AUTHORED VALUE, and resolves authored
   * pairs through it at apply time (cpp:722-753). It caches the resolved pairs
   * per setup behind a dirty flag because it re-resolves on every draw.
   *
   * Ours cannot use that table: a registered setup is interpreted ONCE at
   * registration into named values, so there are no raw pairs left to index.
   * The equivalent tables live in interpreted space on Tr2RenderStateSetup, and
   * this holds only which of them apply. Carbon's per-setup cache has no
   * counterpart either, and needs none: the projection feeds a pipeline key
   * that already includes the flags' effect, so the two variants are distinct
   * cache entries rather than one entry that must be invalidated.
   *
   * Wireframe (`SetWireframeRendering`, cpp:801-812). Carbon overrides
   * RS_FILLMODE; neither browser backend has a fill mode (no equivalent of
   * `glPolygonMode`), so that render-state route cannot be projected. The
   * operator ruled for LINE TOPOLOGY (route (a), 2026-10-18) over barycentric
   * edges in the fragment shader:
   *
   *   - this flag is stored here and read by `Tr2RenderContext.SubmitGeometry`;
   *   - an indexed triangle-list batch with a geometry source draws TOP_LINES
   *     over its LOD's edge list instead, area (start, count) mapping to
   *     (start * 2, count * 2) (`TriGeometryResAllocations.ResolveWireframeDraw`);
   *   - the edge list is built lazily from the retained CPU indices on the
   *     first wireframe draw, allocated in the shared geometry buffer, and
   *     freed with the LOD's other allocations by `TriGeometryRes.ReleasePayload`;
   *   - a LOD with no CPU indices logs once and draws solid.
   *
   * Not covered: batches without a geometry source (line sets, sprites,
   * particles, the debug renderer) draw as they are. Carbon's override also
   * reaches them, through the fill mode.
   */
  #overrides = { invertedDepthTest: false, invertedCullMode: false, wireframe: false };

  /** m_renderTargetWidth (int) */
  @type.int32
  renderTargetWidth = 0;

  /** m_renderTargetHeight (int) */
  @type.int32
  renderTargetHeight = 0;

  /** m_viewport (CTriViewport) */
  @type.rawStruct("CTriViewport")
  viewport = null;

  /** m_viewportOnDevice (Tr2Viewport) */
  @type.rawStruct("Tr2Viewport")
  viewportOnDevice = null;

  /** m_viewportStack (std::list<CTriViewport>) */
  @type.rawStruct("std::list<CTriViewport>")
  viewportStack = null;

  /**
   * m_viewportSizeVar (Tr2Variable), registered by {@link Tr2EffectStateManager#Initialize}
   * (Tr2EffectStateManager.cpp:631-637). Booster depth UVs divide by
   * ViewportSize.xy, so an unregistered variable leaves their
   * non-autoregistered b0 at zero.
   *
   * Adapted: Carbon embeds a Tr2Variable by value; there is no JS Tr2Variable
   * class, so the member is null until Initialize stores the global store's
   * variable.
   */
  @type.rawStruct("Tr2Variable")
  viewportSizeVar = null;

  static RenderingMode = RenderingMode;

  /**
   * Carbon's failure and unset handle (`UNKNOWN`, Tr2EffectStateManager.h:56).
   *
   * The same numeric value is spelled `UNINITIALIZED_DECLARATION` (.h:81) and
   * `Tr2EffectStageInput::INVALID` (Tr2EffectDescription.h:172). It must stay
   * `0xFFFFFFFF` rather than `-1`, or the unsigned range checks below flip
   * sign.
   */
  static Unknown = UNKNOWN;

  /**
   * Bind an empty vertex layout (`NULL_DECLARATION`, .h:82).
   *
   * A meaningful value, not an error, and deliberately distinct from
   * `Unknown` - do not collapse the two.
   */
  static NullDeclaration = 0xFFFFFFFE;

  /**
   * Interns one shader stage's identity and returns its handle.
   *
   * Carbon `RegisterShader` (Tr2EffectStateManager.cpp:466-513) creates the
   * device object here, on the main-thread render context. We register at
   * prepare instead of at read, so this stores identity only and the engine
   * realizes against the handle; see the effect read path decision.
   *
   * Dedupe is Carbon's exactly: stage type, then byte-for-byte body equality,
   * then the static sampler signature. A body registered under a different
   * stage type is a different entry, and so is the same body with different
   * samplers.
   *
   * @param {number} stageType Carbon shader stage type.
   * @param {Uint8Array} bytecode Compiled stage body.
   * @param {object} [signature] Stage signature; only `samplers` participates.
   * @returns {number} Stable handle, or `Unknown` when the body is absent.
   */
  @blue.method
  @meta.renamed("RegisterShader")
  static registerShader(stageType, bytecode, signature = null)
  {
    if (!bytecode || bytecode.length === 0) return Tr2EffectStateManager.Unknown;

    const type = Number(stageType);
    // THE BACKEND BLOCK IS PART OF THE KEY. Carbon dedupes on bytecode and
    // samplers because the signature is derived from the bytecode; ours also
    // carries the pass's per-backend block on the signature, and two passes
    // can share a stage's bytecode while laying its bindings out differently.
    // Keyed on bytecode alone, the second pass compiled against the first
    // pass's block.
    const samplerKey = `${samplerSignatureKey(signature?.samplers)}|${backendBlockKey(signature?.backendBlock)}`;

    for (let handle = 0; handle < shaders.length; handle += 1)
    {
      const existing = shaders[handle];
      if (existing.stageType !== type) continue;
      if (!isSameBytecode(existing.bytecode, bytecode)) continue;
      if (existing.samplerKey !== samplerKey) continue;
      return handle;
    }

    // THE SIGNATURE IS KEPT, not just its sampler key. The key is the identity
    // half - two shaders with the same bytecode and different sampler bindings
    // are different shaders - but the signature itself is what a backend needs
    // to create a shader object, and dropping it here made the row unable to
    // produce one. Carbon does not face this: its row holds the created
    // Tr2ShaderAL, which carries the signature already.
    return shaders.push({ stageType: type, bytecode, samplerKey, signature }) - 1;
  }

  /**
   * Interns a program over already-registered stage handles.
   *
   * Carbon `RegisterShaderProgram` (Tr2EffectStateManager.cpp:545-579). The key
   * is the exact ordered handle list, so it is length- and order-sensitive:
   * `[vs, ps]` and `[ps, vs]` are two programs. Carbon's caller fills the array
   * in the effect file's stage order, not by stage type.
   *
   * @param {number[]} shaderHandles Handles from `registerShader`.
   * @returns {number} Stable handle, or `Unknown` for an empty or stale list.
   */
  @blue.method
  @meta.renamed("RegisterShaderProgram")
  static registerShaderProgram(shaderHandles)
  {
    const handles = [ ...(shaderHandles ?? []) ].map(Number);
    if (handles.length === 0) return Tr2EffectStateManager.Unknown;
    // An out-of-range member also catches Unknown and INVALID, because both are
    // 0xFFFFFFFF and every table check is a range check rather than a sentinel
    // comparison (Tr2EffectStateManager.cpp:558-561).
    if (handles.some(handle => !(handle >= 0 && handle < shaders.length)))
    {
      return Tr2EffectStateManager.Unknown;
    }

    for (let handle = 0; handle < shaderPrograms.length; handle += 1)
    {
      const existing = shaderPrograms[handle].shaderHandles;
      if (existing.length !== handles.length) continue;
      if (existing.every((value, index) => value === handles[index])) return handle;
    }

    return shaderPrograms.push({ shaderHandles: handles }) - 1;
  }

  /**
   * Interns a pass's authored render states and returns its handle.
   *
   * Carbon `RegisterRenderStateSetup` (Tr2EffectStateManager.cpp:442-464) keys
   * on the authored pairs flattened in render-state order, which its
   * `std::map` gives it for free. We sort explicitly and collapse duplicate
   * ids the same way.
   *
   * Keyed on the AUTHORED pairs rather than on the interpreted
   * `Tr2RenderStateSetup.Key()`, so handles match Carbon's numbering: a pass
   * that authors a state at its default value is a distinct setup there even
   * though it draws identically.
   *
   * @param {object} pass Reflected pass carrying `renderStateValues`.
   * @returns {number} Stable handle. This one never fails.
   */
  @blue.method
  @meta.renamed("RegisterRenderStateSetup")
  static registerRenderStateSetup(pass)
  {
    const authored = new Map();
    for (const entry of pass?.renderStateValues ?? [])
    {
      authored.set(Number(entry.state), Number(entry.value));
    }

    const keyValues = [ ...authored.entries() ]
      .sort((left, right) => left[0] - right[0])
      .flat();

    for (let handle = 0; handle < renderStateSetups.length; handle += 1)
    {
      const existing = renderStateSetups[handle].keyValues;
      if (existing === null || existing.length !== keyValues.length) continue;
      if (existing.every((value, index) => value === keyValues[index])) return handle;
    }

    return renderStateSetups.push({
      keyValues,
      setup: Tr2RenderStateSetup.fromPass(pass)
    }) - 1;
  }

  /**
   * Stamps every pass of a resolved shader with its registration handles.
   *
   * Carbon does this inside `Tr2EffectDescription::Read`
   * (Tr2EffectDescription.cpp:587-666), because there the shader body and the
   * registration tables are on the same side of the layering. Ours are not:
   * `Tr2Pass` belongs to the resource layer's reflection, and the resource
   * layer may not import Trinity. So the stamp happens at the Trinity boundary
   * instead, on the first rebuild that resolves a shader.
   *
   * That is a timing difference with no behavioural one. Registration interns
   * identity and creates nothing, so it neither needs a device nor makes the
   * reflection graph device-dependent, and interning is idempotent: re-stamping
   * the same shader yields the same handles.
   *
   * Program members are collected in the pass's retained file order, not by
   * stage type, because Carbon indexes its handle array by position while
   * reading (`shaderHandles[stageIx]`, Tr2EffectDescription.cpp:592) and the
   * program key is order-sensitive. `Tr2Pass.stageOrder` exists precisely
   * because that ordering is authored rather than derivable.
   *
   * @param {object} shader Resolved `Tr2Shader`.
   * @returns {object} The same shader, stamped.
   */
  static registerShaderHandles(shader)
  {
    const techniques = shader?.GetEffect()?.techniques ?? [];

    for (const technique of techniques)
    {
      for (const pass of technique?.passes ?? [])
      {
        const stageInputs = pass?.stageInputs ?? [];
        const ordered = pass?.stageOrder?.length
          ? pass.stageOrder
          : stageInputs.map((_, stageType) => stageType).filter(stageType => stageInputs[stageType]?.exists);

        const programMembers = [];

        for (const stageType of ordered)
        {
          const stage = stageInputs[stageType];
          if (!stage?.exists) continue;

          const handle = Tr2EffectStateManager.registerShader(
            stageType,
            stage.sourceProgram?.bytes ?? null,
            stage.signature
          );

          stage.shader = handle;
          programMembers.push(handle);
        }

        pass.shaderProgram = Tr2EffectStateManager.registerShaderProgram(programMembers);
        pass.renderStates = Tr2EffectStateManager.registerRenderStateSetup(pass);
      }
    }

    // Carbon packs the sort key from the handles it has just assigned
    // (Tr2Shader.cpp:235-240); until they exist the key is unavoidably zero.
    shader?.ProcessEffect();

    return shader;
  }

  /**
   * The stable handle for a vertex declaration, interning it on first sight.
   *
   * Carbon `GetVertexDeclarationHandle` (Tr2EffectStateManager.cpp:863-877):
   * linear-scan the intern table for an equal definition, return its index, or
   * append and return the new index. The handle is what a batch carries and
   * what binning and sorting compare.
   *
   * WHY THE TABLE HOLDS A UNION and does not normalise at the door: Carbon's
   * signature admits only Tr2VertexDefinition, so its map is uniform. Ours
   * also interns payload element lists, which speak the PRODUCER's type
   * vocabulary ("Float32" + elementCount, not "FLOAT32_3") and carry no
   * ledger. Wrapping one into a definition would either fabricate ledger
   * values the byte arithmetic cannot derive from those type names, or
   * zero-fill them - and a zero ledger then fails Carbon's own equality
   * (which compares all four slots) against an authored definition with the
   * same items. Storing what arrived keeps interning correct across both
   * producers; isSameDefinition compares the ledger only when both sides
   * carry one. Revisit if CarbonVertexElements ever normalises type names.
   *
   * @param {Array|Tr2VertexDefinition} elements A definition or plain element list.
   * @returns {number} Stable handle.
   */
  @blue.method
  @meta.renamed("GetVertexDeclarationHandle")
  static getVertexDeclarationHandle(elements)
  {
    const key = elements?.items ?? elements ?? [];
    const memoised = vertexLayoutHandles.get(key);

    if (memoised !== undefined) return memoised;

    let handle = vertexLayouts.findIndex(candidate => Tr2VertexDefinition.isSameDefinition(candidate, elements));

    if (handle < 0)
    {
      handle = vertexLayouts.push(elements) - 1;
    }

    if (typeof key === "object") vertexLayoutHandles.set(key, handle);

    return handle;
  }

  /**
   * The declaration a handle was interned from, or null for an unknown handle.
   *
   * Carbon `GetVertexDeclarationElements` (Tr2EffectStateManager.cpp:912-923)
   * copies the definition into an out parameter and returns a bool; returning
   * the interned identity or null is the same contract without the copy.
   *
   * @param {number} handle Vertex-declaration handle.
   * @returns {Array|Tr2VertexDefinition|null} The interned declaration.
   */
  @blue.method
  @meta.renamed("GetVertexDeclarationElements")
  static getVertexDeclarationElements(handle)
  {
    return vertexLayouts[handle] ?? null;
  }

  /**
   * The identity a shader handle was interned from, or null when out of range.
   *
   * @param {number} handle Shader handle.
   * @returns {object|null} Interned identity.
   */
  static getShaderRecord(handle)
  {
    return shaders[handle] ?? null;
  }

  /**
   * The member handles a program was interned from, or null when out of range.
   *
   * Carbon `GetShaderProgram` (Tr2EffectStateManager.cpp:780-787) returns the
   * device object and null-checks at every call site; ours returns identity for
   * the engine to realize against.
   *
   * @param {number} handle Program handle.
   * @returns {object|null} Interned identity.
   */
  static getShaderProgramRecord(handle)
  {
    return shaderPrograms[handle] ?? null;
  }

  /**
   * The interpreted setup a render-state handle was interned from.
   *
   * Null for a reserved built-in slot that has no ported state list yet, and
   * for an out-of-range handle.
   *
   * @param {number} handle Render-state handle.
   * @returns {Tr2RenderStateSetup|null} Interpreted setup.
   */
  static getRenderStateSetup(handle)
  {
    return renderStateSetups[handle]?.setup ?? null;
  }

  /**
   * The effective render state for a pass drawn in a rendering mode.
   *
   * Carbon does not choose between the two: `ApplyRenderStates` re-applies the
   * current mode's standard states and THEN the pass's own, every time
   * (Tr2EffectStateManager.cpp:703-720). So a pass authoring only a blend mode
   * still draws with its mode's depth, cull and colour-write, and reading the
   * pass alone yields a pipeline missing most of its state.
   *
   * Merging is concatenation because a repeated state id overwrites the earlier
   * one. RM_ANY contributes nothing, which is its meaning.
   *
   * @param {number} renderingMode A `RenderingMode` member.
   * @param {number} [handle] Registered pass render-state handle.
   * @returns {Tr2RenderStateSetup|null} Merged setup, or null when neither exists.
   */
  static resolveRenderStates(renderingMode, handle = Tr2EffectStateManager.Unknown)
  {
    const standard = STANDARD_MODE_PAIRS[renderingMode] ?? [];
    const pass = renderStateSetups[handle]?.keyValues ?? null;

    // A handle inside the reserved range IS a mode, already covered by the
    // standard half; merging it with itself would be harmless but confusing.
    if (!pass || handle < RenderingMode.RM_COUNT)
    {
      return standard.length ? Tr2RenderStateSetup.fromKeyValues(standard) : null;
    }

    return Tr2RenderStateSetup.fromKeyValues([ ...standard, ...pass ]);
  }


  /**
   * Drops every registered identity, as Carbon does on device loss.
   *
   * Carbon `ReleaseDeviceResources` (Tr2EffectStateManager.cpp:982-1023) clears
   * the shader and program tables and truncates the render-state table back to
   * its built-in modes, keeping handles 0..RM_COUNT-1 stable across a reset. It
   * leaves the vertex-layout table alone: only the device objects behind it are
   * invalidated, and the declarations survive.
   *
   * Every handle held on a pass is stale afterwards. Carbon's recovery is that
   * releasing the effect resource forces a re-parse and re-registration.
   *
   * Carbon deletes every `s_shaders` row and then every `s_shaderPrograms`
   * row before clearing them (cpp:995-1005). Ours realizes those values per
   * context (`GetShaderProgram`), so the same deletes are every context's
   * realized shaders, then every context's realized programs
   * (`realizedShaderMaps`): the numbers are reused by the next registration,
   * and an object left in any context's map would answer for it.
   *
   * @returns {void}
   */
  static releaseDeviceResources()
  {
    for (const realizedShaders of realizedShaderMaps)
    {
      for (const shader of realizedShaders.values()) shader.Destroy();

      realizedShaders.clear();
    }

    // A cached null is a remembered refusal and owns nothing.
    for (const realizedPrograms of realizedShaderProgramMaps)
    {
      for (const program of realizedPrograms.values())
      {
        if (program) program.Destroy();
      }

      realizedPrograms.clear();
    }

    realizedShaderMaps.clear();
    realizedShaderProgramMaps.clear();

    shaders.length = 0;
    shaderPrograms.length = 0;
    renderStateSetups.length = RenderingMode.RM_COUNT;
  }


  // ---------------------------------------------------------------------
  // The viewport family (Tr2EffectStateManager.cpp:1065-1245).
  //
  // TWO VIEWPORTS, AND THAT IS THE POINT. `viewport` is what the caller asked
  // for and is what `GetViewport` returns. `viewportOnDevice` is that CLIPPED
  // to the bound render target, and it is the only one the backend ever sees.
  // Carbon derives the second from the first on every set, so a caller may
  // author a viewport larger than its target and still produce a legal draw.
  //
  // The clip floors each edge at one pixel, with Carbon's reason attached:
  // "using zero edge length causes dx error". A browser refuses it too, so the
  // floor earns its place here rather than being D3D trivia.
  //
  // These live HERE and not on the render context because that is where Carbon
  // puts them: the context is the abstraction layer, and its `SetViewport`
  // takes the already-clipped device viewport.

  /** The render context this manager applies state to (Carbon's m_renderContext). */
  #renderContext = null;

  /**
   * Binds the render context this manager applies state through.
   *
   * Carbon constructs the manager as a member of the context
   * (`Tr2RenderContext.h:35`), so the pairing is fixed there; ours is composed,
   * so it is bound once and never rebound.
   *
   * @param {object} renderContext The owning render context.
   * @returns {Tr2EffectStateManager} This manager.
   */
  SetRenderContext(renderContext)
  {
    this.#renderContext = renderContext;

    return this;
  }

  /**
   * Registers the `ViewportSize` global and resets the redundancy cache
   * (Tr2EffectStateManager.cpp:631-637). The owning context calls it from its
   * constructor, as Tr2RenderContextBase's does (Tr2RenderContext.cpp:110-112),
   * so the variable exists before any effect maps its constants.
   *
   * Adapted: there is no JS `Tr2Variable` wrapper, so Carbon's
   * `m_viewportSizeVar.Register( name, value )` registers through the global
   * store and keeps the store's variable; a variable already reserved under the
   * name is the one returned.
   *
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  Initialize()
  {
    this.viewportSizeVar = Tr2VariableStore.globalStore().RegisterVariableInternal(
      "ViewportSize", TriVariableContentType.TRIVARIABLE_FLOAT4, [ 0, 0, 1, 0 ]);

    this.#currentValues = NewCurrentValues();
    this.#isManagedRendering = false;
  }

  /**
   * Destroys every shader, program and vertex layout realized for this
   * manager's context and forgets them, so the next apply creates them
   * through whatever backend the context holds now.
   *
   * Called when the context's backend changes, on device loss and on context
   * teardown: the realized objects belong to the backend that made them, and
   * a WebGPU draw handed a stub program refuses the resource set built
   * against it.
   *
   * The release is Carbon's. `ReleaseDeviceResources` deletes every
   * `s_shaders` row and then every `s_shaderPrograms` row (cpp:998-1007), and
   * `Shutdown` deletes the shaders again at exit (cpp:652-666); each delete
   * runs the value's destructor, which drops its share of the implementation.
   * Carbon never deletes an `s_vertexLayoutMap` row: `DestroyDeviceResources`
   * (`TriDevice.cpp:592`) destroys the implementation behind it and the next
   * apply re-creates it (cpp:899-906). Ours drops the layout with its context,
   * so its share is released here too. JavaScript has no destructor, so each
   * value's `Destroy` releases the share explicitly, and the last share
   * destroys the backend object (WebGL2's `deleteShader` / `deleteProgram`).
   *
   * Ours (no blue stamp): Carbon's tables are one per process with one
   * backend; ours are per context because the backend can change under it.
   *
   * @returns {void}
   */
  ReleaseRealizedObjects()
  {
    if (!this.#renderContext) return;

    // s_shaders (cpp:998-1002).
    for (const shader of (shaderObjects.get(this.#renderContext) ?? new Map()).values()) shader.Destroy();

    // s_shaderPrograms (cpp:1003-1007). A cached null is a remembered refusal
    // and owns nothing.
    for (const program of (shaderProgramObjects.get(this.#renderContext) ?? new Map()).values())
    {
      if (program) program.Destroy();
    }

    for (const layout of (vertexLayoutObjects.get(this.#renderContext) ?? new Map()).values()) layout.Destroy();

    realizedShaderMaps.delete(shaderObjects.get(this.#renderContext));
    realizedShaderProgramMaps.delete(shaderProgramObjects.get(this.#renderContext));
    shaderObjects.delete(this.#renderContext);
    shaderProgramObjects.delete(this.#renderContext);
    vertexLayoutObjects.delete(this.#renderContext);
  }

  /**
   * Carbon `ReleaseDeviceResources( s )` (Tr2EffectStateManager.cpp:982-1023),
   * which TriDevice calls on device loss and replacement. Only a release of
   * all storage does anything: unbind the streams and indices, reset the
   * redundancy cache, clear the shared shader, program and render-state tables,
   * and drop the per-object constant buffers.
   *
   * Adapted: the shared tables are the static `releaseDeviceResources`, which
   * also destroys the shaders and programs every context realized for them;
   * the layouts realized for this context are dropped too
   * (`ReleaseRealizedObjects`), and the per-object constant buffers are held
   * on the render context, so they are destroyed there.
   *
   * @param {number} s A `TriStorage` mask.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  ReleaseDeviceResources(s)
  {
    if ((s & TriStorageFlags.TRISTORAGE_ALL) !== TriStorageFlags.TRISTORAGE_ALL) return;

    this._ReleaseBufferBindings();
    this.#currentValues = NewCurrentValues();
    Tr2EffectStateManager.releaseDeviceResources();
    this.ReleaseRealizedObjects();

    // m_perObjectConstantBuffers[i] = Tr2ConstantBufferAL() (cpp:1018-1021): the
    // by-value handles are reset, not removed.
    for (const buffer of this.#renderContext._perObjectConstantBuffers) buffer.Destroy();
  }

  /**
   * Binds a render target to a slot and refreshes the viewport for slot zero.
   *
   * Carbon's is `SetRenderTarget(index, rt, updateViewport, slice)`
   * (cpp:1133-1152): it sets through the abstraction layer and then, for slot
   * zero only, asks the CONTEXT for the target's extent. Its comment says why
   * the context and not the texture: "don't use rt.GetWidth/Height, rt may be
   * nullRT".
   *
   * @param {number} index Target slot.
   * @param {object|null} renderTarget The target.
   * @param {boolean} [updateViewport] Whether slot zero moves the viewport.
   * @returns {boolean} Whether the bind was accepted.
   */
  @blue.method
  SetRenderTarget(index, renderTarget, updateViewport = true, slice = 0)
  {
    // SLICE IS CARBON'S FOURTH ARGUMENT (`Tr2EffectStateManager.h:147`) and it
    // was being dropped here. The WebGPU backend already accepts one, so a
    // caller rendering into a cascade or a cube face was silently writing
    // slice 0 - a correct-looking image in the wrong place.
    const bound = !Failed(this.#renderContext.SetRenderTarget(index, renderTarget, slice));

    if (index === 0 && updateViewport) this.#RefreshRenderTargetViewport();

    return bound;
  }

  /**
   * Carbon's PushRenderTarget( slot ) (cpp:1043): saves the target bound to a
   * slot and binds nothing, so it can be safely changed later.
   *
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  @blue.method
  PushRenderTarget__Current(slot = 0)
  {
    this.#renderContext.PushRenderTarget(slot);
    return true;
  }

  /**
   * Carbon's PushRenderTarget( rt, slot ) (cpp:1048): saves the slot's target,
   * then binds rt. null is Carbon's default-constructed Tr2TextureAL, a real
   * argument that binds an EMPTY texture and so clears the slot
   * (`Tr2ShadowMap.cpp:238`, commented "empty texture").
   *
   * @param {object|null} renderTarget The target to bind after saving.
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  @blue.method
  PushRenderTarget__TextureAL(renderTarget, slot = 0)
  {
    this.#renderContext.PushRenderTarget(slot);
    this.SetRenderTarget(slot, renderTarget);
    return true;
  }

  /**
   * Carbon's bare PushRenderTarget, for literal ports: undefined or a number
   * as the first argument is the slot-only overload, anything else (null
   * included) is the texture overload. Engine code calls the specific names.
   *
   * @returns {boolean} True.
   */
  @blue.method
  PushRenderTarget(first = undefined, slot = 0)
  {
    return first === undefined || typeof first === "number"
      ? this.PushRenderTarget__Current(first ?? 0)
      : this.PushRenderTarget__TextureAL(first, slot);
  }

  /**
   * Restores the target saved for a slot and refreshes the viewport.
   *
   * @param {number} [slot] Target slot.
   * @returns {boolean} False when nothing was saved.
   */
  @blue.method
  PopRenderTarget(slot = 0)
  {
    const popped = !Failed(this.#renderContext.PopRenderTarget(slot));

    if (slot === 0) this.#RefreshRenderTargetViewport();

    return popped;
  }

  /**
   * Binds the depth-stencil surface.
   *
   * @param {object|null} depthStencil The surface, or null to unbind.
   * @returns {boolean} Whether the bind was accepted.
   */
  @blue.method
  SetDepthStencilBuffer(depthStencil)
  {
    return !Failed(this.#renderContext.SetDepthStencil(depthStencil));
  }

  /**
   * Carbon's PushDepthStencilBuffer() (h:149): saves the bound depth-stencil
   * and binds nothing (`TriStepPushDepthStencil.cpp:44`).
   *
   * @returns {boolean} True.
   */
  @blue.method
  PushDepthStencilBuffer__Current()
  {
    this.#renderContext.PushDepthStencil();
    return true;
  }

  /**
   * Carbon's PushDepthStencilBuffer( ds ) (h:150): saves the bound
   * depth-stencil, then binds ds; null, an explicitly EMPTY texture, unbinds
   * (`TriStepPushDepthStencil.cpp:48`).
   *
   * @param {object|null} depthStencil The surface to bind after saving.
   * @returns {boolean} True.
   */
  @blue.method
  PushDepthStencilBuffer__TextureAL(depthStencil)
  {
    this.#renderContext.PushDepthStencil();
    this.SetDepthStencilBuffer(depthStencil);
    return true;
  }

  /**
   * Carbon's bare PushDepthStencilBuffer, for literal ports: undefined is the
   * save-only overload, anything else (null included) the texture overload.
   * Engine code calls the specific names.
   *
   * @returns {boolean} True.
   */
  @blue.method
  PushDepthStencilBuffer(depthStencil = undefined)
  {
    return depthStencil === undefined
      ? this.PushDepthStencilBuffer__Current()
      : this.PushDepthStencilBuffer__TextureAL(depthStencil);
  }

  /**
   * Restores the saved depth-stencil.
   *
   * @returns {boolean} False when nothing was saved.
   */
  @blue.method
  PopDepthStencilBuffer()
  {
    return !Failed(this.#renderContext.PopDepthStencil());
  }

  /** Reads the bound target's extent and resets the viewport to it. */
  #RefreshRenderTargetViewport()
  {
    const size = this.#renderContext.GetRenderTargetSize(0);

    if (Failed(size.result)) return;

    this.UpdateRenderTargetViewport(size.width, size.height);

    // Carbon stops at the update, because its backend applies the viewport as
    // part of the target bind. Ours does not, so the derived viewport is pushed
    // here - the backend forces this, not preference.
    this.SetupViewport();
  }

  /**
   * The viewport as authored, which is not necessarily the one being drawn.
   *
   * @returns {object|null} The authored viewport, or null before one is set.
   */
  @blue.method
  GetViewport()
  {
    return this.viewport;
  }

  /**
   * The viewport actually handed to the backend, clipped to the render target.
   *
   * @returns {object|null} The device viewport, or null before one is set.
   */
  @blue.method
  GetDeviceViewport()
  {
    return this.viewportOnDevice;
  }

  /**
   * Sets the authored viewport and derives the device one.
   *
   * @param {object} viewport `{ x, y, width, height, minZ, maxZ }`.
   * @returns {void}
   */
  @blue.method
  SetViewport(viewport)
  {
    this.viewport = {
      x: viewport.x ?? 0,
      y: viewport.y ?? 0,
      width: viewport.width ?? 0,
      height: viewport.height ?? 0,
      minZ: viewport.minZ ?? 0,
      maxZ: viewport.maxZ ?? 1
    };

    this.SetupViewport();
  }

  /**
   * Sets the authored viewport to the whole render target.
   *
   * @returns {void}
   */
  @blue.method
  SetFullScreenViewport()
  {
    this.viewport = {
      x: 0,
      y: 0,
      width: this.renderTargetWidth,
      height: this.renderTargetHeight,
      minZ: 0,
      maxZ: 1
    };

    this.SetupViewport();
  }

  /**
   * Clips the authored viewport to the render target and hands it to the
   * backend.
   *
   * @returns {void}
   */
  @blue.method
  SetupViewport()
  {
    const authored = this.viewport;

    if (!authored) failState("SetupViewport needs an authored viewport");

    const x1 = authored.x + authored.width;
    const y1 = authored.y + authored.height;
    const x = Math.max(authored.x, 0);
    const y = Math.max(authored.y, 0);

    // ONE DEPARTURE, AND IT IS A REFUSAL TO INVENT. Carbon always has a render
    // target, so its extent is always known and the clip always applies. Ours
    // can be asked before anything is bound, and clipping to an extent of zero
    // would floor the viewport at ONE PIXEL - a frame that draws, in the wrong
    // place, silently. With no extent recorded the authored viewport passes
    // through unclipped; once a target is bound the clip is Carbon's exactly.
    const clipped = this.renderTargetWidth > 0 && this.renderTargetHeight > 0;

    this.viewportOnDevice = {
      x,
      y,
      // Floored at one: a zero edge is refused by the backend, not merely odd.
      width: clipped ? Math.max(Math.min(x1, this.renderTargetWidth) - x, 1) : authored.width,
      height: clipped ? Math.max(Math.min(y1, this.renderTargetHeight) - y, 1) : authored.height,
      minZ: authored.minZ,
      maxZ: authored.maxZ
    };

    // Carbon assigns a Vector4 of the AUTHORED extent and the target's
    // (cpp:1242). Note it uses the DEVICE extent in UpdateRenderTargetViewport
    // instead - transcribed as it stands rather than made consistent.
    this.viewportSizeVar.SetValue([
      authored.width,
      authored.height,
      this.renderTargetWidth,
      this.renderTargetHeight
    ]);

    if (this.#renderContext) this.#renderContext.SetViewport(this.viewportOnDevice);
  }

  /**
   * Records the bound render target's extent and resets both viewports to it.
   *
   * Carbon writes both viewports directly here rather than going through
   * `SetupViewport`, and does NOT push to the backend: the target bind that
   * called this carries the viewport with it (cpp:1193-1214).
   *
   * @param {number} width Render target width.
   * @param {number} height Render target height.
   * @returns {void}
   */
  @blue.method
  UpdateRenderTargetViewport(width, height)
  {
    if (!(width > 0) || !(height > 0)) failState("a render target's viewport needs a non-zero extent");

    this.renderTargetWidth = width;
    this.renderTargetHeight = height;

    this.viewport = { x: 0, y: 0, width, height, minZ: 0, maxZ: 1 };
    this.viewportOnDevice = { x: 0, y: 0, width, height, minZ: 0, maxZ: 1 };
    this.viewportSizeVar.SetValue([ width, height, width, height ]);
  }

  /**
   * Saves the authored viewport.
   *
   * @returns {void}
   */
  @blue.method
  PushViewport()
  {
    if (!Array.isArray(this.viewportStack)) this.viewportStack = [];

    this.viewportStack.push(this.viewport);
  }

  /**
   * Restores the last saved viewport, deriving the device one again.
   *
   * @returns {boolean} False when nothing was saved.
   */
  @blue.method
  PopViewport()
  {
    if (!Array.isArray(this.viewportStack) || !this.viewportStack.length) return false;

    const restored = this.viewportStack.pop();

    if (restored) this.SetViewport(restored);

    return true;
  }

  /**
   * Depth of the viewport save stack.
   *
   * @returns {number} Saved viewports.
   */
  GetStackSizeViewport()
  {
    return Array.isArray(this.viewportStack) ? this.viewportStack.length : 0;
  }

  /**
   * Releases the cache's shares of the bound vertex and index buffers.
   *
   * Carbon's `CurrentValues::Reset` assigns default `Tr2BufferAL` values over
   * them (cpp:423-428), and the assignment drops each share. JavaScript has
   * no destructor, so the shares are released explicitly.
   *
   * @returns {void}
   */
  _ReleaseBufferBindings()
  {
    for (const stream of this.#currentValues.streams)
    {
      if (stream.vertexBuffer) stream.vertexBuffer.Destroy();
      stream.vertexBuffer = null;
    }
    if (this.#currentValues.indexBuffer) this.#currentValues.indexBuffer.Destroy();
    this.#currentValues.indexBuffer = null;
  }

  /**
   * Explicitly releases values that Carbon releases with its state cache.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    this._ReleaseBufferBindings();
    this.#isManagedRendering = false;
  }

  /**
   * Begins a managed-rendering span, in which redundant applies are filtered.
   *
   * Carbon resets the redundancy cache and binds a default-constructed shader
   * program, which unbinds, before the span starts (cpp:672-676). Outside a
   * span nothing tracks what the device holds, so a stale cache would skip a
   * needed bind, and the unbind makes the device match the reset cache.
   *
   * The cull-mode argument is not a state to set: it selects mirroring, so
   * `CULLMODE_CCW` means "this span is mirrored" and `CULLMODE_NONE` leaves the
   * current setting alone. The default is Carbon's `CULLMODE_CW`
   * (`Tr2EffectStateManager.h:48`), so a bare call ends any mirroring a
   * previous span left behind; the reflection path, which draws into a
   * mirrored cube face, passes `CULLMODE_NONE` (`EveSpaceScene.cpp:1933`).
   *
   * @param {number} [cullMode] A `CullMode` member.
   * @returns {void}
   */
  @blue.method
  BeginManagedRendering(cullMode = CullMode.CULLMODE_CW)
  {
    this._ReleaseBufferBindings();
    this.#currentValues = NewCurrentValues();

    // m_renderContext.SetShaderProgram( Tr2ShaderProgramAL() ) (cpp:674). A
    // manager not yet bound to a context reaches nothing, as every apply does.
    if (this.#renderContext) this.#renderContext.SetShaderProgram(new Tr2ShaderProgramAL());

    this.#isManagedRendering = true;

    if (cullMode === CullMode.CULLMODE_CW) this.SetInvertedCullMode(false);
    else if (cullMode === CullMode.CULLMODE_CCW) this.SetInvertedCullMode(true);
  }

  /**
   * Ends the span. The overrides survive it, as they do in Carbon.
   *
   * @returns {void}
   */
  @blue.method
  EndManagedRendering()
  {
    this.#isManagedRendering = false;
  }

  /**
   * Whether redundant applies are currently being filtered.
   *
   * @returns {boolean}
   */
  IsManagedRendering()
  {
    return this.#isManagedRendering;
  }

  /**
   * Draws this span with the depth comparison reversed.
   *
   * Carbon installs a table over RS_ZFUNC that swaps LESS with GREATER and
   * LEQUAL with GEQUAL, leaving NEVER, EQUAL, NOTEQUAL and ALWAYS untouched
   * (cpp:834-856). It is a per-manager setting rather than authored per pass,
   * because the same registered setup is drawn both ways.
   *
   * @param {boolean} inverted
   * @returns {void}
   */
  @blue.method
  SetInvertedDepthTest(inverted)
  {
    this.#overrides.invertedDepthTest = !!inverted;
  }

  /**
   * @returns {boolean} Whether the depth comparison is reversed.
   */
  @blue.method
  IsDepthTestInverted()
  {
    return this.#overrides.invertedDepthTest;
  }

  /**
   * Draws this span mirrored, swapping the two winding orders and leaving NONE
   * alone (cpp:815-827).
   *
   * @param {boolean} inverted
   * @returns {void}
   */
  @blue.method
  SetInvertedCullMode(inverted)
  {
    this.#overrides.invertedCullMode = !!inverted;
  }

  /**
   * @returns {boolean} Whether the winding order is mirrored.
   */
  @blue.method
  IsCullModeInverted()
  {
    return this.#overrides.invertedCullMode;
  }

  /**
   * Draws this span as wireframe (cpp:800-812).
   *
   * Carbon sets an `RS_FILLMODE` override of
   * `{ 0, FM_POINT, FM_WIREFRAME, FM_WIREFRAME }` and clears it to turn the
   * mode off, using the same override machinery as the cull mode above. Ours
   * keeps the named flag rather than the raw table, for the reason the class
   * head gives: a registered setup is interpreted once, so there are no raw
   * pairs left to index.
   *
   * THE FLAG IS RECORDED HERE; NO BACKEND HONOURS IT YET. Neither browser API
   * has an equivalent of `glPolygonMode`, so Carbon's fill-mode route cannot be
   * projected - but wireframe does not need one (line topology, or barycentric
   * edges in the fragment shader). The blocker is which route to take.
   *
   * Until one is taken, `IsWireframeRendering` is the flag a backend must read,
   * and a backend that cannot honour it must REFUSE rather than draw solid.
   * A toggle that silently does nothing is the thing this must not become.
   *
   * @param {boolean} enabled Whether to draw wireframe.
   * @returns {boolean} The flag as stored.
   */
  @blue.method
  SetWireframeRendering(enabled)
  {
    this.#overrides.wireframe = !!enabled;

    return this.#overrides.wireframe;
  }

  /**
   * @returns {boolean} Whether this span is set to draw wireframe.
   */
  IsWireframeRendering()
  {
    return this.#overrides.wireframe;
  }

  /**
   * Which of Carbon's render-state overrides this manager currently applies.
   *
   * This is where Carbon's DoApplyRenderStates would land, and deliberately
   * stops short of it. Carbon resolves authored pairs against its override
   * tables and submits them to the render context; a backend that bakes the
   * same states into a pipeline has no such call, and one that sets them
   * imperatively wants them in its own vocabulary. So the manager hands over
   * WHICH overrides are active and the backend's projection applies them - the
   * inversion tables live in interpreted space on Tr2RenderStateSetup, beside
   * the values they rewrite.
   *
   * Carbon's dirty-flagged per-setup cache has no counterpart and needs none: a
   * projected state set feeds a pipeline key that already includes the flags'
   * effect, so the two variants are distinct entries rather than one entry that
   * must be invalidated.
   *
   * @returns {{invertedDepthTest: boolean, invertedCullMode: boolean}} A copy.
   */
  GetRenderStateOverrides()
  {
    return { ...this.#overrides };
  }

  /**
   * Records the rendering mode and returns whether its standard states must be
   * applied.
   *
   * Carbon re-applies the mode's states ahead of every pass setup rather than
   * restoring after one (cpp:703-719), which is why a pass's states leak into
   * whatever draws next without an intervening ApplyRenderStates. It then sets
   * the current setup to UNKNOWN, so the next ApplyRenderStates cannot be
   * filtered out.
   *
   * @param {number} renderingMode A `RenderingMode` member.
   * @returns {boolean} Whether the mode carries states to apply.
   */
  @blue.method
  ApplyStandardStates(renderingMode)
  {
    // THE PREDICATE IS CARBON'S, AND SO IS ACTING ON IT. This returned the
    // condition and applied nothing until 2026-09-09, so the base depth, cull
    // and colour-write block for every rendering mode was never set - and all
    // four callers discard the boolean, so nothing noticed. Carbon
    // (`cpp:790-799`):
    //
    //     if( rm > RM_ANY && rm < RM_COUNT ) { DoApplyRenderStates( uint32_t( rm ) ); }
    //
    // The mode IS the handle: the first RM_COUNT setup slots are the standard
    // states, which is why interned registration begins after RM_COUNT.
    const carriesStates = renderingMode > RenderingMode.RM_ANY && renderingMode < RenderingMode.RM_COUNT;

    if (carriesStates) this.DoApplyRenderStates(renderingMode);

    this.#currentValues.renderingMode = renderingMode;
    this.#currentValues.renderStateSetup = Tr2EffectStateManager.Unknown;

    // Carbon returns void; the boolean is kept because callers already take it,
    // and it now reports what was applied rather than what could have been.
    return carriesStates;
  }

  /**
   * Applies a render-state setup to the backend.
   *
   * Carbon (`cpp:703-720`) filters a redundant handle inside a managed span,
   * then does TWO things: re-applies the current rendering mode's standard
   * states, and only then the pass's own. Reading a pass's states alone yields a
   * pipeline missing most of its state, which is why the order is transcribed
   * rather than simplified.
   *
   * @param {number} handle Render-state handle.
   * @returns {boolean} False when the handle is already current in a managed span.
   */
  @blue.method
  ApplyRenderStates(handle)
  {
    if (this.#isManagedRendering && handle === this.#currentValues.renderStateSetup) return false;

    if (handle < Tr2EffectStateManager.getRenderStateSetupCount())
    {
      this.ApplyStandardStates(this.#currentValues.renderingMode);
      this.DoApplyRenderStates(handle);

      this.#currentValues.renderStateSetup = handle;

      return true;
    }

    this.#currentValues.renderStateSetup = handle;

    return false;
  }

  /**
   * Resolves a setup against the current overrides and hands it to the backend.
   *
   * Carbon `DoApplyRenderStates` (`cpp:722-755`) walks the registered
   * state-PAIR list substituting `m_renderStateOverrides[state][value]`, caches
   * the resolved list per setup behind a dirty flag, and calls
   * `m_renderContext.SetRenderStates( &kv[0], kv.size() / 2 )`.
   *
   * OURS RESOLVES A PROJECTION RATHER THAN A PAIR LIST, for the reason the class
   * head gives: a registered setup is interpreted ONCE at registration, so there
   * are no raw pairs left to index. The override tables live in interpreted
   * space on `Tr2RenderStateSetup`, whose `GetWebgpuRecipe` already accepts
   * `invertedDepthTest` and `invertedCullMode`. Same substitution, one layer up.
   *
   * CARBON'S PER-SETUP CACHE HAS NO COUNTERPART HERE, and adding one would be
   * cargo. Carbon caches because it performs the substitution itself and the
   * result is a list it would otherwise rebuild every draw. We substitute
   * nothing - the setup and the overrides go to the backend, which projects
   * them - and the projection's result is already cached by the pipeline cache,
   * keyed on the recipe the overrides changed. Two caches for one derivation is
   * how they fall out of step.
   *
   * WIREFRAME REFUSES HERE, and that is the answer to this class's own note
   * about the toggle. `GetWebgpuRecipe` throws for any fill mode but solid,
   * because WebGPU has no `glPolygonMode` - so the flag reaches a backend that
   * says it cannot honour it, rather than being quietly dropped.
   *
   * @param {number} handle Render-state handle.
   * @returns {boolean} Whether a setup reached the backend.
   */
  @blue.method
  DoApplyRenderStates(handle)
  {
    const setup = Tr2EffectStateManager.getRenderStateSetup(handle);

    if (!setup || !this.#renderContext) return false;

    return !Failed(this.#renderContext.SetRenderStates(this.#OverMode(handle, setup), this.GetRenderStateOverrides()));
  }

  /**
   * A pass setup carrying the current rendering mode's states underneath it.
   *
   * RENDER STATES ARE STICKY IN CARBON, and reproducing that is the whole point
   * of this method. Carbon sets them one at a time through D3D, so
   * `ApplyStandardStates` lays down the rendering mode's block and a pass setup
   * then speaks only for what it changes. Ours interprets a setup ONCE into a
   * complete projection, so handing the backend a pass setup REPLACED the mode's
   * block and turned the pass's silence into interpreted defaults.
   *
   * It cost a hull. RM_OPAQUE asks for `CULLMODE_CW` - cull the FRONT faces,
   * D3D's clockwise-is-front convention - and every `quadv5` pass authors no
   * cull at all, so the default `CULLMODE_CCW` culled the back ones instead.
   * Every EVE ship drew its own interior: right silhouette, wrong surfaces,
   * which is a genuinely hard thing to see. ccpwgl sets `CULL_CW` to
   * `gl.cullFace(gl.FRONT)` against `frontFace(CW)` and agrees exactly
   * (`Tw2Device.js:272,1343-1346,1604`).
   *
   * A MODE HANDLE IS NOT OVERLAID ON ITSELF: the first `RM_COUNT` slots ARE the
   * standard states, so those apply as they are.
   *
   * Merged setups are cached per mode and handle, so the backend keeps seeing
   * one stable object and its redundant-apply check still bites.
   *
   * @param {number} handle The setup being applied.
   * @param {object} setup The interpreted setup for that handle.
   * @returns {object} The setup to hand the backend.
   */
  #OverMode(handle, setup)
  {
    const mode = this.#currentValues.renderingMode;
    const carriesStates = mode > RenderingMode.RM_ANY && mode < RenderingMode.RM_COUNT;

    // Only a mode applying ITS OWN block is left alone. An earlier version
    // excluded every handle below RM_COUNT, which caught the reserved RM_ANY
    // slot - and a pass that registers no states gets exactly that handle, whose
    // interpreted setup is a full projection of DEFAULTS. Applying it over the
    // mode erased the mode.
    if (!carriesStates || handle === mode) return setup;

    const key = `${mode}:${handle}`;
    const cached = this.#overMode.get(key);

    if (cached) return cached;

    const merged = Tr2RenderStateSetup.Overlay(Tr2EffectStateManager.getRenderStateSetup(mode), setup);

    this.#overMode.set(key, merged);

    return merged;
  }

  /** Merged mode-plus-pass setups, keyed by both handles. */
  #overMode = new Map();

  /**
   * Whether this shader program needs binding.
   *
   * Carbon updates the cached value only INSIDE the managed branch (cpp:758-771)
   * and this keeps that asymmetry: outside a span nothing tracks the device, so
   * recording a value there would let the next span's first bind be skipped.
   *
   * @param {number} handle Shader-program handle.
   * @returns {boolean}
   */
  @blue.method
  ApplyShaderProgram(handle)
  {
    if (this.#isManagedRendering)
    {
      if (handle === this.#currentValues.shaderProgram) return false;

      this.#currentValues.shaderProgram = handle;
    }

    // IT BINDS. This recorded the handle and reached no backend until
    // 2026-09-09. Carbon `cpp:758-778`: an in-range handle sets the interned
    // program, and an out-of-range one sets a DEFAULT-CONSTRUCTED program -
    // which unbinds. Both halves are here, because the else branch is what
    // stops a span inheriting the previous span's program.
    if (!this.#renderContext) return true;

    const program = handle >= 0 && handle < shaderPrograms.length
      ? this.GetShaderProgram(handle)
      : null;

    this.#renderContext.SetShaderProgram(program ?? new Tr2ShaderProgramAL());

    return true;
  }

  /**
   * Creates the backend's program for an interned handle, once.
   *
   * Carbon's row already HOLDS the created `Tr2ShaderProgramAL`
   * (`s_shaderPrograms[ix].first`), created at registration against the main
   * thread's context. Ours holds identity plus the bytecode and signature each
   * stage registered, and creates the `Tr2ShaderAL` and `Tr2ShaderProgramAL`
   * values on first use, per context, because the table is shared and a
   * program belongs to the backend that realized it.
   *
   * Carbon's `GetShaderProgram` (`Tr2EffectStateManager.cpp:780-787`), which
   * `Tr2Material::ApplyMaterialDataForPass` calls to hand the program to
   * `Tr2ResourceSetAL::Create` (`Tr2Material.cpp:232-234`). Public for the
   * same caller here.
   *
   * @param {number} handle A shader-program handle.
   * @returns {object|null} The realized program, or null when a stage refused.
   */
  @blue.method
  GetShaderProgram(handle)
  {
    if (!this.#renderContext) return null;
    if (!(handle >= 0 && handle < shaderPrograms.length)) return null;

    const realized = shaderProgramObjects.get(this.#renderContext) ?? new Map();
    const cached = realized.get(handle);

    // A cached NULL is a remembered refusal. Without this a program whose stage
    // failed to compile is rebuilt on every apply, which turns one bad shader
    // into per-draw work.
    if (cached !== undefined) return cached;

    // Carbon's RegisterShader / RegisterShaderProgram (cpp:500-509, 572-576):
    // one `Tr2ShaderAL` value per registered stage, shared by every program
    // that links it, linked into a `Tr2ShaderProgramAL` value; a refused
    // Create leaves no program (`CR_RETURN_VAL( ..., UNKNOWN )`). A refused
    // stage is not kept, as Carbon pushes no row for it (cpp:502-510).
    const realizedShaders = shaderObjects.get(this.#renderContext) ?? new Map();
    const stages = [];

    shaderObjects.set(this.#renderContext, realizedShaders);
    realizedShaderMaps.add(realizedShaders);

    for (const shaderHandle of shaderPrograms[handle].shaderHandles)
    {
      let stage = realizedShaders.get(shaderHandle) ?? null;

      if (!stage)
      {
        const row = shaders[shaderHandle];

        stage = new Tr2ShaderAL();
        if (!row || Failed(stage.Create(row.stageType, row.bytecode, row.signature ?? null, "", this.#renderContext))) { stages.length = 0; break; }

        realizedShaders.set(shaderHandle, stage);
      }

      stages.push(stage);
    }

    let program = null;

    if (stages.length > 0)
    {
      program = new Tr2ShaderProgramAL();
      if (Failed(program.Create(stages, stages.length, this.#renderContext))) program = null;
    }

    realized.set(handle, program);
    shaderProgramObjects.set(this.#renderContext, realized);
    realizedShaderProgramMaps.add(realized);

    return program;
  }

  /**
   * Whether this vertex declaration needs binding.
   *
   * @param {number} handle Vertex-declaration handle.
   * @returns {boolean}
   */
  @blue.method
  ApplyVertexDeclaration(handle)
  {
    if (this.#isManagedRendering && handle === this.#currentValues.vertexDeclaration) return false;

    this.#currentValues.vertexDeclaration = handle;

    // IT BINDS. This recorded the handle and reached no backend until
    // 2026-09-09, so a draw ran with whatever layout the abstraction layer
    // last held. Carbon `cpp:879-910`: NULL_DECLARATION unbinds with a default
    // layout, otherwise the interned layout is created ON FIRST USE and set.
    //
    // Carbon holds a `Tr2VertexLayoutAL` value in its intern table and
    // creates it on first apply. Ours holds the same value, per context
    // because the table is shared and a layout belongs to the backend that
    // realized it (see vertexLayoutObjects).
    // A manager with no context records and reaches nothing, exactly as
    // DoApplyRenderStates does. Carbon's manager always has one; ours is
    // constructed before it is bound.
    if (!this.#renderContext) return handle !== Tr2EffectStateManager.Unknown;

    // TWO SENTINELS, AND THEY ARE NOT THE SAME ONE. Carbon asserts against
    // UNINITIALIZED_DECLARATION and unbinds on NULL_DECLARATION
    // (`cpp:886-893`); they are `~0u` and `~0u - 1`. This tested `Unknown` -
    // the UNINITIALIZED one - which meant a batch carrying NullDeclaration fell
    // past the unbind, found no elements for 0xFFFFFFFE, and bound nothing at
    // all. And because the redundancy cache was already written above, the
    // filter suppressed every retry, so the previous layout stuck. The field's
    // own docstring says "do not collapse the two"; collapsing them is exactly
    // what this did between two commits on 2026-09-09.
    if (handle === Tr2EffectStateManager.NullDeclaration)
    {
      this.#renderContext.SetVertexLayout(new Tr2VertexLayoutAL());

      return true;
    }

    // Carbon ASSERTS here rather than handling it: applying an uninitialized
    // declaration is a caller defect. We have no assert, and binding nothing
    // while reporting success is what hid the bug above, so it reports failure.
    if (handle === Tr2EffectStateManager.Unknown) return false;

    const elements = Tr2EffectStateManager.getVertexDeclarationElements(handle);

    // A HANDLE THAT WAS NEVER INTERNED NAMES NOTHING. Carbon cannot reach this:
    // every declaration handle it holds came out of `getVertexDeclarationHandle`
    // and indexes its own table. Ours can be handed a bare number, and creating
    // a layout from null would make an empty definition look like a real one -
    // which the stub layout then reports as valid, because Carbon stores the
    // definition before checking it.
    if (!elements) return false;

    const realized = vertexLayoutObjects.get(this.#renderContext) ?? new Map();

    let layout = realized.get(handle) ?? null;

    if (!layout)
    {
      layout = new Tr2VertexLayoutAL();

      realized.set(handle, layout);
      vertexLayoutObjects.set(this.#renderContext, realized);
    }

    // Carbon's `if( !hvl.IsValid() ) hvl.Create( ... )` (cpp:899-906): a
    // layout whose Create refused is retried on the next apply.
    if (!layout.IsValid()) layout.Create(elements, this.#renderContext);

    this.#renderContext.SetVertexLayout(layout);

    return true;
  }

  /**
   * Binds one vertex stream unless it is already bound.
   *
   * THE FILTER ONLY RUNS INSIDE A MANAGED SPAN (cpp:930-948). Outside one
   * nothing tracks what the device holds, so every call must reach it; a
   * cached value recorded there would let the next span skip a bind it needs.
   *
   * Carbon's suballocated-buffer overload just unpacks the allocation and calls
   * this, so it is not a second method here.
   *
   * @param {number} stream The stream index.
   * @param {object} buffer A `Tr2BufferAL`.
   * @param {number} offset Byte offset into the buffer.
   * @param {number} stride Bytes per vertex.
   * @returns {boolean} False when the bind was filtered out as redundant.
   */
  @blue.method
  ApplyStreamSource(stream, buffer, offset, stride)
  {
    const current = this.#currentValues.streams[stream];

    if (!current) throw new Error(`Tr2EffectStateManager: no vertex stream ${stream}.`);

    if (this.#isManagedRendering)
    {
      if ((buffer === current.vertexBuffer || (buffer && current.vertexBuffer && buffer.Equals(current.vertexBuffer))) && offset === current.offset && stride === current.stride)
      {
        return false;
      }

      const next = buffer ? new Tr2BufferAL({ copy: buffer }) : null;
      if (current.vertexBuffer) current.vertexBuffer.Destroy();
      current.vertexBuffer = next;
      current.offset = offset;
      current.stride = stride;
    }

    this.#renderContext.SetStreamSource(stream, buffer, offset, stride);

    return true;
  }

  /**
   * Carbon's one-argument ApplyIndexBuffer( indices ) (Tr2EffectStateManager.cpp:951-954):
   * binds the buffer with the stride its own description carries.
   *
   * @param {object} indices A `Tr2BufferAL`.
   * @returns {boolean} False when the bind was filtered out as redundant.
   */
  @blue.method
  ApplyIndexBuffer(indices)
  {
    return this.ApplyIndexBuffer__Stride(indices, indices.GetDesc().stride);
  }

  /**
   * Carbon's ApplyIndexBuffer( indices, stride ) (Tr2EffectStateManager.cpp:961-985): binds
   * the index buffer unless it is already bound with that stride.
   *
   * A ONE-BYTE INDEX STRIDE IS A BUG, and Carbon says so at the top of this
   * method - "Oh no! This is a big bug!" (cpp:963-966) - because no backend has
   * 8-bit indices and the value can only have come from an uninitialised
   * description. It warns and carries on there; here it fails, because a bind
   * that cannot be right should not reach a device.
   *
   * @param {object} indices A `Tr2BufferAL`.
   * @param {number} stride Bytes per index.
   * @returns {boolean} False when the bind was filtered out as redundant.
   */
  @blue.method
  ApplyIndexBuffer__Stride(indices, stride)
  {
    if (stride === 1) throw new Error("Tr2EffectStateManager: a one-byte index stride is never right.");

    if (this.#isManagedRendering)
    {
      if ((indices === this.#currentValues.indexBuffer || (indices && this.#currentValues.indexBuffer && indices.Equals(this.#currentValues.indexBuffer))) && stride === this.#currentValues.indexStride)
      {
        return false;
      }

      const next = indices ? new Tr2BufferAL({ copy: indices }) : null;
      if (this.#currentValues.indexBuffer) this.#currentValues.indexBuffer.Destroy();
      this.#currentValues.indexBuffer = next;
      this.#currentValues.indexStride = stride;
    }

    this.#renderContext.SetIndices__Stride(indices, stride);

    return true;
  }

  /**
   * The current redundancy cache, for a caller that must reason about what is
   * bound. A copy, because it is this class's private state.
   *
   * @returns {object}
   */
  GetCurrentValues()
  {
    return { ...this.#currentValues, streams: this.#currentValues.streams.map(s => ({ ...s })) };
  }

  /**
   * How many render-state handles are registered, which is the range
   * `ApplyRenderStates` checks against.
   *
   * @returns {number}
   */
  static getRenderStateSetupCount()
  {
    return renderStateSetups.length;
  }
}
