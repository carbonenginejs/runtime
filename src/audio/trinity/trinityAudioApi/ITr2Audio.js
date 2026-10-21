import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/ITr2Audio.h
import { CjsSchema, blue } from "#schema";

/** Positions an asset's audio and locates its named emitters. */
export class ITr2Audio extends IRoot
{
  /** Updates the source and destination world positions. */
  Update(_sourcePosition, _destPosition) {}

  /** Returns the named emitter, or null when no emitter matches. */
  FindEmitterByName(_name) {}
}

for (const method of [ "Update", "FindEmitterByName" ])
{
  CjsSchema.decorateMethod(ITr2Audio, method, blue.abstract);
}
blue.inherit(IRoot)(ITr2Audio);
CjsSchema.exposure.interface("ITr2Audio")(ITr2Audio);
