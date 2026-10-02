// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene_Blue.cpp
import { meta } from "#schema";
import { IsMatch, INotify, BlueList } from "#blue";
import { ITr2Scene } from "../core/ITr2Scene.js";
import { ITr2Updateable } from "../core/ITr2Updateable.js";
import { ITr2SpriteObject } from "./ITr2SpriteObject.js";
import { TriCurveSet } from "../curves/TriCurveSet.js";
import { Tr2VariableStore } from "../core/variable/Tr2VariableStore.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { quat } from "#math/quat";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import "./Tr2SpriteObjectBase.js";

/**
 * Owns sprite declarations and CPU curve updates using raw Blue frame clocks.
 * Rendering, picking, clipping, capture buffers, effect acquisition and the
 * native callback/device-resource lifetime remain unported. In particular,
 * maxSpriteCount notification cannot complete required backend invalidation.
 * Native useLinearColorSpace/gammaCorrectText properties and effect-option
 * methods remain absent; this class does not claim renderer parity.
 * Complete canonical members retain native order and indexed aliases. Legacy
 * getField/getDefaults expose no Scene fields; use Blue declaration consumers.
 */
@meta.define({
  className: "Tr2Sprite2dScene", family: "sprite2d",
  // Explicit ordered declarations keep native stored aliases in member order.
  members: [
    {"name":"name","type":{"kind":"wstring"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"display","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"drawWireFrame","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"ignoreClip","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"lastPickPos","type":{"kind":"vec2"},"edit":{"read":true}},
    {"name":"isFullscreen","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"is2dRender","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"is2dPick","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"translation","type":{"kind":"vec3"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"displayX","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true},"key":"translation","index":0,"impl":{"status":"adapted","adapted":true,"reason":"Native stored translation component exposed through an indexed canonical member."}},
    {"name":"displayY","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true},"key":"translation","index":1,"impl":{"status":"adapted","adapted":true,"reason":"Native stored translation component exposed through an indexed canonical member."}},
    {"name":"rotation","type":{"kind":"quat"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"scaling","type":{"kind":"vec3"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"displayWidth","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"displayHeight","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"depthMin","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"depthMax","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"pickState","type":{"kind":"int32"},"edit":{"read":true,"write":true,"persist":true},"enum":{"enumType":"trinity.Tr2SpriteObjectPickState"}},
    {"name":"clearBackground","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"backgroundColor","type":{"kind":"color"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"children","type":{"kind":"list","className":"ITr2SpriteObject","itemType":"ITr2SpriteObject"},"edit":{"read":true,"persist":true}},
    {"name":"background","type":{"kind":"list","className":"ITr2SpriteObject","itemType":"ITr2SpriteObject"},"edit":{"read":true,"persist":true}},
    {"name":"clearFinishedCurveSets","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"curveSets","type":{"kind":"list","className":"TriCurveSet","itemType":"TriCurveSet"},"edit":{"read":true,"persist":true}},
    {"name":"ubershader2d","type":{"kind":"objectRef","className":"Tr2Effect"},"edit":{"read":true}},
    {"name":"ubershader3d","type":{"kind":"objectRef","className":"Tr2Effect"},"edit":{"read":true}},
    {"name":"defaultTextureUpdates","type":{"kind":"boolean"},"edit":{"read":true,"write":true}},
    {"name":"maxItemsToRender","type":{"kind":"uint32"},"edit":{"read":true,"write":true}},
    {"name":"maxDrawCallsToRender","type":{"kind":"uint32"},"edit":{"read":true,"write":true}},
    {"name":"maxSpriteCount","type":{"kind":"uint32"},"edit":{"read":true,"write":true,"notify":true}},
    {"name":"captureIndexDataCapacity","type":{"kind":"uint32"},"edit":{"read":true}}
  ]
})
@meta.blue.inherit(INotify)
export class Tr2Sprite2dScene extends ITr2Scene
{
  /** Native wide-string scene label. @type {string} */
  name = "";

  /** Whether update and rendering work is enabled; clocks are retained while hidden. @type {boolean} */
  display = true;

  /** Requests wireframe rendering from the unported sprite renderer. @type {boolean} */
  drawWireFrame = false;

  /** Disables scene clipping for native rendering diagnostics. @type {boolean} */
  ignoreClip = false;

  /** Coordinates of the most recent pick; native picking remains unimplemented. @type {Float32Array} */
  lastPickPos = vec2.create();

  /** Requests native viewport-sized display dimensions each rendered frame. @type {boolean} */
  isFullscreen = false;

  /** Selects screen-space rather than 3D scene rendering. @type {boolean} */
  is2dRender = true;

  /** Selects screen-space picking rather than a projected 3D pick. @type {boolean} */
  is2dPick = true;

  /** Scene translation; displayX and displayY alias the first two components. @type {Float32Array} */
  translation = vec3.create();

  /** Reads the native translation component alias. @returns {number} displayX coordinate. */
  get displayX()
  {
    return this.translation[0];
  }

  /** Writes the native component through the existing numeric adapter. @param {number} value Coordinate. */
  set displayX(value)
  {
    this.translation[0] = Number(value);
  }

  /** Reads the native translation component alias. @returns {number} displayY coordinate. */
  get displayY()
  {
    return this.translation[1];
  }

  /** Writes the native component through the existing numeric adapter. @param {number} value Coordinate. */
  set displayY(value)
  {
    this.translation[1] = Number(value);
  }

  /** Scene orientation quaternion for 3D rendering. @type {Float32Array} */
  rotation = quat.create();

  /** Scene scale for 3D rendering, initially one on each axis. @type {Float32Array} */
  scaling = vec3.fromValues(1, 1, 1);

  /** Displayed scene width, updated by the native renderer when fullscreen. @type {number} */
  displayWidth = 1;

  /** Displayed scene height, updated by the native renderer when fullscreen. @type {number} */
  displayHeight = 1;

  /** Lower bound of the native scene depth range. @type {number} */
  depthMin = 0;

  /** Upper bound of the native scene depth range. @type {number} */
  depthMax = 0;

  /** Native chooser controlling scene and child picking. @type {number} */
  pickState = 1;

  /** Requests clearing the render target to backgroundColor before rendering. @type {boolean} */
  clearBackground = false;

  /** Native packed-color default 0x000000ff represented as RGBA [0,0,1,0]. @type {Float32Array} */
  backgroundColor = vec4.fromValues(0, 0, 1, 0);

  /** Owned sprites contained by this scene; no container-parent callback is installed by native Scene. @type {BlueList<ITr2SpriteObject>} */
  children = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** Owned non-pickable background sprites that fill the scene extent. @type {BlueList<ITr2SpriteObject>} */
  background = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** Removes stopped curve sets after all sets have received the current update. @type {boolean} */
  clearFinishedCurveSets = false;

  /** Owned curve sets updated with raw real and simulation clocks in list order. @type {BlueList<TriCurveSet>} */
  curveSets = new BlueList(TriCurveSet, { className: "TriCurveSet", listOps: 0 });

  /** Native 2D uber-effect slot; automatic effect construction/acquisition remains unported. @type {Tr2Effect|null} */
  ubershader2d = null;

  /** Native 3D uber-effect slot; automatic effect construction/acquisition remains unported. @type {Tr2Effect|null} */
  ubershader3d = null;

  /** Native diagnostic flag that flashes the default texture during rendering. @type {boolean} */
  defaultTextureUpdates = false;

  /** Maximum sprite/items submitted by the native renderer; UINT32_MAX means unlimited. @type {number} */
  maxItemsToRender = 4294967295;

  /** Maximum native draw calls submitted; UINT32_MAX means unlimited. @type {number} */
  maxDrawCallsToRender = 4294967295;

  /** Maximum sprites per native draw; notified changes require unsupported resource invalidation. @type {number} */
  maxSpriteCount = 1024;

  /** Allocated capture-index capacity; zero because this port allocates no capture buffers. @type {number} */
  captureIndexDataCapacity = 0;

  /** Last real-time timestamp received, in raw Blue 100ns ticks. @type {number} */
  _realTime = 0;

  /** Last simulation timestamp received, in raw Blue 100ns ticks. @type {number} */
  _simTime = 0;

  /** Persistent shader-vector storage because TriVariable.SetValue retains its input array. @type {Float32Array} */
  _dotVectorValue = vec4.fromValues(0, 0, 0, 1);

  /** Native nullable global shader-variable handle, using the existing store adapter. @type {TriVariable|null} */
  _dotVectorVar = Tr2VariableStore.globalStore().RegisterVariable("g_DotVector", this._dotVectorValue);

  /** Native camera-direction quaternion tweak, shared read-only by updates. @type {number[]} */
  static _viewTweak = [0.332621, 0.332621, 0, 0.882455];

  /** Existing class-local view of the native pick-state chooser. @type {Object<string, number>} */
  static Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;

  /**
   * Publishes the camera direction and updates every owned curve set before cleanup.
   * @param {number} realTime Raw Blue real-time ticks (100ns).
   * @param {number} simTime Raw Blue simulation ticks (100ns).
   * @param {Tr2RenderContext|null} [renderContext=null] Relocated camera state.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Reads relocated view state from the supplied or main-thread context and writes through the existing variable-store handle; curve-set clocks remain raw ticks.")
  Update(realTime, simTime, renderContext = null)
  {
    this._realTime = realTime;
    this._simTime = simTime;
    if (!this.display) return;
    const view = (renderContext ?? Tr2RenderContext_GetMainThreadRenderContext()).GetViewTransform();
    const direction = vec3.alloc();
    const dot = this._dotVectorValue;
    try
    {
      // TriMath.cpp: q*v*conjugate(q), retaining the non-unit tweak's scale.
      const [x, y, z, w] = Tr2Sprite2dScene._viewTweak;
      const vx = view[2], vy = view[6], vz = view[10];
      const ww = w * w, xx = x * x, yy = y * y, zz = z * z;
      vec3.set(direction,
        vx * (ww + xx - yy - zz) + 2 * (vy * (x * y - w * z) + vz * (x * z + w * y)),
        vy * (ww - xx + yy - zz) + 2 * (vx * (x * y + w * z) + vz * (y * z - w * x)),
        vz * (ww - xx - yy + zz) + 2 * (vx * (x * z - w * y) + vy * (y * z + w * x)));
      vec4.set(dot, direction[0], direction[1], direction[2], 1);
      if (this._dotVectorVar) this._dotVectorVar.SetValue(dot);
    }
    finally
    {
      vec3.unalloc(direction);
    }
    for (const curveSet of this.curveSets) curveSet.Update(realTime, simTime);
    if (this.clearFinishedCurveSets) this.RemoveFinishedCurveSets();
  }

  /** Removes stopped sets in place using native Blue list removal semantics. @returns {void} */
  @meta.blue.method
  @meta.implemented
  RemoveFinishedCurveSets()
  {
    for (let index = 0; index < this.curveSets.length;)
    {
      if (!this.curveSets[index].IsPlaying()) this.curveSets.Remove(index);
      else index++;
    }
  }

  /**
   * Reports unsupported resource invalidation after the native upper-bound clamp.
   * @param {string|null} value Changed member name.
   * @returns {boolean} True for notifications that require no invalidation.
   * @throws {Error} maxSpriteCount requires the unported ReleaseResources path.
   */
  @meta.blue.method
  @meta.notImplemented
  OnModified(value)
  {
    if (IsMatch(value, "maxSpriteCount"))
    {
      if (this.maxSpriteCount > 16383) this.maxSpriteCount = 16383;
      throw new Error("Tr2Sprite2dScene maxSpriteCount requires unimplemented ReleaseResources.");
    }
    return true;
  }

  /** Native sprite rendering remains unsupported. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.blue.method
  @meta.notImplemented
  Render(_renderContext)
  {
    throw new Error("Tr2Sprite2dScene.Render is not implemented in CarbonEngineJS.");
  }

  /** Native scene debug rendering is empty. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.blue.method
  @meta.noop
  RenderDebugInfo(_renderContext)
  {
  }

  /** Native picking requires the unported viewport/clipping stack. @param {...*} args Picking arguments. @returns {ITr2SpriteObject|null} */
  @meta.blue.method
  @meta.notImplemented
  PickObject(...args)
  {
    throw new Error("Tr2Sprite2dScene.PickObject is not implemented in CarbonEngineJS.");
  }
}

meta.blue.interfaceTable({ interfaces: [Tr2Sprite2dScene, ITr2Scene, ITr2Updateable, INotify], chainTo: null })(Tr2Sprite2dScene);
