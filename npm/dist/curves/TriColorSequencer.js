import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { TriOperator } from '@carbonenginejs/runtime-utils/graphics';

let _initProto, _initClass, _init_operator, _init_extra_operator, _init_value, _init_extra_value, _init_start, _init_extra_start, _init_functions, _init_extra_functions, _init_name, _init_extra_name;

/**
 * Color function combining its child color functions with Carbon's multiply or
 * add operator; both paths start from opaque white, so an additive sequencer is
 * offset by white.
 */
let _TriColorSequencer;
new class extends _identity {
  static [class TriColorSequencer extends CjsModel {
    static {
      ({
        e: [_init_operator, _init_extra_operator, _init_value, _init_extra_value, _init_start, _init_extra_start, _init_functions, _init_extra_functions, _init_name, _init_extra_name, _initProto],
        c: [_TriColorSequencer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriColorSequencer",
        family: "curves"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("TRIOPERATOR")], 16, "operator"], [[io, io.persist, type, type.color], 16, "value"], [[io, io.persist, type, type.float64], 16, "start"], [[io, io.persist, void 0, type.list("ITriColorFunction")], 16, "functions"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"]], 0, void 0, CjsModel));
    }
    operator = (_initProto(this), _init_operator(this, TriOperator.TRIOP_MULTIPLY));
    value = (_init_extra_operator(this), _init_value(this, vec4.create()));
    start = (_init_extra_value(this), _init_start(this, 0));
    functions = (_init_extra_start(this), _init_functions(this, []));
    name = (_init_extra_functions(this), _init_name(this, ""));
    #childValue = (_init_extra_name(this), vec4.create());

    /**
     * Updates the cached result of the child color functions.
     */
    UpdateValue(time) {
      this.GetValueAt(time, this.value);
    }

    /**
     * Updates the cached result and copies it into `out`.
     */
    Update(time, out) {
      this.GetValueAt(time, this.value);
      return vec4.copy(out, this.value);
    }

    /**
     * Combines child colors using Carbon's multiply or add operation.
     */
    GetValueAt(time, out) {
      if (this.operator === TriOperator.TRIOP_MULTIPLY) {
        vec4.set(out, 1, 1, 1, 1);
        for (const curve of this.functions) {
          curve.GetValueAt(time, this.#childValue);
          vec4.multiply(out, out, this.#childValue);
        }
        return out;
      }

      // Carbon's double-seconds overload starts additive evaluation at white.
      // TriCurveSet drives UpdateValue(double), so preserve that observable quirk.
      vec4.set(out, 1, 1, 1, 1);
      for (const curve of this.functions) {
        curve.GetValueAt(time, this.#childValue);
        vec4.add(out, out, this.#childValue);
      }
      return out;
    }

    /**
     * Gets the longest duration exposed by a child function.
     */
    Length() {
      let maxDuration = 0;
      for (const curve of this.functions) {
        const duration = curve.Length?.();
        if (typeof duration === "number") {
          maxDuration = Math.max(maxDuration, duration);
        }
      }
      return maxDuration;
    }
  }];
  TRIOPERATOR = TriOperator;
  constructor() {
    super(_TriColorSequencer), _initClass();
  }
}();

export { _TriColorSequencer as TriColorSequencer };
//# sourceMappingURL=TriColorSequencer.js.map
