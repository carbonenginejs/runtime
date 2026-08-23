import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';
import { Origin } from '../../generated/eve/child/enums.js';

let _initProto, _initClass, _init_transformModifiers, _init_extra_transformModifiers, _init_transforms, _init_extra_transforms, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_alwaysOn, _init_extra_alwaysOn, _init_inheritProperties, _init_extra_inheritProperties, _init_reset, _init_extra_reset, _init_instances, _init_extra_instances, _init_locatorSet, _init_extra_locatorSet, _init_source, _init_extra_source, _init_origin, _init_extra_origin;

/** A child that instantiates a source template across a list of authored or locator-driven transforms, forwarding controller and registration calls to the instances. */
let _EveChildInstanceCont;
new class extends _identity {
  static [class EveChildInstanceContainer extends _EveChildTransform {
    static {
      ({
        e: [_init_transformModifiers, _init_extra_transformModifiers, _init_transforms, _init_extra_transforms, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_alwaysOn, _init_extra_alwaysOn, _init_inheritProperties, _init_extra_inheritProperties, _init_reset, _init_extra_reset, _init_instances, _init_extra_instances, _init_locatorSet, _init_extra_locatorSet, _init_source, _init_extra_source, _init_origin, _init_extra_origin, _initProto],
        c: [_EveChildInstanceCont, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildInstanceContainer",
        family: "eve/child"
      })], [[[io, io.notify, io, io.persist, void 0, type.list("IEveChildTransformModifier")], 16, "transformModifiers"], [[io, io.persist, void 0, type.list("EveChildInstanceTransform")], 16, "transforms"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "alwaysOn"], [[io, io.persist, void 0, type.model("EveChildInheritProperties")], 16, "inheritProperties"], [[io, io.readwrite, type, type.boolean], 16, "reset"], [[io, io.read, void 0, type.list("IEveSpaceObjectChild")], 16, "instances"], [[io, io.notify, io, io.persist, type, type.string], 16, "locatorSet"], [[io, io.persistOnly, void 0, type.model("IEveSpaceObjectChild")], 16, "source"], [[io, io.read, type, type.int32, void 0, type.enum("Origin")], 16, "origin"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, _EveChildTransform));
    }
    constructor(...args) {
      super(...args);
      _init_extra_origin(this);
    }
    #controllerVariables = (_initProto(this), new Map());

    /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST, NOTIFY] */
    transformModifiers = _init_transformModifiers(this, []);

    /** m_transforms (PEveChildInstanceTransformStructureList) [READ, PERSIST] */
    transforms = (_init_extra_transformModifiers(this), _init_transforms(this, []));

    /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
    display = (_init_extra_transforms(this), _init_display(this, true));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_display(this), _init_name(this, ""));

    /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
    alwaysOn = (_init_extra_name(this), _init_alwaysOn(this, false));

    /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE, PERSIST] */
    inheritProperties = (_init_extra_alwaysOn(this), _init_inheritProperties(this, null));

    /** m_reset (bool) [READWRITE] */
    reset = (_init_extra_inheritProperties(this), _init_reset(this, true));

    /** m_instances (PIEveSpaceObjectChildVector) [READ] */
    instances = (_init_extra_reset(this), _init_instances(this, []));

    /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */
    locatorSet = (_init_extra_instances(this), _init_locatorSet(this, ""));

    /** m_source (IEveSpaceObjectChildPtr) [PERSISTONLY] */
    source = (_init_extra_locatorSet(this), _init_source(this, null));

    /** m_origin (Origin - enum Origin) [READ] */
    origin = (_init_extra_source(this), _init_origin(this, 0));

    /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
    HandleControllerEvent(name) {
      for (const instance of this.instances) instance?.HandleControllerEvent?.(name);
    }

    /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
    SetControllerVariable(name, value) {
      const key = String(name);
      const next = Number(value);
      this.source?.SetControllerVariable?.(key, next);
      this.#controllerVariables.set(key, next);
      for (const instance of this.instances) instance?.SetControllerVariable?.(key, next);
    }

    /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
    StartControllers() {
      for (const instance of this.instances) instance?.StartControllers?.();
    }

    /** Carbon EveChildInstanceContainer::RegisterComponents (cpp:83-103):
     * forwards the instances; with no instances (and edit mode enabled -
     * m_disableEditMode has no JS field yet, read duck-typed) the source
     * template registers instead. Gate IsInRegistry() && m_display. */
    RegisterComponents() {
      if (this.IsInRegistry() && this.display) {
        const registry = this.GetComponentRegistry();
        for (const instance of this.instances) {
          instance?.Register?.(registry);
        }
        if (!this.instances.length && !this.disableEditMode) {
          this.source?.Register?.(registry);
        }
      }
    }

    /** Carbon EveChildInstanceContainer::UnRegisterComponents (cpp:105-122):
     * forwards the instances and the source; no display re-check. */
    UnRegisterComponents() {
      if (this.IsInRegistry()) {
        const registry = this.GetComponentRegistry();
        for (const instance of this.instances) {
          instance?.UnRegister?.(registry);
        }
        this.source?.UnRegister?.(registry);
      }
    }
  }];
  Origin = Origin;
  constructor() {
    super(_EveChildInstanceCont), _initClass();
  }
}();

export { _EveChildInstanceCont as EveChildInstanceContainer };
//# sourceMappingURL=EveChildInstanceContainer.js.map
