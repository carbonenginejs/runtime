import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { noise } from '@carbonenginejs/runtime-utils/noise';
import { CjsControllerExpressionProgram } from '../controllers/CjsControllerExpressionProgram.js';
import { Tr2CurveInterpolation } from './enums.js';

let _initProto, _initClass, _init_interpolation, _init_extra_interpolation, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_time, _init_extra_time, _init_value, _init_extra_value, _init_left, _init_extra_left, _init_leftTangentExpression, _init_extra_leftTangentExpression, _init_rightTangentExpression, _init_extra_rightTangentExpression, _init_timeExpression, _init_extra_timeExpression, _init_valueExpression, _init_extra_valueExpression, _init_randomMax, _init_extra_randomMax, _init_randomMin, _init_extra_randomMin, _init_randomConstant, _init_extra_randomConstant, _init_right, _init_extra_right, _init_prevKeyTime, _init_extra_prevKeyTime, _init_prevKeyValue, _init_extra_prevKeyValue;

/**
 * One key of a Tr2ScalarExprKeyCurve whose time, value and tangents can each be
 * produced by an expression over the key's inputs, its random constant and the
 * previous key.
 */
let _Tr2ScalarExprKey;
new class extends _identity {
  static [class Tr2ScalarExprKey extends CjsModel {
    static {
      ({
        e: [_init_interpolation, _init_extra_interpolation, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_time, _init_extra_time, _init_value, _init_extra_value, _init_left, _init_extra_left, _init_leftTangentExpression, _init_extra_leftTangentExpression, _init_rightTangentExpression, _init_extra_rightTangentExpression, _init_timeExpression, _init_extra_timeExpression, _init_valueExpression, _init_extra_valueExpression, _init_randomMax, _init_extra_randomMax, _init_randomMin, _init_extra_randomMin, _init_randomConstant, _init_extra_randomConstant, _init_right, _init_extra_right, _init_prevKeyTime, _init_extra_prevKeyTime, _init_prevKeyValue, _init_extra_prevKeyValue, _initProto],
        c: [_Tr2ScalarExprKey, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ScalarExprKey",
        family: "curves"
      })], [[[io, io.persist, type, type.uint32, void 0, schema.enum("Tr2CurveInterpolation")], 16, "interpolation"], [[io, io.notify, io, io.persist, type, type.float32], 16, "input1"], [[io, io.notify, io, io.persist, type, type.float32], 16, "input2"], [[io, io.notify, io, io.persist, type, type.float32], 16, "input3"], [[io, io.notify, io, io.persist, type, type.float32], 16, "input4"], [[io, io.notify, io, io.persist, type, type.float32], 16, "time"], [[io, io.notify, io, io.persist, type, type.float32], 16, "value"], [[io, io.notify, io, io.persist, type, type.float32], 16, "left"], [[io, io.notify, io, io.persist, type, type.expression], 16, "leftTangentExpression"], [[io, io.notify, io, io.persist, type, type.expression], 16, "rightTangentExpression"], [[io, io.notify, io, io.persist, type, type.expression], 16, "timeExpression"], [[io, io.notify, io, io.persist, type, type.expression], 16, "valueExpression"], [[io, io.notify, io, io.persist, type, type.float32], 16, "randomMax"], [[io, io.notify, io, io.persist, type, type.float32], 16, "randomMin"], [[io, io.read, type, type.float32], 16, "randomConstant"], [[io, io.notify, io, io.persist, type, type.float32], 16, "right"], [[io, io.read, type, type.float32], 16, "prevKeyTime"], [[io, io.read, type, type.float32], 16, "prevKeyValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegenRandomConstant"], [[void 0, carbon.renamed("UpdateValues"), impl, impl.adapted, void 0, impl.note("Renamed to avoid collision with the CjsModel value-update lifecycle")], 18, "ReEvaluate"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_prevKeyValue(this);
    }
    interpolation = (_initProto(this), _init_interpolation(this, Tr2CurveInterpolation.LINEAR));
    input1 = (_init_extra_interpolation(this), _init_input(this, 0));
    input2 = (_init_extra_input(this), _init_input2(this, 0));
    input3 = (_init_extra_input2(this), _init_input3(this, 0));
    input4 = (_init_extra_input3(this), _init_input4(this, 0));
    time = (_init_extra_input4(this), _init_time(this, 0));
    value = (_init_extra_time(this), _init_value(this, 0));
    left = (_init_extra_value(this), _init_left(this, 0));
    leftTangentExpression = (_init_extra_left(this), _init_leftTangentExpression(this, ""));
    rightTangentExpression = (_init_extra_leftTangentExpression(this), _init_rightTangentExpression(this, ""));
    timeExpression = (_init_extra_rightTangentExpression(this), _init_timeExpression(this, ""));
    valueExpression = (_init_extra_timeExpression(this), _init_valueExpression(this, ""));
    randomMax = (_init_extra_valueExpression(this), _init_randomMax(this, 0));
    randomMin = (_init_extra_randomMax(this), _init_randomMin(this, 0));
    randomConstant = (_init_extra_randomMin(this), _init_randomConstant(this, 0));
    right = (_init_extra_randomConstant(this), _init_right(this, 0));
    prevKeyTime = (_init_extra_right(this), _init_prevKeyTime(this, 0));
    prevKeyValue = (_init_extra_prevKeyTime(this), _init_prevKeyValue(this, 0));

    /**
     * Initializes expression-derived key values.
     */
    Initialize() {
      this.RegenRandomConstant();
      return true;
    }

    /**
     * Re-evaluates expression-derived key values after modification.
     */
    OnModified(_options = {}) {
      this.ReEvaluate(null);
      return true;
    }

    /**
     * Regenerates this key's random constant in the authored range.
     */
    RegenRandomConstant() {
      this.randomConstant = this.randomMin + Math.random() * (this.randomMax - this.randomMin);
    }

    /**
     * Evaluates key expressions using previous-key context.
     */
    ReEvaluate(previousKey) {
      this.prevKeyTime = Number(previousKey?.time ?? 0);
      this.prevKeyValue = Number(previousKey?.value ?? 0);
      const variables = this.#expressionVariables();
      this.time = this.Evaluate(this.timeExpression, Number(this.time), variables);
      this.value = this.Evaluate(this.valueExpression, Number(this.value), variables);
      this.left = this.Evaluate(this.leftTangentExpression, this.left, variables);
      this.right = this.Evaluate(this.rightTangentExpression, this.right, variables);
    }

    /**
     * Compiles and evaluates one key expression with the Perlin helper functions
     * available, returning the supplied fallback when the expression is empty,
     * fails to compile, or yields NaN.
     */
    Evaluate(expression, fallback, variables = this.#expressionVariables()) {
      if (!expression) {
        return fallback;
      }
      const program = CjsControllerExpressionProgram.Compile(expression, {
        emptyValue: fallback,
        functions: SCALAR_EXPR_KEY_FUNCTIONS,
        pureFunctions: SCALAR_EXPR_KEY_PURE_FUNCTIONS
      });
      if (!program.IsValid()) {
        return fallback;
      }
      const value = Number(program.Evaluate({
        self: this,
        key: this,
        variables
      }));
      return Number.isNaN(value) ? fallback : value;
    }

    /**
     * Builds the variable map key expressions read: the key's own value, time,
     * tangents, input1..input4, random constant, and the previous key's time and
     * value.
     */
    #expressionVariables() {
      return {
        value: Number(this.value),
        time: Number(this.time),
        input1: this.input1,
        input2: this.input2,
        input3: this.input3,
        input4: this.input4,
        randomConstant: this.randomConstant,
        leftTangent: this.left,
        rightTangent: this.right,
        prevKeyTime: this.prevKeyTime,
        prevKeyValue: this.prevKeyValue
      };
    }
  }];
  Tr2CurveInterpolation = Tr2CurveInterpolation;
  constructor() {
    super(_Tr2ScalarExprKey), _initClass();
  }
}();
const SCALAR_EXPR_KEY_FUNCTIONS = {
  perlin_simple: (_ctx, x = 0) => (noise.carbonPerlin1D(ToFiniteNumber(x), 1.1, 2, 3) + 1) * 0.5,
  perlin: (_ctx, x = 0, a = 1, b = 1, n = 1) => (noise.carbonPerlin1D(ToFiniteNumber(x), ToFiniteNumber(a), ToFiniteNumber(b), Math.trunc(ToFiniteNumber(n))) + 1) * 0.5
};
const SCALAR_EXPR_KEY_PURE_FUNCTIONS = ["perlin_simple", "perlin"];
function ToFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export { _Tr2ScalarExprKey as Tr2ScalarExprKey };
//# sourceMappingURL=Tr2ScalarExprKey.js.map
