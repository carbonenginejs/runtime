// Source: trinity/trinity/Curves/Tr2GrannyTransformTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyTransformTrack.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that samples a bone's position, orientation and scale-shear
 * curves together, exposing them as a translation vector, rotation quaternion
 * and scale vector.
 */
@meta.define({
  className: "Tr2GrannyTransformTrack",
  family: "curves"
})
export class Tr2GrannyTransformTrack extends Tr2GrannyTrack
{
  @meta.blue.readwrite
  @meta.type.boolean
  compressCurves = false;

  @meta.blue.read
  @meta.type.quat
  rotation = quat.create();

  @meta.blue.read
  @meta.type.vec3
  translation = vec3.create();

  @meta.blue.read
  @meta.type.vec3
  scale = vec3.create();

  #positionCurve = null;

  #orientationCurve = null;

  #scaleCurve = null;

  #scaleShearScratch = new Array(9).fill(0);

  /**
   * Checks whether transform track handles are ready.
   */
  @meta.blue.method
  @meta.implemented
  TracksReady()
  {
    return this.#positionCurve !== null && this.#orientationCurve !== null && this.#scaleCurve !== null;
  }

  /**
   * Clears transform track handles.
   */
  @meta.blue.method
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
  @meta.blue.method
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
   * Updates sampled transform values.
   */
  @meta.blue.method
  @meta.adapted
  UpdateValueImpl(time)
  {
    if (!this.#positionCurve || !this.#orientationCurve || !this.#scaleCurve)
    {
      return;
    }
    CjsGrannyCurves.sampleGrannyCurve(this.translation, this.#positionCurve, time, this.cycle, this.duration);
    CjsGrannyCurves.sampleGrannyCurve(this.rotation, this.#orientationCurve, time, this.cycle, this.duration);
    quat.normalize(this.rotation, this.rotation);
    const scaleShear = CjsGrannyCurves.sampleGrannyCurve(this.#scaleShearScratch, this.#scaleCurve, time, this.cycle, this.duration);
    this.scale[0] = Math.hypot(scaleShear[0], scaleShear[1], scaleShear[2]);
    this.scale[1] = Math.hypot(scaleShear[3], scaleShear[4], scaleShear[5]);
    this.scale[2] = Math.hypot(scaleShear[6], scaleShear[7], scaleShear[8]);
  }
}
