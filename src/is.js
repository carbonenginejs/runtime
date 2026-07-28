
import { equals } from "./num.js";


const toString = Object.prototype.toString;

/**
 * Checks if a value is a date
 * @param s
 * @returns {boolean}
 */
export function isDate(s)
{
    return !!(s && s instanceof Date);
}

/**
 * Checks if a value is a map
 * @param o
 * @returns {boolean}
 */
export function isMap(o)
{
    return !!(o && o instanceof Map);
}

/**
 * Checks if a value is a set
 * @param o
 * @returns {boolean}
 */
export function isSet(o)
{
    return !!(o && o instanceof Set);
}

/**
 * Checks if an object is iterable
 * @param {*} a
 * @returns {boolean}
 */
export function isIterable(a)
{
    return a !== null && a !== undefined && typeof a[Symbol.iterator] === "function";
}

/**
 * Checks if a value is an array
 * @param {*} a
 * @returns {Boolean}
 */
export const isArray = Array.isArray;

/**
 * Checks if a value is an array or a typed array
 * @param {*} a
 * @param {number} [minLength=0]
 * @returns {Boolean}
 */
export function isArrayLike(a, minLength = 0)
{
    return !!(a && (isArray(a) || isTyped(a)) && a.length >= minLength);
}

/**
 * Checks if a function is async
 * @param {*} a
 * @returns {boolean}
 */
export function isAsyncFunction(a)
{
    return !!(isFunction(a) && a.constructor.name === "AsyncFunction");
}


/**
 * Checks if a value is a boolean
 * @param {*} a
 * @returns {Boolean}
 */
export function isBoolean(a)
{
    return isTag(a, "[object Boolean]");
}

/**
 * Checks if a value is an html canvas element
 * @param {*} a
 * @returns {Boolean}
 */
export function isCanvas(a)
{
    return typeof HTMLCanvasElement !== "undefined" && a instanceof HTMLCanvasElement;
}

/**
 * Checks if a value is a descriptor
 * @author jay phelps
 * @param {*} a
 * @returns {Boolean}
 */
export function isDescriptor(a)
{
    if (!a || !a.hasOwnProperty)
    {
        return false;
    }

    const keys = [ "value", "initializer", "get", "set" ];

    for (let i = 0, l = keys.length; i < l; i++)
    {
        if (a.hasOwnProperty(keys[i]))
        {
            return true;
        }
    }

    return false;
}

/**
 * Checks if a value is a valid sof DNA string
 * @param {*} a
 */
export function isDNA(a)
{
    return isString(a) && /^[\w-]+:[\w-]+:[\w-]+$/.test(a);
}

/**
 * Checks if a value is an error
 * @param {*} a
 * @returns {Boolean}
 */
export function isError(a)
{
    return !!(a && (a instanceof Error || a.constructor?.__category === "Error"));
}

/**
 * Checks if a value is a number
 * @param {*} a
 * @returns {Boolean}
 */
export function isNumber(a)
{
    return isTag(a, "[object Number]");
}

/**
 * Checks if a value fits a signed 8-bit integer.
 * @param {*} value
 * @returns {Boolean}
 */
export function isInt8(value)
{
    return Number.isInteger(value) && value >= -0x80 && value <= 0x7f;
}

/**
 * Checks if a value fits an unsigned 8-bit integer.
 * @param {*} value
 * @returns {Boolean}
 */
export function isUint8(value)
{
    return Number.isInteger(value) && value >= 0 && value <= 0xff;
}

/**
 * Checks if a value fits a signed 16-bit integer.
 * @param {*} value
 * @returns {Boolean}
 */
export function isInt16(value)
{
    return Number.isInteger(value) && value >= -0x8000 && value <= 0x7fff;
}

/**
 * Checks if a value fits an unsigned 16-bit integer.
 * @param {*} value
 * @returns {Boolean}
 */
