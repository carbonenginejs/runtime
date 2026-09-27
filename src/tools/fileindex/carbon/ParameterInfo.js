// Source: resources/src/ParameterVersion.h
// Source: resources/src/ParameterVersion.cpp
//
// Which document versions carry which field, per construct. Carbon keeps it as
// a table of ParameterInfo records keyed by the Parameter enum, and every
// DocumentParameter asks it before reading or writing its field
// (VersionedParameter::IsParameterExpectedInDocumentVersion,
// ResourceInfo.h:37-40). Ported as the same table, so a version gate is data,
// not a condition written out by hand at each field.
import { CjsSchema, carbon, impl } from "#schema";
import { ParameterContext } from "./ParameterContext.js";
import { VersionInternal } from "./VersionInternal.js";

/** `CarbonResources::Parameter` (ParameterVersion.h:22-44), with Carbon's ordinals. */
export const Parameter = Object.freeze({
    CHUNK_SIZE: 0,
    RESOURCE_GROUP_RESOURCE: 1,
    MAX_INPUT_CHUNK_SIZE: 2,
    VERSION: 3,
    TYPE: 4,
    NUMBER_OF_RESOURCES: 5,
    TOTAL_RESOURCE_SIZE_COMPRESSED: 6,
    TOTAL_RESOURCE_SIZE_UNCOMPRESSED: 7,
    RESOURCE: 8,
    DATA_OFFSET: 9,
    SOURCE_OFFSET: 10,
    TARGET_RESOURCE_RELATIVE_PATH: 11,
    RELATIVE_PATH: 12,
    LOCATION: 13,
    CHECKSUM: 14,
    COMPRESSED_SIZE: 15,
    UNCOMPRESSED_SIZE: 16,
    BINARY_OPERATION: 17,
    PREFIX: 18,
    REMOVED_RESOURCE_RELATIVE_PATHS: 19
});

/** `ParameterInfo` - a parameter's wire tag, the constructs it appears in, and whether it is optional. */
export class ParameterInfo
{
    m_id = 0;

    m_tag = "";

    /** @type {ParameterContext[]} */
    m_context = [];

    m_isOptional = false;

    /**
     * @param {number} id `Parameter`.
     * @param {string} tag Wire tag.
     * @param {ParameterContext[]} context Constructs and version spans.
     * @param {boolean} [isOptional=false] Whether the field may be absent where expected.
     */
    constructor(id, tag, context, isOptional = false)
    {
        this.m_id = id;
        this.m_tag = tag;
        this.m_context = context;
        this.m_isOptional = isOptional;
    }

    /**
     * `GetParameterInfo` (ParameterVersion.cpp:52-55): the record for a parameter.
     *
     * Carbon's is a namespace function over `s_paramToInfo`, filled by each
     * record's constructor; here the table is a static built once.
     *
     * @param {number} parameter `Parameter`.
     * @returns {ParameterInfo|null} The record, or `null` where Carbon's map yields a null pointer.
     */
    static getParameterInfo(parameter)
    {
        return PARAMETERS.get(parameter) ?? null;
    }

    /**
     * `IsParameterExpected` (ParameterVersion.cpp:57-72): whether a construct
     * carries the parameter at this document version, introduced `<=` version
     * `<` deprecated, using VersionInternal's own `<=` and `>`.
     *
     * @param {number} parameter `Parameter`.
     * @param {string} context Construct name.
     * @param {VersionInternal} version Document version.
     * @returns {boolean} Whether the parameter is expected.
     */
    static isParameterExpected(parameter, context, version)
    {
        const info = ParameterInfo.getParameterInfo(parameter);
        if (!info) return false;
        for (const entry of info.m_context)
        {
            if (entry.m_context === context
                && entry.m_introducedInVersion.LessThanOrEqual(version)
                && entry.m_deprecatedInVersion.GreaterThan(version))
            {
                return true;
            }
        }
        return false;
    }

    /**
     * `IsParameterRequired` (ParameterVersion.cpp:74-101): required where
     * expected and not optional; where not expected, required only if no
     * context introduced it in a newer minor version of the same major.
     *
     * @param {number} parameter `Parameter`.
     * @param {string} context Construct name.
     * @param {VersionInternal} version Document version.
     * @returns {boolean} Whether the parameter is required.
     */
    static isParameterRequired(parameter, context, version)
    {
        const info = ParameterInfo.getParameterInfo(parameter);
        if (!info) return false;
        if (ParameterInfo.isParameterExpected(parameter, context, version)) return !info.m_isOptional;

        let maxMinorVersion = 0;
        for (const entry of info.m_context)
        {
            if (version.getMajor() === entry.m_introducedInVersion.getMajor()
                && entry.m_introducedInVersion.getMinor() > maxMinorVersion)
            {
                maxMinorVersion = entry.m_introducedInVersion.getMinor();
            }
        }
        return maxMinorVersion <= version.getMinor();
    }
}

