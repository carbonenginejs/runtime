import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
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
// It is a `Tr2DeviceResource`, as Carbon's is (`Tr2Blitter.h:17`), and prepares
// on the main-thread render context (`Tr2Blitter.cpp:180`). Registration and
// preparation happen at first use rather than in the constructor, because the
// host installs the main context's backend after the blitter can exist.
//
// WHAT IS DELIBERATELY NOT PORTED:
//
// - `BLITCUBE_EFFECT_PATH`. Carbon declares the constant and never uses it
//   (`Tr2Blitter.cpp:13`); transcribing dead code would imply a cube blit
//   exists.
//
// THE BUFFER COMES FROM THE RENDER CONTEXT, not from `new Tr2BufferALStub()`.
// Carbon picks the backend with a compile-time typedef; a Trinity class that
// imports a concrete buffer picks it at authoring time and silently reaches no
// device. See `Tr2RenderContext.CreateBuffer`.

import { Topology, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BufferDescriptionAL } from "../../trinityal/stub/Tr2BufferALStub.js";
import { Tr2VertexDefinition } from "./vertex/Tr2VertexDefinition/index.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { Tr2VariableStore } from "./variable/Tr2VariableStore.js";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2TextureReference } from "./Tr2TextureReference.js";
import { BLIT_EFFECT_PATH, BLIT_FILTERED_EFFECT_PATH } from "#consts/effectPaths";
import { SCREEN_QUAD_FLOATS, SCREEN_VERTEX_BYTES, Tr2RenderUtils } from "./Tr2RenderUtils.js";
import { TriVariableContentType } from "../generated/trinityCore/enums.js";
import { exposure as be } from "#be";
import { Tr2DeviceResource } from "./device/Tr2DeviceResource.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";




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

/** Carbon's DrawHelper default corners (Tr2Blitter.h:58-61). */
const TL_DEFAULT = [ 0, 0 ];
const BR_DEFAULT = [ 1, 1 ];


/**
 * Draws a fullscreen or sub-rectangle quad with a given material.
 */
export class Tr2Blitter
{
  /** m_screenVertexDecl - interned once, and -1 until it is. */
  _screenVertexDecl = -1;

  /**
   * Carbon's function-static CTr2TransientTextureReference in DrawHelper
   * (`cpp:136`): the blitted texture is published through it, never bare.
   */
  _textureReference = new Tr2TextureReference();

  /** m_vertexBuffer - four Tr2ScreenVertex, rewritten per draw. */
  _vertexBuffer = null;

  /** The quad staged on the CPU before it goes into the buffer. */
  _quad = new Float32Array(SCREEN_QUAD_FLOATS);

  /** m_blitEffect / m_blitFilteredEffect. */
  _blitEffect = null;

  _blitFilteredEffect = null;

  /** @cjs Infrastructure lives until explicit teardown, never idle purge. */
  _neverPurge = true;

  /**
   * Registers `BlitSource` on the global store and creates the two blit
   * effects, as Carbon's constructor does (`Tr2Blitter.cpp:17-26`). The blit
   * shaders sample `BlitSource` by name, so it has to exist before the first
   * draw rather than be created by one.
   *
   * THE EFFECTS ARE CREATED HERE, AS CARBON'S ARE. They load asynchronously,
   * and a draw with an unloaded effect draws nothing - the same as every other
   * effect Trinity creates from a path (Tr2PostProcessRenderer, Tr2Denoiser).
   * Until 2026-09-26 they were left for a host to inject, nothing ever did,
   * and every DrawTexture returned false: the post process drew nothing into
   * the back buffer.
   */
  constructor()
  {
    // Carbon registers a TYPED null, `static_cast<ITr2TextureProvider*>(
    // nullptr )` (`cpp:20`), so the variable is a texture variable before
    // anything is published. A JS null has no type and registered an INVALID
    // variable whose binding was skipped, so every blit sampled nothing. The
    // empty reference is the typed null: same type, no texture.
    Tr2VariableStore.globalStore().RegisterVariableInternal(BLIT_SOURCE, TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._textureReference);

    this._blitEffect = new Tr2Effect();
    this._blitEffect.SetEffectPathName(BLIT_EFFECT_PATH);
    this._blitFilteredEffect = new Tr2Effect();
    this._blitFilteredEffect.SetEffectPathName(BLIT_FILTERED_EFFECT_PATH);
  }

