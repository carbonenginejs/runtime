import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub, Tr2BitmapDimensions, Tr2BufferDescriptionAL } from "../../npm/dist/trinityal/index.js";

import { PixelFormat, Tr2GpuUsage, Tr2CpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

// WHY THIS EXISTS. `Tr2RenderContext` used to record every abstraction-layer
// verb into an intent list when no backend was installed, so a bare
// `new Tr2RenderContext()` silently accepted anything. That recording is gone
// (2026-09-06): a context with no backend now throws by name, because a context
// without a backend is an error rather than a recorder.
//
// Carbon ships a stub backend for exactly the headless case, and it is not a
// no-op - it validates arguments, keeps real render-target and depth-stencil
// stacks per slot, reports sizes back, and counts draws, clears and batches.
// So a test that used to assert on recorded intents asserts on real backend
// state instead, which is a stronger claim.

/**
 * A render context with Carbon's stub backend installed and a device created.
 *
 * @param {object} [mode] The back buffer's size.
 * @returns {Tr2RenderContext} The context.
 */
export function StubContext({ width = 64, height = 64 } = {})
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width, height } });

  const context = new Tr2RenderContext();

  // SetRenderContextAL returns the AL, not the context - it does not chain.
  context.SetRenderContextAL(al);

  return context;
}


/**
 * A render target the stub backend accepts.
 *
 * The stub asks a bound target for `IsValid`/`GetWidth`/`GetHeight` whenever it
 * derives a viewport, so a bare `{}` no longer stands in - with no backend
 * installed, that path was never reached.
 *
 * @param {number} [width] Target width.
 * @param {number} [height] Target height.
 * @returns {Tr2TextureAL} A public texture value; the test owns its release.
 */
export function StubTarget(width = 64, height = 64)
{
  const al = new Tr2RenderContextALStub();
  al.CreateDevice();
  const texture = al.CreateTexture(Tr2BitmapDimensions.texture2D(width, height, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM),
    { gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE });
  al.Destroy();
  return texture;
}

/** Creates a caller-owned public vertex/index buffer for binding tests. */
export function StubBuffer()
{
  const al = new Tr2RenderContextALStub();
  al.CreateDevice();
  const buffer = al.CreateBuffer(Tr2BufferDescriptionAL.FromStride(4, 64,
    Tr2GpuUsage.VERTEX_BUFFER | Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.WRITE));
  al.Destroy();
  return buffer;
}
