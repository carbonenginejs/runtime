import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_rotationCurve, _init_extra_rotationCurve, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_scaleCurve, _init_extra_scaleCurve, _init_translationCurve, _init_extra_translationCurve;

/** EveDistributionModifierTransformOffset (eve/distribution/attributeModifiers) - generated from schema shapeHash 6498e175.... */
let _EveDistributionModif;
class EveDistributionModifierTransformOffset extends CjsModel {
  static {
    ({
      e: [_init_rotationCurve, _init_extra_rotationCurve, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_scaleCurve, _init_extra_scaleCurve, _init_translationCurve, _init_extra_translationCurve, _initProto],
      c: [_EveDistributionModif, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionModifierTransformOffset",
      family: "eve/distribution/attributeModifiers"
    })], [[[io, io.persist, void 0, type.model("ITriQuaternionFunction")], 16, "rotationCurve"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "scaleCurve"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "translationCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "AffectsTransform"], [[carbon, carbon.method, impl, impl.adapted], 18, "ProcessDistributionModifier"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_translationCurve(this);
  }
  /** m_rotationCurve (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  rotationCurve = (_initProto(this), _init_rotationCurve(this, null));

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  translation = (_init_extra_rotationCurve(this), _init_translation(this, vec3.create()));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_translation(this), _init_rotation(this, quat.create()));

  /** m_scale (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_scaleCurve (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  scaleCurve = (_init_extra_scaling(this), _init_scaleCurve(this, null));

  /** m_translationCurve (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  translationCurve = (_init_extra_scaleCurve(this), _init_translationCurve(this, null));

  /**
   * Always reports a transform effect, which puts the distribution into its
   * per-frame reset-and-reaccumulate mode.
   */
  AffectsTransform() {
    return true;
  }

  /**
   * Accumulates a translation, rotation and scale onto a placement's additional transform, taken from the authored constants or, when a curve is set, sampled from it at the placement's lifetime; the translation is rotated into the placement's current orientation and the scale multiplies the existing additional scale rather than replacing it.
   *
   * @returns {number} Always DO_NOTHING; this modifier never ends an entity's life.
   */
  ProcessDistributionModifier(placement, _deltaTime, _params) {
    // Carbon (row-vector): initialRotation * additionalRotation - initial first.
    const combinedRotation = quat.multiply(quat.create(), placement.additionalRotation, placement.initialRotation);
    const translation = vec3.create();
    if (this.translationCurve) {
      this.translationCurve.GetValueAt(placement.lifeTime, translation);
    } else {
      vec3.copy(translation, this.translation);
    }
    vec3.transformQuat(translation, translation, combinedRotation);
    vec3.add(placement.additionalTranslation, placement.additionalTranslation, translation);
    const rotation = quat.create();
    if (this.rotationCurve) {
      this.rotationCurve.GetValueAt(placement.lifeTime, rotation);
    } else {
      quat.copy(rotation, this.rotation);
    }
    // Carbon (row-vector): additionalRotation *= rotation - additional first.
    quat.multiply(placement.additionalRotation, rotation, placement.additionalRotation);
    const scale = vec3.create();
    if (this.scaleCurve) {
      this.scaleCurve.GetValueAt(placement.lifeTime, scale);
    } else {
      vec3.copy(scale, this.scaling);
    }
    vec3.multiply(placement.additionalScale, placement.additionalScale, scale);
    return 0;
  }
  static {
    _initClass();
  }
}

export { _EveDistributionModif as EveDistributionModifierTransformOffset };
//# sourceMappingURL=EveDistributionModifierTransformOffset.js.map
