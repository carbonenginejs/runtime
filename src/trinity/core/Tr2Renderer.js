// Source: trinity/trinity/Tr2Renderer.h
// Source: trinity/trinity/Tr2Renderer.cpp
//
// The renderer-wide facade: the constant-buffer register map, the frame clock,
// and the projection and view state every pass reads.
//
// ONE DELIBERATE DEPARTURE, DECIDED BY THE OPERATOR ON 2026-09-05. Carbon's
// `Tr2Renderer` is entirely STATIC - a process-wide singleton. Ours is an
// instance the composition root creates and hands out. Two reasons, and the
// second is the one that matters:
//
// - a page is unlikely to want two backends at once, so the singleton is not
//   buying much;
// - but this runtime already supports more than one library instance with its
//   own resource manager, and a static renderer would silently make the second
//   one share the first one's frame clock and projection. That is a bug nobody
//   would look for.
//
// The composition root creating one is not the same as the composition root
// BECOMING a renderer, which `runtime/docs/core/roadmap.md` rules out: this
// class holds GPU-free state and the library composes it, exactly as it
// composes a resource manager it does not implement.
//
// WHY THE REGISTER MAP IS HERE AND NOT IN AN ENGINE. Carbon keeps these six
// numbers as `Tr2Renderer` statics (`Tr2Renderer.cpp:38-43`), because they are
// the contract between Trinity and EVERY backend rather than one backend's
// detail. They lived in the WebGPU engine until now, where a second backend
// could not have reached them without copying them.

import { carbon, impl, type } from "#schema";
import { Tr2Blitter } from "./Tr2Blitter.js";
import { AdjustTextureCoordsToViewport } from "./Tr2RenderUtils.js";


/** perFrameVS, owned by the scene. */
export const PER_FRAME_VS = 1;

/** perFramePS, owned by the scene. */
export const PER_FRAME_PS = 2;

/** The effect's own constants. */
export const EFFECT_CONSTANTS = 0;

/** perObjectVS, owned by the object being drawn. */
export const PER_OBJECT_VS = 3;

/** perObjectPS, owned by the object being drawn. */
export const PER_OBJECT_PS = 4;

// THERE WAS A REVERSE MAP HERE AND IT IS GONE. A register-number-to-name table
// looked necessary because a caller reading a pipeline's DECLARED bindings has a
// number and wants to know what it means. It is not: the numbers are fixed and
// this class owns them, so the question is answered by comparing against the
// accessors below - which is how Carbon answers it, and why Carbon has no such
// table. The names only ever reached a diagnostic string.


/**
 * Renderer-wide state: the register map now, the frame clock and camera later.
 *
 * NOT A `CjsModel`, and the reason is CATEGORY RATHER THAN COST. Operator,
 * 2026-09-05: "CjsModel is only for things that actually need to hydrate", and
 * "there should be little cost in making something a CjsModel". Both are true
 * at once, and the second is why the first has to be stated as a rule - if the
 * base were expensive, nobody would need telling.
 *
 * A model is an object that arrives from a `.red`/`.black` values graph. This
 * one is composed at runtime by the library, carries no `@io` field, and is
 * named as a type by nothing, so a hydration identity describes something that
 * can never happen. The same goes for the abstraction layer and the resource
 * and GPU classes - none of them is ever part of a serialized object. The AL
 * family already complies.
 *
 * IT IS STILL DECORATED, and that is the point worth keeping straight:
 * decorators are not only hydration. `@type.define` gives the class an
 * identity that tooling and the UI read, and `@carbon.method` is how the
 * parity audit sees a method at all. Dropping `CjsModel` costs neither.
 */
@type.define({ className: "Tr2Renderer", family: "trinityCore" })
export class Tr2Renderer
{
  // Carbon's header calls these the defaults "for the currently set shader
  // model" and they are mutable statics, but nothing ever reassigns them, so
  // they are constants in practice. Kept as fields rather than inlined so a
  // shader model that did move them has somewhere to move them to.

  /** s_perFrameVSStartRegister */
  #perFrameVSStartRegister = PER_FRAME_VS;

  /** s_perFramePSStartRegister */
  #perFramePSStartRegister = PER_FRAME_PS;

