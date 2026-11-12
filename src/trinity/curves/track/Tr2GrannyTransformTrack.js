// Source: trinity/trinity/Curves/Tr2GrannyTransformTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyTransformTrack.cpp
import { exposure as be } from "#be";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { type } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that samples a bone's position, orientation and scale-shear
 * curves together, exposing them as a translation vector, rotation quaternion
 * and scale vector.
 */
@be.define({
  name: "Tr2GrannyTransformTrack",
  // Tr2GrannyTransformTrack_Blue.cpp:10-21, in Carbon's order.
  members: [
    [ be.ATTR, "translation", be.READ ],
    [ be.ATTR, "rotation", be.READ ],
    [ be.ATTR, "scale", be.READ ],
    [ be.ATTR, "compressCurves", be.READWRITE ]
  ],
  chainTo: Tr2GrannyTrack
})
export class Tr2GrannyTransformTrack extends Tr2GrannyTrack
{
  @type.boolean
  compressCurves = false;

  @type.quat
  rotation = quat.create();

  @type.vec3
  translation = vec3.create();

  @type.vec3
  scale = vec3.create();

  _positionCurve = null;

  _orientationCurve = null;

  _scaleCurve = null;

  _scaleShearScratch = new Array(9).fill(0);

  /**
   * Checks whether transform track handles are ready.
   *
   * @implemented
   */

  TracksReady()
  {
    return this._positionCurve !== null && this._orientationCurve !== null && this._scaleCurve !== null;
  }

  /**
   * Clears transform track handles.
   *
   * @implemented
   */

  ResetTracks()
  {
    this._positionCurve = null;
    this._orientationCurve = null;
    this._scaleCurve = null;
  }

  /**
   * Applies transform track handles.
   *
   * @adapted
   */

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
    this._positionCurve = positionCurve;
    this._orientationCurve = orientationCurve;
    this._scaleCurve = scaleCurve;
    this.UpdateValue(0);
  }

  /**
   * Updates sampled transform values. A keyframed position or orientation curve
   * is read with Carbon's own GetKeyFrameAtT, everything else with the Granny
   * evaluator stand-in; the scale curve always uses the evaluator
   * (Tr2GrannyTransformTrack.cpp:27-53).
   *
   * @adapted
   */

  UpdateValueImpl(time)
  {
    if (!this._positionCurve || !this._orientationCurve || !this._scaleCurve)
    {
      return;
    }
    if (this._positionCurve.keyframed)
    {
      CjsGrannyCurves.getKeyFrameAtT(this.translation, this._positionCurve, time, this.duration);
    }
    else
    {
      CjsGrannyCurves.sampleGrannyCurve(this.translation, this._positionCurve, time, this.cycle, this.duration);
    }
    if (this._orientationCurve.keyframed)
    {
      CjsGrannyCurves.getKeyFrameAtT(this.rotation, this._orientationCurve, time, this.duration);
    }
    else
    {
      CjsGrannyCurves.sampleGrannyCurve(this.rotation, this._orientationCurve, time, this.cycle, this.duration);
    }
    quat.normalize(this.rotation, this.rotation);
    const scaleShear = CjsGrannyCurves.sampleGrannyCurve(this._scaleShearScratch, this._scaleCurve, time, this.cycle, this.duration);
    this.scale[0] = Math.hypot(scaleShear[0], scaleShear[1], scaleShear[2]);
    this.scale[1] = Math.hypot(scaleShear[3], scaleShear[4], scaleShear[5]);
    this.scale[2] = Math.hypot(scaleShear[6], scaleShear[7], scaleShear[8]);
  }
}
