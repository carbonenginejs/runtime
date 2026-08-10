// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.cpp
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveScalar } from "../../../curves/curve/Tr2CurveScalar.js";
import { Tr2CurveExtrapolation } from "../../../curves/enums.js";


/**
 * Base for the virtual camera behaviours that contribute a world-space vector3
 * offset to a camera's position or point of interest each update.
 */
@type.define({
  className: "EveVirtualCameraBehaviourVector3Base",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3Base extends CjsModel
{
  @io.persist
  @type.boolean
  active = true;

  @io.notify
  @io.persist
  @type.string
  name = "";

  /** Returns the authored behaviour name shown in tooling. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the behaviour name, coercing to a string; subclasses override this to
   * rename the curves they own alongside it.
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Re-applies the current name after a field change, which propagates it to any
   * owned curves through the subclass SetName override.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.SetName(this.name);
    return true;
  }

  /** Reports whether the camera should evaluate this behaviour this update. */
  @carbon.method
  @impl.implemented
  IsActive()
  {
    return this.active;
  }

  /**
   * Builds the default scalar curve that holds a single value across normalized
   * time 0 to 1, used where a subclass wants an unshaped multiplier the author
   * can later edit.
   */
  static createConstantCurve(value = 1)
  {
    const curve = new Tr2CurveScalar();
    curve.SetExtrapolation(Tr2CurveExtrapolation.LINEAR);
    curve.AddKey(0, value);
    curve.AddKey(1, value);
    return curve;
  }

  /**
   * Builds the default scalar curve ramping linearly from 0 to 1 across
   * normalized time, used as the starting interpolation shape for behaviours
   * that sweep between two values.
   */
  static createEaseCurve()
  {
    const curve = new Tr2CurveScalar();
    curve.SetExtrapolation(Tr2CurveExtrapolation.LINEAR);
    curve.AddKey(0, 0);
    curve.AddKey(1, 1);
    return curve;
  }

  /**
   * Rotates a vector about world up by the yaw of the anchor's forward
   * direction, turning an anchor-relative offset into a world-space one that
   * follows the anchored object's heading; the vector is returned unchanged when
   * the forward direction has no horizontal component.
   */
  static rotateVectorWithAnchor(out, value, anchorForwardDirection)
  {
    const horizontal = vec3.fromValues(anchorForwardDirection[0], 0, anchorForwardDirection[2]);
    if (vec3.squaredLength(horizontal) === 0)
    {
      return vec3.copy(out, value);
    }
    vec3.normalize(horizontal, horizontal);
    const yaw = Math.atan2(horizontal[0], horizontal[2]);
    const rotation = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), yaw);
    return vec3.transformQuat(out, value, rotation);
  }
}
