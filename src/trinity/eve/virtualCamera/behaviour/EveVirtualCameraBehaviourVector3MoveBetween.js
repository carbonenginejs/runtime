import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { INotify } from "#blue";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that sweeps the camera value from one authored endpoint to
 * another across the animation timeline.
 */
@be.define("EveVirtualCameraBehaviourVector3MoveBetween")
@be.mapInterface(INotify)
@be.exposureChainTo(EveVirtualCameraBehaviourVector3Base)
export class EveVirtualCameraBehaviourVector3MoveBetween extends EveVirtualCameraBehaviourVector3Base
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  end = vec3.create();

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  proportional = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  world = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2CurveScalar")
  interpolationCurve = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  start = vec3.create();

  /**
   * Creates the default linear 0-to-1 interpolation curve and names the
   * behaviour "Move Between".
   */
  constructor()
  {
    super();
    this.interpolationCurve = EveVirtualCameraBehaviourVector3Base.createEaseCurve();
    this.SetName("Move Between");
  }

  /**
   * Sets the behaviour name and renames the owned interpolation curve to match.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:271-274
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    super.SetName(name);
    this.interpolationCurve.SetName(`${this.name} - Interpolation Curve`);
  }

  /**
   * Returns the point interpolated from start to end by the interpolation curve
   * at normalized timeline time; both endpoints are multiplied by the anchor
   * radius when proportional is set and yawed into the anchor's heading when
   * world is false, and end is returned directly when the timeline has zero
   * length.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:277-305
   * Adapted: gl-matrix writes the output vector and the existing anchor-rotation helper supplies the native rotation.
   */
  @blue.method
  @meta.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, anchorForwardDirection, out = vec3.create())
  {
    const duration = camera.GetAnimationTimelineLength();
    if (duration === 0)
    {
      return vec3.copy(out, this.end);
    }
    const start = vec3.clone(this.start);
    const end = vec3.clone(this.end);
    if (this.proportional)
    {
      vec3.scale(start, start, anchorRadius);
      vec3.scale(end, end, anchorRadius);
    }
    if (!this.world)
    {
      EveVirtualCameraBehaviourVector3Base.rotateVectorWithAnchor(start, start, anchorForwardDirection);
      EveVirtualCameraBehaviourVector3Base.rotateVectorWithAnchor(end, end, anchorForwardDirection);
    }
    const time = localElapsedTime / duration;
    const amount = this.interpolationCurve ? this.interpolationCurve.GetValue(time) : time;
    return vec3.lerp(out, start, end, amount);
  }
}
