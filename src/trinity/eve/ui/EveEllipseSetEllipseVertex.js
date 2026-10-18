// Source: trinity/trinity/Eve/UI/EveEllipseSet.cpp:18-23
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { type, blue } from "#schema";


/**
 * Carbon's EllipseVertex (EveEllipseSet.cpp:18-23, a struct in that file's
 * anonymous namespace): one vertex of an ellipse ribbon, 28 bytes - the
 * centre-line point as POSITION, then TEXCOORD0 holding the unit tangent and
 * the side sign, -1 for the left edge and +1 for the right. The vertex shader
 * expands the ribbon to its pixel width from these.
 *
 * EveEllipseSet's geometry build writes these members positionally into one
 * Float32Array, as Carbon's memcpy of its EllipseVertex array lays them out:
 * centerPos at float 0, tangentSide at float 3, stride `floatCount`.
 *
 * Carbon leaves both members unset; the JavaScript constructor is that
 * default constructor.
 */
@blue.define({ className: "EveEllipseSetEllipseVertex", donors: [ "EllipseVertex" ] })
export class EveEllipseSetEllipseVertex
{

  /** centerPos (Vector3): the ellipse point. Carbon leaves it unset. */
  @type.vec3
  centerPos = vec3.create();

  /** tangentSide (Vector4): (tangent.xyz, sideSign). Carbon leaves it unset. */
  @type.vec4
  tangentSide = vec4.create();

  /** sizeof( EllipseVertex ): 28, pinned by Carbon's static_assert (cpp:23). */
  static byteSize = 28;

  /** The vertex's float count, byteSize / 4. */
  static floatCount = 7;

}
