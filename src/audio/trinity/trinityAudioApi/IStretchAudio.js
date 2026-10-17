import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/IStretchAudio.h
import { blue } from "#schema";


/** Required stretch-audio component contract. */
@blue.define("IStretchAudio")
@blue.inherit(IRoot)
export class IStretchAudio
{

  /** Starts playback for the stretch-audio component. */
  @blue.abstract
  Start() {}

  /** Stops playback for the stretch-audio component. */
  @blue.abstract
  Stop() {}

  /** Updates the source and destination positions used by the stretch effect. */
  @blue.abstract
  Update(_sourcePosition, _destinationPosition) {}

  /** Finds an owned audio emitter by name. */
  @blue.abstract
  FindEmitterByName(_name) {}

}