export function isUint16(value)
{
    return Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

/**
 * Checks if a value fits a signed 32-bit integer.
 * @param {*} value
 * @returns {Boolean}
 */
export function isInt32(value)
{
    return Number.isInteger(value)
        && value >= -0x80000000
        && value <= 0x7fffffff;
}

/**
 * Checks if a value fits an unsigned 32-bit integer.
 * @param {*} value
 * @returns {Boolean}
 */
export function isUint32(value)
{
    return Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
}

/**
 * Checks if a value is a function
 * @param {*} a
 * @returns {Boolean}
 */
export function isFunction(a)
{
    return typeof a === "function";
}

/**
 * Checks if a value is null or undefined
 * @param {*} a
 * @returns {Boolean}
 */
export function isNoU(a)
{
    return a == null;
}

/**
 * Checks if a value is null
 * @param {*} a
 * @returns {Boolean}
 */
export function isNull(a)
{
    return a === null;
}

/**
 * Checks if a value is an object and not null
 * @param {*} a
 * @returns {Boolean}
 */
export function isObject(a)
{
    const type = typeof a;
    return a !== null && (type === "object" || type === "function");
}

/**
 * Checks if a value has the type object, and is not null
 * @param {*} a
 * @returns {Boolean}
 */
export function isObjectLike(a)
{
    return a !== null && typeof a === "object";
}

/**
 * Is Object object
 * @param {*} a
 * @returns {Boolean}
 */
export function isObjectObject(a)
{
    return a !== null && isTag(a, "[object Object]");
}

/**
 * Checks if a value is a plain object
 * @author lodash
 * @param {*} a
 * @returns {Boolean}
 */
export function isPlain(a)
{
    if (!isObject(a) || !isObjectObject(a))
    {
        return false;
    }

    if (Object.getPrototypeOf(a) === null)
    {
        return true;
    }

    let proto = a;

    while (Object.getPrototypeOf(proto) !== null)
    {
        proto = Object.getPrototypeOf(proto);
    }

    return Object.getPrototypeOf(a) === proto;
}

/**
 * Checks if a value is a primary type
 * @param {*} a
 * @returns {Boolean}
 */
export function isPrimary(a)
{
    return isBoolean(a) || isNumber(a) || isString(a);
}

/**
 * Checks if a value is a promise
 * @param {*} a
 * @returns {Boolean}
 */
export function isPromise(a)
{
    return isObject(a) && isFunction(a.then);
}

/**
 * Checks if a value is a string
 * @param {*} a
 * @returns {Boolean}
 */
export function isString(a)
{
    return isTag(a, "[object String]");
}

/**
 * Checks if a value is a symbol
 * @param {*} a
 * @returns {Boolean}
 */
export function isSymbol(a)
{
    return typeof a === "symbol" || isTag(a, "[object Symbol]");
}

/**
 * Checks if a class is extended from another
 * @param {*} Constructor
 * @param {*} SuperConstructor
 * @returns {boolean}
 */
export function isSubclassOf(Constructor, SuperConstructor)
{
    if (!isFunction(Constructor)) return false;

    while (isFunction(Constructor))
    {
        if (Constructor === SuperConstructor) return true;
        Constructor = Reflect.getPrototypeOf(Constructor);
    }

    return false;
}

/**
 * Checks if a value has a given tag
 * @param {*} a
 * @param {String} tag
 * @returns {Boolean}
 */
export function isTag(a, tag)
{
    return toString.call(a) === tag;
}

/**
 * Checks if a string is preceded with 'Tr2' or 'Tri'
 * @param {String} string
 * @returns {boolean}
 */
export function isTr2OrTri(string)
{
    return !!(string && (string.indexOf("Tr2") === 0 || string.indexOf("Tri") === 0));
}

/**
 * Converts a string that is preceeded with a 'Tr2' or 'Tri' to 'Tw2'
 * @param string
 * @returns {void|*|string}
 */
export function toTw2(string)
{
    return isTr2OrTri(string) ? string.replace("Tr2", "Tw2").replace("Tri", "Tw2") : string;
}


/**
 * Gets an object's type in uppercase
 * @param {*} a
 * @returns {string}
 */
export function getTypeUpper(a)
{
    return Object.prototype.toString.call(a).slice(8, -1).toUpperCase();
}

/**
 * Checks if a value is a typed array
 * @param {*} a
 * @returns {Boolean}
 */
export function isTyped(a)
{
    return a ? !!(a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT) : false;
}

/**
 * Checks if a value is undefined
 * @param {*} a
 * @returns {Boolean}
 */
export function isUndefined(a)
{
    return a === undefined;
}

/**
 * Checks if a value is arraylike and only contains numbers
 * @param {*} a
 * @param {!Number} [len]
 * @returns {Boolean}
 */
export function isVector(a, len)
{
    if (a)
    {
        if (isTyped(a))
        {
            return len === undefined ? true : a.length === len;
        }

        if (isArray(a))
        {
            if (len !== undefined && a.length !== len)
            {
                return false;
            }

            for (let i = 0; i < a.length; i++)
            {
                if (!isNumber(a[i])) return false;
            }

            return true;
        }
    }
    return false;
}

/**
 * Checks if a value is a vector of length 2
 * @param {*} a
 * @returns {boolean}
 */
export function isVector2(a)
{
    return isVector(a, 2);
}

/**
 * Checks if a value is a vector of length 3
 * @param {*} a
 * @returns {boolean}
 */
export function isVector3(a)
{
    return isVector(a, 3);
}

/**
 * Checks if a value is a vector of length 4
 * @param {*} a
 * @returns {boolean}
 */
export function isVector4(a)
{
    return isVector(a, 4);
}

/**
 * Checks if a value is a vector of length 9
 * @param {*} a
 * @returns {boolean}
 */
export function isMatrix3(a)
{
    return isVector(a, 9);
}

/**
 * Checks if a value is a vector of length 16
 * @param {*} a
 * @returns {boolean}
 */
export function isMatrix4(a)
{
    return isVector(a, 16);
}

/**
 * Checks if two primary values are equal
 * - Allows for numbers to be "almost" equal
 * @param {String|Boolean|Number} a
 * @param {String|Boolean|Number} b
 * @returns {boolean}
 */
export function isPrimaryEqual(a, b)
{
    if (a === b) return true;

    return isNumber(a) && isNumber(b) ? equals(a, b) : false;
}

/**
 * Checks two vectors for equality
 * - Allows for numbers to be "almost" equal
 * @param {Array|TypedArray} a
 * @param {Array|TypedArray} b
 * @returns {boolean}
 */
export function isVectorEqual(a, b)
{
    if (a === b) return true;

    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++)
    {
        if (!equals(a[i], b[i])) return false;
    }

    return true;
}