/** `VERSION_0_0_0`, `VERSION_0_1_0`, `VERSION_1_0_0` and `VERSION_MAX` (ParameterVersion.cpp:9-12). */
export const ParameterVersions = Object.freeze({
    VERSION_0_0_0: new VersionInternal(0, 0, 0),
    VERSION_0_1_0: new VersionInternal(0, 1, 0),
    VERSION_1_0_0: new VersionInternal(1, 0, 0),
    VERSION_MAX: new VersionInternal(4294967295, 4294967295, 4294967295)
});

/** The construct names Carbon's table uses (ParameterVersion.cpp:15-19). */
export const ParameterContexts = Object.freeze({
    CONTEXT_RESOURCE_GROUP: "ResourceGroup",
    CONTEXT_BUNDLE_GROUP: "BundleGroup",
    CONTEXT_PATCH_GROUP: "PatchGroup",
    CONTEXT_BINARY_PATCH: "BinaryPatch",
    CONTEXT_RESOURCE: "Resource"
});

const { VERSION_0_0_0, VERSION_0_1_0, VERSION_MAX } = ParameterVersions;
const { CONTEXT_RESOURCE_GROUP, CONTEXT_BUNDLE_GROUP, CONTEXT_PATCH_GROUP, CONTEXT_BINARY_PATCH, CONTEXT_RESOURCE } = ParameterContexts;
const span = (context, from) => new ParameterContext(context, from, VERSION_MAX);

// ParameterVersion.cpp:23-42, in Carbon's order.
const PARAMETERS = new Map([
    new ParameterInfo(Parameter.CHUNK_SIZE, "ChunkSize", [ span(CONTEXT_BUNDLE_GROUP, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.RESOURCE_GROUP_RESOURCE, "ResourceGroupResource", [ span(CONTEXT_BUNDLE_GROUP, VERSION_0_1_0), span(CONTEXT_PATCH_GROUP, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.MAX_INPUT_CHUNK_SIZE, "MaxInputChunkSize", [ span(CONTEXT_PATCH_GROUP, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.VERSION, "Version", [ span(CONTEXT_RESOURCE_GROUP, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.TYPE, "Type", [ span(CONTEXT_RESOURCE_GROUP, VERSION_0_1_0), span(CONTEXT_RESOURCE, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.NUMBER_OF_RESOURCES, "NumberOfResources", [ span(CONTEXT_RESOURCE_GROUP, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.TOTAL_RESOURCE_SIZE_COMPRESSED, "TotalResourcesSizeCompressed", [ span(CONTEXT_RESOURCE_GROUP, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.TOTAL_RESOURCE_SIZE_UNCOMPRESSED, "TotalResourcesSizeUnCompressed", [ span(CONTEXT_RESOURCE_GROUP, VERSION_0_1_0) ]),
    new ParameterInfo(Parameter.RESOURCE, "Resources", [ span(CONTEXT_RESOURCE_GROUP, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.DATA_OFFSET, "DataOffset", [ span(CONTEXT_BINARY_PATCH, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.SOURCE_OFFSET, "SourceOffset", [ span(CONTEXT_BINARY_PATCH, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.TARGET_RESOURCE_RELATIVE_PATH, "TargetResourceRelativePath", [ span(CONTEXT_BINARY_PATCH, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.RELATIVE_PATH, "RelativePath", [ span(CONTEXT_RESOURCE, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.LOCATION, "Location", [ span(CONTEXT_RESOURCE, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.CHECKSUM, "Checksum", [ span(CONTEXT_RESOURCE, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.COMPRESSED_SIZE, "CompressedSize", [ span(CONTEXT_RESOURCE, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.UNCOMPRESSED_SIZE, "UncompressedSize", [ span(CONTEXT_RESOURCE, VERSION_0_0_0) ]),
    new ParameterInfo(Parameter.BINARY_OPERATION, "BinaryOperation", [ span(CONTEXT_RESOURCE, VERSION_0_0_0) ], true),
    new ParameterInfo(Parameter.PREFIX, "Prefix", [ span(CONTEXT_RESOURCE, VERSION_0_0_0) ], true),
    new ParameterInfo(Parameter.REMOVED_RESOURCE_RELATIVE_PATHS, "RemovedResourceRelativePaths", [ span(CONTEXT_PATCH_GROUP, VERSION_0_1_0) ])
].map(info => [ info.m_id, info ]));

CjsSchema.define(ParameterInfo, {
    className: "ParameterInfo",
    carbon: "ParameterInfo",
    family: "tools",
    fields: {},
    methods: {
        getParameterInfo: [ carbon.method, impl.adapted ],
        isParameterExpected: [ carbon.method, impl.implemented ],
        isParameterRequired: [ carbon.method, impl.implemented ]
    }
});
