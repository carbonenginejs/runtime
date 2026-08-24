// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/EveDistributionModifierTransformOffset.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { IEveDistributionModifier } from "./IEveDistributionModifier.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Accumulates authored or lifetime-sampled translation, rotation, and scale onto a distributed placement. */
@type.define({ className: "EveDistributionModifierTransformOffset", family: "eve/distribution/attributeModifiers" })
export class EveDistributionModifierTransformOffset extends IEveDistributionModifier
{

  /** m_rotationCurve (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_scale (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_scaleCurve (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  scaleCurve = null;

  /** m_translationCurve (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  /**
   * Always reports a transform effect, which puts the distribution into its
   * per-frame reset-and-reaccumulate mode.
   */
  @carbon.method
  @impl.implemented
  AffectsTransform()
  {
    return true;
  }

  /**
   * Accumulates a translation, rotation and scale onto a placement's additional transform, taken from the authored constants or, when a curve is set, sampled from it at the placement's lifetime; the translation is rotated into the placement's current orientation and the scale multiplies the existing additional scale rather than replacing it.
   *
   * @returns {number} Always DO_NOTHING; this modifier never ends an entity's life.
   */
  @carbon.method
  @impl.adapted
  ProcessDistributionModifier(placement, _deltaTime, _params)
  {
    // Carbon (row-vector): initialRotation * additionalRotation - initial first.
    const combinedRotation = quat.multiply(quat.create(), placement.additionalRotation, placement.initialRotation);
    const translation = vec3.create();
    if (this.translationCurve)
    {
      this.translationCurve.GetValueAt(placement.lifeTime, translation);
    }
    else
    {
      vec3.copy(translation, this.translation);
    }
    vec3.transformQuat(translation, translation, combinedRotation);
    vec3.add(placement.additionalTranslation, placement.additionalTranslation, translation);

    const rotation = quat.create();
    if (this.rotationCurve)
    {
      this.rotationCurve.GetValueAt(placement.lifeTime, rotation);
    }
    else
    {
      quat.copy(rotation, this.rotation);
    }
    // Carbon (row-vector): additionalRotation *= rotation - additional first.
    quat.multiply(placement.additionalRotation, rotation, placement.additionalRotation);

    const scale = vec3.create();
    if (this.scaleCurve)
    {
      this.scaleCurve.GetValueAt(placement.lifeTime, scale);
    }
    else
    {
      vec3.copy(scale, this.scaling);
    }
    vec3.multiply(placement.additionalScale, placement.additionalScale, scale);
    return 0;
  }

}