  /** s_perObjectVSStartRegister */
  #perObjectVSStartRegister = PER_OBJECT_VS;

  /** s_perObjectPSStartRegister */
  #perObjectPSStartRegister = PER_OBJECT_PS;

  /** s_perObjectRTVertexBufferDataRegister */
  #perObjectRTVertexBufferDataRegister = 5;

  /** s_perObjectVSGUIStartRegister */
  #perObjectVSGUIStartRegister = 6;

  /**
   * The register the scene's per-frame vertex constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @carbon.method
  @impl.implemented
  GetPerFrameVSStartRegister()
  {
    return this.#perFrameVSStartRegister;
  }

  /**
   * The register the scene's per-frame pixel constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @carbon.method
  @impl.implemented
  GetPerFramePSStartRegister()
  {
    return this.#perFramePSStartRegister;
  }

  /**
   * The register an object's per-object vertex constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @carbon.method
  @impl.implemented
  GetPerObjectVSStartRegister()
  {
    return this.#perObjectVSStartRegister;
  }

  /**
   * The register an object's per-object pixel constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @carbon.method
  @impl.implemented
  GetPerObjectPSStartRegister()
  {
    return this.#perObjectPSStartRegister;
  }

  /**
   * The register ray-traced vertex-buffer data binds at.
   *
   * @returns {number} A constant-buffer register.
   */
  @carbon.method
  @impl.implemented
  GetPerObjectRTVertexBufferDataRegister()
  {
    return this.#perObjectRTVertexBufferDataRegister;
  }

  /**
   * The register the GUI's per-object vertex constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @carbon.method
  @impl.implemented
  GetPerObjectVSGUIStartRegister()
  {
    return this.#perObjectVSGUIStartRegister;
  }

  /**
   * The per-object register for one shader stage.
   *
   * Carbon's overload pair collapses to a default: the pixel stage has its own
   * register and every other stage shares the vertex one
   * (`Tr2Renderer.h:65-81`).
   *
   * @param {number} [shaderType] A Carbon `ShaderType` value.
   * @returns {number} A constant-buffer register.
   */
  @carbon.method
  @impl.adapted
  GetPerObjectStartRegister(shaderType = 0)
  {
    return shaderType === Tr2Renderer.PIXEL_SHADER
      ? this.GetPerObjectPSStartRegister()
      : this.GetPerObjectVSStartRegister();
  }

  /**
   * Carbon's `s_blitter`: the blitter every screen-space draw runs through.
   *
   * An INSTANCE field rather than Carbon's module global, for the reason this
   * whole class is an instance - a second library instance must not silently
   * share the first one's blitter. Created by `PrepareDeviceResources`, and
   * null until then, which is why every draw below guards on it exactly as
   * Carbon's `if( s_blitter )` does.
   */
  #blitter = null;

  /**
   * Creates the device-dependent resources, the blitter among them.
   *
   * Carbon `PrepareDeviceResources` (`Tr2Renderer.cpp:1273-1281`), which makes
   * the blitter HERE rather than at startup and says why: it loads an effect,
   * so the device has to exist and the shader model has to be settled first.
   * That holds for us too - there is always a device by this point, the stub
   * backend included, which is a real device and not an absence.
   *
   * Carbon also allocates its quad vertex and index buffers and its debug line
   * set here. Those are not ported; this creates the blitter only.
   *
   * @param {object} [renderContext] The context to prepare the blitter against.
   * @returns {Tr2Blitter} The renderer's blitter.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon also allocates the quad vertex and index buffers and the debug line set here; only the blitter is ported.")
  PrepareDeviceResources(renderContext = null)
  {
    this.#blitter ??= new Tr2Blitter();
    if (renderContext) this.#blitter.PrepareResources(renderContext);
    return this.#blitter;
  }

  /**
   * Returns the blitter, or null before `PrepareDeviceResources` has run.
   *
   * @returns {Tr2Blitter|null} The renderer's blitter.
   */
  GetBlitter()
  {
    return this.#blitter;
  }

