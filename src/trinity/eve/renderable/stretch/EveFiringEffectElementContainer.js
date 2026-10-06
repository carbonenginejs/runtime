// Source: trinity/trinity/Eve/Renderable/Stretch/EveFiringEffectElementContainer.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveFiringEffectElementContainer.cpp
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { EveEntity } from "../../EveEntity.js";


/**
 * A top-level wrapper that hosts one firing-effect element for editing, owning
 * the endpoint state that is pushed into that element every update.
 */
@meta.define({ className: "EveFiringEffectElementContainer", family: "eve/renderable/stretch" })
@meta.blue.inherit(IEveSpaceObject2)
export class EveFiringEffectElementContainer extends EveEntity
{
  @meta.blue.readwrite
  @meta.blue.persistOnly
 @meta.type.model("IEveFiringEffectElement")
  element = null;
  @meta.blue.readwrite
  @meta.type.vec3
  source = vec3.create();
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.mat4
  sourceTransform = mat4.create();
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.vec3
  destination = vec3.create();
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean
  useSourceTransform = false;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean
  displayDestination = true;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean
  displaySource = true;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean
  display = true;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.float32
  destinationScale = 1;

  _active = false;

  /**
   * Pushes the container's endpoint state - source transform or position,
   * destination scale and endpoint display flags - into the wrapped element,
   * then updates the element, but only while the container is firing.
   *
   * Adapted: The browser runtime drives the nominal firing-element contract synchronously
   * instead of Carbon task dispatch.
   */
  @meta.blue.method
  @meta.adapted
  UpdateSynchronous(context)
  {
    if (!this.element) return true;
    const source = this.useSourceTransform ? this.sourceTransform : this.source;
    this.element.SetFiringTransform(source, this.destination);
    this.element.SetDestObjectScale(this.destinationScale);
    this.element.DisplayEndPoints(this.displaySource, this.displayDestination);
    if (this._active)
    {
      this.element.Update(context);
    }
    return true;
  }

  /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  /**
   * The wrapped element is driven entirely from the synchronous phase, so this
   * only reports success.
   *
   * Adapted: The element is updated in the synchronous phase; this asynchronous entry point
   * only reports success.
   */
  @meta.blue.method
  @meta.adapted
  UpdateAsynchronous(context)
  {
    void context;
    return true;
  }

  /**
   * Carbon's IEveSpaceObject2 spelling of UpdateAsynchronous; forwards
   * unchanged.
   */
  UpdateAsyncronous(context)
  {
    return this.UpdateAsynchronous(context);
  }

  /**
   * Forwards the parent placement to the wrapped element under the container's
   * own display flag.
   *
   * Adapted: Visibility is graph-owned; the renderer consumes the collected element later.
   */
  @meta.blue.method
  @meta.adapted
  UpdateVisibility(context, transform)
  {
    if (this.display && this.element) this.element.UpdateVisibility(context, transform);
  }

  /**
   * Appends the wrapped element's renderables to out while the container is displayed.
   *
   * Adapted: Renderable collection is backend-neutral and does not build the batch yet.
   *
   * @returns {Array} out
   */
  @meta.adapted
  GetRenderables__Impostors(out = [], _impostors)
  {
    if (this.display && this.element) this.element.GetRenderables(out);
    return out;
  }

  /**
   * Starts the wrapped element firing with no delay and marks the container
   * active, which is what enables the per-frame element update; without an
   * element nothing changes (Carbon cpp:83-90).
   */
  @meta.blue.method
  @meta.implemented
  StartFiring()
  {
    if (this.element)
    {
      this.element.StartFiring(0);
      this._active = true;
    }
  }

  /**
   * Stops the wrapped element and clears the active flag, halting the per-frame
   * element update while still pushing endpoint state; without an element
   * nothing changes (Carbon cpp:92-99).
   */
  @meta.blue.method
  @meta.implemented
  StopFiring()
  {
    if (this.element)
    {
      this.element.StopFiring();
      this._active = false;
    }
  }

  /**
   * Toggles firing through StartFiring/StopFiring, ignoring a request that
   * matches the current state so a repeated true does not restart the effect.
   */
  @meta.blue.method
  @meta.implemented
  SetActive(active)
  {
    if (!!active === this._active) return;
    if (active) this.StartFiring();
    else this.StopFiring();
  }

  /** Whether the container is currently firing. */
  @meta.blue.method
  @meta.implemented
  GetActive()
  {
    return this._active;
  }

  /**
   * Replaces the wrapped firing-effect element; the container's active state is
   * not reapplied to the new element.
   */
  @meta.blue.method
  @meta.implemented
  SetElement(element)
  {
    this.element = element ?? null;
  }

  /** The wrapped firing-effect element, or null. */
  @meta.blue.method
  @meta.implemented
  GetElement()
  {
    return this.element;
  }

  /**
   * Records the endpoints, accepting either a 16-element source transform - kept
   * whole, with its translation mirrored into source - or a source position;
   * which one was given is latched in useSourceTransform and applied on the next
   * synchronous update.
   */
  @meta.blue.method
  @meta.implemented
  SetFiringTransform(source, destination)
  {
    if (source?.length === 16)
    {
      mat4.copy(this.sourceTransform, source);
      mat4.getTranslation(this.source, source);
      this.useSourceTransform = true;
    }
    else
    {
      vec3.copy(this.source, source ?? EveFiringEffectElementContainer._zero);
      this.useSourceTransform = false;
    }
    vec3.copy(this.destination, destination);
  }

  /**
   * Records the destination-end scale forwarded to the element on the next
   * synchronous update.
   */
  @meta.blue.method
  @meta.implemented
  SetDestObjectScale(scale)
  {
    this.destinationScale = Number(scale);
  }

  /**
   * Records which endpoints the element should draw; forwarded on the next
   * synchronous update.
   */
  @meta.blue.method
  @meta.implemented
  DisplayEndPoints(displaySource, displayDestination)
  {
    this.displaySource = !!displaySource;
    this.displayDestination = !!displayDestination;
  }

  /**
   * Shows or hides the container, gating visibility and renderable collection
   * but not the endpoint state push.
   */
  @meta.blue.method
  @meta.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  /**
   * Curve duration reported by the wrapped element, or 0 when there is no
   * element.
   */
  @meta.blue.method
  @meta.implemented
  GetCurveDuration()
  {
    return this.element ? Number(this.element.GetCurveDuration()) : 0;
  }

  /** Carbon EveFiringEffectElementContainer::RegisterComponents
   * (cpp:140-146): forwards the wrapped element (no gates; EveEntity.Register
   * tolerates a null registry). */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    this.element?.Register(this.GetComponentRegistry());
  }

  /** Carbon EveFiringEffectElementContainer::UnRegisterComponents
   * (cpp:148-154): forwards the wrapped element. */
  @meta.blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    this.element?.UnRegister(this.GetComponentRegistry());
  }

  static _zero = vec3.create();
}
