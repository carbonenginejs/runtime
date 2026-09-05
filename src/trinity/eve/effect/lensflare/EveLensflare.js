// Source: trinity/trinity/Eve/EveLensflare.h
// Source: trinity/trinity/Eve/EveLensflare.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { withITr2Renderable } from "../../../core/ITr2Renderable.js";

/** Represents a lens-flare graph with CPU-side visibility and controller state. */
@type.define({ className: "EveLensflare", family: "eve/effect" })
export class EveLensflare extends withITr2Renderable(CjsModel)
{

  #controllerVariables = new Map();

  /** m_translationCurve (ITriVectorFunctionPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITriVectorFunction")
  translationCurve = null;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Mesh")
  mesh = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_backgroundOccluders (PEveOccluderVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveOccluder")
  backgroundOccluders = [];

  /** m_occluders (PEveOccluderVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveOccluder")
  occluders = [];

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_distanceToEdgeCurves (PITriFunctionVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITriFunction")
  distanceToEdgeCurves = [];

  /** m_distanceToCenterCurves (PITriFunctionVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITriFunction")
  distanceToCenterCurves = [];

  /** m_radialAngleCurves (PITriFunctionVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITriFunction")
  radialAngleCurves = [];

  /** m_xDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITriFunction")
  xDistanceToCenter = [];

  /** m_yDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITriFunction")
  yDistanceToCenter = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2Controller")
  controllers = [];

  /** m_bindings (PITr2ValueBindingVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2ValueBinding")
  bindings = [];

  /** m_cameraFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  cameraFactor = 20;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_flares (PEveTransformVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveTransform")
  flares = [];

  /** m_update (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  update = true;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
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
   * Tr2OcclusionBuffer offsets the ENGINE allocates and stamps (cpp:332-368).
   * null until an engine provides them; Carbon's null case uploads 0. */
  occlusionOffset = null;

  backgroundOcclusionOffset = null;

  /** m_transform (EveLensflare.h:102; ctor identity, cpp:74) - stamped by
   * PrepareRender, forwarded to the flare children as their parent. */
  transform = mat4.create();

  /** Carbon EveLensflare::Update (EveLensflare.cpp:145-182): position from the
   * translation curve, the sun-size curve of very old magic numbers
   * (1.5 / ln(d_AU + 2.71), 0.1495978707e12 metres per AU; no curve means
   * sunSize 1, not the constructed 0), then curve sets and controllers.
   * Carbon's occlusion upload (cpp:169-171, the uint32 offsets bit-cast into
   * m_occScaleVar) is NOT re-derived here: the engine stamps
   * occlusionOffset/backgroundOcclusionOffset (see the field comment above)
   * and GetPerObjectData already ships them through the per-object indices,
   * so repeating it in Update would double-write the same seam. The curve is
   * called out-last (Update(simTime, position)) per the org convention -
   * Carbon's is out-first. */
  @carbon.method
  @impl.implemented
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

    for (const curveSet of this.curveSets)
    {
      curveSet?.Update(realTime, simTime);
    }
    for (const controller of this.controllers)
    {
      controller?.Update(0.5);
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
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext)
  {
    this.isVisible = false;
    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const viewDir = frustum?.viewDir ?? frustum?.m_viewDir;
    const viewDotDir = viewDir ? vec3.dot(viewDir, this.direction) : 0;
    this.isVisible = viewDotDir >= 0;
    for (const flare of this.flares)
    {
      flare?.UpdateVisibility(updateContext, this.transform);
    }
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable(key, next);
  }

  /**
   * Carbon EveLensflare::HandleControllerEvent (cpp:497-503).
   *
   * MISSING UNTIL 2026-09-05. Carbon declares it beside SetControllerVariable
   * and StartControllers, both of which were ported; this one was not, and the
   * hedge at every call site meant a lens flare silently ignored every
   * controller event rather than failing.
   */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    const key = String(name);
    for (const controller of this.controllers) controller?.HandleEvent(key);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start();
  }

  /** Carbon EveLensflare::GetBatches delegates the selected mesh areas (cpp:381-387). */
  @carbon.method
  @impl.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (this.mesh)
    {
      this.mesh.GetBatches?.(batches, this.mesh.GetAreas(batchType), perObjectData);
    }
  }

  /** Carbon EveLensflare::HasTransparentBatches is always false (cpp:389-392). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveLensflare::GetSortValue is the constant one (cpp:394-397). */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveLensflarePerObjectData");

    data.Set("directionScale", [this.direction[0], this.direction[1], this.direction[2], this.sunSize]);
    data.SetIndex("indices", 0, [this.occlusionOffset ?? 0]);
    data.SetIndex("indices", 1, [this.backgroundOcclusionOffset ?? 0]);

    return data;
  }

}
