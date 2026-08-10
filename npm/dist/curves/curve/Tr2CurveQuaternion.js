import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveExtrapolation, Tr2CurveInterpolation } from '../enums.js';
import { Tr2CurveQuaternionKey as _Tr2CurveQuaternionKe } from '../key/Tr2CurveQuaternionKey.js';

let _initProto, _initClass, _init_keys, _init_extra_keys, _init_name, _init_extra_name, _init_currentValue, _init_extra_currentValue, _init_extrapolationBefore, _init_extra_extrapolationBefore, _init_extrapolationAfter, _init_extra_extrapolationAfter;

/**
 * Keyed quaternion curve evaluated in seconds, with per-key interpolation and
 * independent extrapolation modes before the first and after the last key.
 */
let _Tr2CurveQuaternion;
new class extends _identity {
  static [class Tr2CurveQuaternion extends CjsModel {
    static {
      ({
        e: [_init_keys, _init_extra_keys, _init_name, _init_extra_name, _init_currentValue, _init_extra_currentValue, _init_extrapolationBefore, _init_extra_extrapolationBefore, _init_extrapolationAfter, _init_extra_extrapolationAfter, _initProto],
        c: [_Tr2CurveQuaternion, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CurveQuaternion",
        family: "curves"
      })], [[[io, io.persist, void 0, type.array({
        kind: "struct",
        className: "Tr2CurveQuaternionKey"
      })], 16, "keys"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.quat], 16, "currentValue"], [[io, io.persist, type, type.uint32, void 0, schema.enum("Tr2CurveExtrapolation")], 16, "extrapolationBefore"], [[io, io.persist, type, type.uint32, void 0, schema.enum("Tr2CurveExtrapolation")], 16, "extrapolationAfter"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurrentValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnKeysChanged"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetExtrapolation"]], 0, void 0, CjsModel));
    }
    keys = (_initProto(this), _init_keys(this, []));
    name = (_init_extra_keys(this), _init_name(this, ""));
    currentValue = (_init_extra_name(this), _init_currentValue(this, quat.create()));
    extrapolationBefore = (_init_extra_currentValue(this), _init_extrapolationBefore(this, Tr2CurveExtrapolation.CLAMP));
    extrapolationAfter = (_init_extra_extrapolationBefore(this), _init_extrapolationAfter(this, Tr2CurveExtrapolation.CLAMP));
    #lastSegment = (_init_extra_extrapolationAfter(this), 0);

    /**
     * Updates the cached quaternion value for the supplied time.
     */
    UpdateValue(time) {
      this.GetValueAt(time, this.currentValue);
    }

    /**
     * Updates the cached value and copies it into `out`.
     */
    Update(time, out) {
      this.UpdateValue(time);
      return quat.copy(out, this.currentValue);
    }

    /**
     * Gets the quaternion value at `time` into `out`.
     */
    GetValueAt(time, out) {
      return this.Evaluate(out, time);
    }

    /**
     * Derivative stub retained for Carbon interface compatibility.
     */
    GetValueDotAt(_time, out) {
      return quat.identity(out);
    }

    /**
     * Second-derivative stub retained for Carbon interface compatibility.
     */
    GetValueDoubleDotAt(_time, out) {
      return quat.identity(out);
    }

    /**
     * Gets the last authored key time, or zero for an empty curve.
     */
    Length() {
      return this.keys.length ? this.keys[this.keys.length - 1].time : 0;
    }

    /**
     * Gets the authored curve name.
     */
    GetName() {
      return this.name;
    }

    /**
     * Sets the authored curve name.
     */
    SetName(name) {
      return this.SetValues({
        name
      }, {
        source: this,
        returnBoolean: true
      });
    }

    /**
     * Gets the quaternion value at `time` into `out`.
     */
    GetValue(time, out) {
      return this.Evaluate(out, time);
    }

    /**
     * Gets the last cached value.
     */
    GetCurrentValue() {
      return this.currentValue;
    }

    /**
     * Sorts keys by authored time after key edits.
     */
    OnKeysChanged() {
      this.keys = this.keys.map((key, index) => ({
        key,
        index
      })).sort((a, b) => a.key.time - b.key.time || a.index - b.index).map(entry => entry.key);
      this.#lastSegment = 0;
    }

    /**
     * Adds a quaternion key and refreshes key ordering.
     */
    AddKey(time, value, interpolation = Tr2CurveInterpolation.LINEAR) {
      const key = new _Tr2CurveQuaternionKe();
      key.time = time;
      quat.copy(key.value, value);
      key.interpolation = interpolation;
      key.id = 0;
      this.keys.push(key);
      this.OnKeysChanged();
    }

    /**
     * Sets both before and after extrapolation modes.
     */
    SetExtrapolation(extrapolation) {
      return this.SetValues({
        extrapolationAfter: extrapolation,
        extrapolationBefore: extrapolation
      }, {
        source: this,
        returnBoolean: true
      });
    }

    /**
     * Converts caller time into the authored key range according to extrapolation.
     */
    GetLocalTime(time) {
      if (!this.keys.length) {
        return 0;
      }
      const first = this.keys[0].time;
      const last = this.keys[this.keys.length - 1].time;
      const length = last - first;
      if (length === 0) {
        return first;
      }
      if (time < first) {
        const quotient = -(time - first) / length;
        const intPart = Math.trunc(quotient);
        let fracPart = quotient - intPart;
        if (this.extrapolationBefore === Tr2CurveExtrapolation.CYCLE) {
          fracPart = 1 - fracPart;
        } else if (intPart % 2 !== 0) {
          fracPart = 1 - fracPart;
        }
        return fracPart * length + first;
      }
      if (time < last) {
        return time;
      }
      const quotient = (time - first) / length;
      const intPart = Math.trunc(quotient);
      let fracPart = quotient - intPart;
      if (this.extrapolationAfter === Tr2CurveExtrapolation.MIRROR && intPart % 2 !== 0) {
        fracPart = 1 - fracPart;
      }
      return fracPart * length + first;
    }

    /**
     * Finds the key segment containing local time, updating the segment cache.
     */
    FindSegment(time) {
      const count = this.keys.length;
      if (this.#lastSegment + 1 < count) {
        let k0 = this.keys[this.#lastSegment];
        let k1 = this.keys[this.#lastSegment + 1];
        if (time >= k0.time && time < k1.time) {
          return this.#lastSegment;
        }
        if (this.#lastSegment + 2 < count) {
          k0 = this.keys[this.#lastSegment + 1];
          k1 = this.keys[this.#lastSegment + 2];
          if (time >= k0.time && time < k1.time) {
            this.#lastSegment++;
            return this.#lastSegment;
          }
        }
        if (this.#lastSegment > 1) {
          k0 = this.keys[this.#lastSegment - 1];
          k1 = this.keys[this.#lastSegment];
          if (time >= k0.time && time < k1.time) {
            this.#lastSegment--;
            return this.#lastSegment;
          }
        }
      }
      for (let i = 0; i + 1 < count; i++) {
        const k0 = this.keys[i];
        const k1 = this.keys[i + 1];
        if (time >= k0.time && time < k1.time) {
          this.#lastSegment = i;
          return this.#lastSegment;
        }
      }
      this.#lastSegment = count - 2;
      return this.#lastSegment;
    }

    /**
     * Evaluates the quaternion curve with Carbon extrapolation and interpolation rules.
     */
    Evaluate(out, time) {
      const count = this.keys.length;
      if (!count) {
        return quat.identity(out);
      }
      const firstKey = this.keys[0];
      const lastKey = this.keys[count - 1];
      if (count === 1) {
        return quat.copy(out, firstKey.value);
      }
      if (this.extrapolationBefore === Tr2CurveExtrapolation.CLAMP && time <= firstKey.time) {
        return quat.copy(out, firstKey.value);
      }
      if (this.extrapolationAfter === Tr2CurveExtrapolation.CLAMP && time >= lastKey.time) {
        return quat.copy(out, lastKey.value);
      }
      const localTime = this.GetLocalTime(time);
      const segment = this.FindSegment(localTime);
      return this.GetSegmentValue(out, localTime, this.keys[segment], this.keys[segment + 1]);
    }

    /**
     * Evaluates the value inside a key segment using the segment interpolation mode.
     */
    GetSegmentValue(out, time, k0, k1) {
      if (k0.interpolation === Tr2CurveInterpolation.CONSTANT) {
        return quat.copy(out, time === k1.time ? k1.value : k0.value);
      }
      const length = k1.time - k0.time;
      if (length === 0) {
        return quat.copy(out, k1.value);
      }
      return quat.slerp(out, k0.value, k1.value, (time - k0.time) / length);
    }
  }];
  Tr2CurveExtrapolation = Tr2CurveExtrapolation;
  constructor() {
    super(_Tr2CurveQuaternion), _initClass();
  }
}();

export { _Tr2CurveQuaternion as Tr2CurveQuaternion };
//# sourceMappingURL=Tr2CurveQuaternion.js.map
