// Source: fsd/BinaryLoader.cpp, fsd/FsdDict.cpp, fsd/FsdList.cpp, fsd/FsdVector.cpp
// Source: fsd/FsdObject.cpp, fsd/FsdSchema.cpp, fsd/FsdUnsignedIntegerKeyMap.cpp
//
// Carbon's legacy FSD loader is a CPython extension: it reports failure by
// setting the interpreter's error indicator (`PyErr_SetString`,
// `PyErr_Format`, a `BlueStdResult` error) and returning NULL or false. There
// is no interpreter here, so the port throws instead, at the line where Carbon
// sets the error. The thrown error keeps the Python exception type as its
// `name` and Carbon's message text.

/**
 * The CPython exception types Carbon's legacy FSD loader raises.
 *
 * @enum {string}
 */
export const PyExc = Object.freeze({
    AttributeError: "AttributeError",
    IndexError: "IndexError",
    KeyError: "KeyError",
    NotImplementedError: "NotImplementedError",
    OverflowError: "OverflowError",
    RuntimeError: "RuntimeError",
    SystemError: "SystemError",
    TypeError: "TypeError",
    UnicodeDecodeError: "UnicodeDecodeError",
});

/**
 * Throw the error Carbon raises with `PyErr_SetString(type, message)`.
 *
 * The error's `name` is the Python exception type and its `code` is
 * `CJS_FSD_32_` plus that type in upper snake case, for example
 * `CJS_FSD_32_KEY_ERROR`.
 *
 * @param {string} type One of {@link PyExc}.
 * @param {string} message Carbon's message text.
 * @returns {never} Always throws.
 * @throws {Error} Always.
 */
export function PyErr_SetString(type, message)
{
    const error = new Error(message);

    error.name = type;
    error.code = "CJS_FSD_32_" + type.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
    error.variant = "fsd32";
    throw error;
}

/**
 * Convert a key the way CPython's `PyLong_AsLong` does on a 64-bit POSIX build.
 *
 * Python passes integers to the loader; JavaScript callers pass integer
 * Numbers, BigInts or booleans (Python's `bool` is an `int`). The port follows
 * the LP64 `long` of Carbon's non-Windows build; on Windows `long` is 32 bits
 * and a key outside the int32 range raises OverflowError instead.
 *
 * @param {number|bigint|boolean} key Candidate integer key.
 * @returns {number|bigint} The integer value; a BigInt only when it is not a safe Number.
 * @throws {Error} TypeError for a non-integer key, OverflowError beyond the int64 range.
 */
export function PyLong_AsLong(key)
{
    if (typeof key === "boolean") return key ? 1 : 0;

    if (typeof key === "bigint")
    {
        if (BigInt.asIntN(64, key) !== key)
        {
            PyErr_SetString(PyExc.OverflowError, "Python int too large to convert to C long");
        }

        return Number.isSafeInteger(Number(key)) ? Number(key) : key;
    }

    if (typeof key !== "number" || !Number.isInteger(key))
    {
        PyErr_SetString(PyExc.TypeError, `'${typeof key}' object cannot be interpreted as an integer`);
    }

    if (key >= 2 ** 63 || key < -(2 ** 63))
    {
        PyErr_SetString(PyExc.OverflowError, "Python int too large to convert to C long");
    }

    return key;
}

/**
 * Format a dictionary key the way Carbon's `PyObject_Repr` call shows it in
 * paths and error messages.
 *
 * Covers the key types the loader accepts: integers, booleans and strings.
 * Python's escaping of non-printable characters is not reproduced.
 *
 * @param {unknown} key Dictionary key.
 * @returns {string} Python-style representation.
 */
export function PyObject_Repr(key)
{
    if (typeof key === "boolean") return key ? "True" : "False";
    if (typeof key !== "string") return String(key);
    if (key.includes("'") && !key.includes("\"")) return `"${key}"`;

    return `'${key.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}
