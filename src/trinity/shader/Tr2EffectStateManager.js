// Source: trinity/trinity/Shader/Tr2EffectStateManager.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
//
// STILL INCOMPLETE, and not finished-by-design. The registration half is
// implemented: registerShader, registerShaderProgram, registerRenderStateSetup
// and getVertexDeclarationHandle intern identities and hand back Carbon's
// handles. The APPLICATION half is not: ApplyShaderProgram, ApplyRenderStates,
// ApplyVertexDeclaration, ApplyStandardStates and the m_currentValues
// redundancy cache are absent, and so is RegisterShaderProgramOverride, which
// costs the pixel-shader override path. Those need the executor seam.
//
// This class declares no @carbon.method, so the parity audit cannot see it:
// an entirely unimplemented class reports clean. Do not read a green audit as
// evidence that this file is finished.
import { type } from "#schema";
import { CjsModel } from "#model";
import { RenderingMode } from "#consts/graphics";
import {
  BlendMode,
  BlendOperation,
  CompareFunc,
  CullMode,
  FillMode,
  RenderState
} from "#consts/render-context";
import { Tr2VertexDefinition } from "../core/vertex/Tr2VertexDefinition.js";
import { Tr2RenderStateSetup } from "#resource/shader";
import { Failed } from "../core/al/ALResult.js";

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
function samplerSignatureKey(samplers)
{
  if (!samplers || typeof samplers.entries !== "function") return "[]";
  const entries = [ ...samplers.entries() ]
    .map(([ register, setup ]) => [
      Number(register),
      typeof setup?.GetValues === "function" ? setup.GetValues() : setup ?? null
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

/** Tracks the portable render, stream, buffer, viewport, and override state used while applying an effect, and owns the process-wide shader, shader-program and render-state registration tables its handle fields index; the Apply* surface that consumes those handles is not implemented yet. */
@type.define({ className: "Tr2EffectStateManager", family: "shader" })
export class Tr2EffectStateManager extends CjsModel
{

  /** m_renderContext (Tr2RenderContext&) */
  @type.rawStruct("Tr2RenderContext")
  renderContext = null;

  /** m_perObjectConstantBuffers (Tr2ConstantBufferAL) */
  @type.rawStruct("Tr2ConstantBufferAL")
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
   * Wireframe (`SetWireframeRendering`, cpp:800-812) is NOT YET PORTED, which
   * is different from being unwanted - it is a working tool for anyone looking
   * at geometry.
   *
   * An earlier note here said it was "deliberately absent" because neither
   * browser backend has a fill mode. Half of that is true and the conclusion
   * is not. Neither has an equivalent of `glPolygonMode`, so Carbon's
   * render-state route genuinely cannot be projected - but wireframe does not
   * need one:
   *
   *   - LINE TOPOLOGY, reachable today. Carbon's topology 2 and 3 already map
   *     to line primitives in the engine layer, so a pass can be drawn as
   *     lines by choosing its topology. Edges are shared, so a triangle list
   *     drawn this way is not a true wireframe without an index rebuild.
   *   - BARYCENTRIC EDGES in the fragment shader. No new geometry, no index
   *     rebuild, and usable line widths. This is the usual browser answer.
   *
   * So the blocker is a decision about which route to take, not a missing
   * capability. What must NOT happen is the toggle silently doing nothing.
   */
  #overrides = { invertedDepthTest: false, invertedCullMode: false };

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

  /** m_viewportSizeVar (Tr2Variable) */
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
  static registerShader(stageType, bytecode, signature = null)
  {
    if (!bytecode || bytecode.length === 0) return Tr2EffectStateManager.Unknown;

    const type = Number(stageType);
    const samplerKey = samplerSignatureKey(signature?.samplers);

    for (let handle = 0; handle < shaders.length; handle += 1)
    {
      const existing = shaders[handle];
      if (existing.stageType !== type) continue;
      if (!isSameBytecode(existing.bytecode, bytecode)) continue;
      if (existing.samplerKey !== samplerKey) continue;
      return handle;
    }

    return shaders.push({ stageType: type, bytecode, samplerKey }) - 1;
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
    const techniques = shader?.GetEffect?.()?.techniques ?? [];

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
    shader?.ProcessEffect?.();

    return shader;
  }

  /**
   * The handle for a mesh's vertex declaration.
   *
   * Carbon `GetVertexDeclarationHandle` (Tr2EffectStateManager.cpp:863-877).
   * `Tr2VertexDefinition` already owns this table, so this delegates rather
   * than interning a second one.
   *
   * @param {Array} elements Mesh vertex elements.
   * @returns {number} Stable handle.
   */
  static getVertexDeclarationHandle(elements)
  {
    return Tr2VertexDefinition.getHandle(elements);
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
   * @returns {void}
   */
  static releaseDeviceResources()
  {
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
  SetRenderTarget(index, renderTarget, updateViewport = true)
  {
    const bound = this.#renderContext.SetRenderTarget(index, renderTarget);

    if (index === 0 && updateViewport) this.#RefreshRenderTargetViewport();

    return bound;
  }

  /**
   * Saves the target bound to a slot, and binds a new one if given.
   *
   * Carbon's two overloads (cpp:1043-1052): the slot-only form saves and binds
   * nothing, the two-argument form saves and then sets.
   *
   * @param {object|null} [renderTarget] The target to bind after saving.
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  PushRenderTarget(renderTarget = null, slot = 0)
  {
    this.#renderContext.PushRenderTarget(slot);

    if (renderTarget != null) this.SetRenderTarget(slot, renderTarget);

    return true;
  }

  /**
   * Restores the target saved for a slot and refreshes the viewport.
   *
   * @param {number} [slot] Target slot.
   * @returns {boolean} False when nothing was saved.
   */
  PopRenderTarget(slot = 0)
  {
    const popped = this.#renderContext.PopRenderTarget(slot);

    if (slot === 0) this.#RefreshRenderTargetViewport();

    return popped;
  }

  /**
   * Binds the depth-stencil surface.
   *
   * @param {object|null} depthStencil The surface, or null to unbind.
   * @returns {boolean} Whether the bind was accepted.
   */
  SetDepthStencilBuffer(depthStencil)
  {
    return this.#renderContext.SetDepthStencil(depthStencil);
  }

  /**
   * Saves the bound depth-stencil, and binds another if one is given.
   *
   * Carbon has three overloads and the difference between two of them matters:
   * no argument saves and binds nothing, while an explicitly EMPTY texture
   * saves and then unbinds (`TriStepPushDepthStencil.cpp:44,48`). Passing
   * `undefined` is the first; passing `null` is the second.
   *
   * @param {object|null} [depthStencil] The surface to bind after saving.
   * @returns {boolean} True.
   */
  PushDepthStencilBuffer(depthStencil = undefined)
  {
    this.#renderContext.PushDepthStencil();

    if (depthStencil !== undefined) this.SetDepthStencilBuffer(depthStencil);

    return true;
  }

  /**
   * Restores the saved depth-stencil.
   *
   * @returns {boolean} False when nothing was saved.
   */
  PopDepthStencilBuffer()
  {
    return this.#renderContext.PopDepthStencil();
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
  GetViewport()
  {
    return this.viewport;
  }

  /**
   * The viewport actually handed to the backend, clipped to the render target.
   *
   * @returns {object|null} The device viewport, or null before one is set.
   */
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
    this.viewportSizeVar = [
      authored.width,
      authored.height,
      this.renderTargetWidth,
      this.renderTargetHeight
    ];

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
  UpdateRenderTargetViewport(width, height)
  {
    if (!(width > 0) || !(height > 0)) failState("a render target's viewport needs a non-zero extent");

    this.renderTargetWidth = width;
    this.renderTargetHeight = height;

    this.viewport = { x: 0, y: 0, width, height, minZ: 0, maxZ: 1 };
    this.viewportOnDevice = { x: 0, y: 0, width, height, minZ: 0, maxZ: 1 };
    this.viewportSizeVar = [ width, height, width, height ];
  }

  /**
   * Saves the authored viewport.
   *
   * @returns {void}
   */
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
   * Begins a managed-rendering span, in which redundant applies are filtered.
   *
   * Carbon resets the redundancy cache and unbinds the shader program first
   * (cpp:670-694), because outside a span nothing tracks what the device holds
   * and a stale cache would skip a needed bind.
   *
   * The cull-mode argument is not a state to set: it selects mirroring, so
   * `CULLMODE_CCW` means "this span is mirrored" and `CULLMODE_NONE` leaves the
   * current setting alone.
   *
   * @param {number} [cullMode] A `CullMode` member.
   * @returns {void}
   */
  BeginManagedRendering(cullMode = CullMode.CULLMODE_NONE)
  {
    this.#currentValues = NewCurrentValues();
    this.#isManagedRendering = true;

    if (cullMode === CullMode.CULLMODE_CW) this.SetInvertedCullMode(false);
    else if (cullMode === CullMode.CULLMODE_CCW) this.SetInvertedCullMode(true);
  }

  /**
   * Ends the span. The overrides survive it, as they do in Carbon.
   *
   * @returns {void}
   */
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
  SetInvertedDepthTest(inverted)
  {
    this.#overrides.invertedDepthTest = !!inverted;
  }

  /**
   * @returns {boolean} Whether the depth comparison is reversed.
   */
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
  SetInvertedCullMode(inverted)
  {
    this.#overrides.invertedCullMode = !!inverted;
  }

  /**
   * @returns {boolean} Whether the winding order is mirrored.
   */
  IsCullModeInverted()
  {
    return this.#overrides.invertedCullMode;
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
  ApplyStandardStates(renderingMode)
  {
    this.#currentValues.renderingMode = renderingMode;
    this.#currentValues.renderStateSetup = Tr2EffectStateManager.Unknown;

    return renderingMode > RenderingMode.RM_ANY && renderingMode < RenderingMode.RM_COUNT;
  }

  /**
   * Whether this render-state handle needs applying, recording it either way.
   *
   * @param {number} handle Render-state handle.
   * @returns {boolean} False when the handle is already current in a managed span.
   */
  ApplyRenderStates(handle)
  {
    if (this.#isManagedRendering && handle === this.#currentValues.renderStateSetup) return false;

    this.#currentValues.renderStateSetup = handle;

    return handle < Tr2EffectStateManager.getRenderStateSetupCount();
  }

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
  ApplyShaderProgram(handle)
  {
    if (this.#isManagedRendering)
    {
      if (handle === this.#currentValues.shaderProgram) return false;

      this.#currentValues.shaderProgram = handle;
    }

    return true;
  }

  /**
   * Whether this vertex declaration needs binding.
   *
   * @param {number} handle Vertex-declaration handle.
   * @returns {boolean}
   */
  ApplyVertexDeclaration(handle)
  {
    if (this.#isManagedRendering && handle === this.#currentValues.vertexDeclaration) return false;

    this.#currentValues.vertexDeclaration = handle;

    return handle !== Tr2EffectStateManager.Unknown;
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
