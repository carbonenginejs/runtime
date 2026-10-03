// Source: trinity/trinity/Eve/EveLensflare.h
// Source: trinity/trinity/Eve/EveLensflare.cpp
// Hand-maintained after promotion from generated schema intake.
import { CjsSchema, meta } from "#schema";
import { BlueList, IInitialize, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2Controller } from "../../../controllers/ITr2Controller/ITr2Controller.js";
import { ITr2ControllerOwner } from "../../../controllers/ITr2ControllerOwner.js";
import { UnlinkReason } from "../../../controllers/enums.js";
import { ITr2CurveSetOwner } from "../../../curves/ITr2CurveSetOwner.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2VariableStore } from "../../../core/variable/Tr2VariableStore.js";
import { Tr2OcclusionBuffer } from "./Tr2OcclusionBuffer.js";

/** Scratch for PrepareRender's negated vectors. */
const prepareScratch = vec3.create();

/** The float whose bits are `value`: Carbon's `*reinterpret_cast<float*>( &offset )` (cpp:170). */
const bitsAsFloat = value => new Float32Array(new Uint32Array([ value >>> 0 ]).buffer)[0];

/** Represents a lens-flare graph with CPU-side visibility and controller state. */
@meta.define({ className: "EveLensflare", family: "eve/effect" })
@meta.blue.inherit(ITr2Renderable, ITr2CurveSetOwner, ITr2ControllerOwner, IInitialize, IListNotify)
export class EveLensflare
{

  _controllerVariables = new Map();

  /** Subscribes to controller list changes (EveLensflare.cpp:75). */
  constructor()
  {
    this.controllers.SetNotify(this);
  }

