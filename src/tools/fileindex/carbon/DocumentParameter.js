// Source: resources/src/ResourceInfo/ResourceInfo.h:52-84
//
// Carbon's document fields: VersionedParameter knows a field's tag and the
// construct it belongs to, and asks ParameterInfo whether a document version
// carries it; DocumentParameter adds the optional value.
//
// Adapted: Carbon assigns with `operator=`, which JavaScript cannot overload,
// so a value is assigned to `m_value`. An unset `std::optional` is `undefined`.
import { CjsSchema, meta } from "#schema";
import { VersionedParameter } from "./VersionedParameter.js";

/** `DocumentParameter<T>` - a versioned field holding an optional value. */
export class DocumentParameter extends VersionedParameter
{
    m_value = undefined;

    /**
     * `GetValue` - the value, as `std::optional::value()` returns it.
     *
     * @throws {Error} "bad optional access" when unset, as `std::bad_optional_access`.
     */
    GetValue()
    {
        if (!this.HasValue()) throw new Error("bad optional access: " + this.m_tag);
        return this.m_value;
    }

    /** `HasValue` - whether the value is set. */
    HasValue()
    {
        return this.m_value !== undefined;
    }

    /** `Reset` - unsets the value. */
    Reset()
    {
        this.m_value = undefined;
    }
}

CjsSchema.define(DocumentParameter, {
    className: "DocumentParameter",
    carbon: "DocumentParameter",
    family: "tools",
    fields: {},
    methods: {
        GetValue: [ meta.blue.method, meta.implemented ],
        HasValue: [ meta.blue.method, meta.implemented ],
        Reset: [ meta.blue.method, meta.implemented ]
    }
});