  /**
   * Replaces the two blit materials; tests stand fakes in with it.
   *
   * @param {object} blitEffect The point-sampled blit material.
   * @param {object} [blitFilteredEffect] The linear-sampled one.
   * @returns {Tr2Blitter} This, for chaining.
   */
  SetBlitEffects(blitEffect, blitFilteredEffect = null)
  {
    this._blitEffect = blitEffect;
    this._blitFilteredEffect = blitFilteredEffect;

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
    return this._screenVertexDecl;
  }

  /** Whether the blitter has what it needs to draw an untextured material. */
  IsPrepared()
  {
    return this._screenVertexDecl !== -1 && this._vertexBuffer !== null;
  }

  /**
   * Carbon: Tr2DeviceResource::PrepareResources (trinity/trinity/Tr2DeviceResource.cpp:21-33), which
   * the blitter's constructor calls (`Tr2Blitter.cpp:28`).
   *
   * @adapted Called at first use rather than construction, and renews JS residency; the base keeps
   *   the creation gate and readiness state.
   * @returns {boolean} False when OnPrepareResources fails.
   */
  PrepareResources()
  {
    this.KeepAlive();
    return Tr2DeviceResource.prototype.PrepareResources.call(this);
  }

  /**
   * Interns the vertex declaration and creates the vertex buffer on the main-thread render context.
   *
   * Carbon `OnPrepareResources` (`Tr2Blitter.cpp:167-185`). Both halves test before building, so it
   * is idempotent, as Carbon's is.
   *
   * @adapted A main context with no backend installed creates no buffer, so DrawHelper refuses.
   * @returns {boolean} Carbon returns true unconditionally, and so does this.
   */
  _OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (this._screenVertexDecl === -1)
    {
      // Carbon's exact spelling: m_screenVertexDecl =
      // Tr2EffectStateManager::GetVertexDeclarationHandle( vd ) (cpp:172).
      this._screenVertexDecl = Tr2EffectStateManager.getVertexDeclarationHandle(screenVertexDefinition());
    }

    // Carbon's DrawHelper returns false when the buffer is invalid
    // (`cpp:109-112`) and the caller clears instead, so a blitter without a
    // device DEGRADES rather than throws. A context with no backend installed
    // is that case; asking it for a buffer is a loud error everywhere else, and
    // should stay one.
    if (!this._vertexBuffer && renderContext.GetRenderContextAL())
    {
      // WRITE_OFTEN because the quad is rewritten every draw; VERTEX_BUFFER
      // because that is all it is ever bound as. Carbon's own flags
      // (`Tr2Blitter.cpp:175`).
      this._vertexBuffer = renderContext.CreateBuffer(Tr2BufferDescriptionAL.create__Stride(
        SCREEN_VERTEX_BYTES,
        SCREEN_QUAD_VERTICES,
        Tr2GpuUsage.VERTEX_BUFFER,
        Tr2CpuUsage.WRITE_OFTEN
      ));
    }

