import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_translationCurve, _init_extra_translationCurve, _init_mesh, _init_extra_mesh, _init_name, _init_extra_name, _init_backgroundOccluders, _init_extra_backgroundOccluders, _init_occluders, _init_extra_occluders, _init_curveSets, _init_extra_curveSets, _init_distanceToEdgeCurves, _init_extra_distanceToEdgeCurves, _init_distanceToCenterCurves, _init_extra_distanceToCenterCurves, _init_radialAngleCurves, _init_extra_radialAngleCurves, _init_xDistanceToCenter, _init_extra_xDistanceToCenter, _init_yDistanceToCenter, _init_extra_yDistanceToCenter, _init_controllers, _init_extra_controllers, _init_bindings, _init_extra_bindings, _init_cameraFactor, _init_extra_cameraFactor, _init_position, _init_extra_position, _init_flares, _init_extra_flares, _init_update, _init_extra_update, _init_display, _init_extra_display;

/** Represents a lens-flare graph with CPU-side visibility and controller state. */
let _EveLensflare;
class EveLensflare extends CjsModel {
  static {
    ({
      e: [_init_translationCurve, _init_extra_translationCurve, _init_mesh, _init_extra_mesh, _init_name, _init_extra_name, _init_backgroundOccluders, _init_extra_backgroundOccluders, _init_occluders, _init_extra_occluders, _init_curveSets, _init_extra_curveSets, _init_distanceToEdgeCurves, _init_extra_distanceToEdgeCurves, _init_distanceToCenterCurves, _init_extra_distanceToCenterCurves, _init_radialAngleCurves, _init_extra_radialAngleCurves, _init_xDistanceToCenter, _init_extra_xDistanceToCenter, _init_yDistanceToCenter, _init_extra_yDistanceToCenter, _init_controllers, _init_extra_controllers, _init_bindings, _init_extra_bindings, _init_cameraFactor, _init_extra_cameraFactor, _init_position, _init_extra_position, _init_flares, _init_extra_flares, _init_update, _init_extra_update, _init_display, _init_extra_display, _initProto],
      c: [_EveLensflare, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveLensflare",
      family: "eve/effect"
    })], [[[io, io.readwrite, void 0, type.objectRef("ITriVectorFunction")], 16, "translationCurve"], [[io, io.persist, void 0, type.model("Tr2Mesh")], 16, "mesh"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("EveOccluder")], 16, "backgroundOccluders"], [[io, io.persist, void 0, type.list("EveOccluder")], 16, "occluders"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, void 0, type.list("ITriFunction")], 16, "distanceToEdgeCurves"], [[io, io.persist, void 0, type.list("ITriFunction")], 16, "distanceToCenterCurves"], [[io, io.persist, void 0, type.list("ITriFunction")], 16, "radialAngleCurves"], [[io, io.persist, void 0, type.list("ITriFunction")], 16, "xDistanceToCenter"], [[io, io.persist, void 0, type.list("ITriFunction")], 16, "yDistanceToCenter"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[io, io.persist, void 0, type.list("ITr2ValueBinding")], 16, "bindings"], [[io, io.persist, type, type.float32], 16, "cameraFactor"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, void 0, type.list("EveTransform")], 16, "flares"], [[io, io.persist, type, type.boolean], 16, "update"], [[io, io.persist, type, type.boolean], 16, "display"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetPerObjectData"]], 0, void 0, CjsModel));
  }
  #controllerVariables = (_initProto(this), new Map());

  /** m_translationCurve (ITriVectorFunctionPtr) [READWRITE] */
  translationCurve = _init_translationCurve(this, null);

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST] */
  mesh = (_init_extra_translationCurve(this), _init_mesh(this, null));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_mesh(this), _init_name(this, ""));

  /** m_backgroundOccluders (PEveOccluderVector) [READ, PERSIST] */
  backgroundOccluders = (_init_extra_name(this), _init_backgroundOccluders(this, []));

  /** m_occluders (PEveOccluderVector) [READ, PERSIST] */
  occluders = (_init_extra_backgroundOccluders(this), _init_occluders(this, []));

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  curveSets = (_init_extra_occluders(this), _init_curveSets(this, []));

  /** m_distanceToEdgeCurves (PITriFunctionVector) [READ, PERSIST] */
  distanceToEdgeCurves = (_init_extra_curveSets(this), _init_distanceToEdgeCurves(this, []));

  /** m_distanceToCenterCurves (PITriFunctionVector) [READ, PERSIST] */
  distanceToCenterCurves = (_init_extra_distanceToEdgeCurves(this), _init_distanceToCenterCurves(this, []));

  /** m_radialAngleCurves (PITriFunctionVector) [READ, PERSIST] */
  radialAngleCurves = (_init_extra_distanceToCenterCurves(this), _init_radialAngleCurves(this, []));

  /** m_xDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  xDistanceToCenter = (_init_extra_radialAngleCurves(this), _init_xDistanceToCenter(this, []));

  /** m_yDistanceToCenter (PITriFunctionVector) [READ, PERSIST] */
  yDistanceToCenter = (_init_extra_xDistanceToCenter(this), _init_yDistanceToCenter(this, []));

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  controllers = (_init_extra_yDistanceToCenter(this), _init_controllers(this, []));

  /** m_bindings (PITr2ValueBindingVector) [READ, PERSIST] */
  bindings = (_init_extra_controllers(this), _init_bindings(this, []));

  /** m_cameraFactor (float) [READWRITE, PERSIST] */
  cameraFactor = (_init_extra_bindings(this), _init_cameraFactor(this, 20));

  /** m_position (Vector3) [READWRITE, PERSIST] */
  position = (_init_extra_cameraFactor(this), _init_position(this, vec3.create()));

  /** m_flares (PEveTransformVector) [READ, PERSIST] */
  flares = (_init_extra_position(this), _init_flares(this, []));

  /** m_update (bool) [READWRITE, PERSIST] */
  update = (_init_extra_flares(this), _init_update(this, true));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_update(this), _init_display(this, true));

  /** m_isVisible (EveLensflare.h:95; ctor false, cpp:68) - runtime state,
   * not persisted. */
  isVisible = (_init_extra_display(this), false);

  /** m_direction (EveLensflare.h:106) - zero until PrepareRender stamps
   * Normalize(-position); the first-frame zero direction dots to 0, which
   * counts as VISIBLE (the >= comparison) - deliberate Carbon behavior. */
  direction = vec3.create();

  /** m_transform (EveLensflare.h:102; ctor identity, cpp:74) - stamped by
   * PrepareRender, forwarded to the flare children as their parent. */
  transform = mat4.create();

  /** Carbon EveLensflare::UpdateVisibility (EveLensflare.cpp:298-311): the
   * viewDir dot test - visible iff dot(frustum.viewDir, direction) >= 0
   * (a sun exactly perpendicular to the view IS visible), then every flare
   * child updates its visibility under this lensflare's transform. NO display
   * gate (the display || isVisible gate lives in GetRenderables, cpp:281).
   * ONE-FRAME LATENCY is contract: within a Carbon frame this runs before
   * PrepareRender, so the dot uses the PREVIOUS frame's direction and
   * forwards the previous frame's transform - do not "fix" the order. Scene
   * call site: EveSpaceScene.cpp:1462-1466 (sequential, single-lensflare). */
  UpdateVisibility(updateContext) {
    this.isVisible = false;
    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const viewDir = frustum?.viewDir ?? frustum?.m_viewDir;
    const viewDotDir = viewDir ? vec3.dot(viewDir, this.direction) : 0;
    this.isVisible = viewDotDir >= 0;
    for (const flare of this.flares) {
      flare?.UpdateVisibility?.(updateContext, this.transform);
    }
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  SetControllerVariable(name, value) {
    const key = String(name);
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable?.(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  StartControllers() {
    for (const controller of this.controllers) controller?.Start?.();
  }

  /** Carbon EveLensflare::GetBatches delegates the selected mesh areas (cpp:381-387). */
  GetBatches(batches, batchType, perObjectData, _reason) {
    if (this.mesh) {
      this.mesh.GetBatches?.(batches, this.mesh.GetAreas?.(batchType), perObjectData);
    }
  }

  /** Carbon EveLensflare::HasTransparentBatches is always false (cpp:389-392). */
  HasTransparentBatches() {
    return false;
  }

  /** Carbon EveLensflare::GetSortValue is the constant one (cpp:394-397). */
  GetSortValue() {
    return 1;
  }

  /** Carbon EveLensflare::GetPerObjectData populates lensflare-specific device constants (cpp:399-410). */
  GetPerObjectData(_accumulator) {
    throw new Error("EveLensflare.GetPerObjectData is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _EveLensflare as EveLensflare };
//# sourceMappingURL=EveLensflare.js.map
