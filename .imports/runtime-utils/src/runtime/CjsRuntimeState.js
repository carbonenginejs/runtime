/**
 * Gets an object's own CarbonEngineJS runtime state without creating it.
 *
 * Runtime state is intentionally stored on the object for inspection while
 * remaining outside enumeration and serialization.
 *
 * @param {object|Function} target
 * @returns {object|null}
 */
export function getRuntimeState(target)
{
    assertRuntimeStateTarget(target);
    if (!Object.prototype.hasOwnProperty.call(target, "__state")) return null;

    const state = target.__state;
    if (!state || typeof state !== "object" || Array.isArray(state))
    {
        throw new TypeError("Existing __state must be an object.");
    }
    return state;
}

/**
 * Gets or creates an object's own non-enumerable runtime state.
 *
 * @param {object|Function} target
 * @returns {object}
 */
export function ensureRuntimeState(target)
{
    const existing = getRuntimeState(target);
    if (existing) return existing;

    const state = {};
    Object.defineProperty(target, "__state", {
        value: state,
        enumerable: false,
        configurable: false,
        writable: false
    });
    return state;
}

function assertRuntimeStateTarget(target)
{
    if ((typeof target !== "object" || target === null) && typeof target !== "function")
    {
        throw new TypeError("Runtime state requires an object or function.");
    }
}
