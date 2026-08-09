import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsControllerExpressionProgram } from '../../controllers/CjsControllerExpressionProgram.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_expressionX, _init_extra_expressionX, _init_expressionY, _init_extra_expressionY, _init_expressionZ, _init_extra_expressionZ, _init_currentValue, _init_extra_currentValue, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_inputs, _init_extra_inputs;

/**
 * Vector curve whose x, y and z components are each produced by an independently
 * compiled expression evaluated at time divided by timeScale.
 */
let _Tr2CurveVector3Expre;
new class extends _identity {
  static [class Tr2CurveVector3Expression extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_expressionX, _init_extra_expressionX, _init_expressionY, _init_extra_expressionY, _init_expressionZ, _init_extra_expressionZ, _init_currentValue, _init_extra_currentValue, _init_input, _init_extra_input, _init_input2, _init_extra_input2, _init_input3, _init_extra_input3, _init_input4, _init_extra_input4, _init_inputs, _init_extra_inputs, _initProto],
        c: [_Tr2CurveVector3Expre, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CurveVector3Expression",
        family: "curves"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persistOnly, type, type.expression], 16, "expressionX"], [[io, io.persistOnly, type, type.expression], 16, "expressionY"], [[io, io.persistOnly, type, type.expression], 16, "expressionZ"], [[io, io.read, type, type.vec3], 16, "currentValue"], [[io, io.persist, type, type.float32], 16, "input1"], [[io, io.persist, type, type.float32], 16, "input2"], [[io, io.persist, type, type.float32], 16, "input3"], [[io, io.persist, type, type.float32], 16, "input4"], [[io, io.persist, void 0, type.list("ITriScalarFunction")], 16, "inputs"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "InterpolatedPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpressionX"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpressionY"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpressionZ"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpressionX"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpressionY"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpressionZ"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInputValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRandomConstant"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetRandomConstant"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "EvaluateExpression"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));
    expressionX = (_init_extra_name(this), _init_expressionX(this, ""));
    expressionY = (_init_extra_expressionX(this), _init_expressionY(this, ""));
    expressionZ = (_init_extra_expressionY(this), _init_expressionZ(this, ""));
    currentValue = (_init_extra_expressionZ(this), _init_currentValue(this, vec3.create()));
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
     * Updates the cached vector value.
     */
    UpdateValue(time) {
      this.GetValue(time, this.currentValue);
    }

    /**
     * Updates and returns the vector value.
     */

    Update(time, out) {
      this.#sample(time, this.currentValue);
      vec3.copy(out, this.currentValue);
      if (out.length > 3) {
        out[3] = 0;
      }
      return out;
    }

    /**
     * Gets the vector value at a time.
     */

    GetValueAt(time, out) {
      return this.#sample(time, out);
    }

    /**
     * Gets the vector value.
     */
    GetValue(time, out) {
      this.Compile();
      const context = this.GetContext(time);
      out[0] = _Tr2CurveVector3Expre.#evaluate(this.#programs[0], context);
      out[1] = _Tr2CurveVector3Expre.#evaluate(this.#programs[1], context);
      out[2] = _Tr2CurveVector3Expre.#evaluate(this.#programs[2], context);
      return out;
    }

    /**
     * Derivatives are not represented by Carbon expression curves.
     */
    GetValueDotAt(_time, out) {
      return out;
    }

    /**
     * Derivatives are not represented by Carbon expression curves.
     */
    GetValueDoubleDotAt(_time, out) {
      return out;
    }

    /**
     * Expression curves do not have segment interpolation state.
     */
    InterpolatedPosition(_time, out) {
      return out;
    }

    /** Gets the authored x-component expression source. */
    GetExpressionX() {
      return this.expressionX;
    }

    /** Gets the authored y-component expression source. */
    GetExpressionY() {
      return this.expressionY;
    }

    /** Gets the authored z-component expression source. */
    GetExpressionZ() {
      return this.expressionZ;
    }

    /**
     * Sets the x-component expression and drops its cached program so the next
     * sample recompiles; returns false and changes nothing when the source is
     * unchanged.
     */
    SetExpressionX(expression, options = {}) {
      const changed = this.SetValues({
        expressionX: expression
      }, {
        ...options,
        skipUpdate: true,
        returnBoolean: true
      });
      if (!changed) return false;
      this.#programs[0] = null;
      if (options.skipUpdate !== true) {
        this.UpdateValues({
          ...options,
          source: options.source ?? this
        });
      }
      return true;
    }

    /**
     * Sets the y-component expression and drops its cached program so the next
     * sample recompiles; returns false and changes nothing when the source is
     * unchanged.
     */
    SetExpressionY(expression, options = {}) {
      const changed = this.SetValues({
        expressionY: expression
      }, {
        ...options,
        skipUpdate: true,
        returnBoolean: true
      });
      if (!changed) return false;
      this.#programs[1] = null;
      if (options.skipUpdate !== true) {
        this.UpdateValues({
          ...options,
          source: options.source ?? this
        });
      }
      return true;
    }

    /**
     * Sets the z-component expression and drops its cached program so the next
     * sample recompiles; returns false and changes nothing when the source is
     * unchanged.
     */
    SetExpressionZ(expression, options = {}) {
      const changed = this.SetValues({
        expressionZ: expression
      }, {
        ...options,
        skipUpdate: true,
        returnBoolean: true
      });
      if (!changed) return false;
      this.#programs[2] = null;
      if (options.skipUpdate !== true) {
        this.UpdateValues({
          ...options,
          source: options.source ?? this
        });
      }
      return true;
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

    /** Gets the curve expression terms offered to an editor for autocompletion. */
    GetExpressionTermInfo() {
      return CjsControllerExpressionProgram.getCurveTermInfo();
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
     * Compiles any component expression whose cached program is missing or stale
     * against the currently authored source.
     */
    Compile() {
      const expressions = [this.expressionX, this.expressionY, this.expressionZ];
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
     * Compiles as needed and writes the three evaluated components into the
     * caller-owned `out`, zeroing a fourth component when `out` is longer than 3.
     */
    #sample(time, out) {
      this.Compile();
      const context = this.GetContext(time);
      out[0] = _Tr2CurveVector3Expre.#evaluate(this.#programs[0], context);
      out[1] = _Tr2CurveVector3Expre.#evaluate(this.#programs[1], context);
      out[2] = _Tr2CurveVector3Expre.#evaluate(this.#programs[2], context);
      if (out.length > 3) {
        out[3] = 0;
      }
      return out;
    }

    /**
     * Evaluates one component program, substituting 0 for a missing or invalid
     * program and for any non-finite result.
     */
  }];
  #evaluate(program, context) {
    return program?.IsValid() ? Number(program.Evaluate(context)) || 0 : 0;
  }
  constructor() {
    super(_Tr2CurveVector3Expre), _initClass();
  }
}();

export { _Tr2CurveVector3Expre as Tr2CurveVector3Expression };
//# sourceMappingURL=Tr2CurveVector3Expression.js.map
