import { IRoot } from "../../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { IsMatch } from "#blue";
import { INotify } from "../../../../global/blue/INotify.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { Tr2CurveScalar } from "../../../curves/curve/Tr2CurveScalar.js";
import { Tr2CurveExtrapolation } from "../../../curves/enums.js";


/**
 * Base for the virtual camera behaviours that contribute a world-space vector3
 * offset to a camera's position or point of interest each update.
 */
@blue.define({ className: "EveVirtualCameraBehaviourVector3Base", abstract: true })
@blue.inherit(INotify)
@blue.interface(INotify)
export class EveVirtualCameraBehaviourVector3Base extends IRoot
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  active = true;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  /** Returns the authored behaviour name shown in tooling. */

  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the behaviour name, coercing to a string; subclasses override this to
   * rename the curves they own alongside it.
   */

  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Re-applies the current name after a field change, which propagates it to any
   * owned curves through the subclass SetName override.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "name")) this.SetName(this.name);
    return true;
  }

  /** Reports whether the camera should evaluate this behaviour this update. */

  @meta.implemented
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
   * Uses Carbon's cross/angle rotation (EveVirtualCameraBehaviour.cpp:14-21).
   * A zero cross axis yields an identity matrix, including backward headings.
   * glMatrix normalization arithmetic and float rounding remain pending parity work.
   */
  static rotateVectorWithAnchor(out, value, anchorForwardDirection)
  {
    const { vec3_0, vec3_1, vec3_2, quat_0, mat4_0 } = EveVirtualCameraBehaviourVector3Base.scratch;
    vec3.set(vec3_0, anchorForwardDirection[0], 0, anchorForwardDirection[2]);
    vec3.normalize(vec3_0, vec3_0);
    vec3.set(vec3_2, 0, 0, 1);
    vec3.cross(vec3_1, vec3_2, vec3_0);
    const angle = Math.acos(vec3.dot(vec3_0, vec3_2));
    // Carbon RotationQuaternion normalizes its axis; setAxisAngle requires that here.
    vec3.normalize(vec3_1, vec3_1);
    quat.setAxisAngle(quat_0, vec3_1, angle);
    mat4.fromQuat(mat4_0, quat_0);
    const length = vec3.length(value);
    vec3.normalize(out, value);
    vec3.transformMat4(out, out, mat4_0);
    return vec3.scale(out, out, length);
  }
  static scratch = {
    vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create(),
    quat_0: quat.create(), mat4_0: mat4.create()
  };
}

// Exact native Blue exposure: only these identities participate in loading.
