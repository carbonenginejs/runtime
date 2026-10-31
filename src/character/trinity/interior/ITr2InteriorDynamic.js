import { exposure as be } from "#be";
// Source: trinity/trinity/Include/ITr2Interior.h
import { ITr2Interior } from "./ITr2Interior.js";

/** Carbon's ITr2InteriorDynamic nominal interior contract. */
@be.interface("ITr2InteriorDynamic")
export class ITr2InteriorDynamic extends ITr2Interior
{
  /**
   * Writes the world bounding box.
   *
   * @abstract
   */
  @be.abstract
  GetWorldBoundingBox(min, max) {}

  /**
   * Reports whether the bounding box is available.
   *
   * @abstract
   */
  @be.abstract
  IsBoundingBoxReady() {}

  /**
   * Updates the dynamic before physics.
   *
   * @abstract
   */
  @be.abstract
  PrePhysicsUpdate(time) {}

  /**
   * Updates the dynamic after physics.
   *
   * @abstract
   */
  @be.abstract
  PostPhysicsUpdate(time, apexScene) {}

  /**
   * Adds the dynamic to the physics scene, reporting readiness.
   *
   * @abstract
   */
  @be.abstract
  AddToScene(apexScene) {}

  /**
   * Removes the dynamic from its scene.
   *
   * @abstract
   */
  @be.abstract
  RemoveFromScene() {}

  /**
   * Selects the dynamic level of detail.
   *
   * @abstract
   */
  @be.abstract
  SetLOD(frustum) {}
}
