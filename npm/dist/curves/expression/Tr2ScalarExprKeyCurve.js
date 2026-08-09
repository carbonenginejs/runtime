import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { num } from '@carbonenginejs/runtime-utils/num';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveInterpolation } from '../enums.js';
import { Tr2ScalarExprKey as _Tr2ScalarExprKey } from '../key/Tr2ScalarExprKey.js';

let _initProto, _initClass, _init_interpolation, _init_extra_interpolation, _init_currentValue, _init_extra_currentValue, _init_name, _init_extra_name, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_timeOffset, _init_extra_timeOffset, _init_timeScale, _init_extra_timeScale, _init_keys, _init_extra_keys;

/**
 * Keyed scalar curve whose key times, values and tangents are themselves
 * expressions re-evaluated on every sample, with optional cycling and reversed
 * playback over the key range.
 */
let _Tr2ScalarExprKeyCurv;
class Tr2ScalarExprKeyCurve extends CjsModel {
  static {
    ({
      e: [_init_interpolation, _init_extra_interpolation, _init_currentValue, _init_extra_currentValue, _init_name, _init_extra_name, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_timeOffset, _init_extra_timeOffset, _init_timeScale, _init_extra_timeScale, _init_keys, _init_extra_keys, _initProto],
      c: [_Tr2ScalarExprKeyCurv, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ScalarExprKeyCurve",
      family: "curves"
    })], [[[io, io.persist, type, type.uint32], 16, "interpolation"], [[io, io.read, type, type.float32], 16, "currentValue"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "cycle"], [[io, io.persist, type, type.boolean], 16, "reversed"], [[io, io.persist, type, type.float32], 16, "timeOffset"], [[io, io.persist, type, type.float32], 16, "timeScale"], [[io, io.persist, void 0, type.list("Tr2ScalarExprKey")], 16, "keys"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyInterpolation"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyInterpolation"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyLeftTangent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyLeftTangent"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyRightTangent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyRightTangent"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "RemoveKey"], [[carbon, carbon.method, impl, impl.adapted], 18, "Sort"]], 0, void 0, CjsModel));
  }
  interpolation = (_initProto(this), _init_interpolation(this, Tr2CurveInterpolation.LINEAR));
  currentValue = (_init_extra_interpolation(this), _init_currentValue(this, 0));
  name = (_init_extra_currentValue(this), _init_name(this, ""));
  cycle = (_init_extra_name(this), _init_cycle(this, false));
  reversed = (_init_extra_cycle(this), _init_reversed(this, false));
  timeOffset = (_init_extra_reversed(this), _init_timeOffset(this, 0));
  timeScale = (_init_extra_timeOffset(this), _init_timeScale(this, 1));
  keys = (_init_extra_timeScale(this), _init_keys(this, []));
  startTangent = (_init_extra_keys(this), 0);
  endTangent = 0;

  /**
   * Initializes and sorts keys.
   */
  Initialize() {
    this.#reEvaluateKeys();
    return true;
  }

  /**
   * Gets authored duration.
   */
  Length() {
    if (!this.keys.length) {
      return 0;
    }
    return Number(this.keys[this.keys.length - 1].time) - Number(this.keys[0].time);
  }

  /**
   * Updates cached value.
   */
  UpdateValue(time) {
    this.currentValue = this.GetValueAt(time);
  }

  /**
   * Updates and returns value.
   */
  Update(time) {
    this.currentValue = this.GetValueAt(time);
    return this.currentValue;
  }

  /**
   * Gets value at a time.
   */
  GetValueAt(time) {
    if (!this.keys.length) {
      return 0;
    }
    this.#reEvaluateKeys();
    const length = this.Length();
    time = time / this.timeScale - this.timeOffset;
    if (length <= 0 || time <= 0) {
      return Number(this.keys[0].value);
    }
    const first = this.keys[0];
    const last = this.keys[this.keys.length - 1];
    if (time > length + Number(first.time)) {
      if (this.cycle) {
        time = Number(first.value) + (time - Number(first.value)) % length;
      } else {
        return Number(this.reversed ? first.value : last.value);
      }
    }
    if (this.reversed) {
      time = Number(first.value) + (length - (time - Number(first.value)));
    }
    if (time <= Number(first.time)) {
      return this.#interpolate(time, null, first);
    }
    if (time >= Number(last.time)) {
      return this.#interpolate(time, last, null);
    }
    let endKey = first;
    for (let i = 1; i < this.keys.length; i++) {
      const startKey = endKey;
      endKey = this.keys[i];
      if (Number(endKey.time) > time) {
        return this.#interpolate(time, startKey, endKey);
      }
    }
    return Number(last.value);
  }

  /**
   * Gets a key time.
   */
  GetKeyTime(index) {
    return Number(this.keys[index]?.time ?? 0);
  }

  /**
   * Sets a key time.
   */
  SetKeyTime(index, time) {
    if (this.keys[index]) {
      this.keys[index].time = time;
    }
  }

  /**
   * Gets a key value.
   */
  GetKeyValue(index) {
    return Number(this.keys[index]?.value ?? 0);
  }

  /**
   * Sets a key value.
   */
  SetKeyValue(index, value) {
    if (this.keys[index]) {
      this.keys[index].value = value;
    }
  }

  /**
   * Gets the number of keys.
   */
  GetKeyCount() {
    return this.keys.length;
  }

  /**
   * Gets a key interpolation value.
   */
  GetKeyInterpolation(index) {
    return Number(this.keys[index]?.interpolation ?? 0);
  }

  /**
   * Sets a key interpolation value.
   */
  SetKeyInterpolation(index, interpolation) {
    if (this.keys[index]) {
      this.keys[index].interpolation = interpolation;
    }
  }

  /**
   * Gets a key left tangent.
   */
  GetKeyLeftTangent(index) {
    const key = this.keys[index];
    return key ? key.left : this.startTangent;
  }

  /**
   * Sets a key left tangent.
   */
  SetKeyLeftTangent(index, tangent) {
    if (this.keys[index]) {
      this.keys[index].left = tangent;
    }
  }

  /**
   * Gets a key right tangent.
   */
  GetKeyRightTangent(index) {
    const key = this.keys[index];
    return key ? key.right : this.endTangent;
  }

  /**
   * Sets a key right tangent.
   */
  SetKeyRightTangent(index, tangent) {
    if (this.keys[index]) {
      this.keys[index].right = tangent;
    }
  }

  /**
   * JS convenience tangent accessor.
   */
  GetKeyTangent(index, left = false) {
    return left ? this.GetKeyLeftTangent(index) : this.GetKeyRightTangent(index);
  }

  /**
   * JS convenience tangent setter.
   */
  SetKeyTangent(index, value, left = false) {
    if (left) {
      this.SetKeyLeftTangent(index, value);
    } else {
      this.SetKeyRightTangent(index, value);
    }
  }

  /**
   * Adds a key.
   */
  AddKey(time, value, leftTangent = 0, rightTangent = 0, interpolation = this.interpolation) {
    let index = 0;
    while (index < this.keys.length && Number(this.keys[index].time) <= time) {
      index++;
    }
    const key = new _Tr2ScalarExprKey();
    key.time = time;
    key.value = value;
    key.left = leftTangent;
    key.right = rightTangent;
    key.interpolation = interpolation;
    this.keys.splice(index, 0, key);
    return index;
  }

  /**
   * Removes a key.
   */
  RemoveKey(index) {
    this.keys.splice(index, 1);
  }

  /**
   * Sorts and re-evaluates keys.
   */
  Sort() {
    this.#reEvaluateKeys();
  }

  /**
   * Re-evaluates every key's expressions in order, passing each key its
   * predecessor so expressions can reference prevKeyTime and prevKeyValue.
   */
  #reEvaluateKeys() {
    let previousKey = null;
    for (const key of this.keys) {
      key.ReEvaluate(previousKey);
      previousKey = key;
    }
  }

  /**
   * Converts caller time into curve-local time by applying timeScale and
   * timeOffset, reversing it when `reversed` is set and wrapping it into the
   * key-range length when `cycle` is set.
   */
  GetLocalTime(time) {
    const length = this.Length();
    let localTime = time / this.timeScale - this.timeOffset;
    if (this.reversed) {
      localTime = length - localTime;
    }
    if (this.cycle && length > 0) {
      localTime %= length;
      if (localTime < 0) {
        localTime += length;
      }
    }
    return localTime;
  }

  /**
   * Interpolates between two adjacent keys using the left key's mode; a null key
   * on either side means the sample lies outside the key range and that end is
   * held flat at the present key's value.
   */
  #interpolate(time, lastKey, nextKey) {
    let deltaTime = this.Length();
    let startValue = Number(this.keys[0].value);
    let endValue = Number(this.keys[this.keys.length - 1].value);
    let interpolation = this.interpolation;
    if (lastKey) {
      interpolation = Number(lastKey.interpolation);
      time -= Number(lastKey.time);
    }
    switch (interpolation) {
      case Tr2CurveInterpolation.LINEAR:
        if (lastKey && nextKey) {
          startValue = Number(lastKey.value);
          endValue = Number(nextKey.value);
          deltaTime = Number(nextKey.time) - Number(lastKey.time);
        } else if (!lastKey && nextKey) {
          startValue = Number(nextKey.value);
          endValue = Number(nextKey.value);
          deltaTime = Number(nextKey.time);
        } else if (lastKey && !nextKey) {
          startValue = Number(lastKey.value);
          endValue = Number(lastKey.value);
          deltaTime = this.Length() - Number(lastKey.time);
        }
        return startValue + (endValue - startValue) * (time / deltaTime);
      case Tr2CurveInterpolation.HERMITE:
        {
          let inTangent = 0;
          let outTangent = 0;
          if (lastKey && nextKey) {
            startValue = Number(lastKey.value);
            inTangent = Number(lastKey.right);
            endValue = Number(nextKey.value);
            outTangent = Number(nextKey.left);
            deltaTime = Number(nextKey.time) - Number(lastKey.time);
          } else if (!lastKey && nextKey) {
            startValue = Number(nextKey.value);
            endValue = Number(nextKey.value);
            outTangent = Number(nextKey.left);
            deltaTime = Number(nextKey.time);
          } else if (lastKey && !nextKey) {
            startValue = Number(lastKey.value);
            endValue = Number(lastKey.value);
            inTangent = Number(lastKey.right);
            deltaTime = this.Length() - Number(lastKey.time);
          }
          return num.cubicHermite(startValue, inTangent, endValue, outTangent, time / deltaTime);
        }
      default:
        return Number(this.keys[0].value);
    }
  }
  static {
    _initClass();
  }
}

export { _Tr2ScalarExprKeyCurv as Tr2ScalarExprKeyCurve };
//# sourceMappingURL=Tr2ScalarExprKeyCurve.js.map