  /** Links loaded controllers once (EveLensflare.cpp:78-88). */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller.IsLinked()) controller.Link(this);
    }
    return true;
  }

  /** Native controller insertion, removal and unload (cpp:91-122). */
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list !== this.controllers || (event & BLUELISTEVENT.BELIST_LOADING) !== 0) return;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
      {
        const controller = CjsSchema.cast(value, ITr2Controller);
        if (controller)
        {
          controller.Link(this);
          for (const [name, variable] of this._controllerVariables) controller.SetVariable(name, variable);
        }
        break;
      }
      case BLUELISTEVENT.BELIST_REMOVED:
      {
        const controller = CjsSchema.cast(value, ITr2Controller);
        if (controller) controller.Unlink();
        break;
      }
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        for (const controller of this.controllers) controller.Unlink();
        break;
      default:
        break;
    }
  }

  /** Plays all matching curve sets, with an optional named range (cpp:414-431). */
  @meta.blue.method
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() !== name) continue;
      if (rangeName === "")
      {
        curveSet.ResetTimeRange();
        curveSet.Play();
      }
      else curveSet.PlayTimeRange(rangeName);
    }
  }

  /** Stops all matching curve sets (cpp:433-442). */
  @meta.blue.method
  @meta.implemented
  StopCurveSet(name)
  {
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) curveSet.Stop();
  }

  /** Supplies the same time to both native clock inputs (cpp:444-453). */
  @meta.blue.method
  @meta.implemented
  UpdateCurveSet(name, time)
  {
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) curveSet.Update(time, time);
  }

  /** Longest duration among matching curve sets (cpp:455-466). */
  @meta.blue.method
  @meta.implemented
  GetCurveSetDuration(name)
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name) duration = Math.max(duration, curveSet.GetMaxCurveDuration());
    }
    return duration;
  }

  /** Longest named-range duration among matching curve sets (cpp:468-479). */
  @meta.blue.method
  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name) duration = Math.max(duration, curveSet.GetRangeDuration(rangeName));
    }
    return duration;
  }

  /** m_translationCurve (ITriVectorFunctionPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("ITriVectorFunction")
  translationCurve = null;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Mesh")
  mesh = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_backgroundOccluders (PEveOccluderVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveOccluder")
  backgroundOccluders = [];

  /** m_occluders (PEveOccluderVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveOccluder")
  occluders = [];

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** m_distanceToEdgeCurves (PITriFunctionVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriFunction")
  distanceToEdgeCurves = [];

  /** m_distanceToCenterCurves (PITriFunctionVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriFunction")
  distanceToCenterCurves = [];

  /** m_radialAngleCurves (PITriFunctionVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriFunction")
  radialAngleCurves = [];

  /** m_xDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriFunction")
  xDistanceToCenter = [];

  /** m_yDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriFunction")
  yDistanceToCenter = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2Controller")
  controllers = new BlueList(ITr2Controller);

  /** m_bindings (PITr2ValueBindingVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2ValueBinding")
  bindings = [];

  /** m_cameraFactor (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  cameraFactor = 20;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  position = vec3.create();

  /** m_flares (PEveTransformVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveTransform")
  flares = [];

  /** m_update (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  update = true;

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_isVisible (EveLensflare.h:95; ctor false, cpp:68) - runtime state,
   * not persisted. */
  isVisible = false;

  /** m_direction (EveLensflare.h:106) - zero until PrepareRender stamps
   * Normalize(-position); the first-frame zero direction dots to 0, which
   * counts as VISIBLE (the >= comparison) - deliberate Carbon behavior. */
  direction = vec3.create();

  /** m_sunSize (EveLensflare.h:107; ctor 0, cpp:71) - computed by Carbon's
   * Update from the distance-to-center falloff (cpp:161-165); PrepareRender
   * consumes it but does not produce it. Runtime state, not persisted. */
  sunSize = 0;

  /** m_occlusionOffset / m_backgroundOcclusionOffset (EveLensflare.h:140-141) -
   * Tr2OcclusionBuffer slots this lensflare allocates on its first occlusion
   * query (RunOcclusionQueries, cpp:330-337). null until then; Carbon's null
   * case uploads 0. */
  occlusionOffset = null;

  backgroundOcclusionOffset = null;

  /** m_directionVar: the global "LensflareFxDirectionScale" (cpp:72). */
  _directionVar = Tr2VariableStore.globalStore().RegisterVariable("LensflareFxDirectionScale", [ 0, 0, 0, 1 ]);

  /**
   * m_occScaleVar: the global "LensflareFxOccScale" (cpp:73), (1, 0, 0, 0)
   * until the first Update. x and y carry the foreground and background slot
   * bases as float BITS; the god rays read FlareOcclusionBuffer at y.
   */
  _occScaleVar = Tr2VariableStore.globalStore().RegisterVariable("LensflareFxOccScale", [ 1, 0, 0, 0 ]);

  /** m_transform (EveLensflare.h:102; ctor identity, cpp:74) - stamped by
   * PrepareRender, forwarded to the flare children as their parent. */
  transform = mat4.create();

  /** Carbon EveLensflare::Update (EveLensflare.cpp:145-182): position from the
   * translation curve, the sun-size curve of very old magic numbers
   * (1.5 / ln(d_AU + 2.71), 0.1495978707e12 metres per AU; no curve means
   * sunSize 1, not the constructed 0), then curve sets and controllers.
   * Then Carbon's occlusion upload (cpp:168-171): the slot bases bit-cast into
   * the global LensflareFxOccScale. It is not a duplicate of the per-object
   * indices GetPerObjectData ships: the flare mesh reads those, but the god
   * rays read this GLOBAL, and until 2026-09-26 it was never written. The curve is
   * called out-last (Update(simTime, position)) per the org convention -
   * Carbon's is out-first. */
  @meta.blue.method
  @meta.implemented
  Update(realTime, simTime)
  {
    if (!this.update) return;

    if (this.translationCurve)
    {
      this.translationCurve.Update(simTime, this.position);
      const distanceToCenter = vec3.length(this.position) / 0.1495978707e12;
      this.sunSize = 1.5 / Math.log(distanceToCenter + 2.71);
    }
    else
    {
      this.sunSize = 1;
    }

    this._occScaleVar.SetValue([
      bitsAsFloat(this.occlusionOffset ?? 0),
      bitsAsFloat(this.backgroundOcclusionOffset ?? 0),
      0,
      0
    ]);

    for (const curveSet of this.curveSets)
    {
      curveSet.Update(realTime, simTime);
    }
    for (const controller of this.controllers)
    {
      controller.Update(0.5);
    }
  }

  /** Carbon EveLensflare::UpdateVisibility (EveLensflare.cpp:298-311): the
   * viewDir dot test - visible iff dot(frustum.viewDir, direction) >= 0
   * (a sun exactly perpendicular to the view IS visible), then every flare
   * child updates its visibility under this lensflare's transform. NO display
   * gate (the display || isVisible gate lives in GetRenderables, cpp:281).
   * ONE-FRAME LATENCY is contract: within a Carbon frame this runs before
   * PrepareRender, so the dot uses the PREVIOUS frame's direction and
   * forwards the previous frame's transform - do not "fix" the order. Scene
   * call site: EveSpaceScene.cpp:1462-1466 (sequential, single-lensflare). */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext)
  {
    this.isVisible = false;
    const frustum = updateContext.GetFrustum();
    const viewDotDir = vec3.dot(frustum.viewDir, this.direction);
    this.isVisible = viewDotDir >= 0;
    for (const flare of this.flares)
    {
      flare.UpdateVisibility(updateContext, this.transform);
    }
  }

  /**
   * Carbon RunOcclusionQueries (cpp:323-347): allocates this lensflare's
   * foreground and background slots on first call - a new slot is Cleared to
   * visibility 1.0 - then runs each foreground occluder's query into its
   * counters, with fog weight 1.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {EveUpdateContext} updateContext The occluders' context.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  RunOcclusionQueries(renderContext, updateContext)
  {
    if (!this.display) return;

    const occlusionBuffer = Tr2OcclusionBuffer.getInstance();
    if (this.occlusionOffset === null) this.occlusionOffset = occlusionBuffer.AllocateOffset(renderContext);
    if (this.backgroundOcclusionOffset === null) this.backgroundOcclusionOffset = occlusionBuffer.AllocateOffset(renderContext);

    let index = 0;
    for (const occluder of this.occluders)
    {
      occluder.RunQuery(renderContext, updateContext, this.transform, Tr2OcclusionBuffer.getOccluderOffset(this.occlusionOffset, index++), 1);
    }
  }

  /**
   * Carbon RunBackgroundOcclusionQueries (cpp:359-379): the background slot,
   * then the background occluders. Carbon calls it from the background pass,
   * only for scenes with planets (EveSpaceScene.cpp:2153-2170). Fog weight 0.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {EveUpdateContext} updateContext The occluders' context.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  RunBackgroundOcclusionQueries(renderContext, updateContext)
  {
    if (!this.display) return;

    if (this.backgroundOcclusionOffset === null)
    {
      this.backgroundOcclusionOffset = Tr2OcclusionBuffer.getInstance().AllocateOffset(renderContext);
    }

    let index = 0;
    for (const occluder of this.backgroundOccluders)
    {
      occluder.RunQuery(renderContext, updateContext, this.transform, Tr2OcclusionBuffer.getOccluderOffset(this.backgroundOcclusionOffset, index++), 0);
    }
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this._controllerVariables.set(key, next);
    for (const controller of this.controllers) controller.SetVariable(key, next);
  }

  /**
   * Carbon EveLensflare::HandleControllerEvent (cpp:497-503).
   *
   * MISSING UNTIL 2026-09-05. Carbon declares it beside SetControllerVariable
   * and StartControllers, both of which were ported; this one was not, and the
   * hedge at every call site meant a lens flare silently ignored every
   * controller event rather than failing.
   */
  @meta.blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    const key = String(name);
    for (const controller of this.controllers) controller.HandleEvent(key);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller.Start();
  }

  /**
   * Carbon PrepareRender (cpp:192-266): the per-frame placement that needs
   * this frame's frustum. The direction to the sun (from the camera when the
   * flare has no position), a transform that turns the flare geometry toward
   * it and parks it `cameraFactor` in front of the camera, the
   * LensflareFxDirectionScale global, and the sun's screen position driving
   * the edge, centre, angle and x/y curves before the bindings copy.
   *
   * Carbon's row-vector `Transform( v, M )` over a row-major matrix is
   * gl-matrix `transformMat4` over the same bytes.
   *
   * The render context is an ADDED argument: Carbon reads the view from
   * Tr2Renderer::GetViewTransform, a static this runtime keeps on the context.
   *
   * @param {TriFrustum} frustum This frame's frustum.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  PrepareRender(frustum, renderContext)
  {
    if (!this.display) return;

    if (vec3.squaredLength(this.position) === 0) vec3.normalize(this.direction, vec3.negate(prepareScratch, frustum.viewPos));
    else vec3.normalize(this.direction, vec3.negate(prepareScratch, this.position));

    const cameraSpacePos = vec3.scaleAndAdd(vec3.create(), frustum.viewPos, frustum.viewDir, -this.cameraFactor);

    mat4.arcFromForward(this.transform, vec3.negate(prepareScratch, this.direction));
    this.transform[12] = cameraSpacePos[0];
    this.transform[13] = cameraSpacePos[1];
    this.transform[14] = cameraSpacePos[2];
    this.transform[15] = 1;

    this._directionVar.SetValue([ this.direction[0], this.direction[1], this.direction[2], this.sunSize ]);

    const direction = vec4.fromValues(this.direction[0], this.direction[1], this.direction[2], 0);
    vec4.transformMat4(direction, direction, renderContext.GetViewTransform());
    vec4.transformMat4(direction, direction, frustum.projectionMatrix);
    direction[0] /= direction[3];
    direction[1] /= direction[3];

    const distanceToEdge = 1 - Math.min(1 - Math.abs(direction[0]), 1 - Math.abs(direction[1]));
    const distanceToCenter = Math.hypot(direction[0], direction[1]);
    const radialAngle = Math.atan2(direction[1], direction[0]) + Math.PI;

    for (const curve of this.distanceToEdgeCurves) curve.UpdateValue(distanceToEdge);
    for (const curve of this.distanceToCenterCurves) curve.UpdateValue(distanceToCenter);
    for (const curve of this.radialAngleCurves) curve.UpdateValue(radialAngle);
    for (const curve of this.xDistanceToCenter) curve.UpdateValue(direction[0] + 10);
    for (const curve of this.yDistanceToCenter) curve.UpdateValue(direction[1] + 10);
    for (const binding of this.bindings) binding.CopyValue();
  }

  /**
   * Carbon GetRenderables (cpp:278-296): nothing unless displayed and visible;
   * each flare child's renderables, then this lensflare itself for its mesh.
   *
   * @param {TriFrustum} _frustum This frame's frustum (unused, as in Carbon).
   * @param {Array} renderables Out: the renderables.
   * @returns {Array} `renderables`.
   */
  @meta.blue.method
  @meta.implemented
  GetRenderables(_frustum, renderables = [])
  {
    if (!this.display || !this.isVisible) return renderables;

    for (const flare of this.flares) flare.GetRenderables(renderables, null);
    if (this.mesh) renderables.push(this);
    return renderables;
  }

  /** Carbon EveLensflare::GetBatches delegates the selected mesh areas (cpp:381-387). */
  @meta.blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (this.mesh)
    {
      this.mesh.GetBatches(batches, this.mesh.GetAreas(batchType), perObjectData);
    }
  }

  /** Carbon EveLensflare::HasTransparentBatches is always false (cpp:389-392). */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveLensflare::GetSortValue is the constant one (cpp:394-397). */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 1;
  }

  /** Carbon EveLensflare::GetPerObjectData (cpp:399-410): directionScale =
   * (direction, sunSize); indices[0]/[1] from the optional occlusion offsets
   * (null uploads 0). indices[2] and [3] are NEVER written in Carbon - the
   * per-element writes keep that arena-garbage parity. The struct registers
   * with stages ["vs", "ps"]: one payload, same bytes bound to both slots
   * (cpp:24-38). */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveLensflarePerObjectData");

    data.Set("directionScale", [this.direction[0], this.direction[1], this.direction[2], this.sunSize]);
    data.SetIndex("indices", 0, [this.occlusionOffset ?? 0]);
    data.SetIndex("indices", 1, [this.backgroundOcclusionOffset ?? 0]);

    return data;
  }

  /**
   * Returns this lensflare's occlusion-buffer slots. Carbon holds them as
   * Tr2OcclusionBuffer::Offset shared_ptrs whose deleter frees the slot when
   * the lensflare is destroyed (EveOccluder.cpp:36, 70-74); JavaScript has no
   * destructor, so the owner removing a lensflare calls this. Controllers unlink
   * with DELETING as in EveLensflare.cpp:129-135.
   *
   * @returns {void}
   */
  @meta.adapted
  Destroy()
  {
    for (const controller of this.controllers) controller.Unlink(UnlinkReason.DELETING);
    const occlusionBuffer = Tr2OcclusionBuffer.getInstance();
    occlusionBuffer.DestroyOffset(this.occlusionOffset);
    occlusionBuffer.DestroyOffset(this.backgroundOcclusionOffset);
    this.occlusionOffset = null;
    this.backgroundOcclusionOffset = null;
  }


}
