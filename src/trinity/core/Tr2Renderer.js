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


/** perFrameVS, owned by the scene. */
export const PER_FRAME_VS = 1;

/** perFramePS, owned by the scene. */
export const PER_FRAME_PS = 2;

/** The effect's own constants. */
export const EFFECT_CONSTANTS = 0;

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
  #perObjectVSStartRegister = 3;

  /** s_perObjectPSStartRegister */
  #perObjectPSStartRegister = 4;

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

  /** Carbon's `Tr2RenderContextEnum::PIXEL_SHADER`, the one stage that differs. */
  static PIXEL_SHADER = 1;
}
