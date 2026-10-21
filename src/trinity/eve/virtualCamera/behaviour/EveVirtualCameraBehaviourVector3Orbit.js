import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { INotify } from "#blue";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that places the camera on a horizontal circle about the
 * anchor, sweeping from a start to an end angle over the timeline.
 */
@be.define("EveVirtualCameraBehaviourVector3Orbit")
@be.mapInterface(INotify)
@be.exposureChainTo(EveVirtualCameraBehaviourVector3Base)
export class EveVirtualCameraBehaviourVector3Orbit extends EveVirtualCameraBehaviourVector3Base
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2CurveScalar")
  orbitCurve = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2CurveScalar")
  distanceScalarCurve = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  end = 180;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  proportional = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  world = false;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  start = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  distance = 1;

  /**
   * Creates the default constant distance-scalar curve and linear 0-to-1 orbit
   * curve, and names the behaviour "Orbit".
   */
  constructor()
  {
    super();
    this.distanceScalarCurve = EveVirtualCameraBehaviourVector3Base.createConstantCurve(1);
    this.orbitCurve = EveVirtualCameraBehaviourVector3Base.createEaseCurve();
    this.SetName("Orbit");
  }

  /**
   * Sets the behaviour name and renames both owned curves to match.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:364-368
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    super.SetName(name);
    this.distanceScalarCurve.SetName(`${this.name} - Distance Scalar Curve`);
    this.orbitCurve.SetName(`${this.name} - Orbit Curve`);
  }

  /**
   * Returns the offset onto the orbit circle: world +Z, or the anchor's
   * horizontal forward direction when world is false, rotated about world up by
   * the start-to-end angle (degrees) reached by the orbit curve at normalized
   * timeline time, then scaled by distance, by the anchor radius when
   * proportional, and by the distance scalar curve.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:371-404
   * Adapted: gl-matrix writes the output vector. Carbon retains the normalized zero direction; glMatrix arithmetic parity remains pending.
   */
  @blue.method
  @meta.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, anchorForwardDirection, out = vec3.create())
  {
    const duration = camera.GetAnimationTimelineLength();
    const time = localElapsedTime / duration;
    if (this.world)
    {
      vec3.set(out, 0, 0, 1);
    }
    else
    {
      vec3.set(out, anchorForwardDirection[0], 0, anchorForwardDirection[2]);
      vec3.normalize(out, out);
    }
    const amount = this.orbitCurve ? this.orbitCurve.GetValue(time) : time;
    const angle = (this.start + (this.end - this.start) * amount) * Math.PI / 180;
    vec3.transformQuat(out, out, quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), angle));
    let range = this.distance;
    if (this.proportional)
    {
      range *= anchorRadius;
    }
    if (this.distanceScalarCurve) range *= this.distanceScalarCurve.GetValue(time);
    return vec3.scale(out, out, range);
  }
}
