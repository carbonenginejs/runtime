import { meta } from "#schema";
// Source: audio/src/AudObstructionOcclusion.h + AudObstructionOcclusion.cpp
// Nested AudObstructionOcclusion::EmitterState.
// Headless behavior port. The host supplies blockage; this class performs no
// ray casting and leaves the audible obstruction/occlusion law to the backend.

import { FadingValue } from "./FadingValue.js";

/** Obstruction/occlusion fade state retained for one registered emitter. */
@meta.define({"className":"AudObstructionOcclusionEmitterState","carbon":"AudObstructionOcclusion::EmitterState"})
export class AudObstructionOcclusionEmitterState
{
  obstruction = new FadingValue();

  occlusion = new FadingValue();

  needsSend = true;
}
