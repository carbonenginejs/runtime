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
import { Tr2VertexDefinition } from "../core/vertex/Tr2VertexDefinition.js";
import { Tr2RenderStateSetup } from "#resource/shader";

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

/** Registered shader identities; the index is the handle. */
const shaders = [];

/** Registered shader programs; the index is the handle. */
const shaderPrograms = [];

// Carbon seeds this table with RM_COUNT built-in rendering-mode setups, so
// handle `i` IS mode `i` for i < RM_COUNT (Tr2EffectStateManager.cpp:397-410),
// and truncates back to them on device loss rather than emptying (:1012).
// The mode state lists are not ported yet, so the slots are reserved rather
// than filled: reserving now keeps every later handle stable when they land.
// Slot 0 carries RM_ANY's genuinely empty list, which is what makes an
// unauthored setup intern to 0 exactly as Carbon's does.
const renderStateSetups = [ { keyValues: [], setup: null } ];

while (renderStateSetups.length < RenderingMode.RM_COUNT)
{
  renderStateSetups.push({ keyValues: null, setup: null });
}

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

  /** m_shaderProgram (uint32_t) */
  @type.uint32
  shaderProgram = 0;

  /** m_vertexDeclaration (uint32_t) */
  @type.uint32
  vertexDeclaration = 0;

  /** m_vertexBuffer (Tr2BufferAL) */
  @type.rawStruct("Tr2BufferAL")
  vertexBuffer = null;

  /** m_offset (uint32_t) */
  @type.uint32
  offset = 0;

  /** m_stride (uint32_t) */
  @type.uint32
  stride = 0;

  /** m_streams (HalStream) */
  @type.rawStruct("HalStream")
  streams = null;

  /** m_indexBuffer (Tr2BufferAL) */
  @type.rawStruct("Tr2BufferAL")
  indexBuffer = null;

  /** m_indexStride (uint32_t) */
  @type.uint32
  indexStride = 0;

  /** m_renderingMode (Tr2EffectStateManager::RenderingMode - enum RenderingMode) */
  @type.int32
  @type.enum("RenderingMode")
  renderingMode = 0;

  /** m_renderStateSetup (uint32_t) */
  @type.uint32
  renderStateSetup = 0;

  /** m_currentValues (CurrentValues) */
  @type.rawStruct("CurrentValues")
  currentValues = null;

  /** m_isManagedRendering (bool) */
  @type.boolean
  isManagedRendering = false;

  /** states (std::vector<uint32_t>) */
  @type.list("uint32_t")
  states = [];

  /** dirty (bool) */
  @type.boolean
  dirty = false;

  /** m_renderStates (std::vector<RenderStates>) */
  @type.list("RenderStates")
  renderStates = [];

  /** m_renderStateOverrides (const uint32_t*) */
  @type.objectRef("uint32_t")
  renderStateOverrides = null;

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
  static Unknown = 0xFFFFFFFF;

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

}
