/**
 * A graph object's runtime state, held in its `__cjs` field and created only when something needs
 * it (CjsGraph.getState). An object with none has never been asked and is alive.
 * @cjs Carbon keeps no such record: a C++ object ends with its last reference. It is never a
 * member, so no value operation reads, copies, clones or saves it.
 */
export class CjsGraphState
{

  /**
   * Where the object is in its life, a CjsGraphState.State. Anything above ALIVE is not alive.
   * @type {number}
   */
  state = CjsGraphState.State.ALIVE;

  /**
   * Whether the object is prepared; kept apart from `state`, which it never changes.
   * @type {boolean}
   */
  prepared = false;

  /**
   * The object's session identity, 0 until it is first asked for. Never saved.
   * @type {number}
   */
  guid = 0;

  /**
   * The values of `state`.
   * @cjs
   * @enum {number}
   */
  static State = Object.freeze({
    ALIVE: 0,
    DESTRUCTING: 1,
    DESTRUCTED: 2
  });

  /** Stable class identity. */
  static className = "CjsGraphState";

}
