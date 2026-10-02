// Source: trinity/trinity/Include/ITr2Interior.h
import { CjsSchema, meta } from "#schema";
import { ITr2InteriorCullable } from "./ITr2InteriorCullable.js";

/** Native interior-light interface identity; it has no persisted model fields. */
export class ITr2InteriorLight extends ITr2InteriorCullable
{
  /** Copies light parameters into the caller's per-object light data. */
  PopulateLightData(_lightData) {}

  /** Advances light animation to the supplied time. */
  Update(_time) {}
}
for (const method of [ "PopulateLightData", "Update" ])
{
  CjsSchema.decorateMethod(ITr2InteriorLight, method, meta.requires, meta.abstract);
}
CjsSchema.define(ITr2InteriorLight, {
  className: "ITr2InteriorLight", carbon: "ITr2InteriorLight", family: "interior", fields: {}
});
