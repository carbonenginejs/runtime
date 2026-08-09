// Source: E:\carbonengine\trinity\trinity\Particle\Tr2ParticleDragForce.h
// Source: E:\carbonengine\trinity\trinity\Particle\Tr2ParticleDragForce.cpp
// Source: E:\carbonengine\trinity\trinity\Particle\Tr2ParticleDragForce_Blue.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/** Linear particle drag: a force proportional to velocity and opposing it. */
@type.define({
  className: "Tr2ParticleDragForce",
  family: "particle"
})
export class Tr2ParticleDragForce extends CjsModel
{
  @io.persist
  @type.float32
  drag = 0.1;

  /** Carbon's drag force is proportional and opposite to velocity. */
  @carbon.method
  @impl.adapted
  GetForce(_position, velocity, _dt, _mass, out = vec3.create())
  {
    return vec3.scale(out, velocity, -this.drag);
  }

  /**
   * Nothing to advance per frame: drag is computed from each particle's current
   * velocity.
   */
  @carbon.method
  @impl.noop
  Update(_dt)
  {
  }
}
