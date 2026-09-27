// Source: resources/src/ResourceInfo/ResourceInfo.h
// Source: resources/src/ResourceInfo/ResourceInfo.cpp:26-59
import { fnv164 } from "#utils/hash";
import { Result } from "./Result.js";
import { CjsSchema, carbon, impl } from "#schema";

/** CarbonResources::Location, the stored name computed from path and data hashes. */
export class Location
{
    location = "";

    /**
     * Native string constructor.
     *
     * @param {string} [location] Stored resource location.
     */
    constructor(location = "")
    {
        this.location = location;
    }

    /**
     * `SetFromRelativePathAndDataChecksum` (ResourceInfo.cpp:37-59): the
     * location from the FNV-1 hash of `prefix:/` plus the path's generic
     * (slash-separated) form, and the data checksum.
     *
     * Adapted: a path holding a non-ASCII character throws, through fnv164,
     * rather than being hashed. Carbon hashes the bytes of `generic_string()`
     * (ResourceTools::GenerateFowlerNollVoChecksum,
     * resources/tools/src/ResourceTools.cpp:69-97), and on Windows those are in
     * the process code page, which a browser cannot know. A wrong location is
     * worse than an error. Resource paths in shipped indexes are ASCII.
     *
     * @param {string} relativePath Relative path; backslashes become slashes, as `generic_string()` does.
     * @param {string} dataChecksum Data checksum text.
     * @param {string} [prefix] Prefix without its `:/`.
     * @returns {Result} SUCCESS.
     * @throws {TypeError} When the path holds a non-ASCII character.
     */
    SetFromRelativePathAndDataChecksum(relativePath, dataChecksum, prefix = "")
    {
        const logicalPath = (prefix ? prefix + ":/" : "") + String(relativePath).replaceAll("\\", "/");
        this.location = this.CalculateLocationFromChecksums(fnv164(logicalPath), dataChecksum);
        return new Result();
    }

    /**
     * Native stored location.
     *
     * @returns {string} Formatted value using native field or path spelling.
     */
    ToString()
    {
        return this.location;
    }

    /**
     * Native shard/path-hash/data-hash layout.
     *
     * @param {string} relativePathChecksum Hexadecimal hash of the logical path.
     * @param {string} dataChecksum Content checksum text.
     * @returns {string} Formatted value using native field or path spelling.
     */
    CalculateLocationFromChecksums(relativePathChecksum, dataChecksum)
    {
        return relativePathChecksum.slice(0, 2) + "/" + relativePathChecksum + "_" + dataChecksum;
    }
}


CjsSchema.define(Location, {
    className: "Location",
    carbon: "Location",
    family: "tools",
    fields: {},
    methods: {
        SetFromRelativePathAndDataChecksum: [ carbon.method, impl.adapted ],
        ToString: [ carbon.method, impl.implemented ],
        CalculateLocationFromChecksums: [ carbon.method, impl.implemented ]
    }
});
