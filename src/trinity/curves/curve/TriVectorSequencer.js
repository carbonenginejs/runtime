// Source: trinity/trinity/TriSequencer.h
// Source: trinity/trinity/TriSequencer.cpp
import { vec3 } from "#math/vec3";
import { ITriFunction, ITriVectorFunction, BlueList } from "#blue";
import { carbon, impl, edit, type } from "#schema";
import { TRIOPERATOR } from "#consts/graphics";
import "#blue/registerTrinityEnums";


/**
 * Vector function combining its child vector functions with Carbon's multiply,
 * add or average operator; multiply starts from ones and the additive paths from
 * zero. Sampling retains the existing instance child scratch; native sampling
 * uses local temporaries. Numeric tick overloads remain unimplemented.
 */
@type.define({ className: "TriVectorSequencer", family: "curves" })
export class TriVectorSequencer extends ITriVectorFunction
{
  @edit.readwrite
  @edit.persist
  @type.wstring
  name = "";

  @edit.readwrite
  @edit.persist
  @type.int64
  start = 0;

  @edit.readwrite
  @edit.persist
  @type.vec3
  value = vec3.create();

  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("blue.TRIOPERATOR")
  operator = TRIOPERATOR.TRIOP_MULTIPLY;

  @edit.read
  @edit.persist
  @type.list("ITriVectorFunction")
  functions = new BlueList(ITriVectorFunction, { className: null, listOps: 0 });

  _childValue = vec3.create();

  /**
   * Updates the cached result of the child vector functions.
   * Samples into invocation-local output before committing the cache through Update.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (this.operator === TRIOPERATOR.TRIOP_MULTIPLY) return this.GetValueAtMult(time, out);
    if (this.operator === TRIOPERATOR.TRIOP_ADD) return this.GetValueAtAdd(time, out);
    return this.GetValueAtAverage(time, out);
  }

  /**
   * Carbon GetValueAtMult (cpp:75-89/:132-146): seed (1,1,1), multiply
   * component-wise - the donor writes the three axes out by hand.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAtMult(time, out)
  {
    vec3.set(out, 1, 1, 1);
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this._childValue);
      vec3.multiply(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Carbon GetValueAtAdd (cpp:106-120/:148-160): seed zero, accumulate.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAtAdd(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this._childValue);
      vec3.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Carbon GetValueAtAverage (cpp:91-104/:162-176): the multiplier is
   * computed BEFORE the size check and applied per sample. On an empty list
   * the infinite multiplier is never used and the zero seed comes back -
   * transcribed, not guarded.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAtAverage(time, out)
  {
    vec3.zero(out);
    const multiplier = 1 / this.functions.length;
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this._childValue);
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
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
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
   * Carbon leaves interpolated-position output unchanged for this sequencer.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} _time Unused time.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }

  static TRIOPERATOR = TRIOPERATOR;

}

// Native query table deliberately omits the concrete class.
carbon.interfaceTable({ interfaces: [ITriFunction, ITriVectorFunction], chainTo: null })(TriVectorSequencer);
