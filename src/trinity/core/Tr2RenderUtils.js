// Source: trinity/trinity/Tr2RenderUtils.h
// Source: trinity/trinity/Tr2RenderUtils.cpp
//
// Freestanding helpers that need no private state. Carbon's own header explains
// why the file exists: "Most of this was TriDevice/Tr2Renderer but works just
// fine with the public interfaces. So put those guys here to lighten up those
// classes."
//
// THESE ARE TRINITY, NOT THE ABSTRACTION LAYER, and that is the whole reason
// they were missing. `FillAndSetConstants` is the last hop of Carbon's
// per-object upload - `Tr2PerObjectDataStandard::SetPerObjectDataToDevice`
// calls it twice and does nothing else - and it lives in a Trinity header. It
// went unported because "the engine does device work" was read as the
// `engine/webgpu` package rather than the abstraction layer, so the upload was
// reimplemented engine-side and this file never got written. See
// /docs/research/graphics-path-review-2026-09-05.md.
//
// `SetupScreenQuad` and `SetupScreenQuadInCameraSpace` are here too. They feed
// `Tr2Blitter`'s fullscreen-quad path, which is the single gate in front of
// every remaining render step: TriStepRenderTexture, TriStepRenderAtlas and
// `TriStepRenderEffect` all bottom out in `Tr2Renderer::DrawTexture` ->
// `Tr2Blitter::Draw`.
import { ShaderType } from "#consts/render-context";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { Tr2ConstantUsageAL } from "./al/Tr2ConstantBufferALStub.js";
import { Failed } from "./al/ALResult.js";


/**
 * Binds one constant buffer to every shader stage a mask names.
 *
 * Carbon `SetConstants` (`Tr2RenderUtils.cpp:126-137`). The loop clears each
 * bit as it goes and stops as soon as the mask is empty, so a single-stage
 * bind costs one iteration rather than six.
 *
 * @param {object} buffer A `Tr2ConstantBufferAL`.
 * @param {number} constantTypeMask A bit per `ShaderType`.
 * @param {number} registerIndex The constant-buffer register.
 * @param {object} renderContext The context to bind against.
 * @returns {number} How many stages were bound.
 */
export function SetConstants(buffer, constantTypeMask, registerIndex, renderContext)
{
  let mask = constantTypeMask >>> 0;
  let bound = 0;

  for (let stage = ShaderType.SHADER_TYPE_FIRST; stage !== ShaderType.SHADER_TYPE_COUNT && mask; stage += 1)
  {
    if (!(mask & (1 << stage))) continue;

    renderContext.SetConstants(buffer, stage, registerIndex);
    mask &= ~(1 << stage);
    bound += 1;
  }

  return bound;
}


/**
 * Creates or grows a constant buffer, copies data into it, and binds it.
 *
 * Carbon `FillAndSetConstants` (`Tr2RenderUtils.cpp:100-124`), the repeating
 * pattern its own comment describes: create if needed, lock, copy, unlock, set.
 *
 * A ZERO MASK RETURNS SUCCESS AND BINDS NOTHING. That is Carbon's first line
 * and it is not a guard against bad input - it is how a payload declared for
 * stages a technique does not use gets skipped, per batch, without the caller
 * testing anything.
 *
 * THE COPY IS CLAMPED TO THE BUFFER, not to the data. Carbon writes
 * `min( dataSize, buffer.GetSize() )`, so a payload larger than the buffer
 * fills it and the tail is dropped rather than overrunning.
 *
 * @param {object} buffer A `Tr2ConstantBufferAL`, created here if it has to be.
 * @param {ArrayBufferView} data The bytes to upload.
 * @param {number} dataSize How many bytes of `data` to upload.
 * @param {number} constantTypeMask A bit per `ShaderType`.
 * @param {number} registerIndex The constant-buffer register.
 * @param {object} renderContext The context to upload and bind against.
 * @returns {boolean} Whether the data was uploaded and bound.
 */
