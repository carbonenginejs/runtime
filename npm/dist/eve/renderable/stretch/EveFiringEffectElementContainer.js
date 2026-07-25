import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { updateChildSync, updateChildAsync, collectRenderables } from './CjsStretchRuntime.js';

let _initProto, _initClass, _init_element, _init_extra_element, _init_source, _init_extra_source, _init_sourceTransform, _init_extra_sourceTransform, _init_destination, _init_extra_destination, _init_useSourceTransform, _init_extra_useSourceTransform, _init_displayDestination, _init_extra_displayDestination, _init_displaySource, _init_extra_displaySource, _init_display, _init_extra_display, _init_destinationScale, _init_extra_destinationScale;
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
    UpdateSyncronous(context) {
      return this.UpdateSynchronous(context);
    }
    UpdateAsynchronous(context) {
      return true;
    }
    UpdateAsyncronous(context) {
      return this.UpdateAsynchronous(context);
    }
    UpdateVisibility(context, transform) {
      if (this.display) this.element?.UpdateVisibility?.(context, transform);
    }
    GetRenderables(out = []) {
      if (this.display) collectRenderables(this.element, out);
      return out;
    }
    StartFiring(delay = 0) {
      this.element?.StartFiring?.(delay);
      this.#active = true;
    }
    StopFiring() {
      this.element?.StopFiring?.();
      this.#active = false;
    }
    SetActive(active) {
      if (!!active === this.#active) return;
      if (active) this.StartFiring(0);else this.StopFiring();
    }
    GetActive() {
      return this.#active;
    }
    SetElement(element) {
      this.element = element ?? null;
    }
    GetElement() {
      return this.element;
    }
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
    SetDestObjectScale(scale) {
      this.destinationScale = Number(scale);
    }
    DisplayEndPoints(displaySource, displayDestination) {
      this.displaySource = !!displaySource;
      this.displayDestination = !!displayDestination;
    }
    SetDisplay(display) {
      this.display = !!display;
    }
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
