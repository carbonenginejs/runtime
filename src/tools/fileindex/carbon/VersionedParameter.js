// Source: resources/src/ResourceInfo/ResourceInfo.h:29-50
//
// A document field's tag and the construct it belongs to; it asks
// ParameterInfo whether a document version carries the field.
import { CjsSchema, meta, blue, type } from "#schema";
import { ParameterInfo, Parameter } from "./ParameterInfo.js";

/** `VersionedParameter` - a field's tag and construct, and whether a document version carries it. */
export class VersionedParameter
{
    m_tag = "";

    m_context = "";

    m_parameter = 0;

    /**
     * @param {number} parameter `Parameter`.
     * @param {string} context Construct name: the owning class's `typeId()`.
     */
    constructor(parameter, context)
    {
        this.m_parameter = parameter;
        this.m_context = context;
        this.m_tag = ParameterInfo.getParameterInfo(parameter).m_tag;
    }

    /** `IsParameterExpectedInDocumentVersion` - whether this field is in a document of that version. */
    IsParameterExpectedInDocumentVersion(documentVersion)
    {
        return ParameterInfo.isParameterExpected(this.m_parameter, this.m_context, documentVersion);
    }

    /** `GetTag` - the field's wire tag. */
    GetTag()
    {
        return this.m_tag;
    }
}

CjsSchema.blue.define(VersionedParameter, {
  className: "VersionedParameter",
  fields: {
        m_tag: [type.string],
        m_context: [type.string],
        m_parameter: [type.int32, type.enum(Parameter)]
    },
  methods: {
        IsParameterExpectedInDocumentVersion: [ blue.method, meta.implemented ],
        GetTag: [ blue.method, meta.implemented ]
    }
});

