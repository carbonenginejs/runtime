/**
 * The shared prototype every runtime-state object is created from.
 *
 * It exists so questions about an object's state have ONE door regardless of
 * which decorators the class took. `HasListener` is the first: an emitter is
 * opt-in, so a caller deciding whether to build an event payload would
 * otherwise have to know whether the class composed one. Here it always
 * answers, and answers false when nothing ever attached.
 *
 * How it answers is free to change behind the method - today a boolean that
 * `@compose.notify` maintains where it creates and drops its listener map.
 */
export const RUNTIME_STATE_PROTOTYPE = Object.freeze({
    /**
     * Whether anything is listening on the owner of this state.
     *
     * The base answer is always FALSE, and deliberately so: an emitter is
     * opt-in, so most objects can never have a listener and this is the whole
     * truth for them. `@compose.notify` HIJACKS this method - replacing it as
     * an own property on the state when the first listener creates the
     * listener map, and deleting that override when the last one leaves, so
     * the stub answers again. The method's presence IS the state; nothing has
     * to be kept in sync beside it.
     *
     * @param {string} [_eventName] Narrows to one event name; omit for
     *     "anything at all", which is the cheap path a settle wants.
     * @returns {Boolean}
     */
    HasListener(_eventName = "*")
    {
        return false;
    }
});


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

    const state = Object.create(RUNTIME_STATE_PROTOTYPE);
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