    return true;
  }

  /** @cjs Thin public entry for this helper, without Blue schema/value exposure. */
  Destruct()
  {
    CjsGraph.destruct(this);
  }

  /**
   * Unregisters the blitter's global shader variables.
   * Carbon: ~Tr2Blitter (trinity/trinity/Tr2Blitter.cpp:31-35).
   * @adapted Retains existing owned effect/buffer release after native global unregister.
   * @returns {void}
   */
  _Destructor()
  {
    const store = Tr2VariableStore.globalStore();
    store.UnregisterVariable(BLIT_SOURCE);
    store.UnregisterVariable("mipLevel");
    this._textureReference.SetTexture(null);
    if (this._vertexBuffer) this._vertexBuffer.Destroy();
    this._vertexBuffer = null;
    this._screenVertexDecl = -1;
    if (this._blitEffect) this._blitEffect.Destruct();
    if (this._blitFilteredEffect) this._blitFilteredEffect.Destruct();
    this._blitEffect = null;
    this._blitFilteredEffect = null;
  }

  /**
   * Carbon: Tr2Blitter::ReleaseResources (trinity/trinity/Tr2Blitter.cpp:187-190): only the declaration
   * handle is dropped; the vertex buffer is kept and released with the blitter.
   *
   * @implemented
   * @param {number} _s TriStorageFlags, unused by Carbon.
   */
  ReleaseResources(_s)
  {
    this._screenVertexDecl = -1;
  }

  /**
   * Draws a screen quad with a material, optionally over a texture.
   *
   * Carbon's `DrawHelper` (`Tr2Blitter.cpp:100-159`), which every Draw__*
   * overload and DrawInCameraSpace call.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} shader The material's `Tr2Shader`.
   * @param {object} material The material to draw with.
   * @param {object|null} texture A texture to publish as `BlitSource`.
   * @param {boolean} isCameraSpace Whether to unproject the corners.
   * @param {ArrayLike<number>} [tlTexCoord]
   * @param {ArrayLike<number>} [brTexCoord]
   * @param {ArrayLike<number>} [tlVertexCoord]
   * @param {ArrayLike<number>} [brVertexCoord]
   * @returns {boolean} Whether the quad was drawn.
   */
  DrawHelper(renderContext, shader, material, texture, isCameraSpace,
    tlTexCoord = TL_DEFAULT, brTexCoord = BR_DEFAULT, tlVertexCoord = TL_DEFAULT, brVertexCoord = BR_DEFAULT)
  {
    // Carbon asserts on a null material and then returns false anyway, because
    // "final build should not crash even if we get here with a null effect"
    // (`cpp:101-107`). The refusal is the part that ships.
    if (!material || !shader) return false;

    // Carbon's device tick has prepared it (cpp:109-112 only checks); ours prepares at use.
    this.PrepareResources();
    if (!this.IsPrepared()) return false;

    if (isCameraSpace)
    {
      // Carbon asserts the vertex coordinates are the full quad here
      // (`cpp:126-127`), because the camera-space builder ignores them.
      Tr2RenderUtils.setupScreenQuadInCameraSpace(this._quad, renderContext);
    }
    else
    {
      Tr2RenderUtils.setupScreenQuad(this._quad, renderContext, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord);
    }

    const mapped = this._vertexBuffer.MapForWriting(renderContext);
    if (!mapped.data) return false;

    new Float32Array(mapped.data.buffer, mapped.data.byteOffset, SCREEN_QUAD_FLOATS).set(this._quad);
    this._vertexBuffer.UnmapForWriting(renderContext);

    const esm = renderContext.GetEffectStateManager();

    esm.ApplyVertexDeclaration(this._screenVertexDecl);
    esm.ApplyStreamSource(0, this._vertexBuffer, 0, SCREEN_VERTEX_BYTES);

    // Carbon publishes the source texture through the GLOBAL VARIABLE STORE
    // rather than binding it (`cpp:136-144`), because the blit shaders declare
    // a `BlitSource` sampler by name and the material's own parameter path
    // resolves it. It clears the entry afterwards so the next blit cannot
    // inherit this one's texture.
    const blitSource = texture ? Tr2VariableStore.globalStore().GetVariable(BLIT_SOURCE) : null;

    if (blitSource)
    {
      this._textureReference.SetTexture(texture);
      blitSource.SetValue(this._textureReference);
    }

    try
    {
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
    }
    finally
    {
      if (blitSource)
      {
        this._textureReference.SetTexture(null);
        blitSource.Clear();
      }
    }

    return true;
  }

  /**
   * Carbon's bare Draw is not supported: telling a material from a texture
   * would need a type check on our own classes. Call the specific overload:
   * Draw__Texture, Draw__TextureVertexCoords, Draw__EffectTexture,
   * Draw__EffectTextureTexCoords, Draw__EffectTextureVertexCoords, Draw__Effect,
   * Draw__EffectTexCoords or Draw__EffectVertexCoords. In these names TexCoords
   * is tlTexCoord/brTexCoord and VertexCoords is tlVertexCoord/brVertexCoord;
   * the VertexCoords forms always carry their tex coords too.
   */
  Draw()
  {
    throw new Error("Tr2Blitter.Draw is not supported; call Draw__Texture, Draw__TextureVertexCoords, Draw__EffectTexture, Draw__EffectTextureTexCoords, Draw__EffectTextureVertexCoords, Draw__Effect, Draw__EffectTexCoords or Draw__EffectVertexCoords.");
  }

  /**
   * Carbon's Draw( renderContext, texture, tl, br, filter ) (cpp:42-52): blits
   * a texture with the built-in point or linear blit effect, which are two
   * different effects rather than a sampler setting.
   *
   * @returns {boolean} Whether the quad was drawn.
   */
  Draw__Texture(renderContext, texture, tlTexCoord = TL_DEFAULT, brTexCoord = BR_DEFAULT, filter = Filtering.FILTER_POINT)
  {
    // Carbon's switch has no default and falls through to `return false` for an
    // unknown filter (`cpp:43-50`).
    let material = null;
    if (filter === Filtering.FILTER_POINT) material = this._blitEffect;
    else if (filter === Filtering.FILTER_LINEAR) material = this._blitFilteredEffect;
    return this._DrawMaterial(renderContext, material, texture, tlTexCoord, brTexCoord);
  }

  /** Carbon's Draw( renderContext, texture, tl, br, tlV, brV ) (cpp:54): the point blit effect. */
  Draw__TextureVertexCoords(renderContext, texture, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord)
  {
    return this._DrawMaterial(renderContext, this._blitEffect, texture, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord);
  }

  /** Carbon's Draw( renderContext, effect, texture ) (cpp:59). */
  Draw__EffectTexture(renderContext, effect, texture)
  {
    return this._DrawMaterial(renderContext, effect, texture);
  }

  /** Carbon's Draw( renderContext, effect, texture, tl, br ) (cpp:64). */
  Draw__EffectTextureTexCoords(renderContext, effect, texture, tlTexCoord, brTexCoord)
  {
    return this._DrawMaterial(renderContext, effect, texture, tlTexCoord, brTexCoord);
  }

  /** Carbon's Draw( renderContext, effect, texture, tl, br, tlV, brV ) (cpp:69). */
  Draw__EffectTextureVertexCoords(renderContext, effect, texture, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord)
  {
    return this._DrawMaterial(renderContext, effect, texture, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord);
  }

  /** Carbon's Draw( renderContext, material ) (cpp:82): a fullscreen shader. */
  Draw__Effect(renderContext, effect)
  {
    return this._DrawMaterial(renderContext, effect, null);
  }

  /** Carbon's Draw( renderContext, effect, tl, br ) (cpp:89). */
  Draw__EffectTexCoords(renderContext, effect, tlTexCoord, brTexCoord)
  {
    return this._DrawMaterial(renderContext, effect, null, tlTexCoord, brTexCoord);
  }

  /** Carbon's Draw( renderContext, effect, tl, br, tlV, brV ) (cpp:36-39). */
  Draw__EffectVertexCoords(renderContext, effect, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord)
  {
    return this._DrawMaterial(renderContext, effect, null, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord);
  }

  /**
   * The Draw__* overloads' shared call into DrawHelper with the material's own
   * shader. Adapted: a null material, or one whose resource is not good, is not
   * drawn; asking renews what the effect holds.
   */
  _DrawMaterial(renderContext, material, texture, tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord)
  {
    if (!material) return false;
    if (!material.IsGood()) return false;

    return this.DrawHelper(renderContext, material.GetShaderStateInterface(), material, texture, false,
      tlTexCoord, brTexCoord, tlVertexCoord, brVertexCoord);
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

be.inherit(Tr2DeviceResource)(Tr2Blitter);
