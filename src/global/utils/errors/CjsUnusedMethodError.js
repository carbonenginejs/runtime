import { CjsError } from "./CjsError.js";


export const CJS_UNUSED_METHOD = "CJS_UNUSED_METHOD";


/**
 * Thrown by a Carbon method the class lists in `define({ unused })`: one this
 * runtime deliberately does not use. Unlike `meta.notImplemented`, which marks
 * a port still to come, an unused method will not be ported; the thrower is
 * there until the method is removed from the class.
 */
export class CjsUnusedMethodError extends CjsError
{
    /** Stable error identity independent of minified constructor names. */
    static className = "CjsUnusedMethodError";

    /**
     * @param {string} className The declaring class's registered name.
     * @param {string} methodName The Carbon method name.
     */
    constructor(className, methodName)
    {
        super(CJS_UNUSED_METHOD,
            `${className}.${methodName} is a Carbon method this runtime deliberately does not use.`,
            { details: { className, methodName } });
        this.className = className;
        this.methodName = methodName;
    }
}
