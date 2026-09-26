// Source: trinity/trinity/Eve/EveLensflare.h
// Source: trinity/trinity/Eve/EveLensflare.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
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
@type.define({ className: "EveLensflare", family: "eve/effect" })
@carbon.inherit(ITr2Renderable)
export class EveLensflare extends CjsModel
{

  #controllerVariables = new Map();

  /** m_translationCurve (ITriVectorFunctionPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("ITriVectorFunction")
  translationCurve = null;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("Tr2Mesh")
  mesh = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_backgroundOccluders (PEveOccluderVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveOccluder")
  backgroundOccluders = [];

  /** m_occluders (PEveOccluderVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveOccluder")
  occluders = [];

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_distanceToEdgeCurves (PITriFunctionVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITriFunction")
  distanceToEdgeCurves = [];

  /** m_distanceToCenterCurves (PITriFunctionVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITriFunction")
  distanceToCenterCurves = [];

  /** m_radialAngleCurves (PITriFunctionVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITriFunction")
  radialAngleCurves = [];

  /** m_xDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITriFunction")
  xDistanceToCenter = [];

  /** m_yDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITriFunction")
  yDistanceToCenter = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITr2Controller")
  controllers = [];

  /** m_bindings (PITr2ValueBindingVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITr2ValueBinding")
  bindings = [];

  /** m_cameraFactor (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  cameraFactor = 20;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_flares (PEveTransformVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveTransform")
  flares = [];

  /** m_update (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  update = true;

  /** m_display (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
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
   * Tr2OcclusionBuffer slots this lensflare allocates on its first occlusion
   * query (RunOcclusionQueries, cpp:330-337). null until then; Carbon's null
   * case uploads 0. */
  occlusionOffset = null;

  backgroundOcclusionOffset = null;

  /** m_directionVar: the global "LensflareFxDirectionScale" (cpp:72). */
  #directionVar = Tr2VariableStore.GlobalStore().RegisterVariable("LensflareFxDirectionScale", [ 0, 0, 0, 1 ]);

  /**
   * m_occScaleVar: the global "LensflareFxOccScale" (cpp:73), (1, 0, 0, 0)
   * until the first Update. x and y carry the foreground and background slot
   * bases as float BITS; the god rays read FlareOcclusionBuffer at y.
   */
  #occScaleVar = Tr2VariableStore.GlobalStore().RegisterVariable("LensflareFxOccScale", [ 1, 0, 0, 0 ]);

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

    this.#occScaleVar.SetValue([
      bitsAsFloat(this.occlusionOffset ?? 0),
      bitsAsFloat(this.backgroundOcclusionOffset ?? 0),
      0,
      0
    ]);

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

  /**
   * Carbon RunOcclusionQueries (cpp:323-347): allocates this lensflare's
   * foreground and background slots on first call - a new slot is Cleared to
   * visibility 1.0 - then runs each foreground occluder's query into its
   * counters.
   *
   * PARTIAL: EveOccluder.RunQuery (EveOccluder.cpp:150-185) is not ported, so
   * the occluders do not run and the slots keep visibility 1.0 - the flare
   * reads unoccluded. That is reported once rather than skipped silently.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {EveUpdateContext} _updateContext The occluders' context.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RunOcclusionQueries(renderContext, _updateContext)
  {
    if (!this.display) return;

    const occlusionBuffer = Tr2OcclusionBuffer.getInstance();
    if (this.occlusionOffset === null) this.occlusionOffset = occlusionBuffer.AllocateOffset(renderContext);
    if (this.backgroundOcclusionOffset === null) this.backgroundOcclusionOffset = occlusionBuffer.AllocateOffset(renderContext);

    if (this.occluders.length) EveLensflare.#WarnOccludersUnported();
  }

  /**
   * Carbon RunBackgroundOcclusionQueries (cpp:359-379): the background slot,
   * then the background occluders. Carbon calls it from the background pass,
   * only for scenes with planets (EveSpaceScene.cpp:2153-2170). PARTIAL for the
   * same reason as RunOcclusionQueries.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {EveUpdateContext} _updateContext The occluders' context.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RunBackgroundOcclusionQueries(renderContext, _updateContext)
  {
    if (!this.display) return;

    if (this.backgroundOcclusionOffset === null)
    {
      this.backgroundOcclusionOffset = Tr2OcclusionBuffer.getInstance().AllocateOffset(renderContext);
    }

    if (this.backgroundOccluders.length) EveLensflare.#WarnOccludersUnported();
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
  @carbon.method
  @impl.adapted
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

    this.#directionVar.SetValue([ this.direction[0], this.direction[1], this.direction[2], this.sunSize ]);

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
  @carbon.method
  @impl.implemented
  GetRenderables(_frustum, renderables = [])
  {
    if (!this.display || !this.isVisible) return renderables;

    for (const flare of this.flares) flare.GetRenderables(renderables, null);
    if (this.mesh) renderables.push(this);
    return renderables;
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

  /**
   * Returns this lensflare's occlusion-buffer slots. Carbon holds them as
   * Tr2OcclusionBuffer::Offset shared_ptrs whose deleter frees the slot when
   * the lensflare is destroyed (EveOccluder.cpp:36, 70-74); JavaScript has no
   * destructor, so the owner removing a lensflare calls this.
   *
   * @returns {void}
   */
  Destroy()
  {
    const occlusionBuffer = Tr2OcclusionBuffer.getInstance();
    occlusionBuffer.DestroyOffset(this.occlusionOffset);
    occlusionBuffer.DestroyOffset(this.backgroundOcclusionOffset);
    this.occlusionOffset = null;
    this.backgroundOcclusionOffset = null;
  }

  /** Reports, once per page, that occluders are present but EveOccluder.RunQuery is not ported. */
  static #WarnOccludersUnported()
  {
    if (EveLensflare.#occludersWarned) return;
    EveLensflare.#occludersWarned = true;
    console.warn("EveLensflare: EveOccluder.RunQuery is not ported; lens flares read unoccluded (visibility 1.0).");
  }

  static #occludersWarned = false;

}
