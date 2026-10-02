// Source: trinity/trinity/Eve/UI/EveSpherePin.h
// Source: trinity/trinity/Eve/UI/EveSpherePin.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { IEveTransform } from "../IEveTransform.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";

/** A UI sphere pin: authored SRT placement plus the pin constant record. */
@meta.define({ className: "EveSpherePin", family: "eve/ui" })
@meta.blue.inherit(ITr2Renderable, IEveSpaceObject2, IEveTransform)
export class EveSpherePin
{

  /** m_primitiveCount (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  primitiveCount = 0;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_enablePicking (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  enablePicking = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_pinColor (Color) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  pinColor = vec4.fromValues(1, 1, 1, 1);

  /** m_pinColor (Color) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** m_sortValueMultiplier (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sortValueMultiplier = 1;

  /** m_centerNormal (Vector3) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  centerNormal = vec3.fromValues(0, 0, 1);

  /** m_pinMaxRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinMaxRadius = 0.2;

  /** m_pinRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinRadius = 0.2;

  /** m_pinEffectResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  pinEffectResPath = "";

  /** m_geomResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  geometryResPath = "";

  /** m_pinRotation (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinRotation = 0;

  /** m_pinAlphaThreshold (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinAlphaThreshold = 0;

  /** m_uvAtlasScaleOffset (Vector4) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  uvAtlasScaleOffset = vec4.fromValues(1, 1, 0, 0);

  /** m_pinEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  pinEffect = null;

  /** m_pickEffect (Tr2EffectPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2Effect")
  pickEffect = null;

  /** m_worldTransform (EveSpherePin.cpp:46; ctor identity) - runtime state
   * stamped by UpdateViewDependentData; not persisted. */
  worldTransform = mat4.create();

  /** m_boundingSphere - runtime state Carbon derives from the pin geometry
   * resource; zero until a loader/engine stamps it. Not persisted. */
  boundingSphere = vec4.create();

  /** Carbon EveSpherePin::HasTransparentBatches is always true. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon EveSpherePin::GetSortValue (cpp:322-332): distance from the view
   * position to the world-transformed bounding-sphere center, scaled by the
   * sort-value multiplier. Carbon reads the Tr2Renderer view-position static;
   * the batch collector supplies the render context instead. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon reads the Tr2Renderer view-position static; the batch collector supplies the render context explicitly.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition();

    if (!viewPosition)
    {
      return 0;
    }

    const center = vec3.transformMat4(
      vec3.create(),
      [this.boundingSphere[0], this.boundingSphere[1], this.boundingSphere[2]],
      this.worldTransform
    );

    return vec3.distance(viewPosition, center) * this.sortValueMultiplier;
  }

  /** Carbon EveSpherePin::GetBatches submits the pin geometry with the pin effect (GPU-backed). */
  @meta.blue.method
  @meta.notImplemented
  GetBatches(_accumulator, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveSpherePin.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpherePin::GetPickingBatches submits the pick-effect geometry (GPU-backed). */
  @meta.blue.method
  @meta.notImplemented
  GetPickingBatches(_accumulator, _perObjectData)
  {
    throw new Error("EveSpherePin.GetPickingBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpherePin::GetID uses the pin itself as its picking identity. */
  @meta.blue.method
  @meta.implemented
  GetID()
  {
    return this;
  }

  /** Carbon EveSpherePin::UpdateViewDependentData (cpp:243-251):
   * m_worldTransform = TransformationMatrix(scaling, rotation, translation) *
   * parentTransform. Carbon (row-vector): local * parent - local first, so
   * gl multiply(world, parent, local); Carbon (s, r, t) is gl
   * fromRotationTranslationScale (r, t, s). The frustum argument is unused
   * in Carbon's body and kept for signature parity. */
  @meta.blue.method
  @meta.implemented
  UpdateViewDependentData(_frustum, parentTransform)
  {
    const local = mat4.fromRotationTranslationScale(mat4.create(), this.rotation, this.translation, this.scaling);

    mat4.multiply(this.worldTransform, parentTransform, local);
  }

  /** Carbon EveSpherePin::GetPerObjectData (cpp:336-357). One transient
   * payload; Set(MATRIX) performs Carbon's `Transpose(m_worldTransform)`.
   * The struct registers with stages ["vs", "ps"]: the SAME bytes are bound
   * to both per-object slots (cpp:415-425). */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveSpherePinPerObjectData");

    data.SetAndTranspose("worldMatrix", this.worldTransform);
    data.Set("pinPosition", [
      this.centerNormal[0],
      this.centerNormal[1],
      this.centerNormal[2],
      this.pinRadius
    ]);
    data.Set("pinRotation", [this.pinRotation, 0, 0, 0]);
    data.Set("pinColor", this.pinColor);
    data.Set("pinThreshold", [this.pinAlphaThreshold, 0, 0, 0]);
    data.Set("pinRadiusPrecalc", [
      Math.sin(this.pinRadius),
      Math.cos(this.pinRadius),
      Math.sin(this.pinRotation),
      Math.cos(this.pinRotation)
    ]);
    data.Set("pinUV", this.uvAtlasScaleOffset);

    return data;
  }

}