export function FillAndSetConstants(buffer, data, dataSize, constantTypeMask, registerIndex, renderContext)
{
  if (!(constantTypeMask >>> 0)) return true;

  if (!buffer.IsValid() || dataSize > buffer.GetSize())
  {
    if (Failed(buffer.Create(dataSize, Tr2ConstantUsageAL.REUSABLE, null, renderContext))) return false;
  }

  const { result, data: mapped } = buffer.Lock(renderContext);

  if (Failed(result) || !mapped) return false;

  const bytes = data instanceof Uint8Array
    ? data
    : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  mapped.set(bytes.subarray(0, Math.min(dataSize, buffer.GetSize())));

  buffer.Unlock(renderContext);

  SetConstants(buffer, constantTypeMask, registerIndex, renderContext);

  return true;
}


// Carbon `Tr2ScreenVertex` (Tr2RenderUtils.h:13-17): a clip-space position and
// one texture coordinate. Four of them make the blitter's triangle strip.
export const SCREEN_VERTEX_FLOATS = 6;
export const SCREEN_VERTEX_BYTES = SCREEN_VERTEX_FLOATS * 4;
export const SCREEN_QUAD_FLOATS = SCREEN_VERTEX_FLOATS * 4;


/** Writes one Tr2ScreenVertex into a flat float array at vertex index `at`. */
function writeScreenVertex(quad, at, x, y, z, w, u, v)
{
  const base = at * SCREEN_VERTEX_FLOATS;
  quad[base] = x;
  quad[base + 1] = y;
  quad[base + 2] = z;
  quad[base + 3] = w;
  quad[base + 4] = u;
  quad[base + 5] = v;
}


/**
 * Carbon's interior-edge flip (`Tr2RenderUtils.cpp:24-33` and `67-76`).
 *
 * The quad is emitted as a triangle strip, so which diagonal splits it decides
 * the winding of both triangles. Carbon swaps the two interior vertices when
 * the cull mode is NOT inverted, which is the ordinary case - so the common
 * path is the swapped one, not the literal 0/1/2/3 order the comments read as.
 *
 * @param {object} renderContext The context whose ESM holds the cull override.
 * @returns {Array<number>} The two interior vertex indices, in emission order.
 */
function interiorEdges(renderContext)
{
  const esm = renderContext.GetEffectStateManager();

  return esm.IsCullModeInverted() ? [ 1, 2 ] : [ 2, 1 ];
}


/**
 * Fills a four-vertex screen quad in clip space.
 *
 * Carbon `SetupScreenQuad` (`Tr2RenderUtils.cpp:11-50`). Vertex coordinates
 * arrive in [0,1] with y down, which is why y is negated on the way to clip
 * space; texture coordinates pass through untouched.
 *
 * ADAPTED: Carbon reaches for the main-thread render context through
 * `USE_MAIN_THREAD_RENDER_CONTEXT()` purely to read the cull mode, and its own
 * comment on that line asks for the context to be passed in instead
 * (`cpp:27`). We pass it in.
 *
 * @param {Float32Array} quad Destination, at least SCREEN_QUAD_FLOATS long.
 * @param {object} renderContext The context to read the cull mode from.
 * @param {Array<number>} tlTexCoord Top-left texture coordinate.
 * @param {Array<number>} brTexCoord Bottom-right texture coordinate.
 * @param {Array<number>} [tlVertexCoord] Top-left placement, [0,1], y down.
 * @param {Array<number>} [brVertexCoord] Bottom-right placement, [0,1], y down.
 * @returns {Float32Array} The quad that was written.
 */
export function SetupScreenQuad(quad, renderContext, tlTexCoord, brTexCoord, tlVertexCoord = [ 0, 0 ], brVertexCoord = [ 1, 1 ])
{
  const tlX = tlVertexCoord[0] * 2 - 1;
  const tlY = -(tlVertexCoord[1] * 2 - 1);
  const brX = brVertexCoord[0] * 2 - 1;
  const brY = -(brVertexCoord[1] * 2 - 1);
  const z = 1;
  const w = 1;

  const [ edge1, edge2 ] = interiorEdges(renderContext);

  writeScreenVertex(quad, 0, tlX, tlY, z, w, tlTexCoord[0], tlTexCoord[1]);
  writeScreenVertex(quad, edge1, brX, tlY, z, w, brTexCoord[0], tlTexCoord[1]);
  writeScreenVertex(quad, edge2, tlX, brY, z, w, tlTexCoord[0], brTexCoord[1]);
  writeScreenVertex(quad, 3, brX, brY, z, w, brTexCoord[0], brTexCoord[1]);

  return quad;
}


