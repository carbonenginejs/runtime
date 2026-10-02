import { meta } from "#schema";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@meta.define({ className: "CjsCharacterAppearanceDiagnostic", family: "character" })
export class CjsCharacterAppearanceDiagnostic
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    code = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    message = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    severity = "warning";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
