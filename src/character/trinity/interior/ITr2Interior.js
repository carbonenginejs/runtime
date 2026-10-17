// Source: trinity/trinity/Include/ITr2Interior.h
import { CjsSchema, blue } from "#schema";
import { ITr2InteriorCullable } from "./ITr2InteriorCullable.js";

/** Carbon's ITr2Interior nominal interior contract. */
export class ITr2Interior extends ITr2InteriorCullable
{
  /** Provides per-object data with per-instance lighting. */
  GetPerObjectDataWithPerInstanceLighting(_accumulator, _lightSet, _objectToWorldMatrix) {}

}
CjsSchema.decorateMethod(ITr2Interior, "GetPerObjectDataWithPerInstanceLighting", blue.abstract);
CjsSchema.blue.define(ITr2Interior, { className: "ITr2Interior", fields: {} });
