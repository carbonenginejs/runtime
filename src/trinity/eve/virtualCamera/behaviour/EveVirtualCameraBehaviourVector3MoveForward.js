import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { INotify } from "#blue";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that displaces the camera along its own forward axis by a
 * curve-shaped distance, and the base for the sideways and vertical variants.
 */
@be.define("EveVirtualCameraBehaviourVector3MoveForward")
@be.mapInterface(INotify)
@be.exposureChainTo(EveVirtualCameraBehaviourVector3Base)
export class EveVirtualCameraBehaviourVector3MoveForward extends EveVirtualCameraBehaviourVector3Base
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2CurveScalar")
  scaleCurve = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  proportional = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  value = 0;

  /**
   * Creates the constant scale curve and applies the behaviour name, which the
   * axis subclasses supply.
   */
  constructor(name = "Move Forward")
  {
    super();
    this.scaleCurve = EveVirtualCameraBehaviourVector3Base.createConstantCurve(1);
    this.SetName(name);
  }

  /**
   * Sets the behaviour name and renames the owned scale curve to match.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:425-428
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    super.SetName(name);
    this.scaleCurve.SetName(`${this.name} - Scale Curve`);
  }

  /** Returns the camera's forward direction scaled by the current distance. */
  @blue.method
  @meta.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    return vec3.scale(out, camera.GetForwardDirection(out), this.GetCurrentValue(camera, localElapsedTime, anchorRadius));
  }

  /**
   * Evaluates the authored distance for this frame: value shaped by the scale
   * curve at normalized timeline time, multiplied by the anchor radius when
   * proportional is set so the move scales with the anchored object's size.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:436-447
   */
  @meta.implemented
  @blue.method
  GetCurrentValue(camera, localElapsedTime, anchorRadius)
  {
    let value = this.value;
    if (this.scaleCurve)
    {
      const duration = camera.GetAnimationTimelineLength();
      value *= this.scaleCurve.GetValue(localElapsedTime / duration);
    }
    if (this.proportional)
    {
      value *= anchorRadius;
    }
    return value;
  }
}
