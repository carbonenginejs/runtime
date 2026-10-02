// Source: trinityaudioapi/include/ITr2Audio.h
import { CjsSchema, meta } from "#schema";

/** Positions an asset's audio and locates its named emitters. */
export class ITr2Audio
{
  /** Updates the source and destination world positions. */
  Update(_sourcePosition, _destPosition) {}

  /** Returns the named emitter, or null when no emitter matches. */
  FindEmitterByName(_name) {}
}

for (const method of [ "Update", "FindEmitterByName" ])
{
  CjsSchema.decorateMethod(ITr2Audio, method, meta.requires, meta.abstract);
}
CjsSchema.define(ITr2Audio, {
  className: "ITr2Audio", carbon: "ITr2Audio", family: "trinityAudioApi", fields: {}
});
