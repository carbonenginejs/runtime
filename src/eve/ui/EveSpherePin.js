// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/UI/EveSpherePin.h
// Source: trinity/trinity/Eve/UI/EveSpherePin.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** A UI sphere pin: authored SRT placement plus the pin constant record. */
@type.define({ className: "EveSpherePin", family: "eve/ui" })
export class EveSpherePin extends CjsModel
{

  /** m_primitiveCount (int) [READ] */
  @io.read
  @type.int32
  primitiveCount = 0;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_enablePicking (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  enablePicking = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_pinColor (Color) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.color
  pinColor = vec4.fromValues(1, 1, 1, 1);

  /** m_pinColor (Color) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_sortValueMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sortValueMultiplier = 1;

  /** m_centerNormal (Vector3) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.vec3
  centerNormal = vec3.fromValues(0, 0, 1);

  /** m_pinMaxRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinMaxRadius = 0.2;

  /** m_pinRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinRadius = 0.2;

  /** m_pinEffectResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  pinEffectResPath = "";

  /** m_geomResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  geometryResPath = "";

  /** m_pinRotation (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinRotation = 0;

  /** m_pinAlphaThreshold (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinAlphaThreshold = 0;

  /** m_uvAtlasScaleOffset (Vector4) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.vec4
  uvAtlasScaleOffset = vec4.fromValues(1, 1, 0, 0);

  /** m_pinEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  pinEffect = null;

  /** m_pickEffect (Tr2EffectPtr) [READ] */
  @io.read
  @type.objectRef("Tr2Effect")
  pickEffect = null;

  /** m_worldTransform (EveSpherePin.cpp:46; ctor identity) - runtime state
   * stamped by UpdateViewDependentData; not persisted. */
  worldTransform = mat4.create();

  /** m_boundingSphere - runtime state Carbon derives from the pin geometry
   * resource; zero until a loader/engine stamps it. Not persisted. */
  boundingSphere = vec4.create();

  /** Carbon EveSpherePin::HasTransparentBatches is always true. */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon EveSpherePin::GetSortValue (cpp:322-332): distance from the view
   * position to the world-transformed bounding-sphere center, scaled by the
   * sort-value multiplier. Carbon reads the Tr2Renderer view-position static;
   * the batch collector supplies the render context instead. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position static; the batch collector supplies the render context explicitly.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.();

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
  @carbon.method
  @impl.notImplemented
  GetBatches(_accumulator, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveSpherePin.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpherePin::GetPickingBatches submits the pick-effect geometry (GPU-backed). */
  @carbon.method
  @impl.notImplemented
  GetPickingBatches(_accumulator, _perObjectData)
  {
    throw new Error("EveSpherePin.GetPickingBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon ITr2Pickable::GetID - the native picking identity contract. */
  @carbon.method
  @impl.notImplemented
  GetID()
  {
    throw new Error("EveSpherePin.GetID is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpherePin::UpdateViewDependentData (cpp:243-251):
   * m_worldTransform = TransformationMatrix(scaling, rotation, translation) *
   * parentTransform. Carbon (row-vector): local * parent - local first, so
   * gl multiply(world, parent, local); Carbon (s, r, t) is gl
   * fromRotationTranslationScale (r, t, s). The frustum argument is unused
   * in Carbon's body and kept for signature parity. */
  @carbon.method
  @impl.implemented
  UpdateViewDependentData(_frustum, parentTransform)
  {
    const local = mat4.fromRotationTranslationScale(mat4.create(), this.rotation, this.translation, this.scaling);

    mat4.multiply(this.worldTransform, parentTransform, local);
  }

  /** Carbon EveSpherePin::GetPerObjectData (cpp:336-357). One transient
   * payload; Set(MATRIX) performs Carbon's `Transpose(m_worldTransform)`.
   * The struct registers with stages ["vs", "ps"]: the SAME bytes are bound
   * to both per-object slots (cpp:415-425). */
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveSpherePinPerObjectData");

    data.Set("worldMatrix", this.worldTransform);
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
