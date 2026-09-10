// Source: trinity/trinity/Tr2ConstantBufferFormats.h
//   trinity/trinity/Tr2ConstantBufferFormats.cpp:40-66
//
// Carbon binds the per-frame blocks through two process-wide constant buffers
// and `FillAndSetConstants`: the vertex block to the vertex stage at
// `GetPerFrameVSStartRegister()`, the pixel block to the pixel stage at
// `GetPerFramePSStartRegister()` (`Tr2ConstantBufferFormats.cpp:54-66`). The
// layouts themselves are `CjsPerFrameLayouts`; this is the BIND, which nothing
// did on the Trinity path before 2026-09-10 - the scene filled its records and
// the resolver read them, so a frame drawn through the abstraction layer's own
// verbs had b1 and b2 unbound.
//
// THE PER-FRAME BLOCKS NEED BUFFERS OF THEIR OWN, and taking them from
// `GetConstantBuffer` was a defect that cost a hull. Carbon holds two file
// statics here, `s_perFrameVSData` and `s_perFramePSData`
// (`Tr2ConstantBufferFormats.cpp:54-66`), while `GetConstantBuffer` reaches into
// `m_perObjectConstantBuffers` - a DIFFERENT array, for per-object data only.
// Borrowing it indexed the per-object array by REGISTER, so the per-frame vertex
// block (register 1) took the buffer the per-object PIXEL payload uses (shader
// type 1). One buffer, two registers, one frame: the second bind reused the
// first's arena region, and b4 handed the shader the frame's matrices where it
// expected `shipData`. The hull rendered blown-out white.
//
// Kept per CONTEXT rather than per module, which is the one deliberate
// difference from Carbon's statics: a buffer is of the backend's kind, and two
// contexts on different backends must not share one.
import { ShaderType } from "#consts/render-context";
import { FillAndSetConstants } from "../Tr2RenderUtils.js";
import { PER_FRAME_PS, PER_FRAME_VS } from "../Tr2Renderer.js";


/** Carbon's `s_perFrameVSData` / `s_perFramePSData`, one pair per context. */
const perFrameBuffers = new WeakMap();


/**
 * Carbon's `Tr2BindPerFrameVSData`.
 *
 * @param {object} data The scene's per-frame vertex `RawData`.
 * @param {object} renderContext The `Tr2RenderContext` to bind on.
 * @returns {boolean} Whether the block was bound.
 */
export function BindPerFrameVSData(data, renderContext)
{
  return BindPerFrame(data, renderContext, ShaderType.VERTEX_SHADER, PER_FRAME_VS);
}


/**
 * Carbon's `Tr2BindPerFramePSData`.
 *
 * @param {object} data The scene's per-frame pixel `RawData`.
 * @param {object} renderContext The `Tr2RenderContext` to bind on.
 * @returns {boolean} Whether the block was bound.
 */
export function BindPerFramePSData(data, renderContext)
{
  return BindPerFrame(data, renderContext, ShaderType.PIXEL_SHADER, PER_FRAME_PS);
}


function BindPerFrame(data, renderContext, stage, register)
{
  const bytes = data && typeof data.GetData === "function" ? data.GetData() : null;

  if (!bytes || !bytes.byteLength) return false;

  const buffer = PerFrameBuffer(renderContext, stage);

  if (!buffer) return false;

  return FillAndSetConstants(buffer, bytes, bytes.byteLength, 1 << stage, register, renderContext);
}


/**
 * The per-frame constant buffer for one stage, made once per context.
 *
 * @param {object} renderContext The `Tr2RenderContext` to create through.
 * @param {number} stage A `ShaderType`; only the two per-frame stages are used.
 * @returns {object|null} A `Tr2ConstantBufferAL`, or null when none can be made.
 */
function PerFrameBuffer(renderContext, stage)
{
  const held = perFrameBuffers.get(renderContext) ?? {};

  held[stage] ??= renderContext.CreateConstantBuffer();
  perFrameBuffers.set(renderContext, held);

  return held[stage] ?? null;
}
