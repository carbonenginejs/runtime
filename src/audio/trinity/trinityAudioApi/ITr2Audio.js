import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/ITr2Audio.h

/** Positions an asset's audio and locates its named emitters. */
@be.interface("ITr2Audio")
@be.inherit(IRoot)
export class ITr2Audio extends IRoot
{
  /** Updates the source and destination world positions. */
  @be.abstract
  Update(sourcePosition, destPosition) {}

  /** Returns the named emitter, or null when no emitter matches. */
  @be.abstract
  FindEmitterByName(name) {}
}
