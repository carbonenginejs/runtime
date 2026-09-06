// Source: trinity/trinity/Tr2Blitter.h
//   trinity/trinity/Tr2Blitter.cpp
//
// The fullscreen-quad draw. Carbon routes every screen-space blit through this
// one class: `Tr2Renderer::DrawTexture` and `DrawFullScreenWithShader` are
// three-line wrappers around `s_blitter->Draw` (`Tr2Renderer.cpp:750-834`), and
// `TriStepRenderTexture`, `TriStepRenderEffect` and `TriStepRenderAtlas` all
// reach it that way. It is why those render steps could not be ported.
//
// THE WHOLE CLASS IS ONE METHOD. `DrawHelper` fills a four-vertex quad, binds
// it, then runs every pass of the shader over it. The eight public `Draw`
// overloads differ only in which arguments they pass through, so they collapse
// into one method with defaults here.
//
// WHAT IS DELIBERATELY NOT PORTED:
//
// - The `Tr2DeviceResource` BASE. Carbon needs it because a DX device can be
//   lost and every registered resource rebuilt; WebGPU surfaces device loss as
//   a promise on the device itself and nothing here rebuilds on it yet. The
//   `PrepareResources`/`OnPrepareResources` split IS kept - that is where such
//   a registry would hook in - but it is called from first use rather than from
//   the constructor, because Carbon has a device by construction and we may not.
// - `BLITCUBE_EFFECT_PATH`. Carbon declares the constant and never uses it
//   (`Tr2Blitter.cpp:13`); transcribing dead code would imply a cube blit
//   exists.
//
// THE BUFFER COMES FROM THE RENDER CONTEXT, not from `new Tr2BufferALStub()`.
// Carbon picks the backend with a compile-time typedef; a Trinity class that
// imports a concrete buffer picks it at authoring time and silently reaches no
// device. See `Tr2RenderContext.CreateBuffer`.

import { Topology, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BufferDescriptionAL } from "./al/Tr2BufferALStub.js";
import { Tr2VertexDefinition } from "./vertex/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { Tr2VariableStore } from "./variable/Tr2VariableStore.js";
import { SCREEN_QUAD_FLOATS, SCREEN_VERTEX_BYTES, SetupScreenQuad, SetupScreenQuadInCameraSpace } from "./Tr2RenderUtils.js";


/** Carbon's two blit effect paths (`Tr2Blitter.cpp:11-12`). */
export const BLIT_EFFECT_PATH = "res:/Graphics/Effect/Managed/space/system/Blit.fx";
export const BLIT_FILTERED_EFFECT_PATH = "res:/Graphics/Effect/Managed/space/system/BlitFiltered.fx";


/** Carbon `Tr2Blitter::Filtering`. */
export const Filtering = Object.freeze({
  FILTER_POINT: 0,
  FILTER_LINEAR: 1
});


/**
 * The screen-quad declaration, BUILT as Carbon builds it
 * (`Tr2Blitter.cpp:167-172`):
 *
 *     Tr2VertexDefinition vd;
 *     vd.Add( vd.FLOAT32_4, vd.POSITION );
 *     vd.Add( vd.FLOAT32_2, vd.TEXCOORD );
 *
 * A definition is BUILT, not declared. An earlier version of this file wrote
 * the two items as a frozen literal with the offsets computed by hand - 0 and
 * 16 - which is the same shape Carbon spells with two `Add` calls, minus the
 * ledger that guarantees the offsets. Hand arithmetic that happens to agree
 * today is a defect waiting for the third element.
 *
 * @returns {Tr2VertexDefinition} A fresh definition; the state manager interns it.
 */
function screenVertexDefinition()
{
  const definition = new Tr2VertexDefinition();

  definition.Add("FLOAT32_4", "POSITION");
  definition.Add("FLOAT32_2", "TEXCOORD");

  return definition;
}


/** The four vertices of a screen quad, as Carbon's buffer holds them. */
const SCREEN_QUAD_VERTICES = 4;


/** The global-store variable the blit shaders sample by name. */
const BLIT_SOURCE = "BlitSource";


/**
 * Draws a fullscreen or sub-rectangle quad with a given material.
 */
export class Tr2Blitter
{
  /** m_screenVertexDecl - interned once, and -1 until it is. */
  #screenVertexDecl = -1;

  /** m_vertexBuffer - four Tr2ScreenVertex, rewritten per draw. */
  #vertexBuffer = null;

  /** The quad staged on the CPU before it goes into the buffer. */
  #quad = new Float32Array(SCREEN_QUAD_FLOATS);

  /** m_blitEffect / m_blitFilteredEffect, set by the host that owns loading. */
  #blitEffect = null;

  #blitFilteredEffect = null;

