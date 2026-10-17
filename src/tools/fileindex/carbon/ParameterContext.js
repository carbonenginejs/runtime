// Source: resources/src/ParameterVersion.h:46-53
// Source: resources/src/ParameterVersion.cpp:104-109
import { CjsSchema, type } from "#schema";

/** `ParameterContext` - one construct a parameter appears in, and the versions it spans. */
export class ParameterContext
{
    context = "";

    /** @type {import('./VersionInternal.js').VersionInternal|null} */
    introducedInVersion = null;

    /** @type {import('./VersionInternal.js').VersionInternal|null} */
    deprecatedInVersion = null;

    /**
     * @param {string} context Construct name, such as "Resource" or "ResourceGroup".
     * @param {import('./VersionInternal.js').VersionInternal} introducedInVersion First document version carrying the parameter.
     * @param {import('./VersionInternal.js').VersionInternal} deprecatedInVersion First document version no longer carrying it.
     */
    constructor(context, introducedInVersion, deprecatedInVersion)
    {
        this.context = context;
        this.introducedInVersion = introducedInVersion;
        this.deprecatedInVersion = deprecatedInVersion;
    }
}

CjsSchema.blue.define(ParameterContext, { className: "ParameterContext", fields: {
        context: [type.string]
    } });

