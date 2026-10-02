// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { Tr2CurveScalar } from "../../../curves/curve/Tr2CurveScalar.js";
import { Tr2CurveExtrapolation } from "../../../curves/enums.js";
import { TriPerlinCurve } from "../../../curves/curve/TriPerlinCurve.js";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that shakes the camera with independent per-axis Perlin
 * noise applied along the camera's own right, up and forward axes.
 */
@meta.define({
  className: "EveVirtualCameraBehaviourVector3Shake",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3Shake extends EveVirtualCameraBehaviourVector3Base
{
  static _nextPhase = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  octaves = 8;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2CurveScalar")
  magnitudeCurve = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  magnitude = vec3.fromValues(1, 0.6, 0.2);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  perlineScale = 1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  scaleByView = true;

  _phase = EveVirtualCameraBehaviourVector3Shake._allocatePhase();

  /**
   * Creates the default magnitude envelope curve and names the behaviour
   * "Shake".
   */
  constructor()
  {
    super();
    this.magnitudeCurve = EveVirtualCameraBehaviourVector3Shake._createMagnitudeCurve();
    this.SetName("Shake");
  }

  /** Sets the behaviour name and renames the owned magnitude curve to match. */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    super.SetName(name);
    this.magnitudeCurve?.SetName(`${this.name} - Magnitude Curve`);
  }

  /**
   * Returns the shake offset for this frame: the authored per-axis magnitude
   * scaled by three decorrelated Perlin samples and by the magnitude envelope at
   * normalized timeline time, optionally compressed through atan and scaled by
   * the camera-to-interest distance when scaleByView is set, then mapped onto
   * the camera's right, up and forward axes.
   */
  @meta.blue.method
  @meta.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, _anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    const offset = vec3.clone(this.magnitude);
    offset[0] *= EveVirtualCameraBehaviourVector3Shake._clampedNoise(localElapsedTime + this._phase + 1.1, this.perlineScale, this.octaves);
    offset[1] *= EveVirtualCameraBehaviourVector3Shake._clampedNoise(localElapsedTime + this._phase + 10.1, this.perlineScale, this.octaves);
    offset[2] *= EveVirtualCameraBehaviourVector3Shake._clampedNoise(localElapsedTime + this._phase + 18.3, this.perlineScale, this.octaves);

    if (this.magnitudeCurve)
    {
      const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
      const time = duration !== 0 ? localElapsedTime / duration : 0;
      vec3.scale(offset, offset, Number(this.magnitudeCurve.GetValue(time) ?? 1));
    }
    if (this.scaleByView)
    {
      const distance = vec3.distance(camera.GetPointOfInterest(vec3.create()), camera.GetPosition(vec3.create()));
      offset[0] = Math.atan(offset[0]) * distance;
      offset[1] = Math.atan(offset[1]) * distance;
      offset[2] = Math.atan(offset[2]) * distance;
    }

    vec3.scale(out, camera.GetRightDirection(vec3.create()), offset[0]);
    vec3.scaleAndAdd(out, out, camera.GetUpDirection(vec3.create()), offset[1]);
    return vec3.scaleAndAdd(out, out, camera.GetForwardDirection(vec3.create()), offset[2]);
  }

  /**
   * Samples one axis of 1D Perlin noise at the given time offset scaled by
   * frequency, summing the configured number of octaves.
   */
  static _clampedNoise(offset, frequency, octaves)
  {
    return TriPerlinCurve.PerlinNoise1D(offset * frequency, 2, 2, octaves);
  }

  /**
   * Builds the default shake envelope over normalized time: an almost immediate
   * rise to full magnitude by 0.1, then a linear fade to zero at the end of the
   * timeline.
   */
  static _createMagnitudeCurve()
  {
    const curve = new Tr2CurveScalar();
    curve.SetExtrapolation(Tr2CurveExtrapolation.LINEAR);
    curve.AddKey(0, 0);
    curve.AddKey(0.001, 0.8);
    curve.AddKey(0.1, 1);
    curve.AddKey(1, 0);
    return curve;
  }

  /**
   * Hands each new instance a distinct noise phase from a rolling 12-bit
   * counter, so shakes created together do not sample identical noise.
   */
  static _allocatePhase()
  {
    const phase = EveVirtualCameraBehaviourVector3Shake._nextPhase & 0xfff;
    EveVirtualCameraBehaviourVector3Shake._nextPhase++;
    return phase;
  }
}
