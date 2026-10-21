// Source: resources/include/Enums.h:235-249
import { CjsSchema, type } from "#schema";

/**
 * `CarbonResources::Version` - a plain major.minor.patch triple, the public
 * form of a document version. VersionInternal is constructed from one, as
 * Carbon converts implicitly.
 */
export class Version
{
    /** Carbon leaves it unset (`resources/include/Enums.h:246`). */
    major = 0;

    /** Carbon leaves it unset (`resources/include/Enums.h:247`). */
    minor = 0;

    /** Carbon leaves it unset (`resources/include/Enums.h:248`). */
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

CjsSchema.decorateField(Version, "major", type.uint32);
CjsSchema.decorateField(Version, "minor", type.uint32);
CjsSchema.decorateField(Version, "patch", type.uint32);
CjsSchema.meta.carbon("Version")(Version);
