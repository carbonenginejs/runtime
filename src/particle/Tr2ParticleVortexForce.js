// Source: E:\carbonengine\trinity\trinity\Particle\Tr2ParticleVortexForce.h
// Source: E:\carbonengine\trinity\trinity\Particle\Tr2ParticleVortexForce.cpp
// Source: E:\carbonengine\trinity\trinity\Particle\Tr2ParticleVortexForce_Blue.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Particle force of constant magnitude directed tangentially around an axis
 * through a fixed position, swirling particles about it.
 */
@type.define({
  className: "Tr2ParticleVortexForce",
  family: "particle"
})
export class Tr2ParticleVortexForce extends CjsModel
{
  @io.persist
  @type.float32
  magnitude = 1;

  @io.persist
  @type.vec3
  axis = vec3.fromValues(0, 1, 0);

  @io.persist
  @type.vec3
  position = vec3.create();

  /** Applies Carbon's normalized tangential vortex force. */
  @carbon.method
  @impl.adapted
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    vec3.subtract(out, this.position, position);
    vec3.cross(out, out, this.axis);
    const length = vec3.length(out);
    return length === 0 ? vec3.set(out, 0, 0, 0) : vec3.scale(out, out, this.magnitude / length);
  }

  /**
   * Nothing to advance per frame: the vortex is fully described by its axis,
   * position and magnitude.
   */
  @carbon.method
  @impl.noop
  Update(_dt)
  {
  }
}
