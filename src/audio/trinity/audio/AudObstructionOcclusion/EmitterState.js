// Source: audio/src/AudObstructionOcclusion.h + AudObstructionOcclusion.cpp
// Nested AudObstructionOcclusion::EmitterState.
// Headless behavior port. The host supplies blockage; this class performs no
// ray casting and leaves the audible obstruction/occlusion law to the backend.

import { FadingValue } from "./FadingValue.js";

/** Obstruction/occlusion fade state retained for one registered emitter. */
export class EmitterState
{
  obstruction = new FadingValue();

  occlusion = new FadingValue();

  needsSend = true;
}