  /**
   * Draws a fullscreen quad with a material.
   *
   * Carbon `DrawScreenQuad( renderContext, Tr2Material* )`
   * (`Tr2Renderer.cpp:1006-1012`).
   *
   * TEXTURE COORDINATES ARE NOT VIEWPORT-CORRECTED HERE, and that is Carbon's
   * behaviour rather than an omission: only the `DrawTexture` family adjusts
   * them. `AdjustTextureCoordsToViewport` records what the correction is and
   * why folding it into the blitter would move every screen-quad draw.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} material The material to draw with.
   * @returns {boolean} Whether the quad was drawn.
   */
  @carbon.method
  @impl.implemented
  DrawScreenQuad(renderContext, material)
  {
    if (!this.#blitter) return false;
    return this.#blitter.Draw(renderContext, material);
  }

  /**
   * Draws a quad with an effect over an explicit screen rectangle.
   *
   * Carbon `DrawScreenQuad( renderContext, Tr2Effect*, topLeft, bottomRight )`
   * (`Tr2Renderer.cpp:1014-1020`), which passes the full [0,1] TEXTURE range and
   * the caller's corners as the VERTEX rectangle. Carbon distinguishes the two
   * by overload; JavaScript has no overloads, so the rectangle form is named.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} effect The effect to draw with.
   * @param {Array<number>} topLeft Top-left vertex corner.
   * @param {Array<number>} bottomRight Bottom-right vertex corner.
   * @returns {boolean} Whether the quad was drawn.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon distinguishes this from the material form by overload; JavaScript has none, so the rectangle form carries its own name.")
  DrawScreenQuadRect(renderContext, effect, topLeft, bottomRight)
  {
    if (!this.#blitter) return false;
    return this.#blitter.Draw(renderContext, effect, null, {
      tlTexCoord: [ 0, 0 ],
      brTexCoord: [ 1, 1 ],
      tlVertexCoord: topLeft,
      brVertexCoord: bottomRight
    });
  }

  /**
   * Draws the quad in camera space rather than screen space.
   *
   * Carbon `DrawCameraSpaceScreenQuad` (`Tr2Renderer.cpp:1022-1028`).
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} shader The shader state interface to run.
   * @param {object} material The material supplying its parameters.
   * @returns {boolean} Whether the quad was drawn.
   */
  @carbon.method
  @impl.implemented
  DrawCameraSpaceScreenQuad(renderContext, shader, material)
  {
    if (!this.#blitter) return false;
    return this.#blitter.DrawInCameraSpace(renderContext, shader, material);
  }

  /**
   * Draws a unit quad with the given material and no texture.
   *
   * Carbon `DrawFullScreenWithShader` (`Tr2Renderer.cpp:768-775`).
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} material The material to draw with.
   * @returns {boolean} Whether the quad was drawn.
   */
  @carbon.method
  @impl.implemented
  DrawFullScreenWithShader(renderContext, material)
  {
    if (!this.#blitter) return false;
    return this.#blitter.Draw(renderContext, material);
  }

  /**
   * Blits a texture, correcting its coordinates for the device viewport.
   *
   * Carbon's four `DrawTexture` overloads (`Tr2Renderer.cpp:750-834`) collapse
   * into one: the material is optional, and without one the filter selects a
   * built-in blit effect. THIS family adjusts the texture coordinates where
   * `DrawScreenQuad` does not - Carbon draws that distinction and it is load
   * bearing.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} texture The texture to blit.
   * @param {object} [options] `material`, `tlTexCoord`, `brTexCoord`, `filter`.
   * @returns {boolean} Whether the quad was drawn.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's four overloads differ only in an optional material and optional coordinates, which are defaults here.")
  DrawTexture(renderContext, texture, options = {})
  {
    if (!this.#blitter) return false;

    const { tlTexCoord, brTexCoord } = AdjustTextureCoordsToViewport(
      renderContext,
      options.tlTexCoord ?? [ 0, 0 ],
      options.brTexCoord ?? [ 1, 1 ]
    );

    return options.material
      ? this.#blitter.Draw(renderContext, options.material, texture, { tlTexCoord, brTexCoord })
      : this.#blitter.DrawTexture(renderContext, texture, { tlTexCoord, brTexCoord }, options.filter);
  }

  /** Carbon's `Tr2RenderContextEnum::PIXEL_SHADER`, the one stage that differs. */
  static PIXEL_SHADER = 1;
}
