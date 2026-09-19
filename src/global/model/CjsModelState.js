import { RUNTIME_STATE_PROTOTYPE } from "../compose/runtimeState.js";

/**
 * Per-model runtime state. One instance per model at `__state`.
 *
 * Ownership and clearing rules (kb section 8):
 * - `dirty` is the only generically managed member: mutations mark it, and
 *   `UpdateValues` (the settle) is the only thing that clears it. The
 *   pipeline is cooperative - anything mutating outside `SetValues`
 *   (direct writes, Object.assign, reader adapters) owes a `MarkDirty()`
 *   or an explicit `UpdateValues()` ("I made changes, apply please").
 * - Future transient runtime state (lifecycle links, revision counters)
 *   lands here rather than growing new underscore properties.
 */
export class CjsModelState
{

    /** Something changed; the next settle applies it. @type {boolean} */
    dirty = false;

    /** Settle re-entrancy guard. @type {boolean} */
    updating = false;

    /** Construction/teardown event gate (counted). @type {number} */
    suppressEvents = 0;

    /**
     * Checks whether a settle is owed.
     *
     * @returns {boolean}
     */
    IsDirty()
    {
        return this.dirty;
    }

    /**
     * Marks the model as changed ("apply at the next settle").
     *
     * @returns {CjsModelState} This state.
     */
    MarkDirty()
    {
        this.dirty = true;
        return this;
    }

    /**
     * Clears the dirty mark. The settle calls this; class code rarely should.
     *
     * @returns {CjsModelState} This state.
     */
    ClearDirty()
    {
        this.dirty = false;
        return this;
    }

}


// Models put a CjsModelState in the same __state slot a composed class fills
// with a plain state object, so it answers the same questions - HasListener
// first among them. Linking the prototypes rather than copying the method
// means anything added to the shared state surface reaches models too.
Object.setPrototypeOf(CjsModelState.prototype, RUNTIME_STATE_PROTOTYPE);
