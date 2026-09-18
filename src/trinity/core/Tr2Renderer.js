// Source: trinity/trinity/Tr2Renderer.h
// Source: trinity/trinity/Tr2Renderer.cpp
//
// The renderer-wide facade: the constant-buffer register map, the frame clock,
// and the projection and view state every pass reads.
//
// HALF STATIC, HALF NOT, AND THE SPLIT IS DATED. Carbon's `Tr2Renderer` is
// entirely static - 106 of 106 members - and a process-wide singleton.
//
// On 2026-09-05 the operator decided ours would be an instance instead. The
// reason that carried the decision was that this runtime supported more than
// one library instance, each with its own resource manager, and a static
// renderer would silently make the second one share the first one's frame
// clock and projection.
//
// THAT PREMISE IS GONE. The composition-root decision of 2026-09-17 closed the
// door on multiple instances: there is one CarbonEngineJS per page, examined
// properly and shut deliberately. So on 2026-09-18 the six frame members
// Carbon's `TriDevice::Render` calls went back to being static, which is what
// let the frame body be ported at all - a static reaching the ambient render
// context is the whole mechanism.
//
// The rest of the class is still instance members: the register map below, the
// blitter, the projection and view state. That is not a second decision, it is
// unfinished work, and it is recorded in the wrong-shape register in
// `docs/projects/port-fidelity-burn-down.md`.
//
// WHY THE REGISTER MAP IS HERE AND NOT IN AN ENGINE. Carbon keeps these six
// numbers as `Tr2Renderer` statics (`Tr2Renderer.cpp:38-43`), because they are
// the contract between Trinity and EVERY backend rather than one backend's
// detail. They lived in the WebGPU engine until now, where a second backend
// could not have reached them without copying them.

