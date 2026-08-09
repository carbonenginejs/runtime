import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsControllerExpressionProgram } from '../../controllers/expression/CjsControllerExpressionProgram.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_expression, _init_extra_expression, _init_currentValue, _init_extra_currentValue, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_inputs, _init_extra_inputs;

/**
 * Scalar curve whose value is produced by a compiled expression evaluated at
 * time divided by timeScale, with input1..input4 and a stable per-instance
 * random constant available as terms.
 */
let _Tr2CurveScalarExpres;
class Tr2CurveScalarExpression extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_expression, _init_extra_expression, _init_currentValue, _init_extra_currentValue, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_inputs, _init_extra_inputs, _initProto],
      c: [_Tr2CurveScalarExpres, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveScalarExpression",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persistOnly, type, type.expression], 16, "expression"], [[io, io.read, type, type.float32], 16, "currentValue"], [[io, io.persist, type, type.float32], 16, "input1"], [[io, io.persist, type, type.float32], 16, "input2"], [[io, io.persist, type, type.float32], 16, "input3"], [[io, io.persist, type, type.float32], 16, "input4"], [[io, io.persist, void 0, type.list("ITriScalarFunction")], 16, "inputs"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "ScaleTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpression"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpression"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRandomConstant"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInputValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetRandomConstant"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "EvaluateExpression"]], 0, void 0, CjsModel));
  }
  name = (_initProto(this), _init_name(this, ""));
  expression = (_init_extra_name(this), _init_expression(this, ""));
  currentValue = (_init_extra_expression(this), _init_currentValue(this, 0));
  #program = (_init_extra_currentValue(this), null);
  input1 = _init_input(this, 0);
  input2 = (_init_extra_input(this), _init_input2(this, 0));
  input3 = (_init_extra_input2(this), _init_input3(this, 0));
  input4 = (_init_extra_input3(this), _init_input4(this, 0));
  inputs = (_init_extra_input4(this), _init_inputs(this, []));
  timeScale = (_init_extra_inputs(this), 1);
  randomConstant = Math.random();
  #currentTime = 0;

  /**
   * Compiles the authored expression after load.
   */
  Initialize() {
    this.#program = CjsControllerExpressionProgram.Compile(this.expression, {
      emptyValue: 0
    });
    return true;
  }

  /**
   * Updates the cached scalar value.
   */
  UpdateValue(time) {
    this.currentValue = this.GetValue(time);
  }

  /**
   * Updates and returns the scalar value.
   */
  Update(time) {
    this.currentValue = this.GetValue(time);
    return this.currentValue;
  }

  /**
   * Gets the scalar value at a time.
   */
  GetValueAt(time) {
    return this.GetValue(time);
  }

  /**
   * Scales expression time.
   */
  ScaleTime(scale) {
    this.timeScale = scale;
  }

  /**
   * Evaluates the expression.
   */
  GetValue(time) {
    if (!this.expression) {
      return 0;
    }
    const program = this.Compile();
    if (!program.IsValid()) {
      return 0;
    }
    const scaledTime = time / this.timeScale;
    this.#currentTime = scaledTime;
    return Number(program.Evaluate({
      curve: this,
      self: this,
      time: scaledTime,
      variables: {
        time: scaledTime,
        input1: this.input1,
        input2: this.input2,
        input3: this.input3,
        input4: this.input4
      }
    })) || 0;
  }

  /**
   * Gets the authored expression.
   */
  GetExpression() {
    return this.expression;
  }

  /**
   * Sets and compiles the authored expression.
   */
  SetExpression(expression, options = {}) {
    const changed = this.SetValues({
      expression
    }, {
      ...options,
      skipUpdate: true,
      returnBoolean: true
    });
    if (!changed) {
      return false;
    }
    this.#program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    if (options.skipUpdate !== true) {
      this.UpdateValues({
        ...options,
        source: options.source ?? this
      });
    }
    return true;
  }

  /**
   * Gets this curve's random constant.
   */
  GetRandomConstant() {
    return this.randomConstant;
  }

  /**
   * Gets an input curve value at the current or supplied time.
   */
  GetInputValue(index, time = this.#currentTime) {
    const input = this.inputs[index | 0];
    return input ? input.GetValueAt(time) : 0;
  }

  /**
   * Regenerates the random constant.
   */
  ResetRandomConstant() {
    this.randomConstant = Math.random();
  }

  /**
   * Gets expression terms exposed by this curve.
   */
  GetExpressionTermInfo() {
    return CjsControllerExpressionProgram.getCurveTermInfo();
  }

  /**
   * Evaluates an arbitrary expression with this curve's context.
   */
  EvaluateExpression(expression) {
    const program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    if (!program.IsValid()) {
      return 0;
    }
    return Number(program.Evaluate({
      curve: this,
      self: this
    })) || 0;
  }

  /**
   * Returns the cached program, recompiling first when it is missing or was
   * built from different source text.
   */
  Compile() {
    if (!this.#program || this.#program.source !== this.expression) {
      this.SetExpression(this.expression);
    }
    return this.#program;
  }
  static {
    _initClass();
  }
}

export { _Tr2CurveScalarExpres as Tr2CurveScalarExpression };
//# sourceMappingURL=Tr2CurveScalarExpression.js.map
