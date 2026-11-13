import { CjsGraph } from "./CjsGraph.js";

/** @typedef {import("./CjsGraphState.js").CjsGraphState} CjsGraphState */

/**
 * Base class for objects that take part in graph operations: thin forwards and per-object state.
 * @cjs Our class, above IRoot. Direct CjsGraph calls work without it.
 */
export class CjsGraphRoot
{

  /**
   * Runtime state, null until something needs it; only CjsGraph.getState creates it.
   * @type {?CjsGraphState}
   */
  __cjs = null;

  /**
   * Whether this object is being destructed or has been.
   * @cjs Thin forward to the graph.
   * @returns {boolean} False for an object with no state.
   */
  IsDestructed()
  {
    return CjsGraph.isDestructed(this);
  }

  /**
   * Runs the registered ancestry's teardown bodies without changing graph ownership or state.
   * @cjs Thin forward to the graph; hooks own repeat-call safety.
   * @param {...*} args Arguments required by this object's existing teardown contract.
   * @returns {void}
   */
  Destruct(...args)
  {
    CjsGraph.destruct(this, ...args);
  }

  /**
   * What graph Destruct must do for this class, before any C++ destruction. A class overrides it
   * for state JavaScript added and ends with `return super.OnDestruct(options)`; one that must
   * not be destructed returns false and does nothing else.
   * @cjs Only Destruct calls it.
   * @param {object} [options] What Destruct was given.
   * @returns {boolean} True: the root has nothing to do and refuses nothing.
   */
  OnDestruct(options)
  {
    return true;
  }

  /**
   * Returns this object's values.
   * @cjs
   */
  GetValues(options)
  {
    return CjsGraph.get(this, options);
  }

  /**
   * Writes values into this object; returns what changed, or false.
   * @cjs
   */
  SetValues(values, options)
  {
    return CjsGraph.set(this, values, options);
  }

  /**
   * Tells this object about its own members: OnModified per NOTIFY member, in member-table
   * order, for those named or, with no names, all of them (CjsGraph.updateValues).
   * @cjs
   * @param {string|string[]|null} [names=null] One member, several, or null for all.
   * @param {{skipValidation?: boolean}} [options] Opt-outs.
   * @returns {void}
   */
  UpdateValues(names = null, options)
  {
    CjsGraph.updateValues(this, names, options);
  }

  /**
   * Returns one member's value.
   * @cjs
   */
  GetValue(name, options)
  {
    return CjsGraph.getValue(this, name, options);
  }

  /**
   * Writes one member; returns what changed, or false.
   * @cjs
   */
  SetValue(name, value, options)
  {
    return CjsGraph.setValue(this, name, value, options);
  }

  /**
   * Copies another object's values into this one; returns what changed, or false.
   * @cjs
   */
  Copy(source, options)
  {
    return CjsGraph.copy(source, this, options);
  }

  /**
   * Creates a separate graph with this object's values.
   * @cjs
   */
  Clone(options)
  {
    return CjsGraph.clone(this, options);
  }

  /**
   * Creates an instance of this class from values.
   * @cjs
   */
  static from(values, options)
  {
    return CjsGraph.from(this, values, options);
  }

  /** Stable class identity. */
  static className = "CjsGraphRoot";

}
