import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@type.define({ className: "CjsCharacterAppearanceDiagnostic", family: "character" })
export class CjsCharacterAppearanceDiagnostic extends CjsModel
{

    @edit.readwrite
    @type.string
    code = "";

    @edit.readwrite
    @type.string
    message = "";

    @edit.readwrite
    @type.string
    severity = "warning";

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
