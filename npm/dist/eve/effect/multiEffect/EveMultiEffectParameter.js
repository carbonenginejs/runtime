import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { EveEffectRoot2 as _EveEffectRoot } from '../../spaceObject/EveEffectRoot2.js';
import { EveSpaceObject2 as _EveSpaceObject } from '../../spaceObject/EveSpaceObject2.js';

let _initProto, _initClass, _init_type, _init_extra_type, _init_name, _init_extra_name, _init_object, _init_extra_object;

/**
 * One named slot in an EveMultiEffect, holding the object bound to that name
 * together with the object type the effect expects there.
 */
let _EveMultiEffectParame;
new class extends _identity {
  static [class EveMultiEffectParameter extends CjsModel {
    static {
      ({
        e: [_init_type, _init_extra_type, _init_name, _init_extra_name, _init_object, _init_extra_object, _initProto],
        c: [_EveMultiEffectParame, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveMultiEffectParameter",
        family: "eve/effect"
      })], [[[io, io.readwrite, type, type.int32, void 0, schema.enum("ParameterType")], 16, "type"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("IRoot")], 16, "object"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetParameterObject"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon BlueCast checks map to JavaScript instanceof checks against the maintained runtime classes.")], 18, "IsValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOwner"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The runtime settle hook receives the completed model update rather than Carbon's Be::Var pointer; object is the only notifying field.")], 18, "OnModified"]], 0, void 0, CjsModel));
    }
    type = (_initProto(this), _init_type(this, 3));
    name = (_init_extra_type(this), _init_name(this, ""));
    object = (_init_extra_name(this), _init_object(this, null));
    #owner = (_init_extra_object(this), null);

    /** Binds an object to this slot, or clears it when given nothing. */
    SetParameterObject(object) {
      this.object = object ?? null;
    }

    /**
     * Whether the bound object matches the declared parameter type; TYPE_ANYTHING
     * accepts any non-null object, and an unrecognised type accepts none.
     */
    IsValid() {
      if (!this.object) return false;
      switch (this.type) {
        case _EveMultiEffectParame.ParameterType.TYPE_EVESPACEOBJECT:
          return this.object instanceof _EveSpaceObject;
        case _EveMultiEffectParame.ParameterType.TYPE_EVEEFFECTROOT:
          return this.object instanceof _EveEffectRoot;
        case _EveMultiEffectParame.ParameterType.TYPE_ANYTHING:
          return true;
        default:
          return false;
      }
    }

    /**
     * Sets the effect rebound when this slot's object changes; passing nothing
     * detaches the slot.
     */
    SetOwner(owner) {
      this.#owner = owner ?? null;
    }

    /** The object bound to this slot, or null. */
    GetParameterObject() {
      return this.object;
    }

    /** The name bindings and controllers use to reach this slot. */
    GetName() {
      return this.name;
    }

    /**
     * Rebinds the owning effect after a model update, since the bound object is
     * the slot's only notifying field.
     */
    OnModified() {
      this.#owner?.Rebind?.();
      return true;
    }
  }];
  ParameterType = Object.freeze({
    TYPE_EVESPACEOBJECT: 0,
    TYPE_EVEEFFECTROOT: 1,
    TYPE_ANYTHING: 2,
    TYPE_UNDEFINED: 3
  });
  constructor() {
    super(_EveMultiEffectParame), _initClass();
  }
}();

export { _EveMultiEffectParame as EveMultiEffectParameter };
//# sourceMappingURL=EveMultiEffectParameter.js.map
