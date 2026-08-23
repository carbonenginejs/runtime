import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { updateChildSync, updateChildAsync, collectRenderables } from './CjsStretchRuntime.js';

let _initProto, _initClass, _init_element, _init_extra_element, _init_source, _init_extra_source, _init_sourceTransform, _init_extra_sourceTransform, _init_destination, _init_extra_destination, _init_useSourceTransform, _init_extra_useSourceTransform, _init_displayDestination, _init_extra_displayDestination, _init_displaySource, _init_extra_displaySource, _init_display, _init_extra_display, _init_destinationScale, _init_extra_destinationScale;

/**
 * A top-level wrapper that hosts one firing-effect element for editing, owning
 * the endpoint state that is pushed into that element every update.
 */
let _EveFiringEffectEleme;
new class extends _identity {
  static [class EveFiringEffectElementContainer extends _EveEntity {
    static {
      ({
        e: [_init_element, _init_extra_element, _init_source, _init_extra_source, _init_sourceTransform, _init_extra_sourceTransform, _init_destination, _init_extra_destination, _init_useSourceTransform, _init_extra_useSourceTransform, _init_displayDestination, _init_extra_displayDestination, _init_displaySource, _init_extra_displaySource, _init_display, _init_extra_display, _init_destinationScale, _init_extra_destinationScale, _initProto],
        c: [_EveFiringEffectEleme, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveFiringEffectElementContainer",
        family: "eve/renderable/stretch"
      })], [[[io, io.persistOnly, void 0, type.model("IEveFiringEffectElement")], 16, "element"], [[io, io.readwrite, type, type.vec3], 16, "source"], [[io, io.persist, type, type.mat4], 16, "sourceTransform"], [[io, io.persist, type, type.vec3], 16, "destination"], [[io, io.persist, type, type.boolean], 16, "useSourceTransform"], [[io, io.persist, type, type.boolean], 16, "displayDestination"], [[io, io.persist, type, type.boolean], 16, "displaySource"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.float32], 16, "destinationScale"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript uses duck-typed firing elements rather than Carbon QueryInterface dispatch.")], 18, "UpdateSynchronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The browser runtime forwards lifecycle calls directly to the hydrated element.")], 18, "UpdateAsynchronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Visibility is graph-owned; the renderer consumes the collected element later.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Renderable collection is backend-neutral and leaves batch realization to the engine package.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetActive"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetActive"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetElement"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetElement"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFiringTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestObjectScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisplayEndPoints"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, _EveEntity));
    }
    element = (_initProto(this), _init_element(this, null));
    source = (_init_extra_element(this), _init_source(this, vec3.create()));
    sourceTransform = (_init_extra_source(this), _init_sourceTransform(this, mat4.create()));
    destination = (_init_extra_sourceTransform(this), _init_destination(this, vec3.create()));
    useSourceTransform = (_init_extra_destination(this), _init_useSourceTransform(this, false));
    displayDestination = (_init_extra_useSourceTransform(this), _init_displayDestination(this, true));
    displaySource = (_init_extra_displayDestination(this), _init_displaySource(this, true));
    display = (_init_extra_displaySource(this), _init_display(this, true));
    destinationScale = (_init_extra_display(this), _init_destinationScale(this, 1));
    #active = (_init_extra_destinationScale(this), false);

    /**
     * Pushes the container's endpoint state - source transform or position,
     * destination scale and endpoint display flags - into the wrapped element,
     * then updates the element, but only while the container is firing.
     */
    UpdateSynchronous(context) {
      if (!this.element) return true;
      const source = this.useSourceTransform ? this.sourceTransform : this.source;
      this.element.SetFiringTransform?.(source, this.destination);
      this.element.SetDestObjectScale?.(this.destinationScale);
      this.element.DisplayEndPoints?.(this.displaySource, this.displayDestination);
      if (this.#active) {
        if (typeof this.element.Update === "function") this.element.Update(context);else {
          updateChildSync(this.element, context);
          updateChildAsync(this.element, context);
        }
      }
      return true;
    }

    /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
    UpdateSyncronous(context) {
      return this.UpdateSynchronous(context);
    }

    /**
     * The wrapped element is driven entirely from the synchronous phase, so this
     * only reports success.
     */
    UpdateAsynchronous(context) {
      return true;
    }

    /**
     * Carbon's IEveSpaceObject2 spelling of UpdateAsynchronous; forwards
     * unchanged.
     */
    UpdateAsyncronous(context) {
      return this.UpdateAsynchronous(context);
    }

    /**
     * Forwards the parent placement to the wrapped element under the container's
     * own display flag.
     */
    UpdateVisibility(context, transform) {
      if (this.display) this.element?.UpdateVisibility?.(context, transform);
    }

    /**
     * Appends the wrapped element's renderables to out while the container is displayed.
     * @returns {Array} out
     */
    GetRenderables(out = []) {
      if (this.display) collectRenderables(this.element, out);
      return out;
    }

    /**
     * Starts the wrapped element firing and marks the container active, which is
     * what enables the per-frame element update.
     */
    StartFiring(delay = 0) {
      this.element?.StartFiring?.(delay);
      this.#active = true;
    }

    /**
     * Stops the wrapped element and clears the active flag, halting the per-frame
     * element update while still pushing endpoint state.
     */
    StopFiring() {
      this.element?.StopFiring?.();
      this.#active = false;
    }

    /**
     * Toggles firing through StartFiring/StopFiring, ignoring a request that
     * matches the current state so a repeated true does not restart the effect.
     */
    SetActive(active) {
      if (!!active === this.#active) return;
      if (active) this.StartFiring(0);else this.StopFiring();
    }

    /** Whether the container is currently firing. */
    GetActive() {
      return this.#active;
    }

    /**
     * Replaces the wrapped firing-effect element; the container's active state is
     * not reapplied to the new element.
     */
    SetElement(element) {
      this.element = element ?? null;
    }

    /** The wrapped firing-effect element, or null. */
    GetElement() {
      return this.element;
    }

    /**
     * Records the endpoints, accepting either a 16-element source transform - kept
     * whole, with its translation mirrored into source - or a source position;
     * which one was given is latched in useSourceTransform and applied on the next
     * synchronous update.
     */
    SetFiringTransform(source, destination) {
      if (source?.length === 16) {
        mat4.copy(this.sourceTransform, source);
        mat4.getTranslation(this.source, source);
        this.useSourceTransform = true;
      } else {
        vec3.copy(this.source, source ?? _EveFiringEffectEleme.#zero);
        this.useSourceTransform = false;
      }
      vec3.copy(this.destination, destination);
    }

    /**
     * Records the destination-end scale forwarded to the element on the next
     * synchronous update.
     */
    SetDestObjectScale(scale) {
      this.destinationScale = Number(scale);
    }

    /**
     * Records which endpoints the element should draw; forwarded on the next
     * synchronous update.
     */
    DisplayEndPoints(displaySource, displayDestination) {
      this.displaySource = !!displaySource;
      this.displayDestination = !!displayDestination;
    }

    /**
     * Shows or hides the container, gating visibility and renderable collection
     * but not the endpoint state push.
     */
    SetDisplay(display) {
      this.display = !!display;
    }

    /**
     * Curve duration reported by the wrapped element, or 0 when there is no
     * element.
     */
    GetCurveDuration() {
      return Number(this.element?.GetCurveDuration?.() ?? 0);
    }

    /** Carbon EveFiringEffectElementContainer::RegisterComponents
     * (cpp:140-146): forwards the wrapped element (no gates; EveEntity.Register
     * tolerates a null registry). */
    RegisterComponents() {
      this.element?.Register?.(this.GetComponentRegistry());
    }

    /** Carbon EveFiringEffectElementContainer::UnRegisterComponents
     * (cpp:148-154): forwards the wrapped element. */
    UnRegisterComponents() {
      this.element?.UnRegister?.(this.GetComponentRegistry());
    }
  }];
  #zero = vec3.create();
  constructor() {
    super(_EveFiringEffectEleme), _initClass();
  }
}();

export { _EveFiringEffectEleme as EveFiringEffectElementContainer };
//# sourceMappingURL=EveFiringEffectElementContainer.js.map
