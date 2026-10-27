import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/ITr2Audio.h
import { meta } from "#schema";
/** Positions an asset's audio and locates its named emitters. */
@be.interface("ITr2Audio")
@be.inherit(IRoot)
export class ITr2Audio extends IRoot
{
  /** Updates the source and destination world positions. */
  @meta.abstract
  Update(_sourcePosition, _destPosition) {}

  /** Returns the named emitter, or null when no emitter matches. */
  @meta.abstract
  FindEmitterByName(_name) {}
}
