// Source: trinity/trinity/Eve/IEveFiringEffectElement.h
import { meta } from "#schema";
import { EveEntity } from "./EveEntity.js";


/** Required EVE firing-effect element contract. */
@meta.define({ className: "IEveFiringEffectElement", family: "eve" })
export class IEveFiringEffectElement extends EveEntity
{

  /** Sets the destination-object scale applied by this firing element. */
  @meta.blue.method
  @meta.abstract
  SetDestObjectScale(_scale)
  {
    throw new Error("IEveFiringEffectElement.SetDestObjectScale must be implemented by a concrete firing element.");
  }

  /** Starts movement owned by this firing element. */
  @meta.blue.method
  @meta.abstract
  StartMoving()
  {
    throw new Error("IEveFiringEffectElement.StartMoving must be implemented by a concrete firing element.");
  }

  /** Returns the duration of the firing element's authored curves. */
  @meta.blue.method
  @meta.abstract
  GetCurveDuration()
  {
    throw new Error("IEveFiringEffectElement.GetCurveDuration must be implemented by a concrete firing element.");
  }

  /** Starts firing after the supplied delay. */
  @meta.blue.method
  @meta.abstract
  StartFiring(_delay)
  {
    throw new Error("IEveFiringEffectElement.StartFiring must be implemented by a concrete firing element.");
  }

  /** Stops the active firing sequence. */
  @meta.blue.method
  @meta.abstract
  StopFiring()
  {
    throw new Error("IEveFiringEffectElement.StopFiring must be implemented by a concrete firing element.");
  }

  /** Sets the firing source transform and destination position. */
  @meta.blue.method
  @meta.abstract
  SetFiringTransform(_source, _destination)
  {
    throw new Error("IEveFiringEffectElement.SetFiringTransform must be implemented by a concrete firing element.");
  }

  /** Sets whether the source and destination endpoints are displayed. */
  @meta.blue.method
  @meta.abstract
  DisplayEndPoints(_displaySource, _displayDestination)
  {
    throw new Error("IEveFiringEffectElement.DisplayEndPoints must be implemented by a concrete firing element.");
  }

  /** Performs the asynchronous firing-effect update phase. */
  @meta.blue.method
  @meta.abstract
  UpdateEffectAsync(_updateContext)
  {
    throw new Error("IEveFiringEffectElement.UpdateEffectAsync must be implemented by a concrete firing element.");
  }

  /** Performs the synchronous firing-effect update phase. */
  @meta.blue.method
  @meta.abstract
  UpdateEffectSync(_updateContext)
  {
    throw new Error("IEveFiringEffectElement.UpdateEffectSync must be implemented by a concrete firing element.");
  }

  /** Updates visibility beneath the supplied parent transform. */
  @meta.blue.method
  @meta.abstract
  UpdateVisibility(_updateContext, _parentTransform)
  {
    throw new Error("IEveFiringEffectElement.UpdateVisibility must be implemented by a concrete firing element.");
  }

  /** Appends this element's renderer-neutral renderables. */
  @meta.blue.method
  @meta.abstract
  GetRenderables(_renderables)
  {
    throw new Error("IEveFiringEffectElement.GetRenderables must be implemented by a concrete firing element.");
  }

  /** Runs the optional general update hook. */
  @meta.blue.method
  @meta.noop
  Update(_updateContext)
  {
  }

  /** Registers optional content with a quad renderer. */
  @meta.blue.method
  @meta.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Adds optional quad records to a quad renderer. */
  @meta.blue.method
  @meta.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /** Applies an optional intensity multiplier. */
  @meta.blue.method
  @meta.noop
  SetIntensity(_intensity)
  {
  }

  /** Applies an optional display state. */
  @meta.blue.method
  @meta.noop
  SetDisplay(_display)
  {
  }

}
