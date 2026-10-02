// Source: trinityaudioapi/include/IStretchAudio.h
import { meta } from "#schema";


/** Required stretch-audio component contract. */
@meta.define({ className: "IStretchAudio", family: "trinityAudioApi" })
export class IStretchAudio
{

  /** Starts playback for the stretch-audio component. */
  @meta.blue.method
  @meta.abstract
  Start()
  {
    throw new Error("IStretchAudio.Start must be implemented by a concrete stretch-audio component.");
  }

  /** Stops playback for the stretch-audio component. */
  @meta.blue.method
  @meta.abstract
  Stop()
  {
    throw new Error("IStretchAudio.Stop must be implemented by a concrete stretch-audio component.");
  }

  /** Updates the source and destination positions used by the stretch effect. */
  @meta.blue.method
  @meta.abstract
  Update(_sourcePosition, _destinationPosition)
  {
    throw new Error("IStretchAudio.Update must be implemented by a concrete stretch-audio component.");
  }

  /** Finds an owned audio emitter by name. */
  @meta.blue.method
  @meta.abstract
  FindEmitterByName(_name)
  {
    throw new Error("IStretchAudio.FindEmitterByName must be implemented by a concrete stretch-audio component.");
  }

}
