// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve.h
// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve.cpp
// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve_Blue.cpp
// Source: trinity/trinity/Include/Tr2Curve.h
import { mat4 } from "#math/mat4";
import { isArrayLike } from "#utils/is";
import { ITriFunction, ITriCurveLength, IInitialize } from "#blue";
import { meta, types } from "#schema";
import { Tr2MatrixKey } from "../key/Tr2MatrixKey.js";


const SPHERICAL_LINEAR = 4;


/**
 * Matrix function that tracks a named bone on a skinned object, returning the
 * authored transform composed with that bone's current matrix and the object's
 * world transform rather than sampling its own keys.
 */
@meta.define({
  className: "Tr2BoneMatrixCurve",
  family: "curves"
})
@meta.carbon.inherit(IInitialize, ITriCurveLength)
export class Tr2BoneMatrixCurve extends ITriFunction
{
  /**
   * Shared identity matrix copied when AddKey receives no value; a JavaScript helper.
   * @type {Float32Array}
   */
  static _identityMatrix = mat4.create();

  /**
   * JavaScript side table retaining each matrix key's unpersisted native interpolation mode.
   * @type {WeakMap<Tr2MatrixKey, number>}
   */
  static _keyInterpolations = new WeakMap();

  /**
   * Native curve-template name identifying this bone-matrix function (std::string m_name).
   * @type {string}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /**
   * Authored duration in seconds used by endpoint sampling and key sorting (native float m_length).
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  length = 1;

  /**
   * Native repetition flag; sampling past length continues tracking the bone when enabled.
   * @type {boolean}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  cycle = true;

  /**
   * Native reverse flag; noncycling samples past length select startValue when enabled.
   * @type {boolean}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  reversed = false;

  /**
   * Initial matrix returned for nonpositive sample time or duration (native Matrix m_startValue).
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.mat4
  startValue = mat4.create();

  /**
   * Matrix cached by the last UpdateValue call (native Matrix m_currentValue).
   * @type {Float32Array}
   */
  @meta.edit.read
  @types.mat4
  currentValue = mat4.create();

  /**
   * Final matrix returned past the duration of a noncycling forward curve (native Matrix m_endValue).
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.mat4
  endValue = mat4.create();

  /**
   * Source of the tracked bone matrix and world transform (native Tr2SkinnedObjectPtr).
   * @type {Tr2SkinnedObject|null}
   */
  @meta.edit.readwrite
  @types.objectRef("Tr2SkinnedObject")
  skinnedObject = null;

  /**
   * Persisted matrix-key sequence retained for editing and endpoint rollover; bone tracking ignores key interpolation.
   * @type {Tr2MatrixKey[]}
   */
  @meta.edit.persistOnly
  @types.list("Tr2MatrixKey")
  keys = [];

  /**
   * Additional transform applied in bone-local space before the bone and world transforms (native Matrix m_transform).
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.mat4
  transform = mat4.create();

  /** Native live bone property; setting it uses the retained name lookup adapter. */
  @meta.property()
  @meta.edit.readwrite
  @types.string
  get bone()
  {
    return this.GetBone();
  }
  /** Sets the live bone name through the existing lookup adapter. */
  set bone(value)
  {
    this.SetBone(value);
  }

  /**
   * Backing name for the live bone property; the JavaScript adapter resolves this name on each sample.
   * @type {string}
   */
  _bone = "";

  /**
   * Per-instance temporary matrix for composition and endpoint swaps in the JavaScript adapter.
   * @type {Float32Array}
   */
  _scratch = mat4.create();

  /** Gets the native curve template's name. */
  @meta.carbon.method
  @meta.impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the native curve template's name. */
  @meta.carbon.method
  @meta.impl.implemented
  SetName(value)
  {
    this.name = value;
  }

