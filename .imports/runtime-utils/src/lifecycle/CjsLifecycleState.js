import { ensureRuntimeState, getRuntimeState } from "../runtime/CjsRuntimeState.js";

export const CJS_LIFECYCLE = Object.freeze({
    ALIVE: "alive",
    DESTROY_PENDING: "destroyPending",
    DESTROYING: "destroying",
    DESTROYED: "destroyed"
});

/** Inspectable lifecycle state shared by participating runtime objects. */
export class CjsLifecycleState
{

    status = CJS_LIFECYCLE.ALIVE;

    Is(status)
    {
        return this.status === status;
    }

    IsAlive()
    {
        return this.Is(CJS_LIFECYCLE.ALIVE);
    }

    IsAvailable()
    {
        return this.IsAlive();
    }

}

/**
 * Installs shared, non-enumerable lifecycle state on an object.
 *
 * @param {object|Function} target
 * @returns {CjsLifecycleState}
 */
export function initializeLifecycleState(target)
{
    const state = ensureRuntimeState(target);
    if (Object.prototype.hasOwnProperty.call(state, "lifecycle"))
    {
        if (!(state.lifecycle instanceof CjsLifecycleState))
        {
            throw new TypeError("Existing __state.lifecycle must be a CjsLifecycleState.");
        }
        return state.lifecycle;
    }

    const lifecycle = new CjsLifecycleState();
    Object.defineProperty(state, "lifecycle", {
        value: lifecycle,
        enumerable: true,
        configurable: false,
        writable: false
    });
    return lifecycle;
}

/**
 * Gets lifecycle state without enrolling the target in lifecycle management.
 *
 * An absent state means the target is ordinarily alive and unmanaged.
 *
 * @param {object|Function} target
 * @returns {CjsLifecycleState|null}
 */
export function getLifecycleState(target)
{
    const lifecycle = getRuntimeState(target)?.lifecycle ?? null;
    if (lifecycle !== null && !(lifecycle instanceof CjsLifecycleState))
    {
        throw new TypeError("Existing __state.lifecycle must be a CjsLifecycleState.");
    }
    return lifecycle;
}
