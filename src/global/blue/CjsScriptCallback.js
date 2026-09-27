// Source: blueexposure/include/BlueScriptCallback.h
//   blueexposure/BlueScriptCallback.cpp
//
// Stores a JavaScript function or host callback object. Call returns its result;
// CallVoid discards it. Invocation adaptations are documented on those methods.
import { CjsSchema, impl } from "../schema/index.js";

/**
 * A stored script callback that can be invoked later.
 *
 * External JavaScript functions and callback-shaped host objects are adapted
 * once through {@link CjsScriptCallback.from}; runtime hot paths then call
 * `Call` or `CallVoid` directly.
 */
export class CjsScriptCallback
{

    /** Carbon's `m_callback` (BlueScriptValue): the stored callable, or null. */
    #callback = null;

    /**
     * Wraps one already-validated callable.
     *
     * Carbon's default constructor leaves the callback null, which is the
     * invalid state `IsValid` reports; constructing with no argument does the
     * same here. Prefer `from` at any boundary, which validates first.
     *
     * @param {Function|{Call: Function, CallVoid: Function}|null} [callback]
     */
    constructor(callback = null)
    {
        this.#callback = callback ?? null;
    }

    /**
     * Adapts one external callback value to this nominal identity.
     *
     * Custom: Carbon's BlueExtractArgumentImpl accepts a Python callable or None
     * (blueexposure/BlueScriptCallback.cpp:322-340). This adapter accepts functions
     * and host objects with Call and CallVoid, preserves existing wrappers, and
     * returns null for null or undefined instead of clearing a native output object.
     *
     * @param {CjsScriptCallback|Function|object|null|undefined} value - Callback boundary value.
     * @returns {CjsScriptCallback|null} A nominal callback or null.
     */
    static from(value)
    {
        if (value === null || value === undefined) return null;
        if (value instanceof CjsScriptCallback) return value;
        if (typeof value === "function") return new CjsScriptCallback(value);
        if (typeof value !== "object" || typeof value.Call !== "function" || typeof value.CallVoid !== "function")
        {
            throw new TypeError("A script callback must be a function, CjsScriptCallback, or object with Call and CallVoid methods.");
        }
        return new CjsScriptCallback(value);
    }

    /**
     * Reports whether a callback is stored.
     *
     * @returns {boolean} True when this callback can be invoked.
     */
    IsValid()
    {
        return this.#callback !== null;
    }

    /**
     * Releases the stored callback, leaving this invalid.
     *
     * @returns {void}
     */
    Destroy()
    {
        this.#callback = null;
    }

    /**
     * Invokes a callback whose return value is significant.
     *
     * Adapted: JavaScript returns the callback result directly, without Carbon's
     * typed output argument or BlueScriptCallbackStatus. Callback exceptions
     * propagate to the caller (blueexposure/include/BlueScriptCallback.h:144-170).
     * An invalid callback returns undefined; Carbon instead returns CALL_ERROR
     * and leaves the caller's output argument unchanged.
     *
     * @param {...*} args - Callback arguments.
     * @returns {*} Callback result, or undefined when invalid.
     */
    Call(...args)
    {
        const callback = this.#callback;

        if (callback === null) return undefined;
        return typeof callback === "function" ? callback(...args) : callback.Call(...args);
    }

    /**
     * Invokes a notification callback and discards its result.
     *
     * Adapted: Callback exceptions propagate in JavaScript instead of becoming
     * BlueScriptCallbackStatus::EXCEPTION. An invalid callback returns undefined
     * instead of CALL_ERROR; successful calls also return undefined rather than
     * OK (blueexposure/BlueScriptCallback.cpp:282-305).
     *
     * @param {...*} args - Callback arguments.
     * @returns {void}
     */
    CallVoid(...args)
    {
        const callback = this.#callback;

        if (callback === null) return;
        if (typeof callback === "function") callback(...args);
        else callback.CallVoid(...args);
    }

}

// DECLARED AS CALLS, NOT DECORATORS, matching every other file in this folder.
CjsSchema.decorateMethod(CjsScriptCallback, "IsValid", impl.implemented);
CjsSchema.decorateMethod(CjsScriptCallback, "Destroy", impl.implemented);
CjsSchema.decorateMethod(CjsScriptCallback, "Call", impl.adapted);
CjsSchema.decorateMethod(CjsScriptCallback, "CallVoid", impl.adapted);

// THE DONOR IS NAMED, not left to be derived from this class's name. The port
// keeps its Cjs name - schema can call a class whatever we want - and this
// declaration is the only thing tying it back to BlueScriptCallback. Without it
// a deliberately renamed port is indistinguishable from an invention, which is
// exactly how this class read before 2026-09-13.
CjsSchema.define(CjsScriptCallback, { className: "CjsScriptCallback", carbon: "BlueScriptCallback" });
