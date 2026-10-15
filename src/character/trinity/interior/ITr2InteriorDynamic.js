// Source: trinity/trinity/Include/ITr2Interior.h
import { CjsSchema, meta } from "#schema";
import { ITr2Interior } from "./ITr2Interior.js";

/** Carbon's ITr2InteriorDynamic nominal interior contract. */
export class ITr2InteriorDynamic extends ITr2Interior
{
  /** Writes the world bounding box. */
  GetWorldBoundingBox(_min, _max) {}

  /** Reports whether the bounding box is available. */
  IsBoundingBoxReady() {}

  /** Updates the dynamic before physics. */
  PrePhysicsUpdate(_time) {}

  /** Updates the dynamic after physics. */
  PostPhysicsUpdate(_time, _apexScene) {}

  /** Adds the dynamic to the physics scene, reporting readiness. */
  AddToScene(_apexScene) {}

  /** Removes the dynamic from its scene. */
  RemoveFromScene() {}

  /** Selects the dynamic level of detail. */
  SetLOD(_frustum) {}

}
for (const method of ["GetWorldBoundingBox","IsBoundingBoxReady","PrePhysicsUpdate","PostPhysicsUpdate","AddToScene","RemoveFromScene","SetLOD"])
{
  CjsSchema.decorateMethod(ITr2InteriorDynamic, method, meta.requires, meta.abstract);
}
CjsSchema.blue.define(ITr2InteriorDynamic, { className: "ITr2InteriorDynamic", fields: {} });
