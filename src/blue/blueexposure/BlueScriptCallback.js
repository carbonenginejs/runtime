// Source: blueexposure/include/BlueScriptCallback.h
//   blueexposure/BlueScriptCallback.cpp
//
// Stores a JavaScript function, the script callable Carbon's BlueScriptCallback
// holds. Call returns its result; CallVoid discards it. Invocation adaptations
// are documented on those methods.
import { CjsSchema, blue } from "../schema/index.js";

/**
 * A stored script callback that can be invoked later.
 *
 * A JavaScript function is wrapped once at the boundary through
 * {@link BlueScriptCallback.from}; runtime hot paths then call `Call` or
 * `CallVoid` directly.
 *
 * Carbon: BlueScriptCallback (blueexposure/include/BlueScriptCallback.h:54)
 */
export class BlueScriptCallback
{

    /** Carbon's `m_callback` (BlueScriptValue): the stored callable, or null. */
    _callback = null;

    /**
     * Wraps a function, or copies another callback's callable.
     *
     * Carbon's default constructor leaves the callback null, which is the
     * invalid state `IsValid` reports; constructing with no argument does the
     * same here. Given a BlueScriptCallback this is Carbon's copy constructor:
     * the new callback holds the same callable, and destroying either leaves
     * the other valid. Prefer `from` at any boundary, which validates first.
     *
     * @param {Function|BlueScriptCallback|null} [callback]
     */
    constructor(callback = null)
    {
        const source = CjsSchema.cast(callback, BlueScriptCallback);
        this._callback = source ? source._callback : callback ?? null;
    }

    /**
     * Adapts one boundary value to a script callback.
     *
     * Custom: Carbon's BlueExtractArgumentImpl accepts a Python callable or None
     * (blueexposure/BlueScriptCallback.cpp:322-340). The JavaScript callable is
     * a function; an existing BlueScriptCallback passes through, and null or
     * undefined return null instead of clearing a native output object.
     *
     * @param {BlueScriptCallback|Function|null|undefined} value - Callback boundary value.
     * @returns {BlueScriptCallback|null} A script callback or null.
     * @throws {TypeError} Anything else, as Carbon's extraction fails.
     */
    static from(value)
    {
        if (value === null || value === undefined) return null;
        const callback = CjsSchema.cast(value, BlueScriptCallback);
        if (callback) return callback;
        if (typeof value === "function") return new BlueScriptCallback(value);
        throw new TypeError("A script callback must be a function or a BlueScriptCallback.");
    }

    /**
     * Reports whether a callback is stored.
     *
     * @implemented
     * @returns {boolean} True when this callback can be invoked.
     */
    IsValid()
    {
        return this._callback !== null;
    }

    /**
     * Releases the stored callback, leaving this invalid.
     *
     * @implemented
     * @returns {void}
     */
    Destroy()
    {
        this._callback = null;
    }

    /**
     * Invokes a callback whose return value is significant.
     *
     * @adapted JavaScript returns the callback result directly, without Carbon's
     *   typed output argument or BlueScriptCallbackStatus. Callback exceptions
     *   propagate to the caller (blueexposure/include/BlueScriptCallback.h:144-170).
     *   An invalid callback returns undefined; Carbon instead returns CALL_ERROR
     *   and leaves the caller's output argument unchanged.
     * @param {...*} args - Callback arguments.
     * @returns {*} Callback result, or undefined when invalid.
     */
    Call(...args)
    {
        const callback = this._callback;

        if (callback === null) return undefined;
        return callback(...args);
    }

    /**
     * Invokes a notification callback and discards its result.
     *
     * @adapted Callback exceptions propagate in JavaScript instead of becoming
     *   BlueScriptCallbackStatus::EXCEPTION. An invalid callback returns undefined
     *   instead of CALL_ERROR; successful calls also return undefined rather than
     *   OK (blueexposure/BlueScriptCallback.cpp:282-305).
     * @param {...*} args - Callback arguments.
     * @returns {void}
     */
    CallVoid(...args)
    {
        const callback = this._callback;

        if (callback === null) return;
        callback(...args);
    }

}

// DECLARED AS CALLS, NOT DECORATORS, matching every other file in this folder.

// THE DONOR IS NAMED, not left to be derived from this class's name. The port
// keeps its Cjs name - schema can call a class whatever we want - and this
// declaration is the only thing tying it back to BlueScriptCallback. Without it
// a deliberately renamed port is indistinguishable from an invention, which is
// exactly how this class read before 2026-09-13.
CjsSchema.blue.define(BlueScriptCallback, { className: "BlueScriptCallback" });
