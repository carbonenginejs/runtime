// Source: E:\carbonengine\trinity\trinity\Eve\UI\EveTacticalOverlay.h
// Source: E:\carbonengine\trinity\trinity\Eve\UI\EveTacticalOverlay.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\UI\EveTacticalOverlay_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";

@type.define({ className: "EveTacticalOverlayTrackObject", family: "eve/ui" })
export class EveTacticalOverlayTrackObject extends CjsModel
{
  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.float32
  radius = 0;

  @io.persist
  @type.boolean
  isAggressive = false;

  @io.persist
  @type.boolean
  showVelocity = true;

  #velocity = vec3.create();

  @carbon.method
  @impl.adapted
  @impl.reason("Carbon vector functions use output pointers; runtime curves use the established time-first, out-last calling convention.")
  UpdatePosition(updateContext)
  {
    if (!this.translationCurve) return;
    const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0) || 0;
    const velocity = this.translationCurve.GetValueDotAt?.(time, this.#velocity);
    if (velocity && velocity !== this.#velocity) vec3.copy(this.#velocity, velocity);
    const position = this.translationCurve.GetValueAt?.(time, this.position);
    if (position && position !== this.position) vec3.copy(this.position, position);
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")
  GetVelocity(out = vec3.create())
  {
    return vec3.copy(out, this.#velocity);
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  @carbon.method
  @impl.implemented
  GetRadius()
  {
    return this.radius;
  }

  @carbon.method
  @impl.implemented
  IsAggressive()
  {
    return this.isAggressive;
  }

  @carbon.method
  @impl.implemented
  ShowVelocity()
  {
    return this.showVelocity;
  }
}
