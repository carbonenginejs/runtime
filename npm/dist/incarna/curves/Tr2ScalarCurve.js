import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { IncarnaScalarCurveInterpolation } from './enums.js';
import { Tr2ScalarKey as _Tr2ScalarKey } from './Tr2ScalarKey.js';

let _initClass, _init_name, _init_extra_name, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_timeOffset, _init_extra_timeOffset, _init_timeScale, _init_extra_timeScale, _init_startValue, _init_extra_startValue, _init_currentValue, _init_extra_currentValue, _init_endValue, _init_extra_endValue, _init_startTangent, _init_extra_startTangent, _init_endTangent, _init_extra_endTangent, _init_interpolation, _init_extra_interpolation, _init_keys, _init_extra_keys, _init_length, _init_extra_length;

/**
 * Historical Curve2 scalar layout used by Incarna Black assets.
 *
 * This is distinct from runtime-trinity's current Carbon `Tr2CurveScalar`,
 * which owns the modern key, tangent, and extrapolation representation.
 */
let _Tr2ScalarCurve;
new class extends _identity {
  static [class Tr2ScalarCurve extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_timeOffset, _init_extra_timeOffset, _init_timeScale, _init_extra_timeScale, _init_startValue, _init_extra_startValue, _init_currentValue, _init_extra_currentValue, _init_endValue, _init_extra_endValue, _init_startTangent, _init_extra_startTangent, _init_endTangent, _init_extra_endTangent, _init_interpolation, _init_extra_interpolation, _init_keys, _init_extra_keys, _init_length, _init_extra_length],
        c: [_Tr2ScalarCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ScalarCurve",
        family: "incarna"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "cycle"], [[io, io.persist, type, type.boolean], 16, "reversed"], [[io, io.persist, type, type.float32], 16, "timeOffset"], [[io, io.persist, type, type.float32], 16, "timeScale"], [[io, io.persist, type, type.float32], 16, "startValue"], [[io, io.readwrite, type, type.float32], 16, "currentValue"], [[io, io.persist, type, type.float32], 16, "endValue"], [[io, io.persist, type, type.float32], 16, "startTangent"], [[io, io.persist, type, type.float32], 16, "endTangent"], [[io, io.persist, type, type.uint32, void 0, type.enum("Interpolation")], 16, "interpolation"], [[io, io.persist, void 0, type.list("Tr2ScalarKey")], 16, "keys"], [[io, io.persist, type, type.float32], 16, "length"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_length(this);
    }
    name = _init_name(this, "");
    cycle = (_init_extra_name(this), _init_cycle(this, false));
    reversed = (_init_extra_cycle(this), _init_reversed(this, false));
    timeOffset = (_init_extra_reversed(this), _init_timeOffset(this, 0));
    timeScale = (_init_extra_timeOffset(this), _init_timeScale(this, 1));
    startValue = (_init_extra_timeScale(this), _init_startValue(this, 0));
    currentValue = (_init_extra_startValue(this), _init_currentValue(this, 0));
    endValue = (_init_extra_currentValue(this), _init_endValue(this, 0));
    startTangent = (_init_extra_endValue(this), _init_startTangent(this, 0));
    endTangent = (_init_extra_startTangent(this), _init_endTangent(this, 0));
    interpolation = (_init_extra_endTangent(this), _init_interpolation(this, IncarnaScalarCurveInterpolation.LINEAR));
    keys = (_init_extra_interpolation(this), _init_keys(this, []));
    length = (_init_extra_keys(this), _init_length(this, 0));

    /** Sorts keys and reconciles a last key beyond the authored end. */
    Sort() {
      if (!this.keys.length) return;
      this.keys.sort((a, b) => a.time - b.time);
      const last = this.keys[this.keys.length - 1];
      if (last.time <= this.length) return;
      const previousLength = this.length;
      const endValue = this.endValue;
      const endTangent = this.endTangent;
      this.length = last.time;
      this.endValue = last.value;
      this.endTangent = last.leftTangent;
      if (previousLength > 0) {
        last.time = previousLength;
        last.value = endValue;
        last.leftTangent = endTangent;
      }
    }

    /** Initializes derived key ordering. */
    Initialize() {
      this.Sort();
    }

    /** Gets the authored duration. */
    GetLength() {
      return this.length;
    }

    /** Updates the public binding value. */
    UpdateValue(time) {
      this.currentValue = this.GetValueAt(time);
    }

    /** Evaluates the historical curve. */
    GetValueAt(time) {
      time = time / this.timeScale + this.timeOffset;
      if (this.length <= 0 || time <= 0) return this.startValue;
      if (time > this.length) {
        if (this.cycle) {
          time %= this.length;
        } else if (this.reversed) {
          return this.startValue;
        } else {
          return this.endValue;
        }
      }
      if (this.reversed) time = this.length - time;
      if (!this.keys.length) return this.Interpolate(time, null, null);
      let startKey = this.keys[0];
      let endKey = this.keys[this.keys.length - 1];
      if (time <= startKey.time) return this.Interpolate(time, null, startKey);
      if (time >= endKey.time) return this.Interpolate(time, endKey, null);
      for (let i = 0; i + 1 < this.keys.length; i++) {
        startKey = this.keys[i];
        endKey = this.keys[i + 1];
        if (startKey.time <= time && endKey.time > time) break;
      }
      return this.Interpolate(time, startKey, endKey);
    }

    /** Evaluates one historical Curve2 segment. */
    Interpolate(time, lastKey, nextKey) {
      let startValue = this.startValue;
      let endValue = this.endValue;
      let startTangent = this.startTangent;
      let endTangent = this.endTangent;
      let interpolation = this.interpolation;
      let deltaTime = this.length;
      if (lastKey) {
        interpolation = lastKey.interpolation;
        time -= lastKey.time;
      }
      if (lastKey && nextKey) {
        startValue = lastKey.value;
        startTangent = lastKey.rightTangent;
        endValue = nextKey.value;
        endTangent = nextKey.leftTangent;
        deltaTime = nextKey.time - lastKey.time;
      } else if (nextKey) {
        endValue = nextKey.value;
        endTangent = nextKey.leftTangent;
        deltaTime = nextKey.time;
      } else if (lastKey) {
        startValue = lastKey.value;
        startTangent = lastKey.rightTangent;
        deltaTime = this.length - lastKey.time;
      }
      if (deltaTime === 0) return startValue;
      const t = time / deltaTime;
      if (interpolation === IncarnaScalarCurveInterpolation.LINEAR) {
        return startValue + (endValue - startValue) * t;
      }
      if (interpolation === IncarnaScalarCurveInterpolation.HERMITE) {
        const t2 = t * t;
        const t3 = t2 * t;
        const endWeight = -2 * t3 + 3 * t2;
        const startWeight = 1 - endWeight;
        const endTangentWeight = t3 - t2;
        const startTangentWeight = t + endTangentWeight - t2;
        return startValue * startWeight + endValue * endWeight + startTangent * startTangentWeight + endTangent * endTangentWeight;
      }
      return startValue;
    }
  }];
  inputDimension = 1;
  outputDimension = 1;
  valueProperty = "currentValue";
  curveType = 2;
  Key = _Tr2ScalarKey;
  Interpolation = IncarnaScalarCurveInterpolation;
  constructor() {
    super(_Tr2ScalarCurve), _initClass();
  }
}();

export { _Tr2ScalarCurve as Tr2ScalarCurve };
//# sourceMappingURL=Tr2ScalarCurve.js.map
