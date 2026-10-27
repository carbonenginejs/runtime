import { exposure as be } from "#be";
// Source: trinity/trinity/Include/ITr2Interior.h
import { meta } from "#schema";
import { ITr2Interior } from "./ITr2Interior.js";
/** Carbon's ITr2InteriorDynamic nominal interior contract. */
@be.interface("ITr2InteriorDynamic")
export class ITr2InteriorDynamic extends ITr2Interior
{
  /** Writes the world bounding box. */
  @meta.abstract
  GetWorldBoundingBox(_min, _max) {}

  /** Reports whether the bounding box is available. */
  @meta.abstract
  IsBoundingBoxReady() {}

  /** Updates the dynamic before physics. */
  @meta.abstract
  PrePhysicsUpdate(_time) {}

  /** Updates the dynamic after physics. */
  @meta.abstract
  PostPhysicsUpdate(_time, _apexScene) {}

  /** Adds the dynamic to the physics scene, reporting readiness. */
  @meta.abstract
  AddToScene(_apexScene) {}

  /** Removes the dynamic from its scene. */
  @meta.abstract
  RemoveFromScene() {}

  /** Selects the dynamic level of detail. */
  @meta.abstract
  SetLOD(_frustum) {}

}
