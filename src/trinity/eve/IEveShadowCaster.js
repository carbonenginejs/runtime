// Source: trinity/trinity/Eve/IEveShadowCaster.h:140-160
//
// The contract every shadow caster answers to, registered as the "ShadowCaster"
// component type. Carbon makes three methods PURE VIRTUAL (the shadow-frustum
// IsCastingShadow, GetShadowBatches, GetShadowPerObjectData) and gives the rest
// defaulted bodies: the position/radius IsCastingShadow answers false, the two
// raytracing hooks do nothing and IsShadowCastingDirty answers false. Composed
// with meta.blue.inherit, which installs only what a caster does not define.

import { CjsSchema, meta } from "#schema";
import { isVector3 } from "#utils/is";


/** Contract for an object that can cast cascaded or point-light shadows. */
export class IEveShadowCaster
{

  /**
   * Carbon's bare IsCastingShadow, for literal ports: routes on the second
   * argument, a Vector3 position selecting IsCastingShadow_PositionRadius and
   * anything else the shadow-frustum form IsCastingShadow_ShadowFrustum
   * (h:144-145). Engine code calls the specific names; this inspects its
   * argument only because JavaScript cannot overload.
   *
   * @returns {boolean}
   */
  IsCastingShadow(cameraFrustum, second, third, fourth)
  {
    return isVector3(second)
      ? this.IsCastingShadow_PositionRadius(cameraFrustum, second, third, fourth)
      : this.IsCastingShadow_ShadowFrustum(cameraFrustum, second, third, fourth);
  }

  /**
   * Carbon's IsCastingShadow( cameraFrustum, shadowFrustum, renderReason,
   * sizeInShadow ) (h:144), used for the cascaded shadow map. Pure virtual.
   *
   * @returns {boolean}
   */
  IsCastingShadow_ShadowFrustum(_cameraFrustum, _shadowFrustum, _renderReason, _sizeInShadow)
  {
    throw new Error("IEveShadowCaster.IsCastingShadow_ShadowFrustum must be implemented by a shadow caster.");
  }

  /**
   * Carbon's IsCastingShadow( cameraFrustum, position, radius, renderReason )
   * (h:145): false unless a caster overrides it.
   *
   * @returns {boolean}
   */
  IsCastingShadow_PositionRadius(_cameraFrustum, _position, _radius, _renderReason)
  {
    return false;
  }

  /** Carbon's GetShadowBatches (h:149). Pure virtual. */
  GetShadowBatches(_batches, _perObjectData, _shadowPixelSize)
  {
    throw new Error("IEveShadowCaster.GetShadowBatches must be implemented by a shadow caster.");
  }

  /** Carbon's GetShadowPerObjectData (h:150). Pure virtual. */
  GetShadowPerObjectData(_accumulator)
  {
    throw new Error("IEveShadowCaster.GetShadowPerObjectData must be implemented by a shadow caster.");
  }

  /** Carbon's PushRtGeometry (h:152): raytraced shadows; empty by default. */
  PushRtGeometry(_raytracingManager)
  {
  }

  /** Carbon's MarkRtDirty (h:155): empty by default. */
  MarkRtDirty()
  {
  }

  /** Carbon's IsShadowCastingDirty (h:158): false by default. */
  IsShadowCastingDirty()
  {
    return false;
  }
}


CjsSchema.decorateMethod(IEveShadowCaster, "IsCastingShadow", meta.blue.method, meta.adapted);
CjsSchema.decorateMethod(IEveShadowCaster, "IsCastingShadow_ShadowFrustum", meta.renamed("IsCastingShadow"), meta.abstract);
CjsSchema.decorateMethod(IEveShadowCaster, "IsCastingShadow_PositionRadius", meta.renamed("IsCastingShadow"), meta.implemented);
CjsSchema.decorateMethod(IEveShadowCaster, "GetShadowBatches", meta.abstract);
CjsSchema.decorateMethod(IEveShadowCaster, "GetShadowPerObjectData", meta.abstract);
for (const name of [ "PushRtGeometry", "MarkRtDirty", "IsShadowCastingDirty" ]) CjsSchema.decorateMethod(IEveShadowCaster, name, meta.implemented);
CjsSchema.define(IEveShadowCaster, { className: "IEveShadowCaster" });
