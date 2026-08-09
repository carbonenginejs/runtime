import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat, fromYawPitchRoll } from '@carbonenginejs/runtime-utils/quat';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsControllerExpressionProgram } from '../../controllers/CjsControllerExpressionProgram.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_expressionYaw, _init_extra_expressionYaw, _init_expressionPitch, _init_extra_expressionPitch, _init_expressionRoll, _init_extra_expressionRoll, _init_currentValue, _init_extra_currentValue, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_inputs, _init_extra_inputs;

/**
 * Quaternion curve built from three independently compiled expressions producing
 * yaw, pitch and roll in radians at time divided by timeScale.
 */
let _Tr2CurveEulerRotatio;
new class extends _identity {
  static [class Tr2CurveEulerRotationExpression extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_expressionYaw, _init_extra_expressionYaw, _init_expressionPitch, _init_extra_expressionPitch, _init_expressionRoll, _init_extra_expressionRoll, _init_currentValue, _init_extra_currentValue, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_inputs, _init_extra_inputs, _initProto],
        c: [_Tr2CurveEulerRotatio, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CurveEulerRotationExpression",
        family: "curves"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persistOnly, type, type.expression], 16, "expressionYaw"], [[io, io.persistOnly, type, type.expression], 16, "expressionPitch"], [[io, io.persistOnly, type, type.expression], 16, "expressionRoll"], [[io, io.read, type, type.quat], 16, "currentValue"], [[io, io.persist, type, type.float32], 16, "input1"], [[io, io.persist, type, type.float32], 16, "input2"], [[io, io.persist, type, type.float32], 16, "input3"], [[io, io.persist, type, type.float32], 16, "input4"], [[io, io.persist, void 0, type.list("ITriScalarFunction")], 16, "inputs"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpressionYaw"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpressionPitch"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpressionRoll"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpressionYaw"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpressionPitch"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpressionRoll"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInputValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRandomConstant"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetRandomConstant"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "EvaluateExpression"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));
    expressionYaw = (_init_extra_name(this), _init_expressionYaw(this, ""));
    expressionPitch = (_init_extra_expressionYaw(this), _init_expressionPitch(this, ""));
    expressionRoll = (_init_extra_expressionPitch(this), _init_expressionRoll(this, ""));
    currentValue = (_init_extra_expressionRoll(this), _init_currentValue(this, quat.create()));
    input1 = (_init_extra_currentValue(this), _init_input(this, 0));
    input2 = (_init_extra_input(this), _init_input2(this, 0));
    input3 = (_init_extra_input2(this), _init_input3(this, 0));
    input4 = (_init_extra_input3(this), _init_input4(this, 0));
    inputs = (_init_extra_input4(this), _init_inputs(this, []));
    timeScale = (_init_extra_inputs(this), 1);
    randomConstant = Math.random();
    #programs = [null, null, null];
    #sources = ["", "", ""];
    #currentTime = 0;

    /**
     * Compiles component expressions.
     */
    Initialize() {
      this.Compile();
      return true;
    }

    /**
     * Updates the cached quaternion.
     */
    UpdateValue(time) {
      this.GetValue(time, this.currentValue);
    }

    /**
     * Updates and returns the quaternion.
     */
    Update(time, out) {
      this.GetValue(time, this.currentValue);
      return quat.copy(out, this.currentValue);
    }

    /**
     * Gets the quaternion value at a time.
     */
    GetValueAt(time, out) {
      return this.GetValue(time, out);
    }

    /**
     * Gets the quaternion value.
     */
    GetValue(time, out) {
      this.Compile();
      const context = this.GetContext(time);
      return fromYawPitchRoll(out, _Tr2CurveEulerRotatio.#evaluate(this.#programs[0], context), _Tr2CurveEulerRotatio.#evaluate(this.#programs[1], context), _Tr2CurveEulerRotatio.#evaluate(this.#programs[2], context));
    }

    /**
     * Derivative stub retained for interface compatibility.
     */
    GetValueDotAt(_time, out) {
      return out;
    }

    /**
     * Second-derivative stub retained for interface compatibility.
     */
    GetValueDoubleDotAt(_time, out) {
      return out;
    }

    /** The authored yaw expression source text, before compilation. */
    GetExpressionYaw() {
      return this.expressionYaw;
    }

    /** The authored pitch expression source text, before compilation. */
    GetExpressionPitch() {
      return this.expressionPitch;
    }

    /** The authored roll expression source text, before compilation. */
    GetExpressionRoll() {
      return this.expressionRoll;
    }

    /**
     * Sets the yaw expression and drops its cached program so the next sample
     * recompiles.
     */
    SetExpressionYaw(expression) {
      this.expressionYaw = expression;
      this.#programs[0] = null;
    }

    /**
     * Sets the pitch expression and drops its cached program so the next sample
     * recompiles.
     */
    SetExpressionPitch(expression) {
      this.expressionPitch = expression;
      this.#programs[1] = null;
    }

    /**
     * Sets the roll expression and drops its cached program so the next sample
     * recompiles.
     */
    SetExpressionRoll(expression) {
      this.expressionRoll = expression;
      this.#programs[2] = null;
    }

    /**
     * Backs the expression `input`/`inputAt` functions by sampling the n-th input
     * curve, defaulting to the time of the most recent GetContext call and
     * returning 0 when no such input exists.
     */
    GetInputValue(index, time = this.#currentTime) {
      const input = this.inputs[index | 0];
      return input ? input.GetValueAt(time) : 0;
    }

    /**
     * Gets this curve's per-instance random constant, which stays fixed until
     * ResetRandomConstant is called so `randomConstant` expressions are stable
     * over time.
     */
    GetRandomConstant() {
      return this.randomConstant;
    }

    /** Draws a new per-instance random constant in [0, 1). */
    ResetRandomConstant() {
      this.randomConstant = Math.random();
    }

    /**
     * Gets the curve expression terms offered to an editor, including `radians`
     * because this curve's outputs are angles.
     */
    GetExpressionTermInfo() {
      return CjsControllerExpressionProgram.getCurveTermInfo({
        includeRadians: true
      });
    }

    /**
     * Compiles and evaluates an arbitrary expression against this curve's context
     * at time 0, returning 0 when it does not compile.
     */
    EvaluateExpression(expression) {
      const program = CjsControllerExpressionProgram.Compile(expression, {
        emptyValue: 0
      });
      return program.IsValid() ? Number(program.Evaluate(this.GetContext(0))) || 0 : 0;
    }

    /**
     * Compiles any of the yaw, pitch or roll expressions whose cached program is
     * missing or stale against the currently authored source.
     */
    Compile() {
      const expressions = [this.expressionYaw, this.expressionPitch, this.expressionRoll];
      for (let i = 0; i < expressions.length; i++) {
        if (!this.#programs[i] || this.#sources[i] !== expressions[i]) {
          this.#programs[i] = CjsControllerExpressionProgram.Compile(expressions[i], {
            emptyValue: 0
          });
          this.#sources[i] = expressions[i];
        }
      }
    }

    /**
     * Builds the evaluation context for a sample, dividing the caller time by
     * timeScale, recording it as the current input time, and exposing it alongside
     * input1..input4 as expression variables.
     */
    GetContext(time) {
      const scaledTime = time / this.timeScale;
      this.#currentTime = scaledTime;
      return {
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
      };
    }

    /**
     * Evaluates one angle program, substituting 0 for a missing or invalid program
     * and for any non-finite result.
     */
  }];
  #evaluate(program, context) {
    return program?.IsValid() ? Number(program.Evaluate(context)) || 0 : 0;
  }
  constructor() {
    super(_Tr2CurveEulerRotatio), _initClass();
  }
}();

export { _Tr2CurveEulerRotatio as Tr2CurveEulerRotationExpression };
//# sourceMappingURL=Tr2CurveEulerRotationExpression.js.map
