/**
 * Dependency-free callback identity for Carbon-style script invocation.
 *
 * External JavaScript functions and callback-shaped host objects are adapted
 * once through {@link CjsScriptCallback.from}; runtime hot paths then call the
 * required methods directly.
 */
export class CjsScriptCallback
{

    /**
     * Adapts one external callback value to the nominal runtime contract.
     *
     * @param {CjsScriptCallback|Function|object|null|undefined} value - Callback boundary value.
     * @returns {CjsScriptCallback|null} A nominal callback or null.
     */
    static from(value)
    {
        if (value === null || value === undefined) return null;
        if (value instanceof CjsScriptCallback) return value;
        if (typeof value === "function") return new CjsFunctionScriptCallback(value);
        if (typeof value !== "object" || typeof value.Call !== "function" || typeof value.CallVoid !== "function")
        {
            throw new TypeError("A script callback must be a function, CjsScriptCallback, or object with Call and CallVoid methods.");
        }
        return new CjsExternalScriptCallback(value);
    }

    /**
     * Invokes a callback whose return value is significant.
     *
     * @param {...*} _args - Callback arguments.
     * @returns {*} Callback result.
     */
    Call(..._args)
    {
        throw new Error(
            "CjsScriptCallback.Call must be overridden by a concrete script callback."
        );
    }

    /**
     * Invokes a notification callback and discards its result.
     *
     * @param {...*} _args - Callback arguments.
     * @returns {void}
     */
    CallVoid(..._args)
    {
        throw new Error(
            "CjsScriptCallback.CallVoid must be overridden by a concrete script callback."
        );
    }

}

/** Adapts one ordinary JavaScript function to the nominal callback contract. */
class CjsFunctionScriptCallback extends CjsScriptCallback
{

    #callback;

    /** Stores one validated JavaScript function. */
    constructor(callback)
    {
        super();
        this.#callback = callback;
    }

    /** Invokes the function and returns its result. */
    Call(...args)
    {
        return this.#callback(...args);
    }

    /** Invokes the function and discards its result. */
    CallVoid(...args)
    {
        this.#callback(...args);
    }

}

/** Adapts one externally supplied callback object after boundary validation. */
class CjsExternalScriptCallback extends CjsScriptCallback
{

    #callback;

    /** Stores one validated external callback object. */
    constructor(callback)
    {
        super();
        this.#callback = callback;
    }

    /** Directly invokes the external return-bearing method. */
    Call(...args)
    {
        return this.#callback.Call(...args);
    }

    /** Directly invokes the external notification method. */
    CallVoid(...args)
    {
        this.#callback.CallVoid(...args);
    }

}
