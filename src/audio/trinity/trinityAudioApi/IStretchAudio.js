import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/IStretchAudio.h
import { meta, blue } from "#schema";


/** Required stretch-audio component contract. */
@blue.define("IStretchAudio")
@blue.inherit(IRoot)
export class IStretchAudio
{

  /** Starts playback for the stretch-audio component. */
  @blue.method
  @meta.abstract
  Start()
  {
    throw new Error("IStretchAudio.Start must be implemented by a concrete stretch-audio component.");
  }

  /** Stops playback for the stretch-audio component. */
  @blue.method
  @meta.abstract
  Stop()
  {
    throw new Error("IStretchAudio.Stop must be implemented by a concrete stretch-audio component.");
  }

  /** Updates the source and destination positions used by the stretch effect. */
  @blue.method
  @meta.abstract
  Update(_sourcePosition, _destinationPosition)
  {
    throw new Error("IStretchAudio.Update must be implemented by a concrete stretch-audio component.");
  }

  /** Finds an owned audio emitter by name. */
  @blue.method
  @meta.abstract
  FindEmitterByName(_name)
  {
    throw new Error("IStretchAudio.FindEmitterByName must be implemented by a concrete stretch-audio component.");
  }

}
