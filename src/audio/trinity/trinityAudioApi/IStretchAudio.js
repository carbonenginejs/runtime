// Source: trinityaudioapi/include/IStretchAudio.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required stretch-audio component contract. */
@type.define({ className: "IStretchAudio", family: "trinityAudioApi" })
export class IStretchAudio extends CjsModel
{

  /** Starts playback for the stretch-audio component. */
  @carbon.method
  @impl.abstract
  Start()
  {
    throw new Error("IStretchAudio.Start must be implemented by a concrete stretch-audio component.");
  }

  /** Stops playback for the stretch-audio component. */
  @carbon.method
  @impl.abstract
  Stop()
  {
    throw new Error("IStretchAudio.Stop must be implemented by a concrete stretch-audio component.");
  }

  /** Updates the source and destination positions used by the stretch effect. */
  @carbon.method
  @impl.abstract
  Update(_sourcePosition, _destinationPosition)
  {
    throw new Error("IStretchAudio.Update must be implemented by a concrete stretch-audio component.");
  }

  /** Finds an owned audio emitter by name. */
  @carbon.method
  @impl.abstract
  FindEmitterByName(_name)
  {
    throw new Error("IStretchAudio.FindEmitterByName must be implemented by a concrete stretch-audio component.");
  }

}
