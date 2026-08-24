// Source: trinity/trinity/Eve/IEveFiringEffectElement.h
import { carbon, impl, type } from "#schema";
import { EveEntity } from "./EveEntity.js";


/** Required EVE firing-effect element contract. */
@type.define({ className: "IEveFiringEffectElement", family: "eve" })
export class IEveFiringEffectElement extends EveEntity
{

  /** Sets the destination-object scale applied by this firing element. */
  @carbon.method
  @impl.abstract
  SetDestObjectScale(_scale)
  {
    throw new Error("IEveFiringEffectElement.SetDestObjectScale must be implemented by a concrete firing element.");
  }

  /** Starts movement owned by this firing element. */
  @carbon.method
  @impl.abstract
  StartMoving()
  {
    throw new Error("IEveFiringEffectElement.StartMoving must be implemented by a concrete firing element.");
  }

  /** Returns the duration of the firing element's authored curves. */
  @carbon.method
  @impl.abstract
  GetCurveDuration()
  {
    throw new Error("IEveFiringEffectElement.GetCurveDuration must be implemented by a concrete firing element.");
  }

  /** Starts firing after the supplied delay. */
  @carbon.method
  @impl.abstract
  StartFiring(_delay)
  {
    throw new Error("IEveFiringEffectElement.StartFiring must be implemented by a concrete firing element.");
  }

  /** Stops the active firing sequence. */
  @carbon.method
  @impl.abstract
  StopFiring()
  {
    throw new Error("IEveFiringEffectElement.StopFiring must be implemented by a concrete firing element.");
  }

  /** Sets the firing source transform and destination position. */
  @carbon.method
  @impl.abstract
  SetFiringTransform(_source, _destination)
  {
    throw new Error("IEveFiringEffectElement.SetFiringTransform must be implemented by a concrete firing element.");
  }

  /** Sets whether the source and destination endpoints are displayed. */
  @carbon.method
  @impl.abstract
  DisplayEndPoints(_displaySource, _displayDestination)
  {
    throw new Error("IEveFiringEffectElement.DisplayEndPoints must be implemented by a concrete firing element.");
  }

  /** Performs the asynchronous firing-effect update phase. */
  @carbon.method
  @impl.abstract
  UpdateEffectAsync(_updateContext)
  {
    throw new Error("IEveFiringEffectElement.UpdateEffectAsync must be implemented by a concrete firing element.");
  }

  /** Performs the synchronous firing-effect update phase. */
  @carbon.method
  @impl.abstract
  UpdateEffectSync(_updateContext)
  {
    throw new Error("IEveFiringEffectElement.UpdateEffectSync must be implemented by a concrete firing element.");
  }

  /** Updates visibility beneath the supplied parent transform. */
  @carbon.method
  @impl.abstract
  UpdateVisibility(_updateContext, _parentTransform)
  {
    throw new Error("IEveFiringEffectElement.UpdateVisibility must be implemented by a concrete firing element.");
  }

  /** Appends this element's renderer-neutral renderables. */
  @carbon.method
  @impl.abstract
  GetRenderables(_renderables)
  {
    throw new Error("IEveFiringEffectElement.GetRenderables must be implemented by a concrete firing element.");
  }

  /** Runs the optional general update hook. */
  @carbon.method
  @impl.noop
  Update(_updateContext)
  {
  }

  /** Registers optional content with a quad renderer. */
  @carbon.method
  @impl.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Adds optional quad records to a quad renderer. */
  @carbon.method
  @impl.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /** Applies an optional intensity multiplier. */
  @carbon.method
  @impl.noop
  SetIntensity(_intensity)
  {
  }

  /** Applies an optional display state. */
  @carbon.method
  @impl.noop
  SetDisplay(_display)
  {
  }

}
