import { edit, type } from "#schema";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@type.define({ className: "CjsCharacterAppearanceDiagnostic", family: "character" })
export class CjsCharacterAppearanceDiagnostic
{

    @edit.readwrite
    @edit.persist
    @type.string
    code = "";

    @edit.readwrite
    @edit.persist
    @type.string
    message = "";

    @edit.readwrite
    @edit.persist
    @type.string
    severity = "warning";

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
