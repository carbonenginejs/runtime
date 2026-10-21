import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2GrannyTransformTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyTransformTrack.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that samples a bone's position, orientation and scale-shear
 * curves together, exposing them as a translation vector, rotation quaternion
 * and scale vector.
 */
@be.define("Tr2GrannyTransformTrack")
@be.exposureChainTo(Tr2GrannyTrack)
export class Tr2GrannyTransformTrack extends Tr2GrannyTrack
{
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  compressCurves = false;

  @be.mapAttribute(be.READ)
  @type.quat
  rotation = quat.create();

  @be.mapAttribute(be.READ)
  @type.vec3
  translation = vec3.create();

  @be.mapAttribute(be.READ)
  @type.vec3
  scale = vec3.create();

  #positionCurve = null;

  #orientationCurve = null;

  #scaleCurve = null;

  #scaleShearScratch = new Array(9).fill(0);

  /**
   * Checks whether transform track handles are ready.
   */

  @meta.implemented
  TracksReady()
  {
    return this.#positionCurve !== null && this.#orientationCurve !== null && this.#scaleCurve !== null;
  }

  /**
   * Clears transform track handles.
   */

  @meta.implemented
  ResetTracks()
  {
    this.#positionCurve = null;
    this.#orientationCurve = null;
    this.#scaleCurve = null;
  }

  /**
   * Applies transform track handles.
   */

  @meta.adapted
  ApplyTracks(group, duration, _timeStep)
  {
    const track = CjsGrannyCurves.findTransformTrack(group, this.name);
    if (!track)
    {
      return;
    }
    const positionCurve = CjsGrannyCurves.decodeGrannyCurve(track.position, 3);
    const orientationCurve = CjsGrannyCurves.decodeGrannyCurve(track.orientation, 4);
    const scaleCurve = CjsGrannyCurves.decodeGrannyCurve(track.scaleShear, 9);
    if (!positionCurve || !orientationCurve || !scaleCurve)
    {
      return;
    }
    this.duration = duration;
    this.#positionCurve = positionCurve;
    this.#orientationCurve = orientationCurve;
    this.#scaleCurve = scaleCurve;
    this.UpdateValue(0);
  }

  /**
   * Updates sampled transform values. A keyframed position or orientation curve
   * is read with Carbon's own GetKeyFrameAtT, everything else with the Granny
   * evaluator stand-in; the scale curve always uses the evaluator
   * (Tr2GrannyTransformTrack.cpp:27-53).
   */

  @meta.adapted
  UpdateValueImpl(time)
  {
    if (!this.#positionCurve || !this.#orientationCurve || !this.#scaleCurve)
    {
      return;
    }
    if (this.#positionCurve.keyframed)
    {
      CjsGrannyCurves.getKeyFrameAtT(this.translation, this.#positionCurve, time, this.duration);
    }
    else
    {
      CjsGrannyCurves.sampleGrannyCurve(this.translation, this.#positionCurve, time, this.cycle, this.duration);
    }
    if (this.#orientationCurve.keyframed)
    {
      CjsGrannyCurves.getKeyFrameAtT(this.rotation, this.#orientationCurve, time, this.duration);
    }
    else
    {
      CjsGrannyCurves.sampleGrannyCurve(this.rotation, this.#orientationCurve, time, this.cycle, this.duration);
    }
    quat.normalize(this.rotation, this.rotation);
    const scaleShear = CjsGrannyCurves.sampleGrannyCurve(this.#scaleShearScratch, this.#scaleCurve, time, this.cycle, this.duration);
    this.scale[0] = Math.hypot(scaleShear[0], scaleShear[1], scaleShear[2]);
    this.scale[1] = Math.hypot(scaleShear[3], scaleShear[4], scaleShear[5]);
    this.scale[2] = Math.hypot(scaleShear[6], scaleShear[7], scaleShear[8]);
  }
}
