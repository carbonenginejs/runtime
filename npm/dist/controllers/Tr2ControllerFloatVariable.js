import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { Type } from './enums.js';

let _initProto, _initClass, _init_variableType, _init_extra_variableType, _init_enumValues, _init_extra_enumValues, _init_value, _init_extra_value, _init_defaultValue, _init_extra_defaultValue, _init_name, _init_extra_name;

/**
 * One named float slot of a controller's variable set, mirroring its value into
 * the controller's packed expression buffer and raising its dirty bit whenever
 * it changes.
 */
let _Tr2ControllerFloatVa;
new class extends _identity {
  static [class Tr2ControllerFloatVariable extends CjsModel {
    static {
      ({
        e: [_init_variableType, _init_extra_variableType, _init_enumValues, _init_extra_enumValues, _init_value, _init_extra_value, _init_defaultValue, _init_extra_defaultValue, _init_name, _init_extra_name, _initProto],
        c: [_Tr2ControllerFloatVa, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ControllerFloatVariable",
        family: "controllers"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Type")], 16, "variableType"], [[io, io.persist, type, type.string], 16, "enumValues"], [[io, io.notify, io, io.always, io, io.readwrite, type, type.float32], 16, "value"], [[io, io.persist, type, type.float32], 16, "defaultValue"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDestinationBuffer"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDirtyMask"]], 0, void 0, CjsModel));
    }
    variableType = (_initProto(this), _init_variableType(this, Type.FLOAT));
    enumValues = (_init_extra_variableType(this), _init_enumValues(this, ""));
    value = (_init_extra_enumValues(this), _init_value(this, 0));
    defaultValue = (_init_extra_value(this), _init_defaultValue(this, 0));
    name = (_init_extra_defaultValue(this), _init_name(this, ""));
    #destination = (_init_extra_name(this), null);
    #destinationIndex = 0;
    #dirtyMaskDestination = null;
    #dirtyMask = 0n;

    /**
     * Initializes the runtime value from the authored default.
     */
    Initialize() {
      this.SetValues({
        value: this.defaultValue
      }, {
        source: this,
        skipEvents: true
      });
      return true;
    }

    /**
     * Mirrors notified value changes to the bound destination and dirty mask.
     */
    OnModified(_options = {}) {
      this.#writeDestination();
      this.#markDirty();
      return true;
    }

    /**
     * Gets the authored variable name.
     */
    GetName() {
      return this.name;
    }

    /**
     * Gets the current variable value.
     */
    GetValue() {
      return this.value;
    }

    /**
     * Sets the current value and mirrors it to any bound destination.
     */
    SetValue(value) {
      return this.SetValues({
        value
      }, {
        source: this,
        returnBoolean: true
      });
    }

    /**
     * Binds a destination buffer slot and immediately writes the current value.
     */
    SetDestinationBuffer(buffer, index = 0) {
      this.#destination = buffer;
      this.#destinationIndex = index;
      this.#writeDestination();
    }

    /**
     * Binds a dirty-mask holder used when the variable changes.
     */
    SetDirtyMask(maskDestination, mask) {
      this.#dirtyMaskDestination = maskDestination;
      this.#dirtyMask = BigInt(mask);
    }

    /**
     * Writes the current value to the bound destination buffer.
     */
    #writeDestination() {
      if (this.#destination) {
        if (typeof this.#destination === "function") {
          this.#destination(this.value);
        } else if ("value" in this.#destination) {
          this.#destination.value = this.value;
        } else {
          this.#destination[this.#destinationIndex] = this.value;
        }
      }
    }

    /**
     * ORs the configured dirty bit into the bound dirty-mask holder.
     */
    #markDirty() {
      const destination = this.#dirtyMaskDestination;
      if (!destination) {
        return;
      }
      if (typeof destination.value === "bigint") {
        destination.value |= this.#dirtyMask;
        return;
      }
      destination.value = Number(BigInt(destination.value) | this.#dirtyMask);
    }
  }];
  Type = Type;
  constructor() {
    super(_Tr2ControllerFloatVa), _initClass();
  }
}();

export { _Tr2ControllerFloatVa as Tr2ControllerFloatVariable };
//# sourceMappingURL=Tr2ControllerFloatVariable.js.map
