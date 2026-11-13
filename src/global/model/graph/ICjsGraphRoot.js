import { CjsGraph } from "./CjsGraph.js";

/** @typedef {import("./CjsGraphState.js").CjsGraphState} CjsGraphState */

/**
 * Base class for objects that take part in graph operations: thin forwards and per-object state.
 * It holds no logic: each method is one call into CjsGraph, which works without it.
 * @cjs Our class, above IRoot.
 */
export class ICjsGraphRoot
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
   * Ends this object, once: its OnDestruct, then its C++ destruction.
   * @cjs Thin forward to the graph, which holds the steps and the state.
   * @param {*} [options] Handed to OnDestruct unchanged.
   * @returns {boolean} True if it ran; false on a second call, or if OnDestruct refused.
   */
  Destruct(options)
  {
    return CjsGraph.destruct(this, options);
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
   * @param {object} [options] As CjsGraph.get.
   * @returns {object} A plain bag.
   */
  GetValues(options)
  {
    return CjsGraph.get(this, options);
  }

  /**
   * Writes values into this object.
   * @cjs
   * @param {?object} values Plain values.
   * @param {object} [options] As CjsGraph.set.
   * @returns {object|false} What changed, or false.
   */
  SetValues(values, options)
  {
    return CjsGraph.set(this, values, options);
  }

  /**
   * Tells this object about its own members after a direct write: OnModified per NOTIFY member, in
   * member-table order, for those named or, with no names, all of them. It never reaches children.
   * @cjs For tools and loading; engine code calls Carbon's methods.
   * @param {string|string[]|null} [names=null] One member, several, or null for all.
   * @param {{skipValidation?: boolean}} [options] Opt-outs.
   * @returns {void}
   */
  CommitValues(names = null, options)
  {
    CjsGraph.commitValues(this, names, options);
  }

  /**
   * Copies another object's values into this one, keeping this object's identity.
   * @cjs
   * @param {object} source The object to copy from.
   * @param {object} [options] As CjsGraph.copy.
   * @returns {object|false} What changed, or false.
   */
  CopyValues(source, options)
  {
    return CjsGraph.copy(source, this, options);
  }

  /**
   * Creates a separate graph with this object's values.
   * @cjs
   * @param {object} [options] As CjsGraph.clone.
   * @returns {object} The new object.
   */
  CloneValues(options)
  {
    return CjsGraph.clone(this, options);
  }

  /**
   * Visits this object and what its declared members reach, once each.
   * @cjs
   * @param {function(object, object): (boolean|void)} visit Called per object; false skips its children.
   * @param {object} [options] As CjsGraph.traverse.
   * @returns {number} How many objects were visited.
   */
  Traverse(visit, options)
  {
    return CjsGraph.traverse(this, visit, options);
  }

  /**
   * Returns an object's values. The object must be exactly this class.
   * @cjs CjsGraph.get behind this class's door.
   * @param {object} object An instance of exactly this class.
   * @param {object} [options] As CjsGraph.get.
   * @returns {object} A plain bag.
   */
  static get(object, options)
  {
    return CjsGraph.get(CjsGraph.door(this, object), options);
  }

  /**
   * Writes values into an object. The object must be exactly this class, and a _type the values name must be it.
   * @cjs CjsGraph.set behind this class's door.
   * @param {object} object An instance of exactly this class.
   * @param {?object} values Plain values.
   * @param {object} [options] As CjsGraph.set.
   * @returns {object|false} What changed, or false.
   */
  static set(object, values, options)
  {
    return CjsGraph.set(CjsGraph.door(this, object), CjsGraph.doorValues(this, values), options);
  }

  /**
   * Copies one object's values into another. Both must be exactly this class.
   * @cjs CjsGraph.copy behind this class's door.
   * @param {object} source The object to copy from.
   * @param {object} target The object to copy into.
   * @param {object} [options] As CjsGraph.copy.
   * @returns {object|false} What changed, or false.
   */
  static copy(source, target, options)
  {
    return CjsGraph.copy(CjsGraph.door(this, source), CjsGraph.door(this, target), options);
  }

  /**
   * Creates a separate graph with a live object's values. The object must be exactly this class.
   * @cjs CjsGraph.clone behind this class's door.
   * @param {object} object An instance of exactly this class.
   * @param {object} [options] As CjsGraph.clone.
   * @returns {object} The new object.
   */
  static clone(object, options)
  {
    return CjsGraph.clone(CjsGraph.door(this, object), options);
  }

  /**
   * Creates an instance of this class from plain values. A _type the values name must be this class.
   * @cjs CjsGraph.from behind this class's door.
   * @param {?object} values Plain values.
   * @param {object} [options] As CjsGraph.from.
   * @returns {object} The new object.
   */
  static from(values, options)
  {
    return CjsGraph.from(this, CjsGraph.doorValues(this, values), options);
  }

  /** Stable class identity. */
  static className = "ICjsGraphRoot";

}

// The root declares its capabilities once; every class below has them along its base list.
CjsGraph.defineLifetime(ICjsGraphRoot, { name: "ICjsGraphRoot", capabilities: [ "values", "destruct" ] });
