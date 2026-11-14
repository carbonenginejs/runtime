// Modified notification: marks an object dirty and calls its `OnModified` (INotify) once per edit. Blue's children
// lists and the values interface use it.
import { ensureRuntimeState } from "./runtimeState.js";


/**
 * Reports explicit changes made outside SetValues. Names are canonical member
 * names; the caller chooses them independently of the member NOTIFY flag.
 *
 * @param {object} target Changed object.
 * @param {string|string[]} names Changed member or members; duplicates collapse.
 * @param {object} [options] Event source and notification suppression options.
 * @returns {boolean} False when OnModified refuses the change.
 */
export function NotifyModified(target, names, options = {})
{
    if (typeof names !== "string" && !Array.isArray(names))
    {
        throw new TypeError("NotifyModified requires a member name or array of names.");
    }
    const changed = new Set(typeof names === "string" ? [names] : names);
    for (const name of changed)
    {
        if (typeof name !== "string") throw new TypeError("Modified member names must be strings.");
    }
    if (!changed.size || options.markDirty === false) return true;
    ensureRuntimeState(target).dirty = true;
    if (options.skipUpdate === true) return true;
    return dispatchModified(target, options.notify === false ? [] : [...changed]);
}

/**
 * Calls the owner's `OnModified` once (INotify) and clears the dirty flag
 * unless the hook refuses or throws.
 * @param {object} target The owner.
 * @param {string[]|null} names The modified members; null for "everything".
 * @returns {boolean} Whether the hook accepted the edit.
 */
export function dispatchModified(target, names)
{
    const state = ensureRuntimeState(target);
    // Clear before the hook: nested skipped or failed edits must stay dirty.
    state.dirty = false;
    const hook = target.OnModified;
    try
    {
        if (typeof hook === "function" && (names === null || names.length))
        {
            const argument = names === null ? null : names.length === 1 ? names[0] : names.slice();
            if (hook.call(target, argument) === false)
            {
                state.dirty = true;
                return false;
            }
        }
    }
    catch (error)
    {
        state.dirty = true;
        throw error;
    }
    return true;
}
