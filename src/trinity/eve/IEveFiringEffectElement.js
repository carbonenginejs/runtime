import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/IEveFiringEffectElement.h
import { meta } from "#schema";
import { EveEntity } from "./EveEntity.js";


/** Required EVE firing-effect element contract. */
@be.interface("IEveFiringEffectElement")
export class IEveFiringEffectElement extends EveEntity
{

  /**
   * Sets the destination-object scale applied by this firing element.
   *
   * @abstract
   */
  @be.abstract
  SetDestObjectScale(_scale) {}

  /**
   * Starts movement owned by this firing element.
   *
   * @abstract
   */
  @be.abstract
  StartMoving() {}

  /**
   * Returns the duration of the firing element's authored curves.
   *
   * @abstract
   */
  @be.abstract
  GetCurveDuration() {}

  /**
   * Starts firing after the supplied delay.
   *
   * @abstract
   */
  @be.abstract
  StartFiring(_delay) {}

  /**
   * Stops the active firing sequence.
   *
   * @abstract
   */
  @be.abstract
  StopFiring() {}

  /**
   * Sets the firing source transform and destination position.
   *
   * @abstract
   */
  @be.abstract
  SetFiringTransform(_source, _destination) {}

  /**
   * Sets whether the source and destination endpoints are displayed.
   *
   * @abstract
   */
  @be.abstract
  DisplayEndPoints(_displaySource, _displayDestination) {}

  /**
   * Performs the asynchronous firing-effect update phase.
   *
   * @abstract
   */
  @be.abstract
  UpdateEffectAsync(_updateContext) {}

  /**
   * Performs the synchronous firing-effect update phase.
   *
   * @abstract
   */
  @be.abstract
  UpdateEffectSync(_updateContext) {}

  /**
   * Updates visibility beneath the supplied parent transform.
   *
   * @abstract
   */
  @be.abstract
  UpdateVisibility(_updateContext, _parentTransform) {}

  /**
   * Appends this element's renderer-neutral renderables.
   *
   * @abstract
   */
  @be.abstract
  GetRenderables(_renderables) {}

  /**
   * Runs the optional general update hook.
   *
   * @adapted
   */

  @meta.adapted
  Update(_updateContext)
  {
  }

  /**
   * Registers optional content with a quad renderer.
   *
   * @adapted
   */

  @meta.adapted
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * Adds optional quad records to a quad renderer.
   *
   * @adapted
   */

  @meta.adapted
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /**
   * Applies an optional intensity multiplier.
   *
   * @adapted
   */

  @meta.adapted
  SetIntensity(_intensity)
  {
  }

  /**
   * Applies an optional display state.
   *
   * @adapted
   */

  @meta.adapted
  SetDisplay(_display)
  {
  }

}
