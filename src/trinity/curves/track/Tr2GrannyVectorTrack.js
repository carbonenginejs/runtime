import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2GrannyVectorTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyVectorTrack.cpp
import { meta, type, blue } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that samples a named one-dimensional vector track and exposes it
 * as a scalar value.
 */
@be.define("Tr2GrannyVectorTrack")
@be.exposureChainTo(Tr2GrannyTrack)
export class Tr2GrannyVectorTrack extends Tr2GrannyTrack
{
  @blue.read
  @type.float32
  value = 0;

  #valueCurve = null;

  #valueScratch = [0];

  /**
   * Checks whether vector track handles are ready.
   */
  @blue.method
  @meta.implemented
  TracksReady()
  {
    return this.#valueCurve !== null;
  }

  /**
   * Clears vector track handles.
   */
  @blue.method
  @meta.implemented
  ResetTracks()
  {
    this.#valueCurve = null;
  }

  /**
   * Applies vector track handles.
   */
  @blue.method
  @meta.adapted
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
    this.#valueCurve = valueCurve;
    this.UpdateValue(0);
  }

  /**
   * Updates sampled vector value. A keyframed curve is read with Carbon's own
   * GetKeyFrameAtT, anything else with the Granny evaluator stand-in
   * (Tr2GrannyVectorTrack.cpp:21-32).
   */
  @blue.method
  @meta.adapted
  UpdateValueImpl(time)
  {
    if (!this.#valueCurve)
    {
      return;
    }
    if (this.#valueCurve.keyframed)
    {
      CjsGrannyCurves.getKeyFrameAtT(this.#valueScratch, this.#valueCurve, time, this.duration);
    }
    else
    {
      CjsGrannyCurves.sampleGrannyCurve(this.#valueScratch, this.#valueCurve, time, this.cycle, this.duration);
    }
    this.value = this.#valueScratch[0];
  }
}
