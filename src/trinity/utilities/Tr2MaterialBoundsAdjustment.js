// Source: trinity/trinity/Utilities/Tr2MaterialBoundsAdjustment.h
// Source: trinity/trinity/Utilities/Tr2MaterialBoundsAdjustment.cpp
import { carbon, impl, type } from "#schema";
import { box3 } from "#math/box3";

/**
 * How far a material's shader displaces vertices, and the bounds growth that
 * covers it. Native is a plain struct with Python tuple adapters, not a Blue
 * class. The registered typed fields retain JavaScript inspection/dictionary
 * transport only: no native query, read or persistence flags are invented.
 */
@type.define({ className: "Tr2MaterialBoundsAdjustment", family: "utilities" })
export class Tr2MaterialBoundsAdjustment
{

  /**
   * Maximum dimensionless vertex scale applied about the local origin before
   * displacement growth; 1 leaves the original scale unchanged.
   * @type {number}
   */
  @type.float32
  maxLocalScale = 1;

  /**
   * Maximum shader displacement in local geometry units, used to grow every
   * bounding-box face outwards after applying maxLocalScale.
   * @type {number}
   */
  @type.float32
  maxLocalDisplacement = 0;

  /**
   * Whether shader rotation requires an origin-centered cube enclosing the
   * furthest corner of the scaled and displacement-expanded bounds.
   * @type {boolean}
   */
  @type.boolean
  rotatesVertices = false;

  // Carbon Tr2MaterialBoundsAdjustment.cpp:7-22. A vertex shader that scales,
  // displaces or rotates geometry makes the authored bounds wrong, so a
  // renderable grows them by what the material can do before culling against
  // them.
  //
  // Two details are Carbon's and are easy to get wrong:
  //
  //   - SCALING IS ABOUT THE ORIGIN, not the box centre. AxisAlignedBox::Scale
  //     multiplies both corners (AxisAlignedBox_inline.h:154-162), so an
  //     off-centre box MOVES as well as growing. That is what a shader scaling
  //     object-space positions actually does.
  //   - a rotating material discards the box shape entirely: the result is the
  //     origin-centred cube around the furthest corner's radius, because any
  //     corner can end up anywhere on that sphere.
  //
  // Carbon skips an uninitialised box in both Scale and Grow, so an empty box
  // stays empty rather than growing out of nothing.

  /**
   * The bounds a renderable should cull against once this material's vertex
   * displacement is accounted for, written into `out`. The optional output
   * buffer replaces the native box value return. The existing JavaScript
   * empty-box early return is retained, including when rotation is enabled.
   */
  @carbon.method
  @impl.adapted
  AdjustBounds(box, out = box3.create())
  {
    box3.copy(out, box);

    if (box3.isEmpty(out)) return out;

    const min = box3.$min(out);
    const max = box3.$max(out);

    for (let axis = 0; axis < 3; axis++)
    {
      min[axis] = min[axis] * this.maxLocalScale - this.maxLocalDisplacement;
      max[axis] = max[axis] * this.maxLocalScale + this.maxLocalDisplacement;
    }

    if (!this.rotatesVertices) return out;

    // The furthest corner from the origin, which every corner can reach.
    let squaredRadius = 0;

    for (let corner = 0; corner < 8; corner++)
    {
      const x = (corner & 1) ? max[0] : min[0];
      const y = (corner & 2) ? max[1] : min[1];
      const z = (corner & 4) ? max[2] : min[2];
      squaredRadius = Math.max(squaredRadius, x * x + y * y + z * z);
    }

    const radius = Math.sqrt(squaredRadius);

    box3.set(out, -radius, -radius, -radius, radius, radius, radius);
    return out;
  }

}

carbon.interfaceTable({ interfaces: [], chainTo: null })(Tr2MaterialBoundsAdjustment);
