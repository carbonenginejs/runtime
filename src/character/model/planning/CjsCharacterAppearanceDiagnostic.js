import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@type.define({ className: "CjsCharacterAppearanceDiagnostic", family: "character" })
export class CjsCharacterAppearanceDiagnostic extends CjsModel
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
