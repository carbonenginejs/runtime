// Source: E:\carbonengine\trinity\trinity\Curves\Tr2BoneMatrixCurve.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2BoneMatrixCurve.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { isArrayLike } from "@carbonenginejs/runtime-utils/is";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2MatrixKey } from "../keys/Tr2MatrixKey.js";


const SPHERICAL_LINEAR = 4;


/**
 * Matrix function that tracks a named bone on a skinned object, returning the
 * authored transform composed with that bone's current matrix and the object's
 * world transform rather than sampling its own keys.
 */
@type.define({
  className: "Tr2BoneMatrixCurve",
  family: "curves"
})
export class Tr2BoneMatrixCurve extends CjsModel
{
  static #identityMatrix = mat4.create();

  static #keyInterpolations = new WeakMap();

  @io.read
  @type.mat4
  currentValue = mat4.create();

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  length = 1;

  @io.persist
  @type.boolean
  cycle = true;

  @io.persist
  @type.boolean
  reversed = false;

  @io.persist
  @type.mat4
  startValue = mat4.create();

  @io.persist
  @type.mat4
  endValue = mat4.create();

  @io.readwrite
  @type.objectRef("Tr2SkinnedObject")
  skinnedObject = null;

  @io.persist
  @type.mat4
  transform = mat4.create();

  @io.persistOnly
  @type.list("Tr2MatrixKey")
  keys = [];

  #bone = "";

  #scratch = mat4.create();

  /**
   * Initializes sorted keys and cached value.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.Sort();
    this.UpdateValue(0);
    return true;
  }

  /**
   * Gets authored duration.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    const keys = this.keys;
    const length = this.length;
    return length || (keys.length ? keys[keys.length - 1].time : 0);
  }

  /**
   * Updates cached matrix value.
   */
  @carbon.method
  @impl.adapted
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Gets matrix value at a time.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(_time, out)
  {
    const boneMatrix = Tr2BoneMatrixCurve.#getBoneMatrix(this.skinnedObject, this.#bone);
    if (!boneMatrix)
    {
      return mat4.identity(out);
    }
    // Carbon (row-vector): (m_transform * bone) * world - m_transform first,
    // world last (XMMatrixMultiply is row-vector A*B).
    mat4.multiply(this.#scratch, boneMatrix, this.transform);
    const worldTransform = Tr2BoneMatrixCurve.#getSkinnedObjectTransform(this.skinnedObject);
    return worldTransform ? mat4.multiply(out, worldTransform, this.#scratch) : mat4.copy(out, this.#scratch);
  }

  /**
   * Gets matrix value at a time.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Sorts keys by time.
   */
  @carbon.method
  @impl.implemented
  Sort()
  {
    const keys = this.keys;
    keys.sort((a, b) => a.time - b.time);
    const lastKey = keys.at(-1);
    const length = this.length;
    if (lastKey && lastKey.time > length)
    {
      const previousLength = this.length;
      mat4.copy(this.#scratch, this.endValue);
      this.length = lastKey.time;
      mat4.copy(this.endValue, lastKey.value);
      if (previousLength > 0)
      {
        lastKey.time = previousLength;
        mat4.copy(lastKey.value, this.#scratch);
      }
    }
  }

  /**
   * Adds a matrix key.
   */
  @carbon.method
  @impl.adapted
  AddKey(time, value = null)
  {
    const keyValue = value ?? Tr2BoneMatrixCurve.#identityMatrix;
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
    Tr2BoneMatrixCurve.#keyInterpolations.set(key, SPHERICAL_LINEAR);
    keys.push(key);
    this.Sort();
    return keys.indexOf(key);
  }

  /** Gets the number of matrix keys. */
  @carbon.method
  @impl.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /** Gets a key time, or the curve length when the index is out of range. */
  @carbon.method
  @impl.implemented
  GetKeyTime(index)
  {
    return Number(this.keys[index]?.time ?? this.length);
  }

  /** Sets a key time without reordering; Carbon requires an explicit Sort call. */
  @carbon.method
  @impl.implemented
  SetKeyTime(index, time)
  {
    if (this.keys[index])
    {
      this.keys[index].time = Number(time);
    }
  }

  /** Gets a detached key matrix, or the curve end value when out of range. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript returns a detached matrix instead of exposing Carbon's const Matrix reference.")
  GetKeyValue(index)
  {
    return mat4.clone(this.keys[index]?.value ?? this.endValue);
  }

  /** Copies a matrix into an existing key. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript copies authored matrix values so curve storage never aliases caller-owned arrays.")
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
  @carbon.method
  @impl.implemented
  GetKeyInterpolation(index)
  {
    const key = this.keys[index];
    return key
      ? Tr2BoneMatrixCurve.#keyInterpolations.get(key) ?? SPHERICAL_LINEAR
      : SPHERICAL_LINEAR;
  }

  /** Sets the unpersisted interpolation mode on an existing matrix key. */
  @carbon.method
  @impl.implemented
  SetKeyInterpolation(index, interpolation)
  {
    const key = this.keys[index];
    if (key)
    {
      Tr2BoneMatrixCurve.#keyInterpolations.set(key, Math.trunc(Number(interpolation)) >>> 0);
    }
  }

  /**
   * Removes a matrix key.
   */
  @carbon.method
  @impl.implemented
  RemoveKey(index)
  {
    if (Number.isInteger(index) && index >= 0 && index < this.keys.length)
    {
      const [key] = this.keys.splice(index, 1);
      Tr2BoneMatrixCurve.#keyInterpolations.delete(key);
      this.Sort();
    }
  }

  /**
   * Sets the source bone name.
   */
  @carbon.method
  @impl.implemented
  SetBone(bone)
  {
    this.#bone = bone;
  }

  /**
   * Gets the source bone name.
   */
  @carbon.method
  @impl.implemented
  GetBone()
  {
    return this.#bone;
  }

  /**
   * Gets the last key at or before a time, relying on the keys being sorted and
   * falling back to the first key when the time precedes all of them; returns
   * null for an empty curve.
   */
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
  static #getBoneMatrix(skinnedObject, bone)
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
  static #getSkinnedObjectTransform(skinnedObject)
  {
    if (skinnedObject && typeof skinnedObject === "object" && "GetTransform" in skinnedObject && typeof skinnedObject.GetTransform === "function")
    {
      const value = skinnedObject.GetTransform();
      return isArrayLike(value, 16) ? value : null;
    }
    return null;
  }
}