  /**
   * Registers `BlitSource` on the global store, as Carbon's constructor does
   * (`Tr2Blitter.cpp:21`). The blit shaders sample it by name, so it has to
   * exist before the first draw rather than be created by one.
   */
  constructor()
  {
    Tr2VariableStore.GlobalStore().RegisterVariable(BLIT_SOURCE, null);
  }

  /**
   * Installs the two blit materials.
   *
   * CARBON CONSTRUCTS THESE ITSELF, from `BLIT_EFFECT_PATH` and
   * `BLIT_FILTERED_EFFECT_PATH` (`Tr2Blitter.cpp:22-26`). It can, because
   * `Tr2Effect::SetEffectPathName` reaches a synchronous resource manager.
   * Loading here is asynchronous and belongs to whoever owns the resource
   * manager, so the blitter is given its materials rather than fetching them.
   * The paths are exported above so a host uses Carbon's, not its own.
   *
   * @param {object} blitEffect The point-sampled blit material.
   * @param {object} [blitFilteredEffect] The linear-sampled one.
   * @returns {Tr2Blitter} This, for chaining.
   */
  SetBlitEffects(blitEffect, blitFilteredEffect = null)
  {
    this.#blitEffect = blitEffect;
    this.#blitFilteredEffect = blitFilteredEffect;

    return this;
  }

  /**
   * The interned handle for the screen-vertex declaration, or -1 before it is
   * prepared. Carbon's `m_screenVertexDecl`.
   *
   * @returns {number} The handle.
   */
  GetScreenVertexDeclaration()
  {
    return this.#screenVertexDecl;
  }

  /** Whether the blitter has what it needs to draw an untextured material. */
  IsPrepared()
  {
    return this.#screenVertexDecl !== -1 && this.#vertexBuffer !== null;
  }

  /**
   * Brings the blitter's device resources up.
   *
   * Carbon's `Tr2DeviceResource::PrepareResources` is the public entry and
   * `OnPrepareResources` the virtual a subclass implements; the blitter's
   * constructor calls the former (`Tr2Blitter.cpp:28`). The split is kept
   * because the base's half is where a device-resource registry would hook in,
   * and collapsing it would hide that seam.
   *
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Whether the blitter is ready to draw.
   */
  PrepareResources(renderContext)
  {
    this.OnPrepareResources(renderContext);

    return this.IsPrepared();
  }

  /**
   * Interns the vertex declaration and creates the vertex buffer.
   *
   * Carbon `OnPrepareResources` (`Tr2Blitter.cpp:161-179`). Both halves test
   * before building, so it is idempotent exactly as Carbon's is - which is what
   * lets it be called from first use here rather than from the constructor.
   * Carbon can call it at construction because it has a device by then; we may
   * not.
   *
   * @param {object} renderContext The context to create against.
   * @returns {boolean} Carbon returns true unconditionally, and so does this.
   */
  OnPrepareResources(renderContext)
  {
    if (this.#screenVertexDecl === -1)
    {
      // Carbon's exact spelling: m_screenVertexDecl =
      // Tr2EffectStateManager::GetVertexDeclarationHandle( vd ) (cpp:172).
      this.#screenVertexDecl = Tr2EffectStateManager.getVertexDeclarationHandle(screenVertexDefinition());
    }

    // Carbon's DrawHelper returns false when the buffer is invalid
    // (`cpp:109-112`) and the caller clears instead, so a blitter without a
    // device DEGRADES rather than throws. A context with no backend installed
    // is that case; asking it for a buffer is a loud error everywhere else, and
    // should stay one.
    if (!this.#vertexBuffer && renderContext.GetRenderContextAL())
    {
      // WRITE_OFTEN because the quad is rewritten every draw; VERTEX_BUFFER
      // because that is all it is ever bound as. Carbon's own flags
      // (`Tr2Blitter.cpp:175`).
      this.#vertexBuffer = renderContext.CreateBuffer(Tr2BufferDescriptionAL.FromStride(
        SCREEN_VERTEX_BYTES,
        SCREEN_QUAD_VERTICES,
        Tr2GpuUsage.VERTEX_BUFFER,
        Tr2CpuUsage.WRITE_OFTEN
      ));
    }

    return true;
  }

