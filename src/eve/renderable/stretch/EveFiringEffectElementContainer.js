// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveFiringEffectElementContainer.h
// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveFiringEffectElementContainer.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../../EveEntity.js";
import { collectRenderables, updateChildAsync, updateChildSync } from "./CjsStretchRuntime.js";


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

  @carbon.method @impl.adapted
  @impl.reason("JavaScript uses duck-typed firing elements rather than Carbon QueryInterface dispatch.")
  UpdateSynchronous(context)
  {
    if (!this.element) return true;
    const source = this.useSourceTransform ? this.sourceTransform : this.source;
    this.element.SetFiringTransform?.(source, this.destination);
    this.element.SetDestObjectScale?.(this.destinationScale);
    this.element.DisplayEndPoints?.(this.displaySource, this.displayDestination);
    if (this.#active)
    {
      if (typeof this.element.Update === "function") this.element.Update(context);
      else
      {
        updateChildSync(this.element, context);
        updateChildAsync(this.element, context);
      }
    }
    return true;
  }

  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  @carbon.method @impl.adapted
  @impl.reason("The browser runtime forwards lifecycle calls directly to the hydrated element.")
  UpdateAsynchronous(context)
  {
    void context;
    return true;
  }

  UpdateAsyncronous(context)
  {
    return this.UpdateAsynchronous(context);
  }

  @carbon.method @impl.adapted
  @impl.reason("Visibility is graph-owned; the renderer consumes the collected element later.")
  UpdateVisibility(context, transform)
  {
    if (this.display) this.element?.UpdateVisibility?.(context, transform);
  }

  @carbon.method @impl.adapted
  @impl.reason("Renderable collection is backend-neutral and leaves batch realization to the engine package.")
  GetRenderables(out = [])
  {
    if (this.display) collectRenderables(this.element, out);
    return out;
  }

  @carbon.method @impl.implemented
  StartFiring(delay = 0)
  {
    this.element?.StartFiring?.(delay);
    this.#active = true;
  }

  @carbon.method @impl.implemented
  StopFiring()
  {
    this.element?.StopFiring?.();
    this.#active = false;
  }

  @carbon.method @impl.implemented
  SetActive(active)
  {
    if (!!active === this.#active) return;
    if (active) this.StartFiring(0);
    else this.StopFiring();
  }

  @carbon.method @impl.implemented
  GetActive()
  {
    return this.#active;
  }

  @carbon.method @impl.implemented
  SetElement(element)
  {
    this.element = element ?? null;
  }

  @carbon.method @impl.implemented
  GetElement()
  {
    return this.element;
  }

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

  @carbon.method @impl.implemented
  SetDestObjectScale(scale)
  {
    this.destinationScale = Number(scale);
  }

  @carbon.method @impl.implemented
  DisplayEndPoints(displaySource, displayDestination)
  {
    this.displaySource = !!displaySource;
    this.displayDestination = !!displayDestination;
  }

  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  @carbon.method @impl.implemented
  GetCurveDuration()
  {
    return Number(this.element?.GetCurveDuration?.() ?? 0);
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
