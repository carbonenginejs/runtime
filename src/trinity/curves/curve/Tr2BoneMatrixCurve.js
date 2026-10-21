import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve.h
// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve.cpp
// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve_Blue.cpp
// Source: trinity/trinity/Include/Tr2Curve.h
import { mat4 } from "#math/mat4";
import { isArrayLike } from "#utils/is";
import { ITriFunction, ITriCurveLength, IInitialize } from "#blue";
import { meta, type, blue } from "#schema";
import { Tr2MatrixKey } from "../key/Tr2MatrixKey.js";


const SPHERICAL_LINEAR = 4;


/**
 * Matrix function that tracks a named bone on a skinned object, returning the
 * authored transform composed with that bone's current matrix and the object's
 * world transform rather than sampling its own keys.
 */
@be.define("Tr2BoneMatrixCurve")
@blue.inherit(IInitialize, ITriCurveLength)
@be.mapInterface(ITriFunction)
@be.mapInterface(IInitialize)
@be.mapInterface(ITriCurveLength)
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
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /**
   * Authored duration in seconds used by endpoint sampling and key sorting (native float m_length).
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  length = 1;

  /**
   * Native repetition flag; sampling past length continues tracking the bone when enabled.
   * @type {boolean}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  cycle = true;

  /**
   * Native reverse flag; noncycling samples past length select startValue when enabled.
   * @type {boolean}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  reversed = false;

  /**
   * Initial matrix returned for nonpositive sample time or duration (native Matrix m_startValue).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  startValue = mat4.create();

  /**
   * Matrix cached by the last UpdateValue call (native Matrix m_currentValue).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READ)
  @type.mat4
  currentValue = mat4.create();

  /**
   * Final matrix returned past the duration of a noncycling forward curve (native Matrix m_endValue).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  endValue = mat4.create();

  /**
   * Source of the tracked bone matrix and world transform (native Tr2SkinnedObjectPtr).
   * @type {Tr2SkinnedObject|null}
   */
  @be.mapAttribute(be.READWRITE)
  @type.rootRef("Tr2SkinnedObject")
  skinnedObject = null;

  /**
   * Persisted matrix-key sequence retained for editing and endpoint rollover; bone tracking ignores key interpolation.
   * @type {Tr2MatrixKey[]}
   */
  @be.mapAttribute(be.PERSISTONLY)
  @type.list("Tr2MatrixKey")
  keys = [];

  /**
   * Additional transform applied in bone-local space before the bone and world transforms (native Matrix m_transform).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  /** Native live bone property; setting it uses the retained name lookup adapter. */
  @be.mapProperty()
  @type.string
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

  /** m_cachedJoint: the resolved joint index, ~0u until resolved (cpp:28). */
  _cachedJoint = 0xffffffff;

  /** m_skeletonTag: the skeleton the cached joint belongs to, ~0u initially (cpp:29). */
  _skeletonTag = 0xffffffff;

  /** Gets the native curve template's name. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the native curve template's name. */
  @blue.method
  @meta.implemented
  SetName(value)
  {
    this.name = value;
  }

  /**
   * Initializes sorted keys and cached value.
   * Adapted: native Initialize only sorts; the existing JS adapter also samples zero.
   */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
  Length()
  {
    const keys = this.keys;
    const length = this.length;
    return length || (keys.length ? keys[keys.length - 1].time : 0);
  }

  /**
   * Updates cached matrix value.
   */
  @blue.method
  @meta.adapted
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Gets matrix value at a time.
   * Adapted: the matrix is written into out rather than returned by value.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetValueAt(time, out)
  {
    // Native Tr2CurveBase gates precede bone interpolation; its key segments
    // do not affect this subclass, whose Interpolate ignores both keys.
    if (Number.isNaN(time)) time = 0;
    if (this.length <= 0 || time <= 0) return mat4.copy(out, this.startValue);
    if (time > this.length && !this.cycle)
      return mat4.copy(out, this.reversed ? this.startValue : this.endValue);
    return this.Interpolate(out);
  }

  /**
   * Gets matrix value at a time.
   * Adapted: the matrix is written into out rather than returned by value.
   */
  @blue.method
  @meta.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Sorts keys by time.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
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
  @be.mapMethodAndWrap()
  @meta.adapted
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
  @be.mapMethodAndWrap()
  @meta.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /** Gets a key time, or the curve length when the index is out of range. */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetKeyTime(index)
  {
    return Number(this.keys[index]?.time ?? this.length);
  }

  /** Sets a key time without reordering; Carbon requires an explicit Sort call. */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetKeyTime(index, time)
  {
    if (this.keys[index])
    {
      this.keys[index].time = Number(time);
    }
  }

  /** Adapted: returns a detached matrix rather than the native const reference. */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetKeyValue(index)
  {
    return mat4.clone(this.keys[index]?.value ?? this.endValue);
  }

  /** Adapted: validates and copies caller matrices into existing key storage. */
  @be.mapMethodAndWrap()
  @meta.adapted
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
  @be.mapMethodAndWrap()
  @meta.implemented
  GetKeyInterpolation(index)
  {
    const key = this.keys[index];
    return key
      ? Tr2BoneMatrixCurve._keyInterpolations.get(key) ?? SPHERICAL_LINEAR
      : SPHERICAL_LINEAR;
  }

  /** Sets the unpersisted interpolation mode on an existing matrix key. */
  @be.mapMethodAndWrap()
  @meta.implemented
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
  @be.mapMethodAndWrap()
  @meta.implemented
  RemoveKey(index)
  {
    if (Number.isInteger(index) && index >= 0 && index < this.keys.length)
    {
      const [key] = this.keys.splice(index, 1);
      Tr2BoneMatrixCurve._keyInterpolations.delete(key);
      this.Sort();
    }
  }

  /** Carbon SetBone (Tr2BoneMatrixCurve.cpp:51-55): the bone name, and the joint caches reset. */
  @blue.method
  @meta.implemented
  SetBone(bone)
  {
    this._bone = bone;
    this._cachedJoint = this._skeletonTag = Tr2BoneMatrixCurve.INVALID_JOINT;
  }

  /**
   * Gets the source bone name.
   */
  @blue.method
  @meta.implemented
  GetBone()
  {
    return this._bone;
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
   * Carbon Interpolate (Tr2BoneMatrixCurve.cpp:123-152). It ignores both keys: without
   * a skinned object or bone name the result is identity; otherwise the joint index is
   * re-resolved whenever the skeleton tag changes, and the bone's transform is composed
   * as (m_transform * bone) * skinnedObject.GetTransform() in Carbon's row-vector order,
   * which gl-matrix writes right to left.
   * @param {mat4} out
   * @returns {mat4} out
   */
  @meta.implemented
  Interpolate(out)
  {
    const skinnedObject = this.skinnedObject;
    if (!skinnedObject || !this._bone)
    {
      return mat4.identity(out);
    }
    if (this._skeletonTag !== skinnedObject.GetSkeletonTag())
    {
      this._cachedJoint = skinnedObject.GetBoneIndex(this._bone);
      if (this._cachedJoint !== Tr2BoneMatrixCurve.INVALID_JOINT)
      {
        this._skeletonTag = skinnedObject.GetSkeletonTag();
      }
    }
    const bone = skinnedObject.GetBoneTransform(this._cachedJoint);
    if (!bone)
    {
      return mat4.identity(out);
    }
    mat4.multiply(this._scratch, bone, this.transform);
    const world = skinnedObject.GetTransform(Tr2BoneMatrixCurve._worldScratch);
    return mat4.multiply(out, world, this._scratch);
  }

  /** Carbon's ~0u: no joint resolved / no skeleton seen. */
  static INVALID_JOINT = 0xffffffff;

  static _worldScratch = mat4.create();
}

// Native table stops here; the C++ curve template is flattened above.
