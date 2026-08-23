import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_primitiveCount, _init_extra_primitiveCount, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_display, _init_extra_display, _init_enablePicking, _init_extra_enablePicking, _init_name, _init_extra_name, _init_pinColor, _init_extra_pinColor, _init_color, _init_extra_color, _init_curveSets, _init_extra_curveSets, _init_sortValueMultiplier, _init_extra_sortValueMultiplier, _init_centerNormal, _init_extra_centerNormal, _init_pinMaxRadius, _init_extra_pinMaxRadius, _init_pinRadius, _init_extra_pinRadius, _init_pinEffectResPath, _init_extra_pinEffectResPath, _init_geometryResPath, _init_extra_geometryResPath, _init_pinRotation, _init_extra_pinRotation, _init_pinAlphaThreshold, _init_extra_pinAlphaThreshold, _init_uvAtlasScaleOffset, _init_extra_uvAtlasScaleOffset, _init_pinEffect, _init_extra_pinEffect, _init_pickEffect, _init_extra_pickEffect;

/** A UI sphere pin: authored SRT placement plus the pin constant record. */
let _EveSpherePin;
class EveSpherePin extends CjsModel {
  static {
    ({
      e: [_init_primitiveCount, _init_extra_primitiveCount, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_display, _init_extra_display, _init_enablePicking, _init_extra_enablePicking, _init_name, _init_extra_name, _init_pinColor, _init_extra_pinColor, _init_color, _init_extra_color, _init_curveSets, _init_extra_curveSets, _init_sortValueMultiplier, _init_extra_sortValueMultiplier, _init_centerNormal, _init_extra_centerNormal, _init_pinMaxRadius, _init_extra_pinMaxRadius, _init_pinRadius, _init_extra_pinRadius, _init_pinEffectResPath, _init_extra_pinEffectResPath, _init_geometryResPath, _init_extra_geometryResPath, _init_pinRotation, _init_extra_pinRotation, _init_pinAlphaThreshold, _init_extra_pinAlphaThreshold, _init_uvAtlasScaleOffset, _init_extra_uvAtlasScaleOffset, _init_pinEffect, _init_extra_pinEffect, _init_pickEffect, _init_extra_pickEffect, _initProto],
      c: [_EveSpherePin, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSpherePin",
      family: "eve/ui"
    })], [[[io, io.read, type, type.int32], 16, "primitiveCount"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "enablePicking"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.color], 16, "pinColor"], [[io, io.notify, io, io.persist, type, type.color], 16, "color"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, type, type.float32], 16, "sortValueMultiplier"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "centerNormal"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinMaxRadius"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinRadius"], [[io, io.notify, io, io.persist, type, type.string], 16, "pinEffectResPath"], [[io, io.notify, io, io.persist, type, type.string], 16, "geometryResPath"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinRotation"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinAlphaThreshold"], [[io, io.notify, io, io.persist, type, type.vec4], 16, "uvAtlasScaleOffset"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "pinEffect"], [[io, io.read, void 0, type.objectRef("Tr2Effect")], 16, "pickEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the Tr2Renderer view-position static; the batch collector supplies the render context explicitly.")], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetPickingBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetID"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateViewDependentData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"]], 0, void 0, CjsModel));
  }
  /** m_primitiveCount (int) [READ] */
  primitiveCount = (_initProto(this), _init_primitiveCount(this, 0));

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  translation = (_init_extra_primitiveCount(this), _init_translation(this, vec3.create()));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_translation(this), _init_rotation(this, quat.create()));

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_scaling(this), _init_display(this, true));

  /** m_enablePicking (bool) [READWRITE, PERSIST] */
  enablePicking = (_init_extra_display(this), _init_enablePicking(this, true));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_enablePicking(this), _init_name(this, ""));

  /** m_pinColor (Color) [READWRITE, NOTIFY, PERSIST] */
  pinColor = (_init_extra_name(this), _init_pinColor(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_pinColor (Color) [READWRITE, NOTIFY, PERSIST] */
  color = (_init_extra_pinColor(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  curveSets = (_init_extra_color(this), _init_curveSets(this, []));

  /** m_sortValueMultiplier (float) [READWRITE, PERSIST] */
  sortValueMultiplier = (_init_extra_curveSets(this), _init_sortValueMultiplier(this, 1));

  /** m_centerNormal (Vector3) [READWRITE, NOTIFY, PERSIST] */
  centerNormal = (_init_extra_sortValueMultiplier(this), _init_centerNormal(this, vec3.fromValues(0, 0, 1)));

  /** m_pinMaxRadius (float) [READWRITE, NOTIFY, PERSIST] */
  pinMaxRadius = (_init_extra_centerNormal(this), _init_pinMaxRadius(this, 0.2));

  /** m_pinRadius (float) [READWRITE, NOTIFY, PERSIST] */
  pinRadius = (_init_extra_pinMaxRadius(this), _init_pinRadius(this, 0.2));

  /** m_pinEffectResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  pinEffectResPath = (_init_extra_pinRadius(this), _init_pinEffectResPath(this, ""));

  /** m_geomResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  geometryResPath = (_init_extra_pinEffectResPath(this), _init_geometryResPath(this, ""));

  /** m_pinRotation (float) [READWRITE, NOTIFY, PERSIST] */
  pinRotation = (_init_extra_geometryResPath(this), _init_pinRotation(this, 0));

  /** m_pinAlphaThreshold (float) [READWRITE, NOTIFY, PERSIST] */
  pinAlphaThreshold = (_init_extra_pinRotation(this), _init_pinAlphaThreshold(this, 0));

  /** m_uvAtlasScaleOffset (Vector4) [READWRITE, NOTIFY, PERSIST] */
  uvAtlasScaleOffset = (_init_extra_pinAlphaThreshold(this), _init_uvAtlasScaleOffset(this, vec4.fromValues(1, 1, 0, 0)));

  /** m_pinEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  pinEffect = (_init_extra_uvAtlasScaleOffset(this), _init_pinEffect(this, null));

  /** m_pickEffect (Tr2EffectPtr) [READ] */
  pickEffect = (_init_extra_pinEffect(this), _init_pickEffect(this, null));

  /** m_worldTransform (EveSpherePin.cpp:46; ctor identity) - runtime state
   * stamped by UpdateViewDependentData; not persisted. */
  worldTransform = (_init_extra_pickEffect(this), mat4.create());

  /** m_boundingSphere - runtime state Carbon derives from the pin geometry
   * resource; zero until a loader/engine stamps it. Not persisted. */
  boundingSphere = vec4.create();

  /** Carbon EveSpherePin::HasTransparentBatches is always true. */
  HasTransparentBatches() {
    return true;
  }

  /** Carbon EveSpherePin::GetSortValue (cpp:322-332): distance from the view
   * position to the world-transformed bounding-sphere center, scaled by the
   * sort-value multiplier. Carbon reads the Tr2Renderer view-position static;
   * the batch collector supplies the render context instead. */
  GetSortValue(renderContext = null) {
    const viewPosition = renderContext?.GetViewPosition?.();
    if (!viewPosition) {
      return 0;
    }
    const center = vec3.transformMat4(vec3.create(), [this.boundingSphere[0], this.boundingSphere[1], this.boundingSphere[2]], this.worldTransform);
    return vec3.distance(viewPosition, center) * this.sortValueMultiplier;
  }

  /** Carbon EveSpherePin::GetBatches submits the pin geometry with the pin effect (GPU-backed). */
  GetBatches(_accumulator, _batchType, _perObjectData, _reason) {
    throw new Error("EveSpherePin.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpherePin::GetPickingBatches submits the pick-effect geometry (GPU-backed). */
  GetPickingBatches(_accumulator, _perObjectData) {
    throw new Error("EveSpherePin.GetPickingBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon ITr2Pickable::GetID - the native picking identity contract. */
  GetID() {
    throw new Error("EveSpherePin.GetID is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpherePin::UpdateViewDependentData (cpp:243-251):
   * m_worldTransform = TransformationMatrix(scaling, rotation, translation) *
   * parentTransform. Carbon (row-vector): local * parent - local first, so
   * gl multiply(world, parent, local); Carbon (s, r, t) is gl
   * fromRotationTranslationScale (r, t, s). The frustum argument is unused
   * in Carbon's body and kept for signature parity. */
  UpdateViewDependentData(_frustum, parentTransform) {
    const local = mat4.fromRotationTranslationScale(mat4.create(), this.rotation, this.translation, this.scaling);
    mat4.multiply(this.worldTransform, parentTransform, local);
  }

  /** Carbon EveSpherePin::GetPerObjectData (cpp:336-357). One transient
   * payload; Set(MATRIX) performs Carbon's `Transpose(m_worldTransform)`.
   * The struct registers with stages ["vs", "ps"]: the SAME bytes are bound
   * to both per-object slots (cpp:415-425). */
  GetPerObjectData(accumulator) {
    const data = accumulator.Alloc("EveSpherePinPerObjectData");
    data.SetAndTranspose("worldMatrix", this.worldTransform);
    data.Set("pinPosition", [this.centerNormal[0], this.centerNormal[1], this.centerNormal[2], this.pinRadius]);
    data.Set("pinRotation", [this.pinRotation, 0, 0, 0]);
    data.Set("pinColor", this.pinColor);
    data.Set("pinThreshold", [this.pinAlphaThreshold, 0, 0, 0]);
    data.Set("pinRadiusPrecalc", [Math.sin(this.pinRadius), Math.cos(this.pinRadius), Math.sin(this.pinRotation), Math.cos(this.pinRotation)]);
    data.Set("pinUV", this.uvAtlasScaleOffset);
    return data;
  }
  static {
    _initClass();
  }
}

export { _EveSpherePin as EveSpherePin };
//# sourceMappingURL=EveSpherePin.js.map
