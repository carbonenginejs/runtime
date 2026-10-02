// Source: trinity/trinity/Curves/Tr2GrannyVectorTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyVectorTrack.cpp
import { meta } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that samples a named one-dimensional vector track and exposes it
 * as a scalar value.
 */
@meta.define({
  className: "Tr2GrannyVectorTrack",
  family: "curves"
})
export class Tr2GrannyVectorTrack extends Tr2GrannyTrack
{
  @meta.blue.read
  @meta.type.float32
  value = 0;

  #valueCurve = null;

  #valueScratch = [0];

  /**
   * Checks whether vector track handles are ready.
   */
  @meta.blue.method
  @meta.implemented
  TracksReady()
  {
    return this.#valueCurve !== null;
  }

  /**
   * Clears vector track handles.
   */
  @meta.blue.method
  @meta.implemented
  ResetTracks()
  {
    this.#valueCurve = null;
  }

  /**
   * Applies vector track handles.
   */
  @meta.blue.method
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
   * Updates sampled vector value.
   */
  @meta.blue.method
  @meta.adapted
  UpdateValueImpl(time)
  {
    if (!this.#valueCurve)
    {
      return;
    }
    CjsGrannyCurves.sampleGrannyCurve(this.#valueScratch, this.#valueCurve, time, this.cycle, this.duration);
    this.value = this.#valueScratch[0];
  }
}