import { carbon, impl, type } from "#schema";
import { Tr2Blitter } from "./Tr2Blitter.js";
import { AdjustTextureCoordsToViewport } from "./Tr2RenderUtils.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { Tr2VariableStore } from "./variable/Tr2VariableStore.js";
import { gTriDev } from "./device/gTriDev.js";


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
 * one is composed at runtime by the library, carries no `@edit` field, and is
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

  // ------------------------------------------------------------------------
  // THE FRAME STATICS. Source: Tr2Renderer.h:125-133, Tr2Renderer.cpp:1040-1091
  // and :1229-1271.
  //
  // These six are static in Carbon and static here, and they are the ones
  // `TriDevice::Render` calls. They reach the ambient main-thread render
  // context exactly as Carbon's do, through the macro
  // `USE_MAIN_THREAD_RENDER_CONTEXT`; the JS equivalent is the free function
  // that macro wraps.
  //
  // FIVE OF THEM WERE INSTANCE METHODS ON `Tr2RenderContext`, which in Carbon
  // has none of them. That happened because ambient reach was unavailable
  // while the retired graph/realization split was in force, so a static had
  // nothing to act on and the behaviour migrated to the instance that did.
  // ------------------------------------------------------------------------

  /**
   * The animation clock, in seconds (`Tr2Renderer.cpp:1030-1033`).
   *
   * Carbon's body is one line - `gTriDev->GetAnimationTime()` - and so is
   * this. The clock itself is `TriDevice::m_animationTime`, advanced by the
   * tick; nothing here holds a copy.
   *
   * @returns {number} Seconds since the clock was last recentred.
   */
  @carbon.method
  @impl.implemented
  static GetAnimationTime()
  {
    return gTriDev.device.GetAnimationTime();
  }

  /**
   * Seconds elapsed on the animation clock since `startTime`
   * (`Tr2Renderer.cpp:1035-1038`), correct across the hourly recentre.
   *
   * @param {number} startTime An earlier reading of the animation clock.
   * @returns {number} The elapsed seconds.
   */
  @carbon.method
  @impl.implemented
  static GetAnimationTimeElapsed(startTime)
  {
    return gTriDev.device.GetAnimationTimeElapsed(startTime);
  }

  /**
   * Publishes the per-frame "Time" vector every shader reads.
   *
   * x is the animation time, y its fractional part - a free 0..1 sawtooth -
   * z the frame counter, and w the PREVIOUS frame's animation time, which is
   * what lets a shader compute its own delta. Carbon registers the variable
   * once (`Tr2Renderer.cpp:330`) and assigns it here (`:1040-1051`); w comes
   * from the variable's own prior value, not from a second clock.
   *
   * @returns {number[]} The published vector.
   */
  @carbon.method
  @impl.implemented
  static BeginFrame()
  {
    const variable = Tr2Renderer.#RenderTimeVariable();
    const previous = variable?.GetValue() ?? [ 0, 0, 0, 0 ];

    const animationTime = gTriDev.device.GetAnimationTime();
    const time = [
      animationTime,
      animationTime - Math.floor(animationTime),
      Number(Tr2Renderer.GetCurrentFrameCounter()),
      previous[0] ?? 0
    ];

    variable?.SetValue(time);
    return time;
  }

  /**
   * Ends the frame, clearing the debug drawing accumulated during it.
   *
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon clears two of its own statics, s_debugTextRenderer and s_debugLineSet (Tr2Renderer.cpp:1053-1064). Neither type is ported; the installed debug renderer on the ambient context is the only thing here that accumulates per-frame debug drawing, so it is what gets cleared.")
  static EndFrame()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    // `SetDebugRenderer` takes whatever a render job hands it, and Carbon's own
    // type is not ported, so this is a foreign object. Asked explicitly rather
    // than hedged, because the question really is "does this thing clear".
    const debugRenderer = renderContext.GetDebugRenderer();
    if (typeof debugRenderer?.Clear === "function") debugRenderer.Clear();
  }

  /**
   * Opens the scene on the ambient render context (`Tr2Renderer.cpp:1066-1070`).
   *
   * @returns {*} Whatever the backend's BeginScene returns.
   */
  @carbon.method
  @impl.implemented
  static BeginRenderContext()
  {
    return Tr2RenderContext_GetMainThreadRenderContext().BeginScene();
  }

  /**
   * Clears the transient pool, then closes the scene (`Tr2Renderer.cpp:1072-1081`).
   *
   * The clear happens BEFORE EndScene, so every payload leased during the
   * frame dies at one point.
   *
   * @returns {*} Whatever the backend's EndScene returns.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's pool allocator is a Tr2Renderer static (s_poolAllocator); ours is per render context, so this clears the ambient context's. Moving the pool is open work - it has three call sites that read it off a context they were handed.")
  static EndRenderContext()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    renderContext.GetTriPoolAllocator()?.Clear();
    return renderContext.EndScene();
  }

  /**
   * The frame the render path is currently working on.
   *
   * Carbon reads `g_currentFrameCounter`, which lives in `TriDevice.cpp:143`
   * and is advanced by the tick at `:805` - so the counter is the device's and
   * this only reads it (`Tr2Renderer.cpp:1088-1091`).
   *
   * @returns {number} The frame number.
   */
  @carbon.method
  @impl.implemented
  static GetCurrentFrameCounter()
  {
    return gTriDev.device.GetCurrentFrameCounter();
  }

  /**
   * Grows the shared quad-list index buffer to hold `numOfQuads` quads.
   *
   * @param {number} [numOfQuads] Quads the caller needs indices for.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The early-outs are ported because TriDevice::Render calls this with zero every frame, and Carbon returns immediately for that. Actually growing the buffer needs CreateIndexBuffer and a Tr2SuballocatedBuffer allocation, neither of which is reachable yet, so it refuses rather than pretending. Carbon's IsResourceCreationAllowed guard has no counterpart here either.")
  static ReserveQuadListIndexBuffer(numOfQuads = 0)
  {
    let requested = Math.max(Number(numOfQuads) || 0, 0);

    if (requested <= Tr2Renderer.#quadListSize && Tr2Renderer.#quadListIndexBuffer) return;

    requested = Math.max(requested, Tr2Renderer.#quadListSize);
    if (requested === 0) return;

    throw new Error(
      "Tr2Renderer.ReserveQuadListIndexBuffer cannot grow the quad-list index buffer: " +
      "index-buffer creation through Tr2SuballocatedBuffer is not implemented in CarbonEngineJS."
    );
  }

  /**
   * The shared quad-list index buffer allocation (`Tr2Renderer.cpp:1267-1270`).
   *
   * @returns {object|null} The allocation, or null while none has been made.
   */
  @carbon.method
  @impl.implemented
  static GetQuadListIndexBuffer()
  {
    return Tr2Renderer.#quadListIndexBuffer;
  }

  /** Carbon s_quadListSize. */
  static #quadListSize = 0;

  /** Carbon s_quadListIndexBuffer. */
  static #quadListIndexBuffer = null;

  /**
   * Carbon's `s_renderTimeVar`, registered once and assigned every frame.
   *
   * @returns {object|null} The "Time" variable on the global store.
   */
  static #RenderTimeVariable()
  {
    if (!Tr2Renderer.#renderTimeVar)
    {
      Tr2Renderer.#renderTimeVar = Tr2VariableStore.GlobalStore().RegisterVariable("Time", [ 0, 0, 0, 0 ]);
    }
    return Tr2Renderer.#renderTimeVar;
  }

  static #renderTimeVar = null;

  /** Carbon's `Tr2RenderContextEnum::PIXEL_SHADER`, the one stage that differs. */
  static PIXEL_SHADER = 1;
}
