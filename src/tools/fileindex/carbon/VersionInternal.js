// Source: resources/src/VersionInternal.h
// Source: resources/src/VersionInternal.cpp
import { S_VALID_DOCUMENT_VERSIONS } from "./enums.js";
import { CjsSchema, meta } from "#schema";

/** Carbon resource-document version; this is not a game build number. */
export class VersionInternal
{
    m_major = undefined;
    m_minor = undefined;
    m_patch = undefined;

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
            this.m_major = major.major;
            this.m_minor = major.minor;
            this.m_patch = major.patch;
        }
        else
        {
            this.m_major = major;
            this.m_minor = minor;
            this.m_patch = patch;
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
        return this.m_major > value.m_major || this.m_minor > value.m_minor || this.m_patch > value.m_patch;
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
        return this.m_major < value.m_major || this.m_minor < value.m_minor || this.m_patch < value.m_patch;
    }

    /**
     * `operator>=` (VersionInternal.cpp:64-97), which is lexicographic.
     *
     * @param {import('./VersionInternal.js').VersionInternal} value Version to compare against.
     * @returns {boolean} Whether the documented condition or parse succeeds.
     */
    GreaterThanOrEqual(value)
    {
        return this.m_major > value.m_major || (this.m_major === value.m_major
            && (this.m_minor > value.m_minor || (this.m_minor === value.m_minor && this.m_patch >= value.m_patch)));
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
        return this.m_major === value.m_major && this.m_minor === value.m_minor && this.m_patch === value.m_patch;
    }

    /**
     * Formats the native dotted document version.
     *
     * @returns {string} Formatted value using native field or path spelling.
     */
    ToString()
    {
        return this.m_major + "." + this.m_minor + "." + this.m_patch;
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
        const fields = ["m_major", "m_minor", "m_patch"];
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
        return this.m_major;
    }

    /**
     * Native version accessors.
     *
     * @returns {number|undefined} Stored version component, or undefined before initialization.
     */
    getMinor()
    {
        return this.m_minor;
    }

    /**
     * Native version accessors.
     *
     * @returns {number|undefined} Stored version component, or undefined before initialization.
     */
    getPatch()
    {
        return this.m_patch;
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


CjsSchema.define(VersionInternal, {
    className: "VersionInternal",
    carbon: "VersionInternal",
    family: "tools",
    fields: {},
    methods: {
        GreaterThan: [ meta.adapted ],
        LessThan: [ meta.adapted ],
        GreaterThanOrEqual: [ meta.adapted ],
        LessThanOrEqual: [ meta.adapted ],
        Equals: [ meta.adapted ],
        ToString: [ meta.blue.method, meta.implemented ],
        FromString: [ meta.blue.method, meta.implemented ],
        getMajor: [ meta.blue.method, meta.implemented ],
        getMinor: [ meta.blue.method, meta.implemented ],
        getPatch: [ meta.blue.method, meta.implemented ],
        isVersionValid: [ meta.blue.method, meta.implemented ]
    }
});
