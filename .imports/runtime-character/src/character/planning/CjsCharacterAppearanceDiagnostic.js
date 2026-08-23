import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@type.define({ className: "CjsCharacterAppearanceDiagnostic", family: "character" })
export class CjsCharacterAppearanceDiagnostic extends CjsModel
{

    @io.readwrite
    @type.string
    code = "";

    @io.readwrite
    @type.string
    message = "";

    @io.readwrite
    @type.string
    severity = "warning";

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
