// Source: resources/src/ParameterVersion.h:46-53
// Source: resources/src/ParameterVersion.cpp:104-109
import { CjsSchema } from "#schema";

/** `ParameterContext` - one construct a parameter appears in, and the versions it spans. */
export class ParameterContext
{
    m_context = "";

    /** @type {import('./VersionInternal.js').VersionInternal|null} */
    m_introducedInVersion = null;

    /** @type {import('./VersionInternal.js').VersionInternal|null} */
    m_deprecatedInVersion = null;

    /**
     * @param {string} context Construct name, such as "Resource" or "ResourceGroup".
     * @param {import('./VersionInternal.js').VersionInternal} introducedInVersion First document version carrying the parameter.
     * @param {import('./VersionInternal.js').VersionInternal} deprecatedInVersion First document version no longer carrying it.
     */
    constructor(context, introducedInVersion, deprecatedInVersion)
    {
        this.m_context = context;
        this.m_introducedInVersion = introducedInVersion;
        this.m_deprecatedInVersion = deprecatedInVersion;
    }
}

CjsSchema.define(ParameterContext, { className: "ParameterContext", carbon: "ParameterContext", family: "tools", fields: {} });

