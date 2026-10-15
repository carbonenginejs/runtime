// Source: resources/include/Enums.h:235-249
import { CjsSchema, type } from "#schema";

/**
 * `CarbonResources::Version` - a plain major.minor.patch triple, the public
 * form of a document version. VersionInternal is constructed from one, as
 * Carbon converts implicitly.
 */
export class Version
{
    major = 0;

    minor = 0;

    patch = 0;

    /**
     * @param {number} [major=0] Major version.
     * @param {number} [minor=0] Minor version.
     * @param {number} [patch=0] Patch version.
     */
    constructor(major = 0, minor = 0, patch = 0)
    {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
}

CjsSchema.blue.define(Version, { className: "Version", fields: {
        major: [type.uint32],
        minor: [type.uint32],
        patch: [type.uint32]
    } });