  /**
   * Initializes sorted keys and cached value.
   * Adapted: native Initialize only sorts; the existing JS adapter also samples zero.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Initialize()
  {
    this.Sort();
    this.UpdateValue(0);
    return true;
  }

  /**
   * Gets authored duration.
   * Adapted: retains the JS last-key fallback when authored length is zero.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Length()
  {
    const keys = this.keys;
    const length = this.length;
    return length || (keys.length ? keys[keys.length - 1].time : 0);
  }

  /**
   * Updates cached matrix value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Gets matrix value at a time.
   * Adapted: out-parameter matrices and structural bone-name lookup replace
   * native value returns and skeleton-tag/joint caching. World transform is
   * optional in the retained JS skinned-object adapter.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValueAt(time, out)
  {
    // Native Tr2CurveBase gates precede bone interpolation; its key segments
    // do not affect this subclass, whose Interpolate ignores both keys.
    if (Number.isNaN(time)) time = 0;
    if (this.length <= 0 || time <= 0) return mat4.copy(out, this.startValue);
    if (time > this.length && !this.cycle)
      return mat4.copy(out, this.reversed ? this.startValue : this.endValue);
    const boneMatrix = Tr2BoneMatrixCurve._getBoneMatrix(this.skinnedObject, this._bone);
    if (!boneMatrix)
    {
      return mat4.identity(out);
    }
    // Carbon (row-vector): (m_transform * bone) * world - m_transform first,
    // world last (XMMatrixMultiply is row-vector A*B).
    mat4.multiply(this._scratch, boneMatrix, this.transform);
    const worldTransform = Tr2BoneMatrixCurve._getSkinnedObjectTransform(this.skinnedObject);
    return worldTransform ? mat4.multiply(out, worldTransform, this._scratch) : mat4.copy(out, this._scratch);
  }

  /**
   * Gets matrix value at a time.
   * Adapted: out-parameter matrices and structural bone-name lookup replace
   * native value returns and skeleton-tag/joint caching. World transform is
   * optional in the retained JS skinned-object adapter.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Sorts keys by time.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Sort()
  {
    const keys = this.keys;
    keys.sort((a, b) => a.time - b.time);
    const lastKey = keys.at(-1);
    const length = this.length;
    if (lastKey && lastKey.time > length)
    {
      const previousLength = this.length;
      mat4.copy(this._scratch, this.endValue);
      this.length = lastKey.time;
      mat4.copy(this.endValue, lastKey.value);
      if (previousLength > 0)
      {
        lastKey.time = previousLength;
        mat4.copy(lastKey.value, this._scratch);
      }
    }
  }

  /**
   * Adds a matrix key.
   * Adapted: retains the JS direct key insertion and endpoint rollover helper.
   */
  @meta.carbon.method
  @meta.impl.adapted
  AddKey(time, value = null)
  {
    const keyValue = value ?? Tr2BoneMatrixCurve._identityMatrix;
    const keys = this.keys;
    for (let i = 0; i < this.keys.length; i++)
    {
      const key = keys[i];
      if (key.time === time)
      {
        mat4.copy(key.value, keyValue);
        return i;
      }
    }
    const key = new Tr2MatrixKey();
    key.time = time;
    mat4.copy(key.value, keyValue);
    Tr2BoneMatrixCurve._keyInterpolations.set(key, SPHERICAL_LINEAR);
    keys.push(key);
    this.Sort();
    return keys.indexOf(key);
  }

  /** Gets the number of matrix keys. */
  @meta.carbon.method
  @meta.impl.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /** Gets a key time, or the curve length when the index is out of range. */
  @meta.carbon.method
  @meta.impl.implemented
  GetKeyTime(index)
  {
    return Number(this.keys[index]?.time ?? this.length);
  }

  /** Sets a key time without reordering; Carbon requires an explicit Sort call. */
  @meta.carbon.method
  @meta.impl.implemented
  SetKeyTime(index, time)
  {
    if (this.keys[index])
    {
      this.keys[index].time = Number(time);
    }
  }

