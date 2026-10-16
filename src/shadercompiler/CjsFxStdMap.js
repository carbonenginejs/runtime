import { CjsSchema } from "#schema/CjsSchema";

// Custom: iteration order of a C++ std::map.

/**
 * C++ `std::less` for the key types Carbon uses: numbers numerically, strings
 * by code unit (for ASCII keys, `strcmp` order).
 *
 * @param {string|number} a First key.
 * @param {string|number} b Second key.
 * @returns {number} Negative, zero or positive.
 */
function defaultCompare(a, b)
{
    if (typeof a === "number" && typeof b === "number")
    {
        return a - b;
    }
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A `Map` that iterates in ascending key order, as a C++ `std::map` does.
 *
 * Carbon keys several maps by `InlineString` (register bindings by shader
 * profile, defines by name) and by small integers (resources by register)
 * and walks them in key order. Keys here are plain strings or numbers.
 * Insertion, lookup and deletion are the ordinary `Map` operations.
 */
export class CjsFxStdMap extends Map
{
    _compare = null;

    /**
     * @param {(a: *, b: *) => number} [compare] Key order; numbers numerically and strings by code unit when omitted.
     */
    constructor(compare = defaultCompare)
    {
        super();

        this._compare = compare;
    }

    /**
     * Entries in ascending key order.
     *
     * @returns {IterableIterator<[*, *]>} The entries.
     */
    entries()
    {
        return [...super.entries()].sort((a, b) => this._compare(a[0], b[0])).values();
    }

    /**
     * Keys in ascending order.
     *
     * @returns {IterableIterator<*>} The keys.
     */
    keys()
    {
        return [...this.entries()].map(entry => entry[0]).values();
    }

    /**
     * Values in ascending key order.
     *
     * @returns {IterableIterator<*>} The values.
     */
    values()
    {
        return [...this.entries()].map(entry => entry[1]).values();
    }

    /**
     * Calls `callback` for each entry in ascending key order.
     *
     * @param {(value: *, key: *, map: CjsFxStdMap) => void} callback Called per entry.
     */
    forEach(callback)
    {
        for (const [key, value] of this.entries())
        {
            callback(value, key, this);
        }
    }

    /**
     * The first entry in key order, as `std::map::begin()`.
     *
     * @returns {[*, *]|null} The entry, or null when empty.
     */
    First()
    {
        const first = this.entries().next();
        return first.done ? null : first.value;
    }

    [globalThis.Symbol.iterator]()
    {
        return this.entries();
    }
}

CjsSchema.meta.define(CjsFxStdMap, { className: "CjsFxStdMap" });