export function isDateEqual(a, b)
{
    return a.getTime() === b.getTime();
}

/**
 * Checks two parameters for equality
 * TODO: Optimize
 * TODO: Circular references
 * - Allows for numbers to be "almost" equal
 * @param {String|Boolean|Number|Array|TypedArray} a
 * @param {String|Boolean|Number|Array|TypedArray} b
 * @returns {boolean}
 */
export function isEqual(a, b)
{
    if (a === b) return true;

    // allow "almost" equal numbers
    if (isNumber(a)) return isNumber(b) ? equals(a, b) : false;
    //if(isDate(a))) return isDate(b) ? isEqual(a, b) : false;
    if (isVector(a)) return isVector(b) ? isVectorEqual(a, b) : false;
    if (!isObjectObject(a) || !isObjectObject(b)) return false;
    if (a.constructor !== b.constructor) return false;

    const
        aKeys = Object.keys(a),
        bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    for (let i = 0; i < aKeys.length; i++)
    {
        let key = aKeys[i];
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!isEqual(a[key], b[key])) return false;
    }

    return true;
}

// Neutral runtime-utils spellings preserve the established core predicates.
export const isNullish = isNoU;
export const isPlainObject = isPlain;
export const isPromiseLike = isPromise;
export const isTypedArray = isTyped;
