// Source: trinity/trinity/TriSequencer.h
// Source: trinity/trinity/TriSequencer.cpp
import { vec4 } from "#math/vec4";
import { ITriFunction, ITriColorFunction, BlueList, ITriCurveLength } from "#blue";
import { ITriDuration } from "../ITriDuration.js";
import { mappedInterfaces } from "../../../global/compose/interface.js";
import { carbon, impl, edit, type } from "#schema";
import { TRIOPERATOR } from "#consts/graphics";
import "#blue/registerTrinityEnums";


/**
 * Color function combining its child color functions with Carbon's multiply or
 * add operator; both paths start from opaque white, so an additive sequencer is
 * offset by white. Sampling retains the existing instance child scratch; native
 * sampling uses local temporaries. Numeric tick overloads remain unimplemented.
 */
@type.define({ className: "TriColorSequencer", family: "curves" })
@carbon.inherit(ITriCurveLength)
export class TriColorSequencer extends ITriColorFunction
{
  /**
   * Authored name identifying the color sequencer; native wide string.
   * @type {string}
   */
  @edit.readwrite
  @edit.persist
  @type.wstring
  name = "";

  /**
   * Retained native start timestamp in Be::Time tick units (int64 metadata); current sampling
   * does not apply it.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.int64
  start = 0;

  /**
   * Cached combined RGBA color, updated by Update and UpdateValue. Components are not clamped
   * here.
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.color
  value = vec4.create();

  /**
   * TRIOPERATOR code selecting component-wise multiplication; all other values use addition in
   * the current sampler.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("blue.TRIOPERATOR")
  operator = TRIOPERATOR.TRIOP_MULTIPLY;

  /**
   * Ordered child color functions sampled and combined at the supplied time.
   * @type {BlueList<ITriColorFunction>}
   */
  @edit.read
  @edit.persist
  @type.list("ITriColorFunction")
  functions = new BlueList(ITriColorFunction, { className: null, listOps: 0 });

  /**
   * Reusable JavaScript RGBA scratch buffer holding each child's sampled color during
   * combination.
   * @type {Float32Array}
   */
  _childValue = vec4.create();

  /**
   * Updates the cached result of the child color functions.
   * Samples into invocation-local output before committing the cache through Update.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    const out = vec4.alloc();
    try
    {
      this.Update(time, out);
    }
    finally
    {
      vec4.unalloc(out);
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
    vec4.copy(this.value, out);
    return out;
  }

  /**
   * Combines child colors using Carbon's multiply or add operation.
   * JavaScript retains seconds-first/output-last calls and existing sampling math.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (this.operator === TRIOPERATOR.TRIOP_MULTIPLY)
    {
      vec4.set(out, 1, 1, 1, 1);
      for (const curve of this.functions)
      {
        curve.GetValueAt(time, this._childValue);
        vec4.multiply(out, out, this._childValue);
      }
      return out;
    }

    // Carbon's double-seconds overload starts additive evaluation at white.
    // TriCurveSet drives UpdateValue(double), so preserve that observable quirk.
    vec4.set(out, 1, 1, 1, 1);
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this._childValue);
      vec4.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Gets the longest duration exposed by a child function.
   * JavaScript queries exact native ITriDuration before ITriCurveLength; an advertised method is required.
   * @returns {number} Greatest child duration.
   */
  @carbon.method
  @impl.adapted
  Length()
  {
    let maxDuration = 0;
    for (const curve of this.functions)
    {
      const interfaces = mappedInterfaces(curve.constructor);
      const candidate = interfaces.has(ITriDuration) ? curve : interfaces.has(ITriCurveLength) ? curve : null;
      const duration = candidate ? candidate.Length() : 0;
      if (duration > maxDuration) maxDuration = duration;
    }
    return maxDuration;
  }

  /**
   * Shared operator constants exposed as a class-level convenience.
   * @type {Object<string, number>}
   */
  static TRIOPERATOR = TRIOPERATOR;

}

// Native query table deliberately omits the concrete class.
carbon.interfaceTable({ interfaces: [ITriFunction, ITriColorFunction, ITriCurveLength], chainTo: null })(TriColorSequencer);
