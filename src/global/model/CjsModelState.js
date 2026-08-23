/**
 * Per-model runtime state. One instance per model at `__state`.
 *
 * Ownership and clearing rules (kb section 8):
 * - `dirty` is the only generically managed member: mutations mark it, and
 *   `UpdateValues` (the settle) is the only thing that clears it. The
 *   pipeline is cooperative - anything mutating outside `SetValues`
 *   (direct writes, Object.assign, reader adapters) owes a `MarkDirty()`
 *   or an explicit `UpdateValues()` ("I made changes, apply please").
 * - `flags` holds lazy invalidations ("bounds is stale"). Written at
 *   mutation time from `@io.flag` field metadata or by class code; cleared
 *   ONLY by the getter that recomputes the derived value. Never
 *   auto-cleared - deferring until needed is their whole point.
 * - `rebuild` holds scheduled work requirements ("vertices need
 *   rebuilding"). Written at mutation time from `@io.rebuild` field
 *   metadata or by class code; cleared ONLY by the specific work method
 *   that succeeds (e.g. RebuildVertices), typically driven from Update /
 *   per-frame passes. Never auto-cleared.
 * - Future transient runtime state (lifecycle links, revision counters)
 *   lands here rather than growing new underscore properties.
 */
export class CjsModelState
{

    /** Something changed; the next settle applies it. @type {boolean} */
    dirty = false;

    /** Lazy invalidations - consumers clear when they recompute. @type {Set<string>} */
    flags = new Set();

    /** Scheduled work requirements - work methods clear on success. @type {Set<string>} */
    rebuild = new Set();

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