/**
 * Fills a four-vertex screen quad in VIEW space, by unprojecting the clip-space
 * corners through the inverse of the raw projection.
 *
 * Carbon `SetupScreenQuadInCameraSpace` (`Tr2RenderUtils.cpp:52-95`). The
 * vertex shader is expected to push z into w, so the corners carry the
 * unprojected depth rather than a constant.
 *
 * ADAPTED, same reason as SetupScreenQuad: Carbon takes the projection from the
 * `Tr2Renderer` global and the cull mode from the main-thread context; both
 * come from the passed context here.
 *
 * @param {Float32Array} quad Destination, at least SCREEN_QUAD_FLOATS long.
 * @param {object} renderContext The context holding projection and cull mode.
 * @returns {Float32Array|null} The quad, or null with no projection set.
 */
export function SetupScreenQuadInCameraSpace(quad, renderContext)
{
  const projection = renderContext.GetProjection();
  if (!projection) return null;

  const proj2view = mat4.invert(mat4.create(), projection);
  if (!proj2view) return null;

  const tl = vec3.transformMat4(vec3.create(), [ -1, 1, 1 ], proj2view);
  const br = vec3.transformMat4(vec3.create(), [ 1, -1, 1 ], proj2view);

  const [ edge1, edge2 ] = interiorEdges(renderContext);

  writeScreenVertex(quad, 0, tl[0], tl[1], tl[2], 1, 0, 0);
  writeScreenVertex(quad, edge1, br[0], tl[1], tl[2], 1, 1, 0);
  writeScreenVertex(quad, edge2, tl[0], br[1], tl[2], 1, 0, 1);
  // tl[2] on all four, including this one (cpp:97). The unprojected corners
  // share a depth, so br's own z is deliberately unused.
  writeScreenVertex(quad, 3, br[0], br[1], tl[2], 1, 1, 1);

  return quad;
}


/**
 * Corrects texture coordinates when the device viewport differs from the
 * authored one.
 *
 * Carbon `AdjustTextureCoordsToViewport` (`Tr2Renderer.cpp:267-290`), a
 * file-scope free function there and a free function here for the same reason:
 * it needs nothing but the two viewports.
 *
 * WHY IT EXISTS. The authored viewport is what the scene asked for; the device
 * viewport is that clipped to the render target. When they differ - a
 * sub-rectangle render, a target smaller than the request - a blit sampling
 * [0,1] would read the whole source rather than the part actually covered. The
 * correction shifts and scales the coordinates by the difference.
 *
 * ONLY THE `DrawTexture` FAMILY APPLIES THIS. Carbon's `DrawScreenQuad` calls
 * the blitter with unadjusted coordinates (`Tr2Renderer.cpp:1014-1020`), so
 * folding the correction into `Tr2Blitter` itself would silently change every
 * screen-quad draw.
 *
 * @param {object} renderContext The context whose ESM holds both viewports.
 * @param {Array<number>} tlTexCoord Top-left texture coordinate.
 * @param {Array<number>} brTexCoord Bottom-right texture coordinate.
 * @returns {{tlTexCoord: Array<number>, brTexCoord: Array<number>}} Corrected
 *   coordinates; the inputs are not modified, unlike Carbon's in-out reference
 *   parameters.
 */
export function AdjustTextureCoordsToViewport(renderContext, tlTexCoord, brTexCoord)
{
  const esm = renderContext.GetEffectStateManager();
  const viewport = esm.GetViewport();
  const deviceViewport = esm.GetDeviceViewport();

  // Carbon dereferences both unconditionally. Before either is set there is no
  // correction to make, and guessing one would move a blit that was correct.
  if (!viewport || !deviceViewport) return { tlTexCoord, brTexCoord };

  const deltaX = Math.trunc(deviceViewport.x) - viewport.x;
  const deltaY = Math.trunc(deviceViewport.y) - viewport.y;

  const xOffset = deltaX / viewport.width;
  const yOffset = deltaY / viewport.height;

  return {
    tlTexCoord: [
      tlTexCoord[0] + xOffset * brTexCoord[0],
      tlTexCoord[1] + yOffset * brTexCoord[1]
    ],
    brTexCoord: [
      brTexCoord[0] * ((deviceViewport.width + deltaX) / viewport.width),
      brTexCoord[1] * ((deviceViewport.height + deltaY) / viewport.height)
    ]
  };
}