  /** Drops the declaration handle and the buffer, as `ReleaseResources` does. */
  ReleaseResources()
  {
    if (this.#vertexBuffer) this.#vertexBuffer.Destroy();

    this.#vertexBuffer = null;
    this.#screenVertexDecl = -1;
  }

  /**
   * Draws a screen quad with a material, optionally over a texture.
   *
   * Carbon's `DrawHelper` (`Tr2Blitter.cpp:100-159`). The eight `Draw`
   * overloads are this one method; `Draw` and `DrawInCameraSpace` below are the
   * two callers Carbon distinguishes.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} shader The material's `Tr2Shader`.
   * @param {object} material The material to draw with.
   * @param {object|null} texture A texture to publish as `BlitSource`.
   * @param {boolean} isCameraSpace Whether to unproject the corners.
   * @param {object} placement `{ tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord }`.
   * @returns {boolean} Whether the quad was drawn.
   */
  DrawHelper(renderContext, shader, material, texture, isCameraSpace, placement = {})
  {
    // Carbon asserts on a null material and then returns false anyway, because
    // "final build should not crash even if we get here with a null effect"
    // (`cpp:101-107`). The refusal is the part that ships.
    if (!material || !shader) return false;

    if (!this.PrepareResources(renderContext)) return false;

    const {
      tlTexCoord = [ 0, 0 ],
      brTexCoord = [ 1, 1 ],
      tlVertexCoord = [ 0, 0 ],
      brVertexCoord = [ 1, 1 ]
    } = placement;

    if (isCameraSpace)
    {
      // Carbon asserts the vertex coordinates are the full quad here
      // (`cpp:126-127`), because the camera-space builder ignores them.
      if (!SetupScreenQuadInCameraSpace(this.#quad, renderContext)) return false;
    }
    else
    {
      SetupScreenQuad(this.#quad, renderContext, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord);
    }

    const mapped = this.#vertexBuffer.MapForWriting(renderContext);
    if (!mapped.data) return false;

    new Float32Array(mapped.data.buffer, mapped.data.byteOffset, SCREEN_QUAD_FLOATS).set(this.#quad);
    this.#vertexBuffer.UnmapForWriting(renderContext);

    const esm = renderContext.GetEffectStateManager();

    esm.ApplyVertexDeclaration(this.#screenVertexDecl);
    esm.ApplyStreamSource(0, this.#vertexBuffer, 0, SCREEN_VERTEX_BYTES);

    // Carbon publishes the source texture through the GLOBAL VARIABLE STORE
    // rather than binding it (`cpp:136-144`), because the blit shaders declare
    // a `BlitSource` sampler by name and the material's own parameter path
    // resolves it. It clears the entry afterwards so the next blit cannot
    // inherit this one's texture.
    const blitSource = texture ? Tr2VariableStore.GlobalStore().GetVariable(BLIT_SOURCE) : null;

    if (blitSource) blitSource.SetValue(texture);

    const passCount = shader.GetPassCount(0);

    for (let passIndex = 0; passIndex < passCount; passIndex++)
    {
      shader.ApplyAllStateForPass(0, passIndex, renderContext);
      material.ApplyMaterialDataForPass(0, passIndex, renderContext);

      // Two triangles as a strip, which is what the four vertices describe and
      // why the interior-edge flip in SetupScreenQuad matters.
      renderContext.SetTopology(Topology.TOP_TRIANGLE_STRIP);
      renderContext.DrawPrimitive(0, 2);
    }

    if (blitSource) blitSource.Clear();

    return true;
  }

  /**
   * Draws a screen quad with a material.
   *
   * Carbon's `Draw` overloads collapse here: pass a texture to blit it, omit it
   * to run a fullscreen shader, and give a placement to draw a sub-rectangle.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} material The material to draw with.
   * @param {object|null} [texture] A texture to publish as `BlitSource`.
   * @param {object} [placement] Texture and vertex corners.
   * @returns {boolean} Whether the quad was drawn.
   */
  Draw(renderContext, material, texture = null, placement = {})
  {
    if (!material) return false;

    return this.DrawHelper(renderContext, material.GetShaderStateInterface(), material, texture, false, placement);
  }

  /**
   * Blits a texture with the built-in blit material.
   *
   * Carbon `Draw( renderContext, texture, tl, br, filter )` (`cpp:41-51`).
   * Point and linear are two different effects, not a sampler setting.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} texture The texture to blit.
   * @param {object} [placement] Texture and vertex corners.
   * @param {number} [filter] A `Filtering` value.
   * @returns {boolean} Whether the quad was drawn.
   */
  DrawTexture(renderContext, texture, placement = {}, filter = Filtering.FILTER_POINT)
  {
    const material = filter === Filtering.FILTER_LINEAR ? this.#blitFilteredEffect : this.#blitEffect;

    // Carbon's switch has no default and falls through to `return false` for an
    // unknown filter (`cpp:43-50`); a missing effect lands in the same place.
    if (!material) return false;

    return this.DrawHelper(renderContext, material.GetShaderStateInterface(), material, texture, false, placement);
  }

  /**
   * Draws the quad with its corners unprojected into view space.
   *
   * Carbon `DrawInCameraSpace` (`cpp:96-99`), which is the one caller that
   * passes an explicitly chosen shader rather than the material's own.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} shader The shader to run.
   * @param {object} material The material to draw with.
   * @returns {boolean} Whether the quad was drawn.
   */
  DrawInCameraSpace(renderContext, shader, material)
  {
    return this.DrawHelper(renderContext, shader, material, null, true);
  }
}
