// Source: resources/src/ResourceInfo/ResourceInfo.h:29-50
//
// A document field's tag and the construct it belongs to; it asks
// ParameterInfo whether a document version carries the field.
import { CjsSchema, meta, blue, type } from "#schema";
import { ParameterInfo, Parameter } from "./ParameterInfo.js";

/** `VersionedParameter` - a field's tag and construct, and whether a document version carries it. */
export class VersionedParameter
{
    _tag = "";

    _context = "";

    _parameter = 0;

    /**
     * @param {number} parameter `Parameter`.
     * @param {string} context Construct name: the owning class's `typeId()`.
     */
    constructor(parameter, context)
    {
        this._parameter = parameter;
        this._context = context;
        this._tag = ParameterInfo.getParameterInfo(parameter).tag;
    }

    /** `IsParameterExpectedInDocumentVersion` - whether this field is in a document of that version. */
    IsParameterExpectedInDocumentVersion(documentVersion)
    {
        return ParameterInfo.isParameterExpected(this._parameter, this._context, documentVersion);
    }

    /** `GetTag` - the field's wire tag. */
    GetTag()
    {
        return this._tag;
    }
}

CjsSchema.decorateField(VersionedParameter, "_tag", type.string);
CjsSchema.decorateField(VersionedParameter, "_context", type.string);
CjsSchema.decorateField(VersionedParameter, "_parameter", type.int32, type.enum(Parameter));
CjsSchema.decorateMethod(VersionedParameter, "IsParameterExpectedInDocumentVersion", blue.method, meta.implemented);
CjsSchema.decorateMethod(VersionedParameter, "GetTag", blue.method, meta.implemented);
CjsSchema.meta.carbon("VersionedParameter")(VersionedParameter);

