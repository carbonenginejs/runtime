// Source: blueexposure/include/BlueScriptCallback.h
//   blueexposure/BlueScriptCallback.cpp
//
// Carbon's BlueScriptCallback: "encapsulates script callback functions. One can
// store a script function in BlueScriptCallback and subsequently call it from
// C++." Tr2MainWindow holds sixteen of them - every window, mouse, key, focus
// and IME hook it exposes (Tr2MainWindow.h:191-226) - so the type is the
// donor's, not ours.
//
// ONE CONCRETE CLASS, BECAUSE THAT IS WHAT CARBON HAS. This was previously a
// nominal base with two private subclasses adapting a function and a
// callback-shaped object. Carbon has no such hierarchy: it stores one
// BlueScriptValue and dispatches on it. The subclasses were also what made the
// file unsplittable - the base's `from` constructed them while they extended
// it, which is an ESM cycle that throws on evaluation.
//
// Call AND CallVoid ARE CARBON'S PAIR, not an invention: Call takes the return
// value by reference, CallVoid discards it (BlueScriptCallback.h:67-104).
//
// WHAT DIVERGES, AND WHY. Carbon returns BlueScriptCallbackStatus from every
// call, carrying OK / CALL_ERROR / EXCEPTION plus the captured Python type,
// value and traceback, so a caller can MuteException or ReportException. That
// object exists because a C++ caller cannot see a Python exception any other
// way. JavaScript has one exception mechanism for both sides, so a throwing
// callback simply propagates, and no status is returned. Nothing here consumes
// a status today; if mute/report behaviour is ever needed, it is a real port of
// BlueScriptCallbackStatus and not a flag on this class.
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
     * Carbon reaches the same point through BlueExtractArgumentImpl, which
     * extracts a callable out of a script argument and rejects anything else
     * (BlueScriptCallback.h:112-117). This is that boundary in JavaScript.
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
     * An invalid callback does nothing and returns undefined, matching Carbon,
     * which returns CALL_ERROR rather than failing
     * (BlueScriptCallback.cpp:282-287).
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
CjsSchema.decorateMethod(CjsScriptCallback, "Call", impl.reason("Carbon returns BlueScriptCallbackStatus so a C++ caller can see a Python exception; JavaScript shares one exception mechanism, so a throwing callback propagates and no status is returned."));
CjsSchema.decorateMethod(CjsScriptCallback, "CallVoid", impl.adapted);
CjsSchema.decorateMethod(CjsScriptCallback, "CallVoid", impl.reason("Carbon returns BlueScriptCallbackStatus so a C++ caller can see a Python exception; JavaScript shares one exception mechanism, so a throwing callback propagates and no status is returned."));

// THE DONOR IS NAMED, not left to be derived from this class's name. The port
// keeps its Cjs name - schema can call a class whatever we want - and this
// declaration is the only thing tying it back to BlueScriptCallback. Without it
// a deliberately renamed port is indistinguishable from an invention, which is
// exactly how this class read before 2026-09-13.
CjsSchema.define(CjsScriptCallback, { className: "CjsScriptCallback", carbon: "BlueScriptCallback" });
