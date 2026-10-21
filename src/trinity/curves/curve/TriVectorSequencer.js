import { exposure as be } from "#be";
// Source: trinity/trinity/TriSequencer.h
// Source: trinity/trinity/TriSequencer.cpp
import { vec3 } from "#math/vec3";
import { ITriFunction, ITriVectorFunction, BlueList } from "#blue";
import { meta, type, blue } from "#schema";
import { TRIOPERATOR } from "#consts/graphics";
import "#consts/graphics/trinityEnums";


/**
 * Vector function combining its child vector functions with Carbon's multiply,
 * add or average operator; multiply starts from ones and the additive paths from
 * zero. Sampling retains the existing instance child scratch; native sampling
 * uses local temporaries. Numeric tick overloads remain unimplemented.
 */
@be.define("TriVectorSequencer")
@be.mapInterface(ITriFunction)
@be.mapInterface(ITriVectorFunction)
export class TriVectorSequencer extends ITriVectorFunction
{
  /**
   * Authored name identifying the vector sequencer; native wide string.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.wstring
  name = "";

  /**
   * Retained native start timestamp in Be::Time tick units (int64 metadata); current sampling
   * does not apply it.
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int64
  start = 0;

  /**
   * Cached combined three-component vector, updated by Update and UpdateValue. Component units
   * depend on the child functions and selected operator.
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  value = vec3.create();

  /**
   * TRIOPERATOR code selecting component-wise multiplication, addition or averaging; unrecognized
   * values also take the average branch.
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("blue.TRIOPERATOR")
  operator = TRIOPERATOR.TRIOP_MULTIPLY;

  /**
   * Ordered child vector functions sampled and combined at the supplied time.
   * @type {BlueList<ITriVectorFunction>}
   */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("ITriVectorFunction")
  functions = new BlueList(ITriVectorFunction, { className: null, listOps: 0 });

  /**
   * Reusable JavaScript scratch vector for a child value or derivative during accumulation.
   * @type {Float32Array}
   */
  _childValue = vec3.create();

  /**
   * Updates the cached result of the child vector functions.
   * Samples into invocation-local output before committing the cache through Update.
   * @param {number} time Time in seconds.
   * @returns {void}
   */

  @meta.implemented
  UpdateValue(time)
  {
    const out = vec3.alloc();
    try
    {
      this.Update(time, out);
    }
    finally
    {
      vec3.unalloc(out);
    }
  }

  /**
   * Updates the cached result and copies it into `out`.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */

  @meta.adapted
  Update(time, out)
  {
    this.GetValueAt(time, out);
    vec3.copy(this.value, out);
    return out;
  }

  /**
   * Combines child vectors using Carbon's dispatch (TriSequencer.cpp:70-73):
   * MULTIPLY and ADD select their combiner, and EVERY other operator falls
   * to the average arm - the donor's `else`, not an ADD default. Each donor
   * combiner also has a duplicate double-position overload; one body here.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
  GetValueAt(time, out)
  {
    if (this.operator === TRIOPERATOR.TRIOP_MULTIPLY) return this.GetValueAtMult(time, out, false);
    if (this.operator === TRIOPERATOR.TRIOP_ADD) return this.GetValueAtAdd(time, out, false);
    return this.GetValueAtAverage(time, out, false);
  }

  /**
   * Carbon's Update(Be::Time) (TriSequencer.cpp:45-52): samples the tick overload and caches it. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  Update__Ticks(time, out)
  {
    this.GetValueAt__Ticks(time, out);
    vec3.copy(this.value, out);
    return out;
  }

  /**
   * Carbon's GetValueAt(Be::Time) (cpp:63-73): the same dispatch, sampling children through their Be::Time
   * overloads. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueAt__Ticks(time, out)
  {
    if (this.operator === TRIOPERATOR.TRIOP_MULTIPLY) return this.GetValueAtMult(time, out, true);
    if (this.operator === TRIOPERATOR.TRIOP_ADD) return this.GetValueAtAdd(time, out, true);
    return this.GetValueAtAverage(time, out, true);
  }

  /**
   * Carbon GetValueAtMult (cpp:75-89/:132-146): seed (1,1,1), multiply
   * component-wise - the donor writes the three axes out by hand.
   * One body serves both donor overloads; ticks selects the children's Be::Time overload.
   * @param {number} time Seconds, or Blue ticks when ticks is set.
   * @param {boolean} ticks Whether time is Blue ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */

  @meta.adapted
  GetValueAtMult(time, out, ticks)
  {
    vec3.set(out, 1, 1, 1);
    for (const curve of this.functions)
    {
      if (ticks) curve.GetValueAt__Ticks(time, this._childValue);
      else curve.GetValueAt(time, this._childValue);
      vec3.multiply(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Carbon GetValueAtAdd (cpp:106-120/:148-160): seed zero, accumulate.
   * One body serves both donor overloads; ticks selects the children's Be::Time overload.
   * @param {number} time Seconds, or Blue ticks when ticks is set.
   * @param {boolean} ticks Whether time is Blue ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */

  @meta.adapted
  GetValueAtAdd(time, out, ticks)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      if (ticks) curve.GetValueAt__Ticks(time, this._childValue);
      else curve.GetValueAt(time, this._childValue);
      vec3.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Carbon GetValueAtAverage (cpp:91-104/:162-176): the multiplier is
   * computed BEFORE the size check and applied per sample. On an empty list
   * the infinite multiplier is never used and the zero seed comes back -
   * transcribed, not guarded.
   * One body serves both donor overloads; ticks selects the children's Be::Time overload.
   * @param {number} time Seconds, or Blue ticks when ticks is set.
   * @param {boolean} ticks Whether time is Blue ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */

  @meta.adapted
  GetValueAtAverage(time, out, ticks)
  {
    vec3.zero(out);
    const multiplier = 1 / this.functions.length;
    for (const curve of this.functions)
    {
      if (ticks) curve.GetValueAt__Ticks(time, this._childValue);
      else curve.GetValueAt(time, this._childValue);
      vec3.scaleAndAdd(out, out, this._childValue, multiplier);
    }
    return out;
  }

  /**
   * Sums child-function velocities as Carbon does for every operator.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
  GetValueDotAt(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueDotAt(time, this._childValue);
      vec3.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Sums child-function accelerations as Carbon does for every operator.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
  GetValueDoubleDotAt(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueDoubleDotAt(time, this._childValue);
      vec3.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Carbon's GetValueDotAt(Be::Time) (cpp:178-191): sums the children's Be::Time velocities. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueDotAt__Ticks(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueDotAt__Ticks(time, this._childValue);
      vec3.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Carbon's GetValueDoubleDotAt(Be::Time) (cpp:211-224): sums the children's Be::Time accelerations. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueDoubleDotAt__Ticks(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueDoubleDotAt__Ticks(time, this._childValue);
      vec3.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Carbon leaves interpolated-position output unchanged for this sequencer.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} _time Unused time.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */

  @meta.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }

  /**
   * Shared operator constants exposed as a class-level convenience.
   * @type {Object<string, number>}
   */
  static TRIOPERATOR = TRIOPERATOR;

}

// Native query table deliberately omits the concrete class.
