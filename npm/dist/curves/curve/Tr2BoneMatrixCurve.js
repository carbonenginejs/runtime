import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { isArrayLike } from '@carbonenginejs/runtime-utils/is';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2MatrixKey as _Tr2MatrixKey } from '../key/Tr2MatrixKey.js';

let _initProto, _initClass, _init_currentValue, _init_extra_currentValue, _init_name, _init_extra_name, _init_length, _init_extra_length, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_startValue, _init_extra_startValue, _init_endValue, _init_extra_endValue, _init_skinnedObject, _init_extra_skinnedObject, _init_transform, _init_extra_transform, _init_keys, _init_extra_keys;
const SPHERICAL_LINEAR = 4;

/**
 * Matrix function that tracks a named bone on a skinned object, returning the
 * authored transform composed with that bone's current matrix and the object's
 * world transform rather than sampling its own keys.
 */
let _Tr2BoneMatrixCurve;
new class extends _identity {
  static [class Tr2BoneMatrixCurve extends CjsModel {
    static {
      ({
        e: [_init_currentValue, _init_extra_currentValue, _init_name, _init_extra_name, _init_length, _init_extra_length, _init_cycle, _init_extra_cycle, _init_reversed, _init_extra_reversed, _init_startValue, _init_extra_startValue, _init_endValue, _init_extra_endValue, _init_skinnedObject, _init_extra_skinnedObject, _init_transform, _init_extra_transform, _init_keys, _init_extra_keys, _initProto],
        c: [_Tr2BoneMatrixCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2BoneMatrixCurve",
        family: "curves"
      })], [[[io, io.read, type, type.mat4], 16, "currentValue"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "length"], [[io, io.persist, type, type.boolean], 16, "cycle"], [[io, io.persist, type, type.boolean], 16, "reversed"], [[io, io.persist, type, type.mat4], 16, "startValue"], [[io, io.persist, type, type.mat4], 16, "endValue"], [[io, io.readwrite, void 0, type.objectRef("Tr2SkinnedObject")], 16, "skinnedObject"], [[io, io.persist, type, type.mat4], 16, "transform"], [[io, io.persistOnly, void 0, type.list("Tr2MatrixKey")], 16, "keys"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Sort"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyTime"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript returns a detached matrix instead of exposing Carbon's const Matrix reference.")], 18, "GetKeyValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript copies authored matrix values so curve storage never aliases caller-owned arrays.")], 18, "SetKeyValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyInterpolation"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyInterpolation"], [[carbon, carbon.method, impl, impl.implemented], 18, "RemoveKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetBone"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBone"]], 0, void 0, CjsModel));
    }
    currentValue = (_initProto(this), _init_currentValue(this, mat4.create()));
    name = (_init_extra_currentValue(this), _init_name(this, ""));
    length = (_init_extra_name(this), _init_length(this, 1));
    cycle = (_init_extra_length(this), _init_cycle(this, true));
    reversed = (_init_extra_cycle(this), _init_reversed(this, false));
    startValue = (_init_extra_reversed(this), _init_startValue(this, mat4.create()));
    endValue = (_init_extra_startValue(this), _init_endValue(this, mat4.create()));
    skinnedObject = (_init_extra_endValue(this), _init_skinnedObject(this, null));
    transform = (_init_extra_skinnedObject(this), _init_transform(this, mat4.create()));
    keys = (_init_extra_transform(this), _init_keys(this, []));
    #bone = (_init_extra_keys(this), "");
    #scratch = mat4.create();

    /**
     * Initializes sorted keys and cached value.
     */
    Initialize() {
      this.Sort();
      this.UpdateValue(0);
      return true;
    }

    /**
     * Gets authored duration.
     */
    Length() {
      const keys = this.keys;
      const length = this.length;
      return length || (keys.length ? keys[keys.length - 1].time : 0);
    }

    /**
     * Updates cached matrix value.
     */
    UpdateValue(time) {
      this.GetValueAt(time, this.currentValue);
    }

    /**
     * Gets matrix value at a time.
     */
    GetValueAt(_time, out) {
      const boneMatrix = _Tr2BoneMatrixCurve.#getBoneMatrix(this.skinnedObject, this.#bone);
      if (!boneMatrix) {
        return mat4.identity(out);
      }
      // Carbon (row-vector): (m_transform * bone) * world - m_transform first,
      // world last (XMMatrixMultiply is row-vector A*B).
      mat4.multiply(this.#scratch, boneMatrix, this.transform);
      const worldTransform = _Tr2BoneMatrixCurve.#getSkinnedObjectTransform(this.skinnedObject);
      return worldTransform ? mat4.multiply(out, worldTransform, this.#scratch) : mat4.copy(out, this.#scratch);
    }

    /**
     * Gets matrix value at a time.
     */
    GetValue(time, out) {
      return this.GetValueAt(time, out);
    }

    /**
     * Sorts keys by time.
     */
    Sort() {
      const keys = this.keys;
      keys.sort((a, b) => a.time - b.time);
      const lastKey = keys.at(-1);
      const length = this.length;
      if (lastKey && lastKey.time > length) {
        const previousLength = this.length;
        mat4.copy(this.#scratch, this.endValue);
        this.length = lastKey.time;
        mat4.copy(this.endValue, lastKey.value);
        if (previousLength > 0) {
          lastKey.time = previousLength;
          mat4.copy(lastKey.value, this.#scratch);
        }
      }
    }

    /**
     * Adds a matrix key.
     */
    AddKey(time, value = null) {
      const keyValue = value ?? _Tr2BoneMatrixCurve.#identityMatrix;
      const keys = this.keys;
      for (let i = 0; i < this.keys.length; i++) {
        const key = keys[i];
        if (key.time === time) {
          mat4.copy(key.value, keyValue);
          return i;
        }
      }
      const key = new _Tr2MatrixKey();
      key.time = time;
      mat4.copy(key.value, keyValue);
      _Tr2BoneMatrixCurve.#keyInterpolations.set(key, SPHERICAL_LINEAR);
      keys.push(key);
      this.Sort();
      return keys.indexOf(key);
    }

    /** Gets the number of matrix keys. */
    GetKeyCount() {
      return this.keys.length;
    }

    /** Gets a key time, or the curve length when the index is out of range. */
    GetKeyTime(index) {
      return Number(this.keys[index]?.time ?? this.length);
    }

    /** Sets a key time without reordering; Carbon requires an explicit Sort call. */
    SetKeyTime(index, time) {
      if (this.keys[index]) {
        this.keys[index].time = Number(time);
      }
    }

    /** Gets a detached key matrix, or the curve end value when out of range. */
    GetKeyValue(index) {
      return mat4.clone(this.keys[index]?.value ?? this.endValue);
    }

    /** Copies a matrix into an existing key. */
    SetKeyValue(index, value) {
      if (this.keys[index]) {
        if (!isArrayLike(value, 16)) {
          throw new TypeError("Matrix key values must contain 16 components");
        }
        mat4.copy(this.keys[index].value, value);
      }
    }

    /** Gets a key interpolation, or Carbon's spherical-linear curve default. */
    GetKeyInterpolation(index) {
      const key = this.keys[index];
      return key ? _Tr2BoneMatrixCurve.#keyInterpolations.get(key) ?? SPHERICAL_LINEAR : SPHERICAL_LINEAR;
    }

    /** Sets the unpersisted interpolation mode on an existing matrix key. */
    SetKeyInterpolation(index, interpolation) {
      const key = this.keys[index];
      if (key) {
        _Tr2BoneMatrixCurve.#keyInterpolations.set(key, Math.trunc(Number(interpolation)) >>> 0);
      }
    }

    /**
     * Removes a matrix key.
     */
    RemoveKey(index) {
      if (Number.isInteger(index) && index >= 0 && index < this.keys.length) {
        const [key] = this.keys.splice(index, 1);
        _Tr2BoneMatrixCurve.#keyInterpolations.delete(key);
        this.Sort();
      }
    }

    /**
     * Sets the source bone name.
     */
    SetBone(bone) {
      this.#bone = bone;
    }

    /**
     * Gets the source bone name.
     */
    GetBone() {
      return this.#bone;
    }

    /**
     * Gets the last key at or before a time, relying on the keys being sorted and
     * falling back to the first key when the time precedes all of them; returns
     * null for an empty curve.
     */
    GetKeyForTime(time) {
      const keys = this.keys;
      if (!this.keys.length) {
        return null;
      }
      let best = keys[0];
      for (const key of keys) {
        if (key.time <= time) {
          best = key;
        } else {
          break;
        }
      }
      return best;
    }

    /**
     * Reads a bone's 16-component matrix through GetBoneMatrix or
     * GetBoneTransform, returning null when the object exposes neither or returns
     * a wrongly sized value.
     */

    /**
     * Reads the skinned object's own 16-component world transform, or null when it
     * exposes none.
     */
  }];
  #identityMatrix = mat4.create();
  #keyInterpolations = new WeakMap();
  #getBoneMatrix(skinnedObject, bone) {
    if (!skinnedObject || !bone) {
      return null;
    }
    if (typeof skinnedObject === "object" && "GetBoneMatrix" in skinnedObject && typeof skinnedObject.GetBoneMatrix === "function") {
      const value = skinnedObject.GetBoneMatrix(bone);
      return isArrayLike(value, 16) ? value : null;
    }
    if (typeof skinnedObject === "object" && "GetBoneTransform" in skinnedObject && typeof skinnedObject.GetBoneTransform === "function") {
      const value = skinnedObject.GetBoneTransform(bone);
      return isArrayLike(value, 16) ? value : null;
    }
    return null;
  }
  #getSkinnedObjectTransform(skinnedObject) {
    if (skinnedObject && typeof skinnedObject === "object" && "GetTransform" in skinnedObject && typeof skinnedObject.GetTransform === "function") {
      const value = skinnedObject.GetTransform();
      return isArrayLike(value, 16) ? value : null;
    }
    return null;
  }
  constructor() {
    super(_Tr2BoneMatrixCurve), _initClass();
  }
}();

export { _Tr2BoneMatrixCurve as Tr2BoneMatrixCurve };
//# sourceMappingURL=Tr2BoneMatrixCurve.js.map
