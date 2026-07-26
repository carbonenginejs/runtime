// Source: E:\carbonengine\trinity\trinity\Curves\Tr2GrannyVectorTrack.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2GrannyVectorTrack.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that samples a named one-dimensional vector track and exposes it
 * as a scalar value.
 */
@type.define({
  className: "Tr2GrannyVectorTrack",
  family: "curves"
})
export class Tr2GrannyVectorTrack extends Tr2GrannyTrack
{
  @io.read
  @type.float32
  value = 0;

  #valueCurve = null;

  #valueScratch = [0];

  /**
   * Checks whether vector track handles are ready.
   */
  @carbon.method
  @impl.implemented
  TracksReady()
  {
    return this.#valueCurve !== null;
  }

  /**
   * Clears vector track handles.
   */
  @carbon.method
  @impl.implemented
  ResetTracks()
  {
    this.#valueCurve = null;
  }

  /**
   * Applies vector track handles.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
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
