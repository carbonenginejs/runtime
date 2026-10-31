import { exposure as be } from "#be";
// Source: trinity/trinity/Include/ITr2Interior.h
import { ITr2InteriorCullable } from "./ITr2InteriorCullable.js";

/** Native interior-light interface identity; it has no persisted model fields. */
@be.interface("ITr2InteriorLight")
export class ITr2InteriorLight extends ITr2InteriorCullable
{
  /**
   * Copies light parameters into the caller's per-object light data.
   *
   * @abstract
   */
  @be.abstract
  PopulateLightData(lightData) {}

  /**
   * Advances light animation to the supplied time.
   *
   * @abstract
   */
  @be.abstract
  Update(time) {}
}
