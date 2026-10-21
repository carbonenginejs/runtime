import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/IStretchAudio.h
import { blue } from "#schema";


/** Required stretch-audio component contract. */
@be.interface("IStretchAudio")
@be.inherit(IRoot)
export class IStretchAudio extends IRoot
{

  /** Starts playback for the stretch-audio component. */
  @be.abstract
  Start() {}

  /** Stops playback for the stretch-audio component. */
  @be.abstract
  Stop() {}

  /** Updates the source and destination positions used by the stretch effect. */
  @be.abstract
  Update(_sourcePosition, _destinationPosition) {}

  /** Finds an owned audio emitter by name. */
  @be.abstract
  FindEmitterByName(_name) {}

}
