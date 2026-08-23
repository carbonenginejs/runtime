import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_scaleFactor, _init_extra_scaleFactor, _init_authoredForBoundingRadius, _init_extra_authoredForBoundingRadius, _init_scaleCurve, _init_extra_scaleCurve;

/** EveDistributionModifierScaleBySpaceObjectParent (eve/distribution/attributeModifiers) - generated from schema shapeHash c3114e37.... */
let _EveDistributionModif;
class EveDistributionModifierScaleBySpaceObjectParent extends CjsModel {
  static {
    ({
      e: [_init_scaleFactor, _init_extra_scaleFactor, _init_authoredForBoundingRadius, _init_extra_authoredForBoundingRadius, _init_scaleCurve, _init_extra_scaleCurve, _initProto],
      c: [_EveDistributionModif, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionModifierScaleBySpaceObjectParent",
      family: "eve/distribution/attributeModifiers"
    })], [[[io, io.persist, type, type.float32], 16, "scaleFactor"], [[io, io.persist, type, type.float32], 16, "authoredForBoundingRadius"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "scaleCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "AffectsTransform"], [[carbon, carbon.method, impl, impl.adapted], 18, "ProcessDistributionModifier"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_scaleCurve(this);
  }
  /** m_scaleFactor (float) [READWRITE, PERSIST] */
  scaleFactor = (_initProto(this), _init_scaleFactor(this, 1));

  /** m_authoredForBoundingRadius (float) [READWRITE, PERSIST] */
  authoredForBoundingRadius = (_init_extra_scaleFactor(this), _init_authoredForBoundingRadius(this, 1000));

  /** m_scaleCurve (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  scaleCurve = (_init_extra_authoredForBoundingRadius(this), _init_scaleCurve(this, null));

  /** Reports a transform effect whenever a non-zero scale factor is authored. */
  AffectsTransform() {
    return this.scaleFactor !== 0;
  }

  /**
   * Scales a placement by the size of the parent space object: the parent's bounding-sphere radius either samples scaleCurve or, without a curve, forms a scaleFactor-shaped ratio against authoredForBoundingRadius, and the result multiplies into the placement's additional scale rather than replacing it. Does nothing when the update params carry no space-object parent.
   *
   * @returns {number} Always DO_NOTHING; this modifier never ends an entity's life.
   */
  ProcessDistributionModifier(placement, _deltaTime, params) {
    if (!params.spaceObjectParent) {
      return 0;
    }
    const bounds = sph3.create();
    params.spaceObjectParent.GetBoundingSphere(bounds);
    if (this.scaleCurve) {
      const finalScale = vec3.create();
      this.scaleCurve.GetValueAt(bounds[3], finalScale);
      vec3.multiply(placement.additionalScale, placement.additionalScale, finalScale);
    } else {
      const assetRatio = bounds[3] / Math.max(this.authoredForBoundingRadius, 1);
      const finalScale = assetRatio > 1 ? 1 + this.scaleFactor * (assetRatio - 1) : Math.pow(assetRatio, this.scaleFactor);
      vec3.scale(placement.additionalScale, placement.additionalScale, finalScale);
    }
    return 0;
  }
  static {
    _initClass();
  }
}

export { _EveDistributionModif as EveDistributionModifierScaleBySpaceObjectParent };
//# sourceMappingURL=EveDistributionModifierScaleBySpaceObjectParent.js.map
