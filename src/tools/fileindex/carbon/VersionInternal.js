// Source: resources/src/VersionInternal.h
// Source: resources/src/VersionInternal.cpp
import { S_VALID_DOCUMENT_VERSIONS } from "./enums.js";
import { CjsSchema, meta, blue, type } from "#schema";

/** Carbon resource-document version; this is not a game build number. */
export class VersionInternal
{
    _major = undefined;
    _minor = undefined;
    _patch = undefined;

    /**
     * Native constructors collapsed into one JS overload.
     *
     * @param {number|{major: number, minor: number, patch: number}} [major] Major component or native version aggregate.
     * @param {number} [minor] Version component; omitted components remain unset.
     * @param {number} [patch] Version component; omitted components remain unset.
     */
    constructor(major, minor, patch)
    {
        if (typeof major === "object")
        {
            this._major = major.major;
            this._minor = major.minor;
            this._patch = major.patch;
        }
        else
        {
            this._major = major;
            this._minor = minor;
            this._patch = patch;
        }
    }

    /**
     * `operator>` (VersionInternal.cpp:26-43).
     *
     * Quirk, reproduced (CE-41): true when any one component is greater, so
     * 0.1.0 > 1.0.0. `LessThanOrEqual` negates it; `GreaterThanOrEqual` is
     * lexicographic; the four operators disagree.
     *
     * @param {import('./VersionInternal.js').VersionInternal} value Version to compare against.
     * @returns {boolean} Whether the documented condition or parse succeeds.
     */
    GreaterThan(value)
    {
        return this._major > value._major || this._minor > value._minor || this._patch > value._patch;
    }

    /**
     * `operator<` (VersionInternal.cpp:45-62).
     *
     * Quirk, reproduced (CE-41): true when any one component is less.
     *
     * @param {import('./VersionInternal.js').VersionInternal} value Version to compare against.
     * @returns {boolean} Whether the documented condition or parse succeeds.
     */
    LessThan(value)
    {
        return this._major < value._major || this._minor < value._minor || this._patch < value._patch;
    }

    /**
     * `operator>=` (VersionInternal.cpp:64-97), which is lexicographic.
     *
     * @param {import('./VersionInternal.js').VersionInternal} value Version to compare against.
     * @returns {boolean} Whether the documented condition or parse succeeds.
     */
    GreaterThanOrEqual(value)
    {
        return this._major > value._major || (this._major === value._major
            && (this._minor > value._minor || (this._minor === value._minor && this._patch >= value._patch)));
    }

    /**
     * `operator<=` (VersionInternal.cpp:119-122): `!(this > value)`, over the quirky `>`.
     *
     * @param {import('./VersionInternal.js').VersionInternal} value Version to compare against.
     * @returns {boolean} Whether the documented condition or parse succeeds.
     */
    LessThanOrEqual(value)
    {
        return !this.GreaterThan(value);
    }

    /**
     * `operator==` (VersionInternal.cpp:99-117).
     *
     * @param {import('./VersionInternal.js').VersionInternal} value Version to compare against.
     * @returns {boolean} Whether the documented condition or parse succeeds.
     */
    Equals(value)
    {
        return this._major === value._major && this._minor === value._minor && this._patch === value._patch;
    }

    /**
     * Formats the native dotted document version.
     *
     * @returns {string} Formatted value using native field or path spelling.
     */
    ToString()
    {
        return this._major + "." + this._minor + "." + this._patch;
    }

    /**
     * std::stoi prefix parsing, signed-int range and unsigned assignment.
     *
     * @param {string} text Dotted version text to parse.
     * @returns {boolean} Whether the documented condition or parse succeeds.
     */
    FromString(text)
    {
        const parts = String(text).split(".");
        const fields = ["_major", "_minor", "_patch"];
        for (let i = 0; i < 3; i++)
        {
            const match = (parts[i] ?? "").match(/^\s*[+-]?\d+/u);
            if (!match) return false;
            const value = Number(match[0]);
            if (value < -2147483648 || value > 2147483647) return false;
            this[fields[i]] = value >>> 0;
        }
        return true;
    }

    /**
     * Native version accessors.
     *
     * @returns {number|undefined} Stored version component, or undefined before initialization.
     */
    getMajor()
    {
        return this._major;
    }

    /**
     * Native version accessors.
     *
     * @returns {number|undefined} Stored version component, or undefined before initialization.
     */
    getMinor()
    {
        return this._minor;
    }

    /**
     * Native version accessors.
     *
     * @returns {number|undefined} Stored version component, or undefined before initialization.
     */
    getPatch()
    {
        return this._patch;
    }

    /**
     * `isVersionValid` - whether this is one of S_VALID_DOCUMENT_VERSIONS
     * (VersionInternal.cpp:189-199).
     *
     * @returns {boolean} Whether the version is valid.
     */
    isVersionValid()
    {
        return S_VALID_DOCUMENT_VERSIONS.some(version => this.Equals(new VersionInternal(version)));
    }
}


CjsSchema.decorateField(VersionInternal, "_major", type.uint32);
CjsSchema.decorateField(VersionInternal, "_minor", type.uint32);
CjsSchema.decorateField(VersionInternal, "_patch", type.uint32);
CjsSchema.decorateMethod(VersionInternal, "GreaterThan", meta.renamed("operator>"), meta.adapted);
CjsSchema.decorateMethod(VersionInternal, "LessThan", meta.renamed("operator<"), meta.adapted);
CjsSchema.decorateMethod(VersionInternal, "GreaterThanOrEqual", meta.renamed("operator>="), meta.adapted);
CjsSchema.decorateMethod(VersionInternal, "LessThanOrEqual", meta.renamed("operator<="), meta.adapted);
CjsSchema.decorateMethod(VersionInternal, "Equals", meta.renamed("operator=="), meta.adapted);
CjsSchema.decorateMethod(VersionInternal, "ToString", blue.method, meta.implemented);
CjsSchema.decorateMethod(VersionInternal, "FromString", blue.method, meta.implemented);
CjsSchema.decorateMethod(VersionInternal, "getMajor", blue.method, meta.implemented);
CjsSchema.decorateMethod(VersionInternal, "getMinor", blue.method, meta.implemented);
CjsSchema.decorateMethod(VersionInternal, "getPatch", blue.method, meta.implemented);
CjsSchema.decorateMethod(VersionInternal, "isVersionValid", blue.method, meta.implemented);
CjsSchema.meta.carbon("VersionInternal")(VersionInternal);
