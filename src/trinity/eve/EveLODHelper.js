// Source: trinity/trinity/Eve/EveLODHelper.h
// Source: trinity/trinity/Eve/EveLODHelper.cpp
// Source: trinity/trinity/Eve/EveSpaceScene.cpp
import { Tr2Lod } from "#consts/trinity";

export { Tr2Lod };

/** Carbon's stateless LOD decision helper. */
export class EveLODHelper
{
  static lowUpdateRate = 1;

  static mediumUpdateRate = 0.1;

  /**
   * Whether an object at this detail level is due for an update given the
   * seconds since its last one; unspecified and low update once a second, medium
   * ten times a second, and higher levels every frame.
   */
  static ShouldUpdate(lod, timeSinceUpdate)
  {
    switch (lod)
    {
      case Tr2Lod.TR2_LOD_UNSPECIFIED:
      case Tr2Lod.TR2_LOD_LOW:
        return timeSinceUpdate >= EveLODHelper.lowUpdateRate;
      case Tr2Lod.TR2_LOD_MEDIUM:
        return timeSinceUpdate >= EveLODHelper.mediumUpdateRate;
      default:
        return true;
    }
  }

  /**
   * Carbon's MergeLOD( lod0, lod1 ) (EveLODHelper.h:62): the higher of two
   * detail levels, treating unspecified as no opinion.
   * @param {Number} lod0
   * @param {Number} lod1
   * @returns {Number}
   */
  static MergeLOD(lod0, lod1)
  {
    if (lod0 === Tr2Lod.TR2_LOD_UNSPECIFIED || lod1 === Tr2Lod.TR2_LOD_UNSPECIFIED)
    {
      return lod0 === Tr2Lod.TR2_LOD_UNSPECIFIED ? lod1 : lod0;
    }

    return lod0 > lod1 ? lod0 : lod1;
  }

  /**
   * Carbon's MergeLOD( lod0, sphere, updateContext ) (EveLODHelper.cpp:12),
   * named by the parameters that replace lod1: an invisible sphere yields
   * unspecified, and a visible one is classified by its on-screen pixel size
   * against the context's low and medium detail thresholds, then merged.
   * @param {Number} lod0
   * @param {Float32Array} sphere - packed (x, y, z, radius)
   * @param {EveUpdateContext} updateContext
   * @returns {Number}
   */
  static MergeLOD__SphereUpdateContext(lod0, sphere, updateContext)
  {
    const frustum = updateContext.GetFrustum();
    if (!frustum.IsSphereVisible(sphere))
    {
      return Tr2Lod.TR2_LOD_UNSPECIFIED;
    }

    const estimatedSize = frustum.GetPixelSizeAccross(sphere);
    let lod1 = Tr2Lod.TR2_LOD_LOW;
    if (estimatedSize >= updateContext.GetMediumDetailThreshold())
    {
      lod1 = Tr2Lod.TR2_LOD_HIGH;
    }
    else if (estimatedSize >= updateContext.GetLowDetailThreshold())
    {
      lod1 = Tr2Lod.TR2_LOD_MEDIUM;
    }
    return EveLODHelper.MergeLOD(lod0, lod1);
  }
}
