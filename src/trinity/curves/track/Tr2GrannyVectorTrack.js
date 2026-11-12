// Source: trinity/trinity/Curves/Tr2GrannyVectorTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyVectorTrack.cpp
import { exposure as be } from "#be";
import { type } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that samples a named one-dimensional vector track and exposes it
 * as a scalar value.
 */
@be.define({
  name: "Tr2GrannyVectorTrack",
  // Tr2GrannyVectorTrack_Blue.cpp:10-13, in Carbon's order.
  members: [
    [ be.ATTR, "value", be.READ ]
  ],
  chainTo: Tr2GrannyTrack
})
export class Tr2GrannyVectorTrack extends Tr2GrannyTrack
{
  @type.float32
  value = 0;

  _valueCurve = null;

  _valueScratch = [0];

  /**
   * Checks whether vector track handles are ready.
   *
   * @implemented
   */

  TracksReady()
  {
    return this._valueCurve !== null;
  }

  /**
   * Clears vector track handles.
   *
   * @implemented
   */

  ResetTracks()
  {
    this._valueCurve = null;
  }

  /**
   * Applies vector track handles.
   *
   * @adapted
   */

  ApplyTracks(group, duration, _timeStep)
  {
    const track = CjsGrannyCurves.findVectorTrack(group, this.name);
    if (!track)
    {
      return;
    }
    const valueCurve = CjsGrannyCurves.decodeGrannyCurve(track.valueCurve, 1);
    if (!valueCurve)
    {
      return;
    }
    this.duration = duration;
    this._valueCurve = valueCurve;
    this.UpdateValue(0);
  }

  /**
   * Updates sampled vector value. A keyframed curve is read with Carbon's own
   * GetKeyFrameAtT, anything else with the Granny evaluator stand-in
   * (Tr2GrannyVectorTrack.cpp:21-32).
   *
   * @adapted
   */

  UpdateValueImpl(time)
  {
    if (!this._valueCurve)
    {
      return;
    }
    if (this._valueCurve.keyframed)
    {
      CjsGrannyCurves.getKeyFrameAtT(this._valueScratch, this._valueCurve, time, this.duration);
    }
    else
    {
      CjsGrannyCurves.sampleGrannyCurve(this._valueScratch, this._valueCurve, time, this.cycle, this.duration);
    }
    this.value = this._valueScratch[0];
  }
}
