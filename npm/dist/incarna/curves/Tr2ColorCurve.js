import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { IncarnaColorCurveInterpolation } from './enums.js';
import { Tr2ColorKey as _Tr2ColorKey } from './Tr2ColorKey.js';

let _initClass, _init_name, _init_extra_name, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_timeOffset, _init_extra_timeOffset, _init_timeScale, _init_extra_timeScale, _init_startValue, _init_extra_startValue, _init_currentValue, _init_extra_currentValue, _init_endValue, _init_extra_endValue, _init_startTangent, _init_extra_startTangent, _init_endTangent, _init_extra_endTangent, _init_interpolation, _init_extra_interpolation, _init_keys, _init_extra_keys, _init_length, _init_extra_length;

/**
 * Historical Curve2 color layout used by Incarna Black assets.
 *
 * This is distinct from runtime-trinity's current Carbon `Tr2CurveColor`,
 * whose persisted representation is four component scalar curves.
 */
let _Tr2ColorCurve;
new class extends _identity {
  static [class Tr2ColorCurve extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_timeOffset, _init_extra_timeOffset, _init_timeScale, _init_extra_timeScale, _init_startValue, _init_extra_startValue, _init_currentValue, _init_extra_currentValue, _init_endValue, _init_extra_endValue, _init_startTangent, _init_extra_startTangent, _init_endTangent, _init_extra_endTangent, _init_interpolation, _init_extra_interpolation, _init_keys, _init_extra_keys, _init_length, _init_extra_length],
        c: [_Tr2ColorCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ColorCurve",
        family: "incarna"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "cycle"], [[io, io.persist, type, type.boolean], 16, "reversed"], [[io, io.persist, type, type.float32], 16, "timeOffset"], [[io, io.persist, type, type.float32], 16, "timeScale"], [[io, io.persist, type, type.color], 16, "startValue"], [[io, io.readwrite, type, type.color], 16, "currentValue"], [[io, io.persist, type, type.color], 16, "endValue"], [[io, io.persist, type, type.vec4], 16, "startTangent"], [[io, io.persist, type, type.vec4], 16, "endTangent"], [[io, io.persist, type, type.uint32, void 0, type.enum("Interpolation")], 16, "interpolation"], [[io, io.persist, void 0, type.list("Tr2ColorKey")], 16, "keys"], [[io, io.persist, type, type.float32], 16, "length"]], 0, void 0, CjsModel));
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
    startValue = (_init_extra_timeScale(this), _init_startValue(this, vec4.fromValues(0, 0, 0, 1)));
    currentValue = (_init_extra_startValue(this), _init_currentValue(this, vec4.fromValues(0, 0, 0, 1)));
    endValue = (_init_extra_currentValue(this), _init_endValue(this, vec4.fromValues(0, 0, 0, 1)));
    startTangent = (_init_extra_endValue(this), _init_startTangent(this, vec4.create()));
    endTangent = (_init_extra_startTangent(this), _init_endTangent(this, vec4.create()));
    interpolation = (_init_extra_endTangent(this), _init_interpolation(this, IncarnaColorCurveInterpolation.LINEAR));
    keys = (_init_extra_interpolation(this), _init_keys(this, []));
    length = (_init_extra_keys(this), _init_length(this, 0));

    /** Sorts keys and reconciles a last key beyond the authored end. */
    Sort() {
      sortCurve2(this);
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
      this.GetValueAt(time, this.currentValue);
    }

    /** Evaluates the historical curve into `out`. */
    GetValueAt(time, out) {
      time = time / this.timeScale + this.timeOffset;
      if (this.length <= 0 || time <= 0) {
        return vec4.copy(out, this.startValue);
      }
      if (time > this.length) {
        if (this.cycle) {
          time %= this.length;
        } else if (this.reversed) {
          return vec4.copy(out, this.startValue);
        } else {
          return vec4.copy(out, this.endValue);
        }
      }
      if (this.reversed) time = this.length - time;
      if (!this.keys.length) return this.Interpolate(time, null, null, out);
      let startKey = this.keys[0];
      let endKey = this.keys[this.keys.length - 1];
      if (time <= startKey.time) {
        return this.Interpolate(time, null, startKey, out);
      }
      if (time >= endKey.time) {
        return this.Interpolate(time, endKey, null, out);
      }
      for (let i = 0; i + 1 < this.keys.length; i++) {
        startKey = this.keys[i];
        endKey = this.keys[i + 1];
        if (startKey.time <= time && endKey.time > time) break;
      }
      return this.Interpolate(time, startKey, endKey, out);
    }

    /** Evaluates one historical Curve2 segment into `out`. */
    Interpolate(time, lastKey, nextKey, out) {
      let startValue = this.startValue;
      let endValue = this.endValue;
      let interpolation = this.interpolation;
      let deltaTime = this.length;
      if (lastKey) {
        interpolation = lastKey.interpolation;
        time -= lastKey.time;
      }
      if (lastKey && nextKey) {
        startValue = lastKey.value;
        endValue = nextKey.value;
        deltaTime = nextKey.time - lastKey.time;
      } else if (nextKey) {
        endValue = nextKey.value;
        deltaTime = nextKey.time;
      } else if (lastKey) {
        startValue = lastKey.value;
        deltaTime = this.length - lastKey.time;
      }
      if (interpolation !== IncarnaColorCurveInterpolation.LINEAR || deltaTime === 0) {
        return vec4.copy(out, startValue);
      }
      return vec4.lerp(out, startValue, endValue, time / deltaTime);
    }
  }];
  inputDimension = 4;
  outputDimension = 4;
  valueProperty = "currentValue";
  curveType = 2;
  Key = _Tr2ColorKey;
  Interpolation = IncarnaColorCurveInterpolation;
  constructor() {
    super(_Tr2ColorCurve), _initClass();
  }
}();
function sortCurve2(curve) {
  if (!curve.keys.length) return;
  curve.keys.sort((a, b) => a.time - b.time);
  const last = curve.keys[curve.keys.length - 1];
  if (last.time <= curve.length) return;
  const previousLength = curve.length;
  const endValue = curve.endValue;
  const endTangent = curve.endTangent;
  curve.length = last.time;
  curve.endValue = last.value;
  curve.endTangent = last.leftTangent;
  if (previousLength > 0) {
    last.time = previousLength;
    last.value = endValue;
    last.leftTangent = endTangent;
  }
}

export { _Tr2ColorCurve as Tr2ColorCurve };
//# sourceMappingURL=Tr2ColorCurve.js.map
