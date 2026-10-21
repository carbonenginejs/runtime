import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/IEveFiringEffectElement.h
import { meta, blue } from "#schema";
import { EveEntity } from "./EveEntity.js";


/** Required EVE firing-effect element contract. */
@be.interface("IEveFiringEffectElement")
export class IEveFiringEffectElement extends EveEntity
{

  /** Sets the destination-object scale applied by this firing element. */
  @blue.abstract
  SetDestObjectScale(_scale) {}

  /** Starts movement owned by this firing element. */
  @blue.abstract
  StartMoving() {}

  /** Returns the duration of the firing element's authored curves. */
  @blue.abstract
  GetCurveDuration() {}

  /** Starts firing after the supplied delay. */
  @blue.abstract
  StartFiring(_delay) {}

  /** Stops the active firing sequence. */
  @blue.abstract
  StopFiring() {}

  /** Sets the firing source transform and destination position. */
  @blue.abstract
  SetFiringTransform(_source, _destination) {}

  /** Sets whether the source and destination endpoints are displayed. */
  @blue.abstract
  DisplayEndPoints(_displaySource, _displayDestination) {}

  /** Performs the asynchronous firing-effect update phase. */
  @blue.abstract
  UpdateEffectAsync(_updateContext) {}

  /** Performs the synchronous firing-effect update phase. */
  @blue.abstract
  UpdateEffectSync(_updateContext) {}

  /** Updates visibility beneath the supplied parent transform. */
  @blue.abstract
  UpdateVisibility(_updateContext, _parentTransform) {}

  /** Appends this element's renderer-neutral renderables. */
  @blue.abstract
  GetRenderables(_renderables) {}

  /** Runs the optional general update hook. */

  @meta.noop
  Update(_updateContext)
  {
  }

  /** Registers optional content with a quad renderer. */

  @meta.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Adds optional quad records to a quad renderer. */

  @meta.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /** Applies an optional intensity multiplier. */

  @meta.noop
  SetIntensity(_intensity)
  {
  }

  /** Applies an optional display state. */

  @meta.noop
  SetDisplay(_display)
  {
  }

}
