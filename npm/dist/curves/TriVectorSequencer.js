import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { TriOperator } from '@carbonenginejs/runtime-utils/graphics';

let _initProto, _initClass, _init_operator, _init_extra_operator, _init_value, _init_extra_value, _init_start, _init_extra_start, _init_functions, _init_extra_functions, _init_name, _init_extra_name;

/**
 * Vector function combining its child vector functions with Carbon's multiply,
 * add or average operator; multiply starts from ones and the additive paths from
 * zero.
 */
let _TriVectorSequencer;
new class extends _identity {
  static [class TriVectorSequencer extends CjsModel {
    static {
      ({
        e: [_init_operator, _init_extra_operator, _init_value, _init_extra_value, _init_start, _init_extra_start, _init_functions, _init_extra_functions, _init_name, _init_extra_name, _initProto],
        c: [_TriVectorSequencer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriVectorSequencer",
        family: "curves"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("TRIOPERATOR")], 16, "operator"], [[io, io.persist, type, type.vec3], 16, "value"], [[io, io.persist, type, type.float64], 16, "start"], [[io, io.persist, void 0, type.list("ITriVectorFunction")], 16, "functions"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
    }
    operator = (_initProto(this), _init_operator(this, TriOperator.TRIOP_MULTIPLY));
    value = (_init_extra_operator(this), _init_value(this, vec3.create()));
    start = (_init_extra_value(this), _init_start(this, 0));
    functions = (_init_extra_start(this), _init_functions(this, []));
    name = (_init_extra_functions(this), _init_name(this, ""));
    #childValue = (_init_extra_name(this), vec3.create());

    /**
     * Updates the cached result of the child vector functions.
     */
    UpdateValue(time) {
      this.GetValueAt(time, this.value);
    }

    /**
     * Updates the cached result and copies it into `out`.
     */
    Update(time, out) {
      this.GetValueAt(time, this.value);
      return vec3.copy(out, this.value);
    }

    /**
     * Combines child vectors using Carbon's multiply, add, or average operation.
     */
    GetValueAt(time, out) {
      if (this.operator === TriOperator.TRIOP_MULTIPLY) {
        vec3.set(out, 1, 1, 1);
        for (const curve of this.functions) {
          curve.GetValueAt(time, this.#childValue);
          vec3.multiply(out, out, this.#childValue);
        }
        return out;
      }
      vec3.zero(out);
      for (const curve of this.functions) {
        curve.GetValueAt(time, this.#childValue);
        vec3.add(out, out, this.#childValue);
      }
      if (this.operator === TriOperator.TRIOP_AVERAGE && this.functions.length) {
        vec3.scale(out, out, 1 / this.functions.length);
      }
      return out;
    }

    /**
     * Sums child-function velocities as Carbon does for every operator.
     */
    GetValueDotAt(time, out) {
      vec3.zero(out);
      for (const curve of this.functions) {
        curve.GetValueDotAt(time, this.#childValue);
        vec3.add(out, out, this.#childValue);
      }
      return out;
    }

    /**
     * Sums child-function accelerations as Carbon does for every operator.
     */
    GetValueDoubleDotAt(time, out) {
      vec3.zero(out);
      for (const curve of this.functions) {
        curve.GetValueDoubleDotAt(time, this.#childValue);
        vec3.add(out, out, this.#childValue);
      }
      return out;
    }

    /**
     * Carbon leaves interpolated-position output unchanged for this sequencer.
     */
    InterpolatedPosition(_time, out) {
      return out;
    }
  }];
  TRIOPERATOR = TriOperator;
  constructor() {
    super(_TriVectorSequencer), _initClass();
  }
}();

export { _TriVectorSequencer as TriVectorSequencer };
//# sourceMappingURL=TriVectorSequencer.js.map
