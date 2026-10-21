import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/Renderable/Stretch/EveFiringEffectElementContainer.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveFiringEffectElementContainer.cpp
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { vec3 } from "#math/vec3";
import { CjsSchema, meta, type, blue } from "#schema";
import { EveEntity } from "../../EveEntity.js";


/**
 * A top-level wrapper that hosts one firing-effect element for editing, owning
 * the endpoint state that is pushed into that element every update.
 */
@be.define("EveFiringEffectElementContainer")
@blue.inherit(IEveSpaceObject2)
@be.mapInterface(IEveSpaceObject2)
@be.mapInterface(EveEntity)
export class EveFiringEffectElementContainer extends EveEntity
{
  /**
   * m_element (IEveFiringEffectElementPtr, private, h:62), persisted under its
   * exposed name by MAP_ATTRIBUTE "element" PERSISTONLY
   * (EveFiringEffectElementContainer_Blue.cpp:21-25). Readers write it
   * directly, bypassing the setter.
   */
  @blue.attribute("element")
  @blue.persistOnly
  @type.rootRef("IEveFiringEffectElement")
  _element = null;

  /**
   * Carbon MAP_PROPERTY "element" over GetElement/SetElement
   * (EveFiringEffectElementContainer_Blue.cpp:27-31): the setter moves
   * component registration to the replacement.
   */
  @blue.property()
  @type.rootRef("IEveFiringEffectElement")
  @meta.implemented
  get element()
  {
    return this.GetElement();
  }

  /** Moves component registration to the replacement element. */
  @meta.implemented
  set element(value)
  {
    this.SetElement(value);
  }

  /**
   * Carbon MAP_PROPERTY "active" over GetActive/SetActive
   * (EveFiringEffectElementContainer_Blue.cpp:33-37): setting it starts or
   * stops the element when the state changes.
   */
  @blue.property()
  @type.boolean
  @meta.implemented
  get active()
  {
    return this.GetActive();
  }

  /** Starts or stops firing when the requested state differs. */
  @meta.implemented
  set active(value)
  {
    this.SetActive(value);
  }

  @blue.readwrite
  @type.vec3
  source = vec3.create();
  @blue.readwrite
  @blue.persist
 @type.mat4
  sourceTransform = mat4.create();
  @blue.readwrite
  @blue.persist
 @type.vec3
  destination = vec3.create();
  @blue.readwrite
  @blue.persist
 @type.boolean
  useSourceTransform = false;
  @blue.readwrite
  @blue.persist
 @type.boolean
  displayDestination = true;
  @blue.readwrite
  @blue.persist
 @type.boolean
  displaySource = true;
  @blue.readwrite
  @blue.persist
 @type.boolean
  display = true;
  @blue.readwrite
  @blue.persist
 @type.float32
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
  @meta.adapted
  UpdateSynchronous(context)
  {
    if (!this._element) return true;
    const source = this.useSourceTransform ? this.sourceTransform : this.source;
    this._element.SetFiringTransform(source, this.destination);
    this._element.SetDestObjectScale(this.destinationScale);
    this._element.DisplayEndPoints(this.displaySource, this.displayDestination);
    if (this._active)
    {
      this._element.Update(context);
    }
    return true;
  }

  /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
  @blue.method
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
  @blue.method
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
  @blue.method
  @meta.adapted
  UpdateVisibility(context, transform)
  {
    if (this.display && this._element) this._element.UpdateVisibility(context, transform);
  }

  /**
   * Appends the wrapped element's renderables to out while the container is displayed.
   *
   * Adapted: Renderable collection is backend-neutral and does not build the batch yet.
   *
   * @returns {Array} out
   */
  @meta.adapted
  @blue.method
  GetRenderables__Impostors(out = [], _impostors)
  {
    if (this.display && this._element) this._element.GetRenderables(out);
    return out;
  }

  /**
   * Starts the wrapped element firing with no delay and marks the container
   * active, which is what enables the per-frame element update; without an
   * element nothing changes (Carbon cpp:83-90).
   */
  @blue.method
  @meta.implemented
  StartFiring()
  {
    if (this._element)
    {
      this._element.StartFiring(0);
      this._active = true;
    }
  }

  /**
   * Stops the wrapped element and clears the active flag, halting the per-frame
   * element update while still pushing endpoint state; without an element
   * nothing changes (Carbon cpp:92-99).
   */
  @blue.method
  @meta.implemented
  StopFiring()
  {
    if (this._element)
    {
      this._element.StopFiring();
      this._active = false;
    }
  }

  /**
   * Toggles firing through StartFiring/StopFiring, ignoring a request that
   * matches the current state so a repeated true does not restart the effect.
   */
  @blue.method
  @meta.implemented
  SetActive(active)
  {
    if (!!active === this._active) return;
    if (active) this.StartFiring();
    else this.StopFiring();
  }

  /** Whether the container is currently firing. */
  @blue.method
  @meta.implemented
  GetActive()
  {
    return this._active;
  }

  /**
   * Replaces the wrapped firing-effect element, moving its component
   * registration from the old element to the new one; the container's active
   * state is not reapplied to the new element (Carbon cpp:121-133).
   */
  @blue.method
  @meta.implemented
  SetElement(element)
  {
    const registry = this.GetComponentRegistry();
    CjsSchema.cast(this._element, EveEntity)?.UnRegister(registry);
    this._element = element ?? null;
    CjsSchema.cast(this._element, EveEntity)?.Register(registry);
  }

  /** The wrapped firing-effect element, or null. */
  @blue.method
  @meta.implemented
  GetElement()
  {
    return this._element;
  }

  /**
   * Records the endpoints, accepting either a 16-element source transform - kept
   * whole, with its translation mirrored into source - or a source position;
   * which one was given is latched in useSourceTransform and applied on the next
   * synchronous update.
   */
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
  @meta.implemented
  SetDestObjectScale(scale)
  {
    this.destinationScale = Number(scale);
  }

  /**
   * Records which endpoints the element should draw; forwarded on the next
   * synchronous update.
   */
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
  @meta.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  /**
   * Curve duration reported by the wrapped element, or 0 when there is no
   * element.
   */
  @meta.implemented
  GetCurveDuration()
  {
    return this._element ? Number(this._element.GetCurveDuration()) : 0;
  }

  /** Carbon EveFiringEffectElementContainer::RegisterComponents
   * (cpp:140-146): forwards the wrapped element (no gates; EveEntity.Register
   * tolerates a null registry). */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    this._element?.Register(this.GetComponentRegistry());
  }

  /** Carbon EveFiringEffectElementContainer::UnRegisterComponents
   * (cpp:148-154): forwards the wrapped element. */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    this._element?.UnRegister(this.GetComponentRegistry());
  }

  static _zero = vec3.create();
}
