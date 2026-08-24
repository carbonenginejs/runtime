// Source: trinity/trinity/Eve/Renderable/Stretch/EveFiringEffectElementContainer.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveFiringEffectElementContainer.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";


/**
 * A top-level wrapper that hosts one firing-effect element for editing, owning
 * the endpoint state that is pushed into that element every update.
 */
@type.define({ className: "EveFiringEffectElementContainer", family: "eve/renderable/stretch" })
export class EveFiringEffectElementContainer extends EveEntity
{
  @io.persistOnly @type.model("IEveFiringEffectElement") element = null;
  @io.readwrite @type.vec3 source = vec3.create();
  @io.persist @type.mat4 sourceTransform = mat4.create();
  @io.persist @type.vec3 destination = vec3.create();
  @io.persist @type.boolean useSourceTransform = false;
  @io.persist @type.boolean displayDestination = true;
  @io.persist @type.boolean displaySource = true;
  @io.persist @type.boolean display = true;
  @io.persist @type.float32 destinationScale = 1;

  #active = false;

  /**
   * Pushes the container's endpoint state - source transform or position,
   * destination scale and endpoint display flags - into the wrapped element,
   * then updates the element, but only while the container is firing.
  */
  @carbon.method @impl.adapted
  @impl.reason("The browser runtime drives the nominal firing-element contract synchronously instead of Carbon task dispatch.")
  UpdateSynchronous(context)
  {
    if (!this.element) return true;
    const source = this.useSourceTransform ? this.sourceTransform : this.source;
    this.element.SetFiringTransform(source, this.destination);
    this.element.SetDestObjectScale(this.destinationScale);
    this.element.DisplayEndPoints(this.displaySource, this.displayDestination);
    if (this.#active)
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
   */
  @carbon.method @impl.adapted
  @impl.reason("The browser runtime forwards lifecycle calls directly to the hydrated element.")
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
   */
  @carbon.method @impl.adapted
  @impl.reason("Visibility is graph-owned; the renderer consumes the collected element later.")
  UpdateVisibility(context, transform)
  {
    if (this.display && this.element) this.element.UpdateVisibility(context, transform);
  }

  /**
   * Appends the wrapped element's renderables to out while the container is displayed.
   * @returns {Array} out
   */
  @carbon.method @impl.adapted
  @impl.reason("Renderable collection is backend-neutral and leaves batch realization to the engine package.")
  GetRenderables(out = [])
  {
    if (this.display && this.element) this.element.GetRenderables(out);
    return out;
  }

  /**
   * Starts the wrapped element firing and marks the container active, which is
   * what enables the per-frame element update.
   */
  @carbon.method @impl.implemented
  StartFiring(delay = 0)
  {
    if (this.element) this.element.StartFiring(delay);
    this.#active = true;
  }

  /**
   * Stops the wrapped element and clears the active flag, halting the per-frame
   * element update while still pushing endpoint state.
   */
  @carbon.method @impl.implemented
  StopFiring()
  {
    if (this.element) this.element.StopFiring();
    this.#active = false;
  }

  /**
   * Toggles firing through StartFiring/StopFiring, ignoring a request that
   * matches the current state so a repeated true does not restart the effect.
   */
  @carbon.method @impl.implemented
  SetActive(active)
  {
    if (!!active === this.#active) return;
    if (active) this.StartFiring(0);
    else this.StopFiring();
  }

  /** Whether the container is currently firing. */
  @carbon.method @impl.implemented
  GetActive()
  {
    return this.#active;
  }

  /**
   * Replaces the wrapped firing-effect element; the container's active state is
   * not reapplied to the new element.
   */
  @carbon.method @impl.implemented
  SetElement(element)
  {
    this.element = element ?? null;
  }

  /** The wrapped firing-effect element, or null. */
  @carbon.method @impl.implemented
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
  @carbon.method @impl.implemented
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
      vec3.copy(this.source, source ?? EveFiringEffectElementContainer.#zero);
      this.useSourceTransform = false;
    }
    vec3.copy(this.destination, destination);
  }

  /**
   * Records the destination-end scale forwarded to the element on the next
   * synchronous update.
   */
  @carbon.method @impl.implemented
  SetDestObjectScale(scale)
  {
    this.destinationScale = Number(scale);
  }

  /**
   * Records which endpoints the element should draw; forwarded on the next
   * synchronous update.
   */
  @carbon.method @impl.implemented
  DisplayEndPoints(displaySource, displayDestination)
  {
    this.displaySource = !!displaySource;
    this.displayDestination = !!displayDestination;
  }

  /**
   * Shows or hides the container, gating visibility and renderable collection
   * but not the endpoint state push.
   */
  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  /**
   * Curve duration reported by the wrapped element, or 0 when there is no
   * element.
   */
  @carbon.method @impl.implemented
  GetCurveDuration()
  {
    return this.element ? Number(this.element.GetCurveDuration()) : 0;
  }

  /** Carbon EveFiringEffectElementContainer::RegisterComponents
   * (cpp:140-146): forwards the wrapped element (no gates; EveEntity.Register
   * tolerates a null registry). */
  @carbon.method @impl.implemented
  RegisterComponents()
  {
    this.element?.Register?.(this.GetComponentRegistry());
  }

  /** Carbon EveFiringEffectElementContainer::UnRegisterComponents
   * (cpp:148-154): forwards the wrapped element. */
  @carbon.method @impl.implemented
  UnRegisterComponents()
  {
    this.element?.UnRegister?.(this.GetComponentRegistry());
  }

  static #zero = vec3.create();
}
