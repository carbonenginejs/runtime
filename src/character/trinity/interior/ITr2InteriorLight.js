import { exposure as be } from "#be";
// Source: trinity/trinity/Include/ITr2Interior.h
import { meta } from "#schema";
import { ITr2InteriorCullable } from "./ITr2InteriorCullable.js";
/** Native interior-light interface identity; it has no persisted model fields. */
@be.interface("ITr2InteriorLight")
export class ITr2InteriorLight extends ITr2InteriorCullable
{
  /** Copies light parameters into the caller's per-object light data. */
  @meta.abstract
  PopulateLightData(_lightData) {}

  /** Advances light animation to the supplied time. */
  @meta.abstract
  Update(_time) {}
}