  /** Adapted: returns a detached matrix rather than the native const reference. */
  @meta.carbon.method
  @meta.impl.adapted
  GetKeyValue(index)
  {
    return mat4.clone(this.keys[index]?.value ?? this.endValue);
  }

  /** Adapted: validates and copies caller matrices into existing key storage. */
  @meta.carbon.method
  @meta.impl.adapted
  SetKeyValue(index, value)
  {
    if (this.keys[index])
    {
      if (!isArrayLike(value, 16))
      {
        throw new TypeError("Matrix key values must contain 16 components");
      }
      mat4.copy(this.keys[index].value, value);
    }
  }

  /** Gets a key interpolation, or Carbon's spherical-linear curve default. */
  @meta.carbon.method
  @meta.impl.implemented
  GetKeyInterpolation(index)
  {
    const key = this.keys[index];
    return key
      ? Tr2BoneMatrixCurve._keyInterpolations.get(key) ?? SPHERICAL_LINEAR
      : SPHERICAL_LINEAR;
  }

  /** Sets the unpersisted interpolation mode on an existing matrix key. */
  @meta.carbon.method
  @meta.impl.implemented
  SetKeyInterpolation(index, interpolation)
  {
    const key = this.keys[index];
    if (key)
    {
      Tr2BoneMatrixCurve._keyInterpolations.set(key, Math.trunc(Number(interpolation)) >>> 0);
    }
  }

  /**
   * Removes a matrix key.
   */
  @meta.carbon.method
  @meta.impl.implemented
  RemoveKey(index)
  {
    if (Number.isInteger(index) && index >= 0 && index < this.keys.length)
    {
      const [key] = this.keys.splice(index, 1);
      Tr2BoneMatrixCurve._keyInterpolations.delete(key);
      this.Sort();
    }
  }

  /**
   * Sets the source bone name.
   * Adapted: native also resets joint/skeleton caches; JS resolves by name per sample.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetBone(bone)
  {
    this._bone = bone;
  }

  /**
   * Gets the source bone name.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetBone()
  {
    return this._bone;
  }

  /**
   * Gets the last key at or before a time, relying on the keys being sorted and
   * falling back to the first key when the time precedes all of them; returns
   * null for an empty curve.
   */
  @meta.impl.custom
  GetKeyForTime(time)
  {
    const keys = this.keys;
    if (!this.keys.length)
    {
      return null;
    }
    let best = keys[0];
    for (const key of keys)
    {
      if (key.time <= time)
      {
        best = key;
      }
      else
      {
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
  @meta.impl.custom
  static _getBoneMatrix(skinnedObject, bone)
  {
    if (!skinnedObject || !bone)
    {
      return null;
    }
    if (typeof skinnedObject === "object" && "GetBoneMatrix" in skinnedObject && typeof skinnedObject.GetBoneMatrix === "function")
    {
      const value = skinnedObject.GetBoneMatrix(bone);
      return isArrayLike(value, 16) ? value : null;
    }
    if (typeof skinnedObject === "object" && "GetBoneTransform" in skinnedObject && typeof skinnedObject.GetBoneTransform === "function")
    {
      const value = skinnedObject.GetBoneTransform(bone);
      return isArrayLike(value, 16) ? value : null;
    }
    return null;
  }

  /**
   * Reads the skinned object's own 16-component world transform, or null when it
   * exposes none.
   */
  @meta.impl.custom
  static _getSkinnedObjectTransform(skinnedObject)
  {
    if (skinnedObject && typeof skinnedObject === "object" && "GetTransform" in skinnedObject && typeof skinnedObject.GetTransform === "function")
    {
      const value = skinnedObject.GetTransform();
      return isArrayLike(value, 16) ? value : null;
    }
    return null;
  }
}

// Native table stops here; the C++ curve template is flattened above.
meta.carbon.interfaceTable({
  interfaces: [Tr2BoneMatrixCurve, ITriFunction, IInitialize, ITriCurveLength],
  chainTo: null
})(Tr2BoneMatrixCurve);
