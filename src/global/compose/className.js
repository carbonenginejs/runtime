// The registered name of a class, read from the constructor alone.
//
// Minification renames classes, so `constructor.name` is wrong in a shipped
// bundle (source-style.md, *Function.name is not identity*). The persistent name
// lives on the constructor: `CjsSchema.define` stamps `CJS_CLASS_NAME`, and a
// class the schema does not register declares `static className`. Reading it
// needs nothing else, so this module imports nothing: compose/ siblings and
// the schema both reach it without a cycle.

/**
 * Registered-name brand. The global-registry key lets a second copy of the
 * runtime read a name the first stamped.
 */
export const CJS_CLASS_NAME = Symbol.for("carbonenginejs.className");

/**
 * The nearest registered name on a constructor's chain: an own
 * `CJS_CLASS_NAME` stamp or an own string `static className`.
 *
 * @param {Function} Constructor Class to name.
 * @returns {string|null} The registered name, or `null`.
 */
export function getRegisteredClassName(Constructor)
{
    let current = Constructor;
    while (typeof current === "function")
    {
        const name = Object.hasOwn(current, CJS_CLASS_NAME)
            ? current[CJS_CLASS_NAME]
            : (Object.hasOwn(current, "className") && typeof current.className === "string" ? current.className : null);
        if (name)
        {
            return name;
        }
        current = Object.getPrototypeOf(current);
    }
    return null;
}
