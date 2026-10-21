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
// The view and projection state went static on 2026-10-18 (Ruling 9), with
// Carbon's setters, getters and save stacks; it had lived on each
// Tr2RenderContext. The register map below is still instance members; the
// blitter is process-wide again. That is not a second decision, it is
// unfinished work, tracked as a known wrong shape.
//
// WHY THE REGISTER MAP IS HERE AND NOT IN AN ENGINE. Carbon keeps these six
// numbers as `Tr2Renderer` statics (`Tr2Renderer.cpp:38-43`), because they are
// the contract between Trinity and EVERY backend rather than one backend's
// detail. They lived in the WebGPU engine until now, where a second backend
// could not have reached them without copying them.

import * as CcpLog from "../../global/logging/ccpLog.js";
import { meta, blue } from "#schema";
import { Tr2Blitter } from "./Tr2Blitter.js";
import { TriDebugTextRenderer } from "./TriDebugTextRenderer.js";
import { TriLineSet } from "./line/TriLineSet.js";
import { TriSettingsRegistrar } from "./TriSettingsRegistrar.js";
import { Tr2RenderUtils } from "./Tr2RenderUtils.js";
import { Tr2RenderContext, Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { Tr2VariableStore } from "./variable/Tr2VariableStore.js";
import { gTriDev } from "./device/gTriDev.js";
import { Failed } from "../../trinityal/ALResult.js";
import { Tr2SuballocatedBufferAllocation } from "./device/Tr2SuballocatedBuffer/index.js";
import { SharedGeometryBuffer } from "./mesh/TriGeometryResAllocations.js";
import { TR2SHADERMODEL, TriStorageFlags } from "#consts/graphics";
import { ShaderType } from "#consts/render-context";
import { TriVariableContentType } from "../generated/trinityCore/enums.js";
import { PROJECTION_TYPE } from "../generated/shader/enums.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";


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

/** GUI transform-array vertex constants, Carbon s_perObjectVSGUIStartRegister. */
export const PER_OBJECT_VS_GUI = 6;

/** The default viewportAdjustment, Carbon's IdentityMatrix() (Tr2Renderer.h:139-157). Never written. */
const IDENTITY = mat4.create();

/** The six frustum-plane variable names, by Carbon's plane index (Tr2Renderer.cpp:341-346). */
const FRUSTUM_PLANES = [ "FrustumPlane0", "FrustumPlane1", "FrustumPlane2", "FrustumPlane3", "FrustumPlane4", "FrustumPlane5" ];

// Scratch for ProjectWorldToScreen and SetProjectionDerivedValues, and for the
// frustum planes; the variable store copies what it is given.
const PROJECT_SCRATCH = new Float32Array(4);
const PLANE_SCRATCH = new Float32Array(4);

// THERE WAS A REVERSE MAP HERE AND IT IS GONE. A register-number-to-name table
// looked necessary because a caller reading a pipeline's DECLARED bindings has a
// number and wants to know what it means. It is not: the numbers are fixed and
// this class owns them, so the question is answered by comparing against the
// accessors below - which is how Carbon answers it, and why Carbon has no such
// table. The names only ever reached a diagnostic string.


/**
 * Owns renderer-wide shader register defaults and runtime rendering state.
 * Composed by the library without authored fields or serialized instance state.
 * Class and method decorators expose identity and native contracts to tooling
 * independently of graph hydration.
 */
@meta.carbon("Tr2Renderer")
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
  #perObjectVSGUIStartRegister = PER_OBJECT_VS_GUI;

  /**
   * The register the scene's per-frame vertex constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @blue.method
  @meta.implemented
  GetPerFrameVSStartRegister()
  {
    return this.#perFrameVSStartRegister;
  }

  /**
   * The register the scene's per-frame pixel constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @blue.method
  @meta.implemented
  GetPerFramePSStartRegister()
  {
    return this.#perFramePSStartRegister;
  }

  /**
   * The register an object's per-object vertex constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @blue.method
  @meta.implemented
  GetPerObjectVSStartRegister()
  {
    return this.#perObjectVSStartRegister;
  }

  /**
   * The register an object's per-object pixel constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @blue.method
  @meta.implemented
  GetPerObjectPSStartRegister()
  {
    return this.#perObjectPSStartRegister;
  }

  /**
   * The register ray-traced vertex-buffer data binds at.
   *
   * @returns {number} A constant-buffer register.
   */
  @blue.method
  @meta.implemented
  GetPerObjectRTVertexBufferDataRegister()
  {
    return this.#perObjectRTVertexBufferDataRegister;
  }

  /**
   * The register the GUI's per-object vertex constants bind at.
   *
   * @returns {number} A constant-buffer register.
   */
  @blue.method
  @meta.implemented
  GetPerObjectVSGUIStartRegister()
  {
    return this.#perObjectVSGUIStartRegister;
  }

  /**
   * The per-object register for one shader stage.
   *
   * Carbon's template<ShaderType> form and its runtime overload are one
   * method here: the template parameter becomes this explicit argument. The
   * pixel stage has its own register and every other stage shares the vertex
   * one (`Tr2Renderer.h:65-81`).
   *
   * @param {number} shaderType A Carbon `ShaderType` value.
   * @returns {number} A constant-buffer register.
   */
  @blue.method
  @meta.adapted
  GetPerObjectStartRegister(shaderType)
  {
    return shaderType === Tr2Renderer.PIXEL_SHADER
      ? this.GetPerObjectPSStartRegister()
      : this.GetPerObjectVSStartRegister();
  }

  /** Carbon process-wide s_blitter (Tr2Renderer.cpp:25). */
  static #blitter = null;

  /** Carbon s_debugTextRenderer (Tr2Renderer.cpp:96), created by initialize. */
  static #debugTextRenderer = null;

  /** Carbon s_debugLineSet (Tr2Renderer.cpp:98), created by prepareDeviceResources. */
  static #debugLineSet = null;

  /**
   * Carbon `Initialize` (Tr2Renderer.cpp:330-356), called from
   * `InitializeTrinity`: registers the renderer's global variables - `Time`,
   * then the camera matrices and frustum planes - once, at start-up.
   *
   * Adapted: the variables are the same objects the view and projection
   * setters and `BeginFrame` use, which still create them on first use for code that runs
   * without `InitializeTrinity` (tests building a context directly). Not
   * ported: `s_poolAllocator` (JS allocates). The effect state manager registers `ViewportSize`
   * (Tr2EffectStateManager.cpp:631-637) at construction so standalone contexts
   * also publish it before material mapping.
   *
   * @returns {boolean} True, as Carbon's.
   */
  @meta.adapted
  static initialize()
  {
    Tr2Renderer.#debugTextRenderer = new TriDebugTextRenderer();
    Tr2Renderer.#RenderTimeVariable();
    Tr2Renderer._CameraVariables();
    return true;
  }

  /**
   * Releases the fullscreen blitter, the debug text renderer and the debug
   * line set from native Shutdown (cpp:358-373).
   * Partial: the renderer-owned pool is still unported.
   */
  @meta.adapted
  static shutdown()
  {
    if (Tr2Renderer.#blitter) Tr2Renderer.#blitter.Destruct();
    Tr2Renderer.#blitter = null;
    Tr2Renderer.#debugTextRenderer = null;
    Tr2Renderer.#debugLineSet = null;
  }

  /**
   * Creates the device-dependent resources, the blitter among them.
   *
   * Carbon `PrepareDeviceResources` (`Tr2Renderer.cpp:1273-1281`), which makes
   * the blitter HERE rather than at startup and says why: it loads an effect,
   * so the device has to exist and the shader model has to be settled first.
   * That holds for us too - there is always a device by this point, the stub
   * backend included, which is a real device and not an absence.
   *
   * Carbon also allocates its quad vertex buffer here, which is not ported;
   * this creates the blitter and the debug line set (cpp:1293-1296) and
   * reserves the quad-list index buffer.
   *
   * Adapted: Carbon also allocates the quad vertex buffer here; only the
   * blitter, the debug line set and the quad-list index buffer are ported.
   *
   * @param {object} [renderContext] The context to prepare the blitter against.
   * @returns {Tr2Blitter} The renderer's blitter.
   */
  @blue.method
  @meta.adapted
  static prepareDeviceResources(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    Tr2Renderer.#blitter ??= new Tr2Blitter();
    if (renderContext) Tr2Renderer.#blitter.PrepareResources(renderContext);

    Tr2Renderer.#debugLineSet ??= new TriLineSet();

    // "just call the Get* function, it will do the alloc" (cpp:1300-1301).
    Tr2Renderer.ReserveQuadListIndexBuffer(128);
    return Tr2Renderer.#blitter;
  }

  /**
   * Carbon `ReleaseDeviceResources( s )` (`Tr2Renderer.cpp:1316-1327`), which
   * TriDevice calls on device loss and reset: a managed-memory release frees
   * the quad-list index buffer from the shared geometry buffer, so the next
   * `prepareDeviceResources` makes it again.
   *
   * Adapted: the quad vertex buffer and the reversed quad-list index buffer
   * are not ported (see prepareDeviceResources), so only the quad-list index
   * buffer is freed.
   *
   * @param {number} s A `TriStorage` mask.
   * @returns {void}
   */
  @meta.adapted
  static releaseDeviceResources(s)
  {
    if (!(s & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)) return;

    const allocation = Tr2Renderer.#quadListIndexBuffer;
    if (allocation._parent) allocation._parent.Free(allocation);
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
  @blue.method
  @meta.implemented
  static drawScreenQuad(renderContext, material)
  {
    if (!Tr2Renderer.#blitter) return false;
    return Tr2Renderer.#blitter.Draw__Effect(renderContext, material);
  }

  /**
   * Draws a quad with an effect over an explicit screen rectangle.
   *
   * Carbon `DrawScreenQuad( renderContext, Tr2Effect*, topLeft, bottomRight )`
   * (`Tr2Renderer.cpp:1014-1020`), which passes the full [0,1] TEXTURE range and
   * the caller's corners as the VERTEX rectangle. Carbon distinguishes the two
   * by overload; JavaScript has no overloads, so the rectangle form is named.
   *
   * Adapted: Carbon distinguishes this from the material form by overload; JavaScript has
   * none, so the rectangle form carries its own name.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} effect The effect to draw with.
   * @param {Array<number>} topLeft Top-left vertex corner.
   * @param {Array<number>} bottomRight Bottom-right vertex corner.
   * @returns {boolean} Whether the quad was drawn.
   */
  @blue.method
  @meta.adapted
  static drawScreenQuadRect(renderContext, effect, topLeft, bottomRight)
  {
    if (!Tr2Renderer.#blitter) return false;
    return Tr2Renderer.#blitter.Draw__EffectVertexCoords(renderContext, effect, [ 0, 0 ], [ 1, 1 ], topLeft, bottomRight);
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
  @blue.method
  @meta.implemented
  static drawCameraSpaceScreenQuad(renderContext, shader, material)
  {
    if (!Tr2Renderer.#blitter) return false;
    return Tr2Renderer.#blitter.DrawInCameraSpace(renderContext, shader, material);
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
  @blue.method
  @meta.implemented
  static drawFullScreenWithShader(renderContext, material)
  {
    if (!Tr2Renderer.#blitter) return false;
    return Tr2Renderer.#blitter.Draw__Effect(renderContext, material);
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
   * Adapted: Carbon's four overloads differ only in an optional material and optional
   * coordinates, which are defaults here.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} texture The texture to blit.
   * @param {object} [options] `material`, `tlTexCoord`, `brTexCoord`, `filter`.
   * @returns {boolean} Whether the quad was drawn.
   */
  @blue.method
  @meta.adapted
  static drawTexture(renderContext, texture, options = {})
  {
    if (!Tr2Renderer.#blitter) return false;

    const { tlTexCoord, brTexCoord } = Tr2RenderUtils.adjustTextureCoordsToViewport(
      renderContext,
      options.tlTexCoord ?? [ 0, 0 ],
      options.brTexCoord ?? [ 1, 1 ]
    );

    return options.material
      ? Tr2Renderer.#blitter.Draw__EffectTextureTexCoords(renderContext, options.material, texture, tlTexCoord, brTexCoord)
      : Tr2Renderer.#blitter.Draw__Texture(renderContext, texture, tlTexCoord, brTexCoord, options.filter);
  }
  /**
   * Carbon DrawTexture( renderContext, effect, tlTexCoord, brTexCoord )
   * (Tr2Renderer.cpp:806-817): a quad drawn with a material and no source
   * texture, its coordinates adjusted to the viewport first. False without a
   * blitter, as Carbon returns.
   *
   * @param {object} renderContext The context to draw through.
   * @param {object} effect The material to draw with.
   * @param {ArrayLike<number>} tlTexCoord Top-left texture coordinate.
   * @param {ArrayLike<number>} brTexCoord Bottom-right texture coordinate.
   * @returns {boolean} Whether the quad was drawn.
   */
  @blue.method
  @meta.implemented
  static DrawTexture__EffectTexCoords(renderContext, effect, tlTexCoord, brTexCoord)
  {
    if (!Tr2Renderer.#blitter) return false;

    const adjusted = Tr2RenderUtils.adjustTextureCoordsToViewport(renderContext, tlTexCoord, brTexCoord);
    return Tr2Renderer.#blitter.Draw__EffectTexCoords(renderContext, effect, adjusted.tlTexCoord, adjusted.brTexCoord);
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
   * Carbon GetSettings (Tr2Renderer.cpp:1387-1391): the engine settings every
   * `TRI_REGISTER_SETTING` registers into.
   *
   * Adapted: the registry is held by TriSettingsRegistrar, so classes can
   * register without importing the renderer.
   *
   * @returns {TriSettings} The renderer's settings.
   */
  @blue.method
  @meta.adapted
  static getSettings()
  {
    return TriSettingsRegistrar.getSettings();
  }

  /**
   * The animation clock, in seconds (`Tr2Renderer.cpp:1030-1033`).
   *
   * Carbon's body is one line - `gTriDev->GetAnimationTime()` - and so is
   * this. The clock itself is `TriDevice::m_animationTime`, advanced by the
   * tick; nothing here holds a copy.
   *
   * @returns {number} Seconds since the clock was last recentred.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
   * Carbon clears its two statics, s_debugTextRenderer and s_debugLineSet
   * (Tr2Renderer.cpp:1056-1067), and so does this.
   *
   * Adapted: before those statics were ported, this cleared the debug renderer
   * installed on the ambient context instead, and it still does; Carbon's
   * EndFrame does not touch that renderer.
   *
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  static EndFrame()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    // `SetDebugRenderer` takes whatever a render job hands it, and Carbon's own
    // type is not ported, so this is a foreign object. Asked explicitly rather
    // than hedged, because the question really is "does this thing clear".
    const debugRenderer = renderContext.GetDebugRenderer();
    if (typeof debugRenderer?.Clear === "function") debugRenderer.Clear();

    // Carbon EndFrame's own clears (cpp:1056-1067).
    if (Tr2Renderer.#debugTextRenderer)
    {
      Tr2Renderer.#debugTextRenderer.Clear();
    }

    if (Tr2Renderer.#debugLineSet)
    {
      Tr2Renderer.#debugLineSet.Clear();
    }
  }

  /**
   * Carbon RenderDebugInfo (Tr2Renderer.cpp:1377-1390): draws, then clears,
   * the debug text and debug lines queued on the renderer during the frame.
   *
   * @param {Tr2RenderContext} renderContext The context to draw through.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static RenderDebugInfo(renderContext)
  {
    if (Tr2Renderer.#debugTextRenderer)
    {
      Tr2Renderer.#debugTextRenderer.Render(renderContext);
      Tr2Renderer.#debugTextRenderer.Clear();
    }

    if (Tr2Renderer.#debugLineSet)
    {
      Tr2Renderer.#debugLineSet.Render(renderContext);
      Tr2Renderer.#debugLineSet.Clear();
    }
  }

  /**
   * Opens the scene on the ambient render context (`Tr2Renderer.cpp:1066-1070`).
   *
   * @returns {*} Whatever the backend's BeginScene returns.
   */
  @blue.method
  @meta.implemented
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
   * Adapted: Carbon's pool allocator is a Tr2Renderer static (s_poolAllocator); ours is per
   * render context, so this clears the ambient context's. Moving the pool is open work - it
   * has three call sites that read it off a context they were handed.
   *
   * @returns {*} Whatever the backend's EndScene returns.
   */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
  static GetCurrentFrameCounter()
  {
    return gTriDev.device.GetCurrentFrameCounter();
  }

  /**
   * The shader model the renderer runs, which picks tier-dependent geometry
   * such as the booster box or star (`Tr2Renderer.cpp:1147-1150`).
   *
   * @returns {number} A `TR2SHADERMODEL` value.
   */
  @blue.method
  @meta.implemented
  static GetShaderModel()
  {
    return Tr2Renderer.#shaderModel;
  }

  /** Carbon IsLowQuality (Tr2Renderer.cpp:1193-1197): the low shader model or below. */
  @blue.method
  @meta.implemented
  static IsLowQuality()
  {
    return Tr2Renderer.GetShaderModel() <= TR2SHADERMODEL.TR2SM_3_0_LO;
  }

  /**
   * Sets the renderer's shader model.
   *
   * Adapted: Carbon also requests a device reset on change (Tr2Renderer.cpp:1126-1145); no
   * device reset is ported, so nothing rebuilds tier-dependent resources.
   *
   * @param {number} shaderModel A `TR2SHADERMODEL` value.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  static SetShaderModel(shaderModel)
  {
    Tr2Renderer.#shaderModel = shaderModel;
  }

  /**
   * Whether device resources may be created now: the main-thread context has
   * a backend with a device (`Tr2Renderer.cpp:1393-1397`).
   *
   * Adapted: Carbon also ANDs s_isResourceCreationAllowed, which TriDevice clears during a
   * reset (TriDevice.cpp:886); no device reset is ported, so the flag has nothing to clear
   * it.
   *
   * @returns {boolean} True when creation is allowed.
   */
  @blue.method
  @meta.adapted
  static IsResourceCreationAllowed()
  {
    return Tr2RenderContext_GetMainThreadRenderContext().IsValid();
  }

  /**
   * Grows the shared quad-list index buffer to hold `numOfQuads` quads
   * (`Tr2Renderer.cpp:1229-1266`). Sixteen-bit indices while every index
   * fits, thirty-two-bit beyond.
   *
   * @param {number} [numOfQuads] Quads the caller needs indices for.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static ReserveQuadListIndexBuffer(numOfQuads = 0)
  {
    if (!Tr2Renderer.IsResourceCreationAllowed()) return;

    let requested = Math.max(Number(numOfQuads) || 0, 0);

    if (requested <= Tr2Renderer.#quadListSize && Tr2Renderer.#quadListIndexBuffer.IsValid()) return;

    requested = Math.max(requested, Tr2Renderer.#quadListSize);
    if (requested === 0) return;

    const Typed = requested <= Math.floor(0xffff / 6) ? Uint16Array : Uint32Array;

    if (Tr2Renderer.#CreateIndexBuffer(Typed, requested))
    {
      Tr2Renderer.#quadListSize = requested;
    }
  }

  /**
   * Carbon's file-static `CreateIndexBuffer<T>` (`Tr2Renderer.cpp:293-323`):
   * two triangles per quad, (0,2,1) and (0,3,2), into the shared geometry
   * buffer. The previous allocation is returned to its recorded owner before regrowth.
   */
  static #CreateIndexBuffer(Typed, count)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    const indices = new Typed(count * 6);

    for (let quad = 0, at = 0; quad < count; quad++, at += 6)
    {
      const base = 4 * quad;
      indices[at] = base;
      indices[at + 1] = base + 2;
      indices[at + 2] = base + 1;
      indices[at + 3] = base;
      indices[at + 4] = base + 3;
      indices[at + 5] = base + 2;
    }

    const previous = Tr2Renderer.#quadListIndexBuffer;
    if (previous._parent) previous._parent.Free(previous);
    const allocation = SharedGeometryBuffer(renderContext).Allocate(Typed.BYTES_PER_ELEMENT, count * 6, indices, renderContext);

    if (!allocation)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Tr2Renderer: CreateIndexBuffer failed to create an index buffer for ${count} quads`);
      return false;
    }

    Tr2Renderer.#quadListIndexBuffer = allocation;
    return true;
  }

  /**
   * The shared quad-list index buffer allocation (`Tr2Renderer.cpp:1267-1270`).
   * Invalid until `ReserveQuadListIndexBuffer` has made one, as Carbon's
   * default-constructed allocation is.
   *
   * @returns {Tr2SuballocatedBufferAllocation} The allocation.
   */
  @blue.method
  @meta.implemented
  static GetQuadListIndexBuffer()
  {
    return Tr2Renderer.#quadListIndexBuffer;
  }

  /**
   * Carbon `Tr2Renderer::RunComputeShader` (`Tr2Renderer.cpp:848-925`): for
   * every pass of the technique with a compute stage, bind the pass's program
   * and states, bind its material data, and dispatch.
   *
   * Carbon's two overloads - technique 0, or a technique by name - are one
   * method here, told apart by whether the second argument is a string,
   * because JavaScript has no overloads. As in Carbon, the named form looks
   * the technique up before it checks the description is non-empty.
   *
   * @param {object} effect The `Tr2Material` holding the compute passes.
   * @param {...*} args `(groupDimX, groupDimY, groupDimZ, renderContext)` or
   *     `(techniqueName, groupDimX, groupDimY, groupDimZ, renderContext)`.
   * @returns {boolean} Whether at least one pass dispatched, and none failed.
   */
  @blue.method
  @meta.adapted
  static runComputeShader(effect, ...args)
  {
    const named = typeof args[0] === "string";
    const [ techniqueName, groupDimX, groupDimY, groupDimZ, renderContext ] = named ? args : [ null, ...args ];

    if (!effect) return false;
    // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
    if (!effect.IsGood()) return false;

    const shader = effect.GetShaderStateInterface();

    if (!shader) return false;

    let techniqueIndex = 0;

    if (named)
    {
      techniqueIndex = shader.GetTechniqueIndex(techniqueName);
      if (techniqueIndex < 0) return false;
    }

    const desc = shader.GetEffectDescription();

    if (!desc?.techniques?.length) return false;

    let result = false;

    for (const [ passIndex, pass ] of desc.techniques[techniqueIndex].passes.entries())
    {
      if (!pass.stageInputs[ShaderType.COMPUTE_SHADER]?.exists) continue;

      shader.ApplyAllStateForPass(techniqueIndex, passIndex, renderContext);
      effect.ApplyMaterialDataForPass(techniqueIndex, passIndex, renderContext);

      if (Failed(renderContext.RunComputeShader(groupDimX, groupDimY, groupDimZ))) return false;

      result = true;
    }

    return result;
  }

  /**
   * Carbon `Tr2Renderer::RunComputeShaderIndirect` (`Tr2Renderer.cpp:942-971`):
   * as `runComputeShader` on technique 0, with the group counts read from a
   * buffer. Carbon's quirk kept: it answers true when no pass has a compute
   * stage, where `runComputeShader` answers false.
   *
   * @param {object} effect The `Tr2Material` holding the compute passes.
   * @param {object} indirectParams A `Tr2BufferAL` holding the group counts.
   * @param {number} offset Byte offset to them.
   * @param {object} renderContext The context to dispatch on.
   * @returns {boolean} False when there is no effect or shader, or a dispatch failed.
   */
  @blue.method
  @meta.adapted
  static runComputeShaderIndirect(effect, indirectParams, offset, renderContext)
  {
    if (!effect) return false;
    // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
    if (!effect.IsGood()) return false;

    const shader = effect.GetShaderStateInterface();

    if (!shader) return false;

    const desc = shader.GetEffectDescription();

    if (!desc?.techniques?.length) return false;

    for (const [ passIndex, pass ] of desc.techniques[0].passes.entries())
    {
      if (!pass.stageInputs[ShaderType.COMPUTE_SHADER]?.exists) continue;

      shader.ApplyAllStateForPass(0, passIndex, renderContext);
      effect.ApplyMaterialDataForPass(0, passIndex, renderContext);

      if (Failed(renderContext.RunComputeShaderIndirect(indirectParams, offset))) return false;
    }

    return true;
  }

  // ------------------------------------------------------------------------
  // THE VIEW AND PROJECTION STATICS. Source: Tr2Renderer.h:136-186 and
  // :236-239, Tr2Renderer.cpp:51-118 (state), :155-208 (derived values),
  // :388-600 (setters and getters) and :976-1004 (the save stacks).
  //
  // Carbon has no camera object. The rendering code sets the current view and
  // projection here, one pass at a time, and everything camera-dependent reads
  // it back from here. A second view is a second pass that sets these again,
  // usually between a Push and a Pop; there is no per-view copy, in Carbon or
  // here.
  //
  // These lived on each Tr2RenderContext until Ruling 9 (2026-10-18), and
  // reached the camera-dependent code through an added context argument.
  // ------------------------------------------------------------------------

  /**
   * Carbon SetPerspectiveProjection( fov, front, back, asp, viewportAdjustment )
   * (Tr2Renderer.cpp:403-415).
   *
   * @param {number} fov Vertical field of view, radians.
   * @param {number} front Near plane.
   * @param {number} back Far plane.
   * @param {number} asp Aspect ratio.
   * @param {mat4} [viewportAdjustment] Scale and offset for a clipped viewport.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static SetPerspectiveProjection__FovAspect(fov, front, back, asp, viewportAdjustment = IDENTITY)
  {
    Tr2Renderer._currentProjectionType = PROJECTION_TYPE.PT_PERSPECTIVE;
    Tr2Renderer._fieldOfView = fov;
    Tr2Renderer._frontClip = front;
    Tr2Renderer._backClip = back;
    Tr2Renderer._aspectRatio = asp;

    mat4.perspectiveFovCarbon(Tr2Renderer._projectionTransform, Tr2Renderer._fieldOfView, Tr2Renderer._aspectRatio, Tr2Renderer._frontClip, Tr2Renderer._backClip);
    mat4.copy(Tr2Renderer._viewport2projectionAdjustment, viewportAdjustment);

    Tr2Renderer._SetProjectionDerivedValues();
  }

  /**
   * Carbon SetPerspectiveProjection( left, right, bottom, top, front, back,
   * viewportAdjustment ) (Tr2Renderer.cpp:417-426).
   *
   * @param {number} left Left edge at the near plane.
   * @param {number} right Right edge.
   * @param {number} bottom Bottom edge.
   * @param {number} top Top edge.
   * @param {number} front Near plane.
   * @param {number} back Far plane.
   * @param {mat4} [viewportAdjustment] Scale and offset for a clipped viewport.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static SetPerspectiveProjection__LeftRightBottomTop(left, right, bottom, top, front, back, viewportAdjustment = IDENTITY)
  {
    Tr2Renderer._currentProjectionType = PROJECTION_TYPE.PT_PERSPECTIVE;
    mat4.perspectiveOffCenterCarbon(Tr2Renderer._projectionTransform, left, right, bottom, top, front, back);
    mat4.copy(Tr2Renderer._viewport2projectionAdjustment, viewportAdjustment);

    Tr2Renderer._UpdateProjectionParameters(Tr2Renderer._projectionTransform);

    Tr2Renderer._SetProjectionDerivedValues();
  }

  /**
   * Carbon SetOrthoProjection( width, height, front, back, viewportAdjustment )
   * (Tr2Renderer.cpp:428-443).
   *
   * @param {number} width View width.
   * @param {number} height View height.
   * @param {number} front Near plane.
   * @param {number} back Far plane.
   * @param {mat4} [viewportAdjustment] Scale and offset for a clipped viewport.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static SetOrthoProjection__WidthHeight(width, height, front, back, viewportAdjustment = IDENTITY)
  {
    Tr2Renderer._currentProjectionType = PROJECTION_TYPE.PT_ORTHOGONAL;

    mat4.orthoCarbon(Tr2Renderer._projectionTransform, width, height, front, back);
    mat4.copy(Tr2Renderer._viewport2projectionAdjustment, viewportAdjustment);

    Tr2Renderer._orthoWidth = width;
    Tr2Renderer._orthoHeight = height;
    Tr2Renderer._aspectRatio = height ? width / height : 1;
    Tr2Renderer._fieldOfView = 1;
    Tr2Renderer._frontClip = front;
    Tr2Renderer._backClip = back;

    Tr2Renderer._SetProjectionDerivedValues();
  }

  /**
   * Carbon SetOrthoProjection( left, right, bottom, top, front, back,
   * viewportAdjustment ) (Tr2Renderer.cpp:445-459).
   *
   * @param {number} left Left edge.
   * @param {number} right Right edge.
   * @param {number} bottom Bottom edge.
   * @param {number} top Top edge.
   * @param {number} front Near plane.
   * @param {number} back Far plane.
   * @param {mat4} [viewportAdjustment] Scale and offset for a clipped viewport.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static SetOrthoProjection__LeftRightBottomTop(left, right, bottom, top, front, back, viewportAdjustment = IDENTITY)
  {
    Tr2Renderer._currentProjectionType = PROJECTION_TYPE.PT_ORTHOGONAL;

    mat4.orthoOffCenterCarbon(Tr2Renderer._projectionTransform, left, right, bottom, top, front, back);
    mat4.copy(Tr2Renderer._viewport2projectionAdjustment, viewportAdjustment);

    Tr2Renderer._orthoWidth = right - left;
    Tr2Renderer._orthoHeight = top - bottom;
    Tr2Renderer._aspectRatio = Tr2Renderer._orthoHeight ? Tr2Renderer._orthoWidth / Tr2Renderer._orthoHeight : 1;
    Tr2Renderer._fieldOfView = 1;
    Tr2Renderer._frontClip = front;
    Tr2Renderer._backClip = back;
    Tr2Renderer._SetProjectionDerivedValues();
  }

  /**
   * Carbon AdjustProjection (Tr2Renderer.cpp:390-401): rescales and offsets
   * the RAW projection, as picking does to zoom onto one pixel. Carbon's `_rc`
   * is `[(r - 1) * 4 + (c - 1)]`.
   *
   * Carbon quirk, reproduced: the offset goes through `_34` only and `_41
   * _42` are left alone (:396-397), so an orthographic projection (`_34` = 0)
   * is scaled but never recentred on the pick point. Tr2PrimitiveScene
   * rebuilds its ortho projection instead (Tr2PrimitiveScene.cpp:158-169);
   * ITr2PickableScene and EveSpaceScene do not.
   *
   * @param {ArrayLike<number>} scaling x and y scale.
   * @param {ArrayLike<number>} translation x and y offset.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static AdjustProjection(scaling, translation)
  {
    const proj = mat4.copy(Tr2Renderer._projectionTransform, Tr2Renderer._projectionRawTransform);
    proj[0] *= scaling[0];
    proj[5] *= scaling[1];
    proj[8] = scaling[0] * proj[8] + proj[11] * translation[0];
    proj[9] = scaling[1] * proj[9] + proj[11] * translation[1];

    Tr2Renderer._SetProjectionDerivedValues();
  }

  /**
   * Carbon SetProjectionTransform (Tr2Renderer.cpp:461-468): an arbitrary
   * matrix, its parameters read back from it.
   *
   * @param {mat4} proj The projection.
   * @param {mat4} [viewportAdjustment] Scale and offset for a clipped viewport.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static SetProjectionTransform(proj, viewportAdjustment = IDENTITY)
  {
    Tr2Renderer._currentProjectionType = PROJECTION_TYPE.PT_UNKNOWN;
    mat4.copy(Tr2Renderer._projectionTransform, proj);
    mat4.copy(Tr2Renderer._viewport2projectionAdjustment, viewportAdjustment);
    Tr2Renderer._UpdateProjectionParameters(proj);
    Tr2Renderer._SetProjectionDerivedValues();
  }

  /**
   * Carbon GetCurrentProjectionType (Tr2Renderer.cpp:470-473).
   *
   * @returns {number} A `PROJECTION_TYPE` value.
   */
  @blue.method
  @meta.implemented
  static GetCurrentProjectionType()
  {
    return Tr2Renderer._currentProjectionType;
  }

  /**
   * Carbon GetProjectionTransform (Tr2Renderer.cpp:475-478): the projection
   * with the viewport adjustment applied. A live matrix; callers read it.
   *
   * @returns {mat4} The projection.
   */
  @blue.method
  @meta.implemented
  static GetProjectionTransform()
  {
    return Tr2Renderer._projectionTransform;
  }

  /**
   * Carbon GetReversedDepthProjectionTransform (Tr2Renderer.cpp:480-486):
   * `_33` negated and offset by one, `_43` negated - indices 10 and 14.
   * Carbon returns by value; the copy goes into `out`.
   *
   * @param {mat4} [out] Receives the matrix.
   * @returns {mat4} out
   */
  @blue.method
  @meta.implemented
  static GetReversedDepthProjectionTransform(out = mat4.create())
  {
    const proj = mat4.copy(out, Tr2Renderer._projectionTransform);
    proj[10] = -proj[10] - 1;
    proj[14] = -proj[14];
    return proj;
  }

  /**
   * Carbon GetProjectionRawTransform (Tr2Renderer.cpp:488-491): the projection
   * before the viewport adjustment. A live matrix; callers read it.
   *
   * @returns {mat4} The raw projection.
   */
  @blue.method
  @meta.implemented
  static GetProjectionRawTransform()
  {
    return Tr2Renderer._projectionRawTransform;
  }

  /**
   * Carbon: ProjectWorldToScreen (trinity/trinity/Tr2Renderer.cpp:493-506)
   *
   * Projects a world position through the current view and projection into
   * the viewport's pixels and depth. Row-vector `p * view * proj` applies the
   * view first; `vec4.transformMat4` is `p * M` on the shared layout, so the
   * two transforms are applied in Carbon's order.
   *
   * Carbon quirk, reproduced: the depth is `m_minZ + p.z * m_maxZ` (:505), not
   * a lerp between the two; identical whenever minZ is 0.
   *
   * @param {ArrayLike<number>} worldPos The world position.
   * @param {{x: number, y: number, width: number, height: number, minZ: number, maxZ: number}} vp The viewport.
   * @param {vec3} [out] Receives the screen position.
   * @returns {vec3} out
   */
  @blue.method
  @meta.implemented
  static ProjectWorldToScreen(worldPos, vp, out = vec3.create())
  {
    const p = vec4.set(PROJECT_SCRATCH, worldPos[0], worldPos[1], worldPos[2], 1);
    vec4.transformMat4(p, p, Tr2Renderer.GetViewTransform());
    vec4.transformMat4(p, p, Tr2Renderer.GetProjectionTransform());
    if (p[3])
    {
      vec4.scale(p, p, 1 / p[3]);
    }

    return vec3.set(out,
      vp.x + vp.width * (0.5 + 0.5 * p[0]),
      vp.y + vp.height * (0.5 - 0.5 * p[1]),
      vp.minZ + p[2] * vp.maxZ);
  }

  /**
   * Carbon GetInverseProjectionTransform (Tr2Renderer.cpp:508-511). A live
   * matrix; callers read it.
   *
   * @returns {mat4} The inverse of the adjusted projection.
   */
  @blue.method
  @meta.implemented
  static GetInverseProjectionTransform()
  {
    return Tr2Renderer._inverseProjectionTransform;
  }

  /**
   * Carbon GetFrontClip (Tr2Renderer.cpp:513-516). For a reversed-depth
   * projection set through SetProjectionTransform this is the far plane, as
   * UpdateProjectionParameters derives it.
   *
   * @returns {number} The front clip.
   */
  @blue.method
  @meta.implemented
  static GetFrontClip()
  {
    return Tr2Renderer._frontClip;
  }

  /**
   * Carbon GetBackClip (Tr2Renderer.cpp:518-521).
   *
   * @returns {number} The back clip.
   */
  @blue.method
  @meta.implemented
  static GetBackClip()
  {
    return Tr2Renderer._backClip;
  }

  /**
   * Carbon GetFrustumRadius (Tr2Renderer.cpp:523-526): the length of the
   * view-space far corner, set with the projection.
   *
   * @returns {number} The radius.
   */
  @blue.method
  @meta.implemented
  static GetFrustumRadius()
  {
    return Tr2Renderer._frustumRadius;
  }

  /**
   * Carbon GetFrustumPlane( index, plane& ) (Tr2Renderer.cpp:528-531): read
   * from the registered variable, as Carbon reads it. The output reference is
   * the return value.
   *
   * @param {number} index The plane, 0 to 5.
   * @param {Float32Array|number[]} [plane] Receives the plane.
   * @returns {Float32Array|number[]} plane
   */
  @blue.method
  @meta.implemented
  static GetFrustumPlane(index, plane = vec4.create())
  {
    return Tr2Renderer._CameraVariables()[FRUSTUM_PLANES[index]].GetValue(plane);
  }

  /**
   * Carbon GetFieldOfView (Tr2Renderer.cpp:533-536).
   *
   * @returns {number} Radians; 1 for an orthographic projection.
   */
  @blue.method
  @meta.implemented
  static GetFieldOfView()
  {
    return Tr2Renderer._fieldOfView;
  }

  /**
   * Carbon GetAspectRatio (Tr2Renderer.cpp:538-541).
   *
   * @returns {number} Width over height.
   */
  @blue.method
  @meta.implemented
  static GetAspectRatio()
  {
    return Tr2Renderer._aspectRatio;
  }

  /**
   * Carbon GetOrthoWidth (Tr2Renderer.cpp:543-546).
   *
   * @returns {number} The width of the last orthographic projection.
   */
  @blue.method
  @meta.implemented
  static GetOrthoWidth()
  {
    return Tr2Renderer._orthoWidth;
  }

  /**
   * Carbon GetOrthoHeight (Tr2Renderer.cpp:548-551).
   *
   * @returns {number} The height of the last orthographic projection.
   */
  @blue.method
  @meta.implemented
  static GetOrthoHeight()
  {
    return Tr2Renderer._orthoHeight;
  }

  /**
   * Carbon SetWorldTransform (Tr2Renderer.cpp:553-559): copied, and the
   * "WorldMat" variable told.
   *
   * @param {mat4} m The world matrix.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static SetWorldTransform(m)
  {
    mat4.copy(Tr2Renderer._worldTransform, m);

    // Ensure variable store is aware of the change.
    Tr2Renderer._CameraVariables().WorldMat.SetValue(Tr2Renderer._worldTransform);
  }

  /**
   * Carbon SetViewTransform (Tr2Renderer.cpp:561-571): the view, its inverse
   * (Carbon's value-form Inverse, so a singular view inverts to itself), the
   * view-projection and frustum planes, and the "ViewMat"/"ViewInvMat"
   * variables.
   *
   * @param {mat4} m The view matrix.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static SetViewTransform(m)
  {
    mat4.copy(Tr2Renderer._viewTransform, m);
    mat4.inverseCarbon(Tr2Renderer._inverseViewTransform, Tr2Renderer._viewTransform);

    Tr2Renderer._UpdateViewProjectionTransform();

    // Ensure variable store is aware of the change.
    const variables = Tr2Renderer._CameraVariables();
    variables.ViewMat.SetValue(Tr2Renderer._viewTransform);
    variables.ViewInvMat.SetValue(Tr2Renderer._inverseViewTransform);
  }

  /**
   * Carbon GetWorldTransform (Tr2Renderer.cpp:573-576). A live matrix;
   * callers read it.
   *
   * @returns {mat4} The world matrix.
   */
  @blue.method
  @meta.implemented
  static GetWorldTransform()
  {
    return Tr2Renderer._worldTransform;
  }

  /**
   * Carbon GetViewTransform (Tr2Renderer.cpp:578-581). A live matrix; callers
   * read it.
   *
   * @returns {mat4} The view matrix.
   */
  @blue.method
  @meta.implemented
  static GetViewTransform()
  {
    return Tr2Renderer._viewTransform;
  }

  /**
   * Carbon GetInverseViewTransform (Tr2Renderer.cpp:583-586). A live matrix;
   * callers read it.
   *
   * @returns {mat4} The inverse view matrix.
   */
  @blue.method
  @meta.implemented
  static GetInverseViewTransform()
  {
    return Tr2Renderer._inverseViewTransform;
  }

  /**
   * Carbon GetViewPosition (Tr2Renderer.cpp:588-591): a reference to the
   * inverse view's translation row, `_41.._43`. Here it is a live view onto
   * indices 12-14 of the same matrix, so it follows every SetViewTransform.
   *
   * @returns {Float32Array} The camera position, three components.
   */
  @blue.method
  @meta.implemented
  static GetViewPosition()
  {
    return Tr2Renderer._viewPosition;
  }

  /**
   * Carbon GetViewLookAt (Tr2Renderer.cpp:593-600): the view's third column,
   * `_13 _23 _33` - indices 2, 6 and 10. Carbon returns by value; the copy
   * goes into `out`.
   *
   * @param {vec3} [out] Receives the direction.
   * @returns {vec3} out
   */
  @blue.method
  @meta.implemented
  static GetViewLookAt(out = vec3.create())
  {
    const view = Tr2Renderer._viewTransform;
    return vec3.set(out, view[2], view[6], view[10]);
  }

  /**
   * Carbon GetViewport (Tr2Renderer.cpp:1392-1396): the main-thread context's
   * authored viewport, through its state manager.
   *
   * @returns {object|null} The viewport, or null before one is set.
   */
  @blue.method
  @meta.implemented
  static GetViewport()
  {
    return Tr2RenderContext_GetMainThreadRenderContext().GetEffectStateManager().GetViewport();
  }

  /**
   * Carbon PushProjection (Tr2Renderer.cpp:976-979): saves the RAW projection
   * and the viewport adjustment.
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static PushProjection()
  {
    Tr2Renderer._projectionStack.push([
      mat4.clone(Tr2Renderer._projectionRawTransform),
      mat4.clone(Tr2Renderer._viewport2projectionAdjustment)
    ]);
  }

  /**
   * Carbon PopProjection (Tr2Renderer.cpp:981-991). Carbon quirk, reproduced:
   * the parameters are read back from the restored matrix
   * (UpdateProjectionParameters, :989) and the projection type, ortho width
   * and height are not restored: a popped
   * orthographic projection reports `2 * atan(1 / _22)` as its field of view
   * rather than the 1 SetOrthoProjection gave it. Carbon asserts the stack is
   * not empty and then reads it unchecked; here an empty stack throws.
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static PopProjection()
  {
    if (!Tr2Renderer._projectionStack.length)
    {
      throw new RangeError("Tr2Renderer.PopProjection: the projection stack is empty (CCP_ASSERT, Tr2Renderer.cpp:983).");
    }

    const [ projection, adjustment ] = Tr2Renderer._projectionStack.pop();
    mat4.copy(Tr2Renderer._projectionTransform, projection);
    mat4.copy(Tr2Renderer._viewport2projectionAdjustment, adjustment);
    Tr2Renderer._UpdateProjectionParameters(Tr2Renderer._projectionTransform);
    Tr2Renderer._SetProjectionDerivedValues();
  }

  /**
   * Carbon PushViewTransform (Tr2Renderer.cpp:993-996).
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static PushViewTransform()
  {
    Tr2Renderer._viewTransformStack.push(mat4.clone(Tr2Renderer._viewTransform));
  }

  /**
   * Carbon PopViewTransform (Tr2Renderer.cpp:998-1004). Carbon asserts the
   * stack is not empty and then reads it unchecked; here an empty stack
   * throws.
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  static PopViewTransform()
  {
    if (!Tr2Renderer._viewTransformStack.length)
    {
      throw new RangeError("Tr2Renderer.PopViewTransform: the view transform stack is empty (CCP_ASSERT, Tr2Renderer.cpp:1000).");
    }

    const view = Tr2Renderer._viewTransformStack.pop();

    Tr2Renderer.SetViewTransform(view);
  }

  /**
   * Carbon's file-static UpdateProjectionParameters (Tr2Renderer.cpp:70-83):
   * aspect, field of view and clips read back from a matrix. `_11 _22 _33
   * _43` are indices 0, 5, 10 and 14.
   *
   * @param {mat4} proj The projection to read.
   * @returns {void}
   */
  static _UpdateProjectionParameters(proj)
  {
    Tr2Renderer._aspectRatio = proj[0] ? proj[5] / proj[0] : 0;
    Tr2Renderer._fieldOfView = proj[5] ? 2 * Math.atan(1 / proj[5]) : 0;
    Tr2Renderer._frontClip = proj[10] ? proj[14] / proj[10] : 0;
    Tr2Renderer._backClip = proj[14] / (1 + proj[10]);
  }

  /**
   * Carbon's file-static UpdateViewProjectionTransform (Tr2Renderer.cpp:156-185):
   * the view-projection and the six frustum planes drawn from its columns.
   * Row-vector `view * proj` is gl `multiply(out, proj, view)`; Carbon's
   * `_c` column is indices `c - 1`, `c + 3`, `c + 7`, `c + 11`.
   *
   * @returns {void}
   */
  static _UpdateViewProjectionTransform()
  {
    const m = mat4.multiply(Tr2Renderer._viewProjectionTransform, Tr2Renderer._projectionTransform, Tr2Renderer._viewTransform);
    const variables = Tr2Renderer._CameraVariables();
    variables.ViewProjectionMat.SetValue(m);

    const plane = PLANE_SCRATCH;
    variables.FrustumPlane0.SetValue(vec4.set(plane, m[2], m[6], m[10], m[14]));
    variables.FrustumPlane1.SetValue(vec4.set(plane, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]));
    variables.FrustumPlane2.SetValue(vec4.set(plane, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]));
    variables.FrustumPlane3.SetValue(vec4.set(plane, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]));
    variables.FrustumPlane4.SetValue(vec4.set(plane, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]));
    variables.FrustumPlane5.SetValue(vec4.set(plane, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]));
  }

  /**
   * Carbon's file-static SetProjectionDerivedValues (Tr2Renderer.cpp:187-208):
   * keeps the raw projection, applies the viewport adjustment (row-vector
   * `proj * adjustment`, gl `multiply(out, adjustment, proj)`), caches the
   * inverse (Carbon's value-form Inverse) and the frustum radius, and tells
   * the variable store.
   *
   * @returns {void}
   */
  static _SetProjectionDerivedValues()
  {
    mat4.copy(Tr2Renderer._projectionRawTransform, Tr2Renderer._projectionTransform);

    // Apply scaling and offset to projection matrix. If the viewport extends
    // the render target we need to clip the viewport and thus scale+offset the
    // projection.
    mat4.multiply(Tr2Renderer._projectionTransform, Tr2Renderer._viewport2projectionAdjustment, Tr2Renderer._projectionTransform);

    // Cache inverse projection matrix.
    mat4.inverseCarbon(Tr2Renderer._inverseProjectionTransform, Tr2Renderer._projectionTransform);

    const corner = vec4.set(PROJECT_SCRATCH, 1, 1, 1, 1);
    vec4.transformMat4(corner, corner, Tr2Renderer._inverseProjectionTransform);
    Tr2Renderer._frustumRadius = Math.hypot(corner[0] / corner[3], corner[1] / corner[3], corner[2] / corner[3]);

    // Ensure TriVariable store is aware of the projection transform.
    const variables = Tr2Renderer._CameraVariables();
    variables.ProjectionMat.SetValue(Tr2Renderer._projectionTransform);
    variables.ProjectionInvMat.SetValue(Tr2Renderer._inverseProjectionTransform);
    Tr2Renderer._UpdateViewProjectionTransform();
  }

  /**
   * Carbon Initialize's camera variables (Tr2Renderer.cpp:334-346), on the
   * global store. Registered on first use rather than only in Initialize, so
   * code that runs without InitializeTrinity (tests building a context
   * directly) still publishes them.
   *
   * @returns {Record<string, TriVariable>} The variables by name.
   */
  static _CameraVariables()
  {
    if (!Tr2Renderer._cameraVariables)
    {
      const store = Tr2VariableStore.globalStore();
      const matrix = (name, value) => store.RegisterVariableInternal(name, TriVariableContentType.TRIVARIABLE_FLOAT4X4, value);
      const plane = name => store.RegisterVariableInternal(name, TriVariableContentType.TRIVARIABLE_FLOAT4, [ 0, 0, 1, 0 ]);

      Tr2Renderer._cameraVariables = {
        WorldMat: matrix("WorldMat", Tr2Renderer._worldTransform),
        ViewMat: matrix("ViewMat", Tr2Renderer._viewTransform),
        ViewInvMat: matrix("ViewInvMat", Tr2Renderer._viewTransform),
        ProjectionMat: matrix("ProjectionMat", Tr2Renderer._projectionTransform),
        ProjectionInvMat: matrix("ProjectionInvMat", Tr2Renderer._projectionTransform),
        ViewProjectionMat: matrix("ViewProjectionMat", Tr2Renderer._viewProjectionTransform),
        FrustumPlane0: plane("FrustumPlane0"),
        FrustumPlane1: plane("FrustumPlane1"),
        FrustumPlane2: plane("FrustumPlane2"),
        FrustumPlane3: plane("FrustumPlane3"),
        FrustumPlane4: plane("FrustumPlane4"),
        FrustumPlane5: plane("FrustumPlane5")
      };
    }
    return Tr2Renderer._cameraVariables;
  }

  static _cameraVariables = null;

  /** Carbon s_currentProjectionType (Tr2Renderer.cpp:51). */
  static _currentProjectionType = PROJECTION_TYPE.PT_PERSPECTIVE;

  /** Carbon s_projectionTransform (Tr2Renderer.cpp:53); Carbon's Matrix() is the identity. */
  static _projectionTransform = mat4.create();

  /** Carbon s_projectionRawTransform (Tr2Renderer.cpp:54). */
  static _projectionRawTransform = mat4.create();

  /** Carbon s_inverseProjectionTransform (Tr2Renderer.cpp:55). */
  static _inverseProjectionTransform = mat4.create();

  /** Carbon s_viewport2projectionAdjustment (Tr2Renderer.cpp:56; Initialize sets the identity, :353). */
  static _viewport2projectionAdjustment = mat4.create();

  /** Carbon s_viewTransform (Tr2Renderer.cpp:58). */
  static _viewTransform = mat4.create();

  /** Carbon s_inverseViewTransform (Tr2Renderer.cpp:59). */
  static _inverseViewTransform = mat4.create();

  /** GetViewPosition's reference into s_inverseViewTransform._41 (Tr2Renderer.cpp:590). */
  static _viewPosition = this._inverseViewTransform.subarray(12, 15);

  /** Carbon s_viewProjectionTransform (Tr2Renderer.cpp:61). */
  static _viewProjectionTransform = mat4.create();

  /** Carbon s_frontClip (Tr2Renderer.cpp:63). */
  static _frontClip = 0;

  /** Carbon s_backClip (Tr2Renderer.cpp:64). */
  static _backClip = 0;

  /** Carbon s_frustumRadius (Tr2Renderer.cpp:65). */
  static _frustumRadius = 0;

  /** Carbon s_aspectRatio (Tr2Renderer.cpp:66). */
  static _aspectRatio = 0;

  /** Carbon s_fieldOfView (Tr2Renderer.cpp:67). */
  static _fieldOfView = 0;

  /** Carbon s_orthoWidth (Tr2Renderer.cpp:68). */
  static _orthoWidth = 0;

  /** Carbon s_orthoHeight (Tr2Renderer.cpp:69). */
  static _orthoHeight = 0;

  /** Carbon s_worldTransform (Tr2Renderer.cpp:86). */
  static _worldTransform = mat4.create();

  /** Carbon s_projectionStack (Tr2Renderer.cpp:109): [ raw projection, viewport adjustment ] pairs. */
  static _projectionStack = [];

  /** Carbon s_viewTransformStack (Tr2Renderer.cpp:110). */
  static _viewTransformStack = [];

  /** Carbon s_shaderModel (`Tr2Renderer.cpp:34`). */
  static #shaderModel = TR2SHADERMODEL.TR2SM_3_0_HI;

  /** Carbon s_quadListSize. */
  static #quadListSize = 0;

  /** Carbon s_quadListIndexBuffer. */
  static #quadListIndexBuffer = new Tr2SuballocatedBufferAllocation();

  /**
   * Carbon's `s_renderTimeVar`, registered once and assigned every frame.
   *
   * @returns {object|null} The "Time" variable on the global store.
   */
  static #RenderTimeVariable()
  {
    if (!Tr2Renderer.#renderTimeVar)
    {
      Tr2Renderer.#renderTimeVar = Tr2VariableStore.globalStore().RegisterVariableInternal("Time", TriVariableContentType.TRIVARIABLE_FLOAT4, [ 0, 0, 0, 0 ]);
    }
    return Tr2Renderer.#renderTimeVar;
  }

  static #renderTimeVar = null;

  /** Carbon's `Tr2RenderContextEnum::PIXEL_SHADER`, the one stage that differs. */
  static PIXEL_SHADER = 1;
}
