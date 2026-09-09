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
// The buffers are the context's per-slot ones rather than file statics, for the
// reason `Tr2RenderContext.GetConstantBuffer` gives: a buffer is of the
// backend's kind, and a context knows which backend it holds.
import { ShaderType } from "#consts/render-context";
import { FillAndSetConstants } from "../Tr2RenderUtils.js";
import { PER_FRAME_PS, PER_FRAME_VS } from "../Tr2Renderer.js";


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

  const buffer = renderContext.GetConstantBuffer(register);

  if (!buffer) return false;

  return FillAndSetConstants(buffer, bytes, bytes.byteLength, 1 << stage, register, renderContext);
}
